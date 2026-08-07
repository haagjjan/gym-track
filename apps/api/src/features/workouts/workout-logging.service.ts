import { randomUUID } from "node:crypto";
import type {
  MutationWriteFailure,
  SessionExerciseRecord,
  SetRecord,
  WorkoutLoggingRepository
} from "./workout-logging.repository.js";
import type {
  AddSessionExerciseRequest,
  AddSetRequest,
  ReorderSessionExercisesRequest,
  UpdateSetRequest
} from "./workout-logging.schemas.js";

export interface SessionExerciseShape {
  id: string;
  position: number;
  exercise: SessionExerciseRecord["exercise"];
  sets: [];
}

export interface SetShape {
  id: string;
  setOrder: number;
  setType: "warmup" | "working";
  weightKg: string;
  reps: number;
  rir: number;
  restTimeSeconds: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LoggingResult<T> =
  | { ok: true; replayed: boolean; value: T }
  | { ok: false; reason: MutationWriteFailure };

export interface WorkoutLoggingService {
  addSessionExercise(
    userId: string,
    workoutId: string,
    input: AddSessionExerciseRequest
  ): Promise<LoggingResult<SessionExerciseShape>>;
  reorderSessionExercises(
    userId: string,
    workoutId: string,
    input: ReorderSessionExercisesRequest
  ): Promise<LoggingResult<{ sessionExerciseId: string; position: number }[]>>;
  deleteSessionExercise(
    userId: string,
    workoutId: string,
    sessionExerciseId: string
  ): Promise<LoggingResult<{ deleted: true }>>;
  addSet(
    userId: string,
    workoutId: string,
    sessionExerciseId: string,
    input: AddSetRequest
  ): Promise<LoggingResult<SetShape>>;
  updateSet(
    userId: string,
    setId: string,
    input: UpdateSetRequest
  ): Promise<LoggingResult<SetShape>>;
  deleteSet(userId: string, setId: string): Promise<LoggingResult<{ deleted: true }>>;
}

interface WorkoutLoggingServiceOptions {
  repository: WorkoutLoggingRepository;
  now?: () => Date;
}

export function createWorkoutLoggingService(
  options: WorkoutLoggingServiceOptions
): WorkoutLoggingService {
  const now = options.now ?? (() => new Date());

  return {
    async addSessionExercise(userId, workoutId, input) {
      const result = await options.repository.addSessionExercise({
        id: randomUUID(),
        userId,
        workoutId,
        values: input
      });

      return result.ok
        ? { ok: true, replayed: result.replayed, value: toSessionExerciseShape(result.value) }
        : result;
    },
    reorderSessionExercises(userId, workoutId, input) {
      return options.repository.reorderSessionExercises(userId, workoutId, input, now());
    },
    deleteSessionExercise(userId, workoutId, sessionExerciseId) {
      return options.repository.deleteSessionExercise(
        userId,
        workoutId,
        sessionExerciseId,
        now()
      );
    },
    async addSet(userId, workoutId, sessionExerciseId, input) {
      const result = await options.repository.addSet({
        id: randomUUID(),
        userId,
        workoutId,
        sessionExerciseId,
        values: input
      });

      return result.ok
        ? { ok: true, replayed: result.replayed, value: toSetShape(result.value) }
        : result;
    },
    async updateSet(userId, setId, input) {
      const set = await options.repository.updateSet(userId, setId, input, now());

      return set
        ? { ok: true, replayed: false, value: toSetShape(set) }
        : { ok: false, reason: "not_found" };
    },
    deleteSet(userId, setId) {
      return options.repository.deleteSet(userId, setId, now());
    }
  };
}

function toSessionExerciseShape(record: SessionExerciseRecord): SessionExerciseShape {
  return {
    id: record.id,
    position: record.position,
    exercise: record.exercise,
    sets: []
  };
}

function toSetShape(record: SetRecord): SetShape {
  return {
    id: record.id,
    setOrder: record.setOrder,
    setType: record.setType,
    weightKg: record.weightKg,
    reps: record.reps,
    rir: record.rir,
    restTimeSeconds: record.restTimeSeconds,
    note: record.note,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}
