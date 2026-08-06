import type { Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type { WorkoutSessionRecord } from "./workout.repository.js";
import { toWorkoutSessionRecord, workoutSessionSelection } from "./workout-records.js";
import {
  findPreviousPerformances,
  type PreviousPerformanceRecord
} from "./workout-previous-performance.repository.js";

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

interface WorkoutMuscleGroupRecord {
  id: string;
  slug: string;
  name: string;
}

interface WorkoutMuscleRow extends WorkoutMuscleGroupRecord {
  exerciseId: string;
  role: "PRIMARY" | "SECONDARY";
}

export interface WorkoutSessionExerciseRecord {
  id: string;
  position: number;
  exercise: {
    id: string;
    name: string;
    primaryMuscleGroup: WorkoutMuscleGroupRecord;
    primaryMuscleGroups: WorkoutMuscleGroupRecord[];
    secondaryMuscleGroups: WorkoutMuscleGroupRecord[];
    muscleGroups: Array<WorkoutMuscleGroupRecord & { role: "PRIMARY" | "SECONDARY" }>;
  };
  sets: WorkoutSetRecord[];
  previousPerformance: PreviousPerformanceRecord | null;
}

export interface WorkoutDetailRecord extends WorkoutSessionRecord {
  exercises: WorkoutSessionExerciseRecord[];
}

export async function findWorkoutDetail(
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
  if (!workout) return null;

  const exercises = await findSessionExercises(db, workout.id);
  const sets = await findSets(db, exercises.map((exercise) => exercise.id));
  const setsByExerciseId = groupSetsBySessionExerciseId(sets);
  const previousPerformances = await findPreviousPerformances(db, {
    userId,
    currentWorkoutId: workout.id,
    currentWorkoutStartedAt: workout.startedAt,
    exerciseIds: exercises.map((exercise) => exercise.exercise.id)
  });
  return {
    ...toWorkoutSessionRecord(workout),
    exercises: exercises.map((exercise) => ({
      ...exercise,
      sets: setsByExerciseId.get(exercise.id) ?? [],
      previousPerformance: previousPerformances.get(exercise.exercise.id) ?? null
    }))
  };
}

async function findSessionExercises(
  db: Kysely<AppDatabase>,
  workoutId: string
): Promise<Omit<WorkoutSessionExerciseRecord, "sets" | "previousPerformance">[]> {
  const rows = await db
    .selectFrom("session_exercises")
    .innerJoin("exercises", "exercises.id", "session_exercises.exercise_id")
    .select([
      "session_exercises.id as id",
      "session_exercises.position as position",
      "exercises.id as exerciseId",
      "exercises.name as exerciseName"
    ])
    .where("session_exercises.workout_session_id", "=", workoutId)
    .where("session_exercises.deleted_at", "is", null)
    .orderBy("session_exercises.position", "asc")
    .execute();
  const muscleRows = await findMuscleRows(db, [...new Set(rows.map((row) => row.exerciseId))]);

  return rows.map((row) => {
    const muscleGroups = muscleRows
      .filter((muscle) => muscle.exerciseId === row.exerciseId)
      .sort((left, right) => left.role === right.role ? 0 : left.role === "PRIMARY" ? -1 : 1)
      .map((muscle) => ({
        id: muscle.id,
        slug: muscle.slug,
        name: muscle.name,
        role: muscle.role
      }));
    const primaryMuscleGroups = muscleGroups
      .filter((muscle) => muscle.role === "PRIMARY")
      .map(withoutRole);
    const primaryMuscleGroup = primaryMuscleGroups[0];
    if (!primaryMuscleGroup) {
      throw new Error(`Exercise ${row.exerciseId} has no primary muscle assignment.`);
    }

    return {
      id: row.id,
      position: row.position,
      exercise: {
        id: row.exerciseId,
        name: row.exerciseName,
        primaryMuscleGroup,
        primaryMuscleGroups,
        secondaryMuscleGroups: muscleGroups
          .filter((muscle) => muscle.role === "SECONDARY")
          .map(withoutRole),
        muscleGroups
      }
    };
  });
}

async function findMuscleRows(
  db: Kysely<AppDatabase>,
  exerciseIds: string[]
): Promise<WorkoutMuscleRow[]> {
  if (exerciseIds.length === 0) return [];
  return db
    .selectFrom("exercise_muscle_groups")
    .innerJoin("muscle_groups", "muscle_groups.id", "exercise_muscle_groups.muscle_group_id")
    .select([
      "exercise_muscle_groups.exercise_id as exerciseId",
      "exercise_muscle_groups.role as role",
      "muscle_groups.id as id",
      "muscle_groups.slug as slug",
      "muscle_groups.name as name"
    ])
    .where("exercise_muscle_groups.exercise_id", "in", exerciseIds)
    .orderBy("muscle_groups.sort_order", "asc")
    .execute();
}

function withoutRole(
  muscle: WorkoutMuscleGroupRecord & { role: "PRIMARY" | "SECONDARY" }
): WorkoutMuscleGroupRecord {
  return { id: muscle.id, slug: muscle.slug, name: muscle.name };
}

async function findSets(
  db: Kysely<AppDatabase>,
  sessionExerciseIds: string[]
): Promise<WorkoutSetRecord[]> {
  if (sessionExerciseIds.length === 0) return [];
  return db
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
