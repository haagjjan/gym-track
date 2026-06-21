import type { Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";

export interface NewWorkoutSession {
  id: string;
  userId: string;
  startedAt: Date;
  workoutType: string | null;
  title: string | null;
  notes: string | null;
}

export interface WorkoutSessionRecord {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  workoutType: string | null;
  title: string | null;
  notes: string | null;
}

export interface WorkoutListRecord extends WorkoutSessionRecord {
  totalExercises: number;
  totalSets: number;
}

interface WorkoutSetRecord {
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
}

interface WorkoutSessionExerciseRecord {
  id: string;
  position: number;
  exercise: {
    id: string;
    name: string;
    primaryMuscleGroup: {
      id: string;
      slug: string;
      name: string;
    };
  };
  sets: WorkoutSetRecord[];
}

export interface WorkoutDetailRecord extends WorkoutSessionRecord {
  exercises: WorkoutSessionExerciseRecord[];
}

export interface WorkoutListFilters {
  userId: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  limit: number;
  offset: number;
}

export type CreateWorkoutResult =
  | { status: "created"; workout: WorkoutSessionRecord }
  | { status: "conflict" };

export interface WorkoutListResult {
  items: WorkoutListRecord[];
  total: number;
}

export interface WorkoutRepository {
  createWorkout(workout: NewWorkoutSession): Promise<CreateWorkoutResult>;
  listWorkouts(filters: WorkoutListFilters): Promise<WorkoutListResult>;
  findWorkoutSession(userId: string, workoutId: string): Promise<WorkoutSessionRecord | null>;
  findWorkoutDetail(userId: string, workoutId: string): Promise<WorkoutDetailRecord | null>;
  endWorkout(
    userId: string,
    workoutId: string,
    endedAt: Date,
    updatedAt: Date
  ): Promise<WorkoutDetailRecord | null>;
}

export function createWorkoutRepository(db: Kysely<AppDatabase>): WorkoutRepository {
  return {
    async createWorkout(workout) {
      try {
        const inserted = await db
          .insertInto("workout_sessions")
          .values({
            id: workout.id,
            user_id: workout.userId,
            started_at: workout.startedAt,
            workout_type: workout.workoutType,
            title: workout.title,
            notes: workout.notes
          })
          .returning(workoutSessionSelection)
          .executeTakeFirstOrThrow();

        return {
          status: "created",
          workout: toWorkoutSessionRecord(inserted)
        };
      } catch (error) {
        if (isUniqueViolation(error)) {
          return { status: "conflict" };
        }

        throw error;
      }
    },
    async listWorkouts(filters) {
      const items = await listWorkoutRows(db, filters);
      const total = await countWorkoutRows(db, filters);

      return {
        items,
        total
      };
    },
    async findWorkoutSession(userId, workoutId) {
      const row = await db
        .selectFrom("workout_sessions")
        .select(workoutSessionSelection)
        .where("id", "=", workoutId)
        .where("user_id", "=", userId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

      return row ? toWorkoutSessionRecord(row) : null;
    },
    async findWorkoutDetail(userId, workoutId) {
      return findWorkoutDetail(db, userId, workoutId);
    },
    async endWorkout(userId, workoutId, endedAt, updatedAt) {
      const updated = await db
        .updateTable("workout_sessions")
        .set({
          ended_at: endedAt,
          updated_at: updatedAt
        })
        .where("id", "=", workoutId)
        .where("user_id", "=", userId)
        .where("deleted_at", "is", null)
        .where("ended_at", "is", null)
        .returning(workoutSessionSelection)
        .executeTakeFirst();

      if (!updated) {
        return null;
      }

      return findWorkoutDetail(db, userId, updated.id);
    }
  };
}

const workoutSessionSelection = [
  "id",
  "user_id as userId",
  "started_at as startedAt",
  "ended_at as endedAt",
  "workout_type as workoutType",
  "title",
  "notes"
] as const;

async function listWorkoutRows(
  db: Kysely<AppDatabase>,
  filters: WorkoutListFilters
): Promise<WorkoutListRecord[]> {
  const rows = await db
    .selectFrom("workout_sessions")
    .select(workoutSessionSelection)
    .select((eb) => [
      eb
        .selectFrom("session_exercises")
        .select((subquery) => subquery.fn.countAll<string>().as("count"))
        .whereRef("session_exercises.workout_session_id", "=", "workout_sessions.id")
        .where("session_exercises.deleted_at", "is", null)
        .as("totalExercises"),
      eb
        .selectFrom("sets")
        .innerJoin("session_exercises", "session_exercises.id", "sets.session_exercise_id")
        .select((subquery) => subquery.fn.countAll<string>().as("count"))
        .whereRef("session_exercises.workout_session_id", "=", "workout_sessions.id")
        .where("session_exercises.deleted_at", "is", null)
        .where("sets.deleted_at", "is", null)
        .as("totalSets")
    ])
    .where("user_id", "=", filters.userId)
    .where("deleted_at", "is", null)
    .$if(filters.startDate !== undefined, (query) =>
      query.where("started_at", ">=", filters.startDate as Date)
    )
    .$if(filters.endDate !== undefined, (query) =>
      query.where("started_at", "<=", filters.endDate as Date)
    )
    .orderBy("started_at", "desc")
    .limit(filters.limit)
    .offset(filters.offset)
    .execute();

  return rows.map((row) => ({
    ...toWorkoutSessionRecord(row),
    totalExercises: Number(row.totalExercises),
    totalSets: Number(row.totalSets)
  }));
}

async function countWorkoutRows(
  db: Kysely<AppDatabase>,
  filters: WorkoutListFilters
): Promise<number> {
  const row = await db
    .selectFrom("workout_sessions")
    .select((eb) => eb.fn.countAll<string>().as("total"))
    .where("user_id", "=", filters.userId)
    .where("deleted_at", "is", null)
    .$if(filters.startDate !== undefined, (query) =>
      query.where("started_at", ">=", filters.startDate as Date)
    )
    .$if(filters.endDate !== undefined, (query) =>
      query.where("started_at", "<=", filters.endDate as Date)
    )
    .executeTakeFirstOrThrow();

  return Number(row.total);
}

async function findWorkoutDetail(
  db: Kysely<AppDatabase>,
  userId: string,
  workoutId: string
): Promise<WorkoutDetailRecord | null> {
  const workout = await db
    .selectFrom("workout_sessions")
    .select(workoutSessionSelection)
    .where("id", "=", workoutId)
    .where("user_id", "=", userId)
    .where("deleted_at", "is", null)
    .executeTakeFirst();

  if (!workout) {
    return null;
  }

  const exercises = await findSessionExercises(db, workout.id);
  const sets = await findSets(db, exercises.map((exercise) => exercise.id));
  const setsByExerciseId = groupSetsBySessionExerciseId(sets);

  return {
    ...toWorkoutSessionRecord(workout),
    exercises: exercises.map((exercise) => ({
      ...exercise,
      sets: setsByExerciseId.get(exercise.id) ?? []
    }))
  };
}

async function findSessionExercises(
  db: Kysely<AppDatabase>,
  workoutId: string
): Promise<Omit<WorkoutSessionExerciseRecord, "sets">[]> {
  const rows = await db
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
    .where("session_exercises.workout_session_id", "=", workoutId)
    .where("session_exercises.deleted_at", "is", null)
    .orderBy("session_exercises.position", "asc")
    .execute();

  return rows.map((row) => ({
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
  }));
}

async function findSets(
  db: Kysely<AppDatabase>,
  sessionExerciseIds: string[]
): Promise<WorkoutSetRecord[]> {
  if (sessionExerciseIds.length === 0) {
    return [];
  }

  const rows = await db
    .selectFrom("sets")
    .select([
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
    ])
    .where("session_exercise_id", "in", sessionExerciseIds)
    .where("deleted_at", "is", null)
    .orderBy("set_order", "asc")
    .execute();

  return rows;
}

function groupSetsBySessionExerciseId(
  sets: WorkoutSetRecord[]
): Map<string, WorkoutSetRecord[]> {
  const grouped = new Map<string, WorkoutSetRecord[]>();

  for (const set of sets) {
    grouped.set(set.sessionExerciseId, [...(grouped.get(set.sessionExerciseId) ?? []), set]);
  }

  return grouped;
}

function toWorkoutSessionRecord(row: {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  workoutType: string | null;
  title: string | null;
  notes: string | null;
}): WorkoutSessionRecord {
  return {
    id: row.id,
    userId: row.userId,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    workoutType: row.workoutType,
    title: row.title,
    notes: row.notes
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
