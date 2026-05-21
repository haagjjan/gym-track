import { sql, type Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type { AddSetRequest, UpdateSetRequest } from "./workout-logging.schemas.js";
import type {
  SelectableExerciseRecord,
  SessionExerciseRecord,
  SetRecord
} from "./workout-logging.repository.js";

export const setSelection = [
  "id",
  "session_exercise_id as sessionExerciseId",
  "set_order as setOrder",
  "set_type as setType",
  "weight_kg as weightKg",
  "reps",
  "rir",
  "rest_time_seconds as restTimeSeconds",
  "note",
  "created_at as createdAt",
  "updated_at as updatedAt"
] as const;

const qualifiedSetSelection = [
  "sets.id as id",
  "sets.session_exercise_id as sessionExerciseId",
  "sets.set_order as setOrder",
  "sets.set_type as setType",
  "sets.weight_kg as weightKg",
  "sets.reps as reps",
  "sets.rir as rir",
  "sets.rest_time_seconds as restTimeSeconds",
  "sets.note as note",
  "sets.created_at as createdAt",
  "sets.updated_at as updatedAt"
] as const;

export async function findSelectableExercise(
  db: Kysely<AppDatabase>,
  exerciseId: string
): Promise<SelectableExerciseRecord | null> {
  const row = await db
    .selectFrom("exercises")
    .innerJoin("muscle_groups", "muscle_groups.id", "exercises.primary_muscle_group_id")
    .select([
      "exercises.id as id",
      "exercises.name as name",
      "muscle_groups.id as muscleGroupId",
      "muscle_groups.slug as muscleGroupSlug",
      "muscle_groups.name as muscleGroupName"
    ])
    .where("exercises.id", "=", exerciseId)
    .where("exercises.deleted_at", "is", null)
    .executeTakeFirst();

  return row
    ? {
        id: row.id,
        name: row.name,
        primaryMuscleGroup: {
          id: row.muscleGroupId,
          slug: row.muscleGroupSlug,
          name: row.muscleGroupName
        }
      }
    : null;
}

export async function findSessionExerciseByIdOrThrow(
  db: Kysely<AppDatabase>,
  sessionExerciseId: string
): Promise<SessionExerciseRecord> {
  const row = await db
    .selectFrom("session_exercises")
    .innerJoin("exercises", "exercises.id", "session_exercises.exercise_id")
    .innerJoin("muscle_groups", "muscle_groups.id", "exercises.primary_muscle_group_id")
    .select([
      "session_exercises.id as id",
      "session_exercises.position as position",
      "exercises.id as exerciseId",
      "exercises.name as exerciseName",
      "muscle_groups.id as muscleGroupId",
      "muscle_groups.slug as muscleGroupSlug",
      "muscle_groups.name as muscleGroupName"
    ])
    .where("session_exercises.id", "=", sessionExerciseId)
    .executeTakeFirstOrThrow();

  return {
    id: row.id,
    position: row.position,
    exercise: {
      id: row.exerciseId,
      name: row.exerciseName,
      primaryMuscleGroup: {
        id: row.muscleGroupId,
        slug: row.muscleGroupSlug,
        name: row.muscleGroupName
      }
    }
  };
}

export async function findSetByUser(
  db: Kysely<AppDatabase>,
  userId: string,
  setId: string
) {
  return db
    .selectFrom("sets")
    .innerJoin("session_exercises", "session_exercises.id", "sets.session_exercise_id")
    .innerJoin("workout_sessions", "workout_sessions.id", "session_exercises.workout_session_id")
    .select(qualifiedSetSelection)
    .where("sets.id", "=", setId)
    .where("sets.deleted_at", "is", null)
    .where("session_exercises.deleted_at", "is", null)
    .where("workout_sessions.deleted_at", "is", null)
    .where("workout_sessions.user_id", "=", userId)
    .executeTakeFirst();
}

export async function shiftExercisePositions(
  db: Kysely<AppDatabase>,
  workoutId: string,
  fromPosition: number
): Promise<void> {
  await db
    .updateTable("session_exercises")
    .set({ position: sql<number>`position + 10000` })
    .where("workout_session_id", "=", workoutId)
    .where("deleted_at", "is", null)
    .where("position", ">=", fromPosition)
    .execute();
  await db
    .updateTable("session_exercises")
    .set({ position: sql<number>`position - 9999` })
    .where("workout_session_id", "=", workoutId)
    .where("deleted_at", "is", null)
    .where("position", ">=", 10000)
    .execute();
}

export async function compactExercisePositions(
  db: Kysely<AppDatabase>,
  workoutId: string,
  updatedAt: Date
): Promise<void> {
  const rows = await db
    .selectFrom("session_exercises")
    .select("id")
    .where("workout_session_id", "=", workoutId)
    .where("deleted_at", "is", null)
    .orderBy("position", "asc")
    .execute();

  for (const [index, row] of rows.entries()) {
    await db
      .updateTable("session_exercises")
      .set({ position: index + 1, updated_at: updatedAt })
      .where("id", "=", row.id)
      .execute();
  }
}

export async function compactSetOrder(
  db: Kysely<AppDatabase>,
  sessionExerciseId: string,
  updatedAt: Date
): Promise<void> {
  const rows = await db
    .selectFrom("sets")
    .select("id")
    .where("session_exercise_id", "=", sessionExerciseId)
    .where("deleted_at", "is", null)
    .orderBy("set_order", "asc")
    .execute();

  for (const [index, row] of rows.entries()) {
    await db
      .updateTable("sets")
      .set({ set_order: index + 1, updated_at: updatedAt })
      .where("id", "=", row.id)
      .execute();
  }
}

export async function countActiveRows(
  db: Kysely<AppDatabase>,
  table: "session_exercises" | "sets",
  column: "session_exercise_id" | "workout_session_id",
  id: string
): Promise<number> {
  const row = await db
    .selectFrom(table)
    .select((eb) => eb.fn.countAll<string>().as("total"))
    .where(column, "=", id)
    .where("deleted_at", "is", null)
    .executeTakeFirstOrThrow();

  return Number(row.total);
}

export function toSetInsert(input: {
  id: string;
  sessionExerciseId: string;
  setOrder: number;
  values: AddSetRequest;
}) {
  return {
    id: input.id,
    session_exercise_id: input.sessionExerciseId,
    set_order: input.setOrder,
    set_type: input.values.setType,
    weight_kg: input.values.weightKg,
    reps: input.values.reps,
    rir: input.values.rir,
    rest_time_seconds: input.values.restTimeSeconds ?? null,
    note: input.values.note ?? null
  };
}

export function toSetUpdate(input: UpdateSetRequest, updatedAt: Date) {
  return {
    ...(input.setType === undefined ? {} : { set_type: input.setType }),
    ...(input.weightKg === undefined ? {} : { weight_kg: input.weightKg }),
    ...(input.reps === undefined ? {} : { reps: input.reps }),
    ...(input.rir === undefined ? {} : { rir: input.rir }),
    ...(input.restTimeSeconds === undefined ? {} : { rest_time_seconds: input.restTimeSeconds }),
    ...(input.note === undefined ? {} : { note: input.note }),
    updated_at: updatedAt
  };
}

export function toSetRecord(row: {
  id: string;
  sessionExerciseId: string;
  setOrder: number;
  setType: string;
  weightKg: string;
  reps: number;
  rir: number;
  restTimeSeconds: number | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SetRecord {
  return {
    id: row.id,
    sessionExerciseId: row.sessionExerciseId,
    setOrder: row.setOrder,
    setType: row.setType === "warmup" ? "warmup" : "working",
    weightKg: row.weightKg,
    reps: row.reps,
    rir: row.rir,
    restTimeSeconds: row.restTimeSeconds,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
