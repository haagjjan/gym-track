import { randomUUID } from "node:crypto";
import { sql, type Kysely, type Transaction } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type { WorkoutCsvExercise, WorkoutCsvWorkout } from "./workout-csv.js";

type DatabaseExecutor = Kysely<AppDatabase> | Transaction<AppDatabase>;

export interface WorkoutCsvExportRow {
  workout_started_at: string;
  workout_ended_at: string;
  workout_type: string;
  workout_title: string;
  workout_notes: string;
  exercise_name: string;
  primary_muscle_group_slug: string;
  equipment: string;
  exercise_type: string;
  exercise_position: string;
  set_order: string;
  set_type: string;
  weight_kg: string;
  reps: string;
  rir: string;
  rest_time_seconds: string;
  set_note: string;
}

export interface WorkoutCsvRepository {
  exportRows(userId: string): Promise<WorkoutCsvExportRow[]>;
  importWorkouts(userId: string, workouts: WorkoutCsvWorkout[], importedAt: Date): Promise<void>;
  listMuscleGroupSlugs(): Promise<string[]>;
}

export function createWorkoutCsvRepository(db: Kysely<AppDatabase>): WorkoutCsvRepository {
  return {
    async exportRows(userId) {
      const rows = await db
        .selectFrom("workout_sessions")
        .innerJoin("session_exercises", "session_exercises.workout_session_id", "workout_sessions.id")
        .innerJoin("exercises", "exercises.id", "session_exercises.exercise_id")
        .innerJoin("muscle_groups", "muscle_groups.id", "exercises.primary_muscle_group_id")
        .innerJoin("sets", "sets.session_exercise_id", "session_exercises.id")
        .select([
          "workout_sessions.started_at as workoutStartedAt",
          "workout_sessions.ended_at as workoutEndedAt",
          "workout_sessions.workout_type as workoutType",
          "workout_sessions.title as workoutTitle",
          "workout_sessions.notes as workoutNotes",
          "exercises.name as exerciseName",
          "muscle_groups.slug as primaryMuscleGroupSlug",
          "exercises.equipment as equipment",
          "exercises.exercise_type as exerciseType",
          "session_exercises.position as exercisePosition",
          "sets.set_order as setOrder",
          "sets.set_type as setType",
          "sets.weight_kg as weightKg",
          "sets.reps as reps",
          "sets.rir as rir",
          "sets.rest_time_seconds as restTimeSeconds",
          "sets.note as setNote"
        ])
        .where("workout_sessions.user_id", "=", userId)
        .where("workout_sessions.deleted_at", "is", null)
        .where("session_exercises.deleted_at", "is", null)
        .where("sets.deleted_at", "is", null)
        .where("workout_sessions.ended_at", "is not", null)
        .orderBy("workout_sessions.started_at", "asc")
        .orderBy("session_exercises.position", "asc")
        .orderBy("sets.set_order", "asc")
        .execute();

      return rows.map(toExportRow);
    },
    async importWorkouts(userId, workouts, importedAt) {
      await db.transaction().execute(async (trx) => {
        for (const workout of workouts) {
          await importWorkout(trx, userId, workout, importedAt);
        }
      });
    },
    async listMuscleGroupSlugs() {
      const rows = await db.selectFrom("muscle_groups").select("slug").execute();

      return rows.map((row) => row.slug);
    }
  };
}

async function importWorkout(
  db: Transaction<AppDatabase>,
  userId: string,
  workout: WorkoutCsvWorkout,
  importedAt: Date
): Promise<void> {
  const workoutId = randomUUID();

  await db
    .insertInto("workout_sessions")
    .values({
      id: workoutId,
      user_id: userId,
      started_at: workout.startedAt,
      ended_at: workout.endedAt,
      workout_type: workout.workoutType,
      title: workout.title,
      notes: workout.notes,
      created_at: importedAt,
      updated_at: importedAt
    })
    .execute();

  for (const exercise of workout.exercises) {
    await importExerciseBlock(db, userId, workoutId, exercise, importedAt);
  }
}

