import type { Kysely, Transaction } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type { MergeExerciseHistoryResult } from "./exercise.repository.js";

export async function mergeExerciseHistory(
  db: Kysely<AppDatabase>,
  userId: string,
  sourceExerciseId: string,
  targetExerciseId: string,
  mergedAt: Date
): Promise<MergeExerciseHistoryResult> {
  return db.transaction().execute(async (trx) => {
    const affected = await trx
      .selectFrom("session_exercises")
      .innerJoin("workout_sessions", "workout_sessions.id", "session_exercises.workout_session_id")
      .select([
        "session_exercises.id as id",
        "session_exercises.workout_session_id as workoutSessionId"
      ])
      .where("session_exercises.exercise_id", "=", sourceExerciseId)
      .where("session_exercises.deleted_at", "is", null)
      .where("workout_sessions.user_id", "=", userId)
      .where("workout_sessions.deleted_at", "is", null)
      .execute();

    const sessionExerciseIds = affected.map((row) => row.id);
    const affectedWorkouts = new Set(affected.map((row) => row.workoutSessionId)).size;
    let affectedSets = 0;

    if (sessionExerciseIds.length > 0) {
      const setCount = await trx
        .selectFrom("sets")
        .select((eb) => eb.fn.countAll<string>().as("total"))
        .where("session_exercise_id", "in", sessionExerciseIds)
        .where("deleted_at", "is", null)
        .executeTakeFirstOrThrow();
      affectedSets = Number(setCount.total);
      await trx
        .updateTable("session_exercises")
        .set({ exercise_id: targetExerciseId, updated_at: mergedAt })
        .where("id", "in", sessionExerciseIds)
        .execute();
    }

    const templateReferences = await trx
      .selectFrom("workout_template_exercises")
      .innerJoin("workout_templates", "workout_templates.id", "workout_template_exercises.workout_template_id")
      .select([
        "workout_template_exercises.id as id",
        "workout_template_exercises.workout_template_id as templateId"
      ])
      .where("workout_template_exercises.exercise_id", "=", sourceExerciseId)
      .where("workout_templates.user_id", "=", userId)
      .execute();
    const templateExerciseIds = templateReferences.map((row) => row.id);
    const affectedTemplates = new Set(templateReferences.map((row) => row.templateId)).size;

    if (templateExerciseIds.length > 0) {
      await trx
        .updateTable("workout_template_exercises")
        .set({ exercise_id: targetExerciseId })
        .where("id", "in", templateExerciseIds)
        .execute();
    }

    const source = await trx
      .selectFrom("exercises")
      .select("created_by_user_id as createdByUserId")
      .where("id", "=", sourceExerciseId)
      .executeTakeFirstOrThrow();
    const sourceRetired = await retireUnreferencedPersonalExercise(
      trx,
      source.createdByUserId === userId,
      sourceExerciseId,
      mergedAt
    );

    return {
      reassignedSessionExercises: sessionExerciseIds.length,
      reassignedTemplateExercises: templateExerciseIds.length,
      affectedWorkouts,
      affectedTemplates,
      affectedSets,
      sourceRetired
    };
  });
}

async function retireUnreferencedPersonalExercise(
  db: Transaction<AppDatabase>,
  isPersonal: boolean,
  sourceExerciseId: string,
  mergedAt: Date
): Promise<boolean> {
  if (!isPersonal) return false;

  const workoutReference = await db
    .selectFrom("session_exercises")
    .select("id")
    .where("exercise_id", "=", sourceExerciseId)
    .where("deleted_at", "is", null)
    .limit(1)
    .executeTakeFirst();
  const templateReference = await db
    .selectFrom("workout_template_exercises")
    .select("id")
    .where("exercise_id", "=", sourceExerciseId)
    .limit(1)
    .executeTakeFirst();

  if (workoutReference || templateReference) return false;
  await db
    .updateTable("exercises")
    .set({ deleted_at: mergedAt, updated_at: mergedAt })
    .where("id", "=", sourceExerciseId)
    .execute();
  return true;
}
