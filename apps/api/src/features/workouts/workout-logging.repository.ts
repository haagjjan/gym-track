import type { Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import {
  addSessionExerciseWrite,
  deleteSessionExerciseWrite,
  reorderSessionExercisesWrite
} from "./workout-logging.exercise-writes.js";
import {
  addSetWrite,
  deleteSetWrite,
  updateSetWrite
} from "./workout-logging.set-writes.js";
import type {
  AddSessionExerciseRequest,
  AddSetRequest,
  ReorderSessionExercisesRequest,
  UpdateSetRequest
} from "./workout-logging.schemas.js";

interface MuscleGroupRecord {
  id: string;
  slug: string;
  name: string;
}

export interface SelectableExerciseRecord {
  id: string;
  name: string;
  primaryMuscleGroup: MuscleGroupRecord;
}

export interface SessionExerciseRecord {
  id: string;
  position: number;
  exercise: SelectableExerciseRecord;
}

export interface SetRecord {
  id: string;
  sessionExerciseId: string;
  setOrder: number;
  setType: "warmup" | "working";
  weightKg: string;
  reps: number;
  rir: number;
  restTimeSeconds: number | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MutationWriteFailure = "idempotency_conflict" | "invalid_order" | "not_found";

export type MutationWriteResult<T> =
  | { ok: true; replayed: boolean; value: T }
  | { ok: false; reason: MutationWriteFailure };

export interface WorkoutLoggingRepository {
  addSessionExercise(input: {
    id: string;
    userId: string;
    workoutId: string;
    values: AddSessionExerciseRequest;
  }): Promise<MutationWriteResult<SessionExerciseRecord>>;
  reorderSessionExercises(
    userId: string,
    workoutId: string,
    input: ReorderSessionExercisesRequest,
    updatedAt: Date
  ): Promise<MutationWriteResult<{ sessionExerciseId: string; position: number }[]>>;
  deleteSessionExercise(
    userId: string,
    workoutId: string,
    sessionExerciseId: string,
    deletedAt: Date
  ): Promise<MutationWriteResult<{ deleted: true }>>;
  addSet(input: {
    id: string;
    userId: string;
    workoutId: string;
    sessionExerciseId: string;
    values: AddSetRequest;
  }): Promise<MutationWriteResult<SetRecord>>;
  updateSet(
    userId: string,
    setId: string,
    input: UpdateSetRequest,
    updatedAt: Date
  ): Promise<SetRecord | null>;
  deleteSet(
    userId: string,
    setId: string,
    deletedAt: Date
  ): Promise<MutationWriteResult<{ deleted: true }>>;
}

export function createWorkoutLoggingRepository(
  db: Kysely<AppDatabase>
): WorkoutLoggingRepository {
  return {
    addSessionExercise: (input) => addSessionExerciseWrite(db, input),
    reorderSessionExercises: (userId, workoutId, input, updatedAt) =>
      reorderSessionExercisesWrite(db, userId, workoutId, input.items, updatedAt),
    deleteSessionExercise: (userId, workoutId, sessionExerciseId, deletedAt) =>
      deleteSessionExerciseWrite(db, userId, workoutId, sessionExerciseId, deletedAt),
    addSet: (input) => addSetWrite(db, input),
    updateSet: (userId, setId, input, updatedAt) =>
      updateSetWrite(db, userId, setId, input, updatedAt),
    deleteSet: (userId, setId, deletedAt) => deleteSetWrite(db, userId, setId, deletedAt)
  };
}