async function importExerciseBlock(
  db: Transaction<AppDatabase>,
  userId: string,
  workoutId: string,
  exercise: WorkoutCsvExercise,
  importedAt: Date
): Promise<void> {
  const exerciseId = await findOrCreateExercise(db, userId, exercise, importedAt);
  const sessionExerciseId = randomUUID();

  await db
    .insertInto("session_exercises")
    .values({
      id: sessionExerciseId,
      workout_session_id: workoutId,
      exercise_id: exerciseId,
      position: exercise.position,
      created_at: importedAt,
      updated_at: importedAt
    })
    .execute();

  await db
    .insertInto("sets")
    .values(
      exercise.sets.map((set) => ({
        id: randomUUID(),
        session_exercise_id: sessionExerciseId,
        set_order: set.setOrder,
        set_type: set.setType,
        weight_kg: set.weightKg,
        reps: set.reps,
        rir: set.rir,
        rest_time_seconds: set.restTimeSeconds,
        note: set.note,
        created_at: importedAt,
        updated_at: importedAt
      }))
    )
    .execute();
}

async function findOrCreateExercise(
  db: DatabaseExecutor,
  userId: string,
  exercise: WorkoutCsvExercise,
  importedAt: Date
): Promise<string> {
  const existing = await db
    .selectFrom("exercises")
    .select(["id", "deleted_at as deletedAt"])
    .where(sql<string>`lower(name)`, "=", exercise.name.toLowerCase())
    .executeTakeFirst();

  if (existing) {
    if (existing.deletedAt) {
      await restoreExercise(db, existing.id, exercise, importedAt);
    }

    return existing.id;
  }

  const muscleGroupId = await findMuscleGroupId(db, exercise.primaryMuscleGroupSlug);
  const exerciseId = randomUUID();

  await db
    .insertInto("exercises")
    .values({
      id: exerciseId,
      name: exercise.name,
      equipment: exercise.equipment,
      exercise_type: exercise.exerciseType,
      primary_muscle_group_id: muscleGroupId,
      created_by_user_id: userId,
      created_at: importedAt,
      updated_at: importedAt
    })
    .execute();

  return exerciseId;
}

async function restoreExercise(
  db: DatabaseExecutor,
  exerciseId: string,
  exercise: WorkoutCsvExercise,
  importedAt: Date
): Promise<void> {
  const muscleGroupId = await findMuscleGroupId(db, exercise.primaryMuscleGroupSlug);

  await db
    .updateTable("exercises")
    .set({
      equipment: exercise.equipment,
      exercise_type: exercise.exerciseType,
      primary_muscle_group_id: muscleGroupId,
      updated_at: importedAt,
      deleted_at: null
    })
    .where("id", "=", exerciseId)
    .execute();
}

async function findMuscleGroupId(db: DatabaseExecutor, slug: string): Promise<string> {
  const row = await db
    .selectFrom("muscle_groups")
    .select("id")
    .where("slug", "=", slug)
    .executeTakeFirstOrThrow();

  return row.id;
}

function toExportRow(row: {
  workoutStartedAt: Date;
  workoutEndedAt: Date | null;
  workoutType: string | null;
  workoutTitle: string | null;
  workoutNotes: string | null;
  exerciseName: string;
  primaryMuscleGroupSlug: string;
  equipment: string | null;
  exerciseType: string | null;
  exercisePosition: number;
  setOrder: number;
  setType: string;
  weightKg: string;
  reps: number;
  rir: number;
  restTimeSeconds: number | null;
  setNote: string | null;
}): WorkoutCsvExportRow {
  return {
    workout_started_at: row.workoutStartedAt.toISOString(),
    workout_ended_at: row.workoutEndedAt?.toISOString() ?? "",
    workout_type: row.workoutType ?? "",
    workout_title: row.workoutTitle ?? "",
    workout_notes: row.workoutNotes ?? "",
    exercise_name: row.exerciseName,
    primary_muscle_group_slug: row.primaryMuscleGroupSlug,
    equipment: row.equipment ?? "",
    exercise_type: row.exerciseType ?? "",
    exercise_position: String(row.exercisePosition),
    set_order: String(row.setOrder),
    set_type: row.setType,
    weight_kg: row.weightKg,
    reps: String(row.reps),
    rir: String(row.rir),
    rest_time_seconds: row.restTimeSeconds === null ? "" : String(row.restTimeSeconds),
    set_note: row.setNote ?? ""
  };
}
