import { randomUUID } from "node:crypto";
import type {
  SelectableExerciseRecord,
  SessionExerciseRecord,
  SetRecord,
  WorkoutLoggingRepository
} from "./workout-logging.repository.js";
import type { AddSessionExerciseRequest, AddSetRequest, ReorderSessionExercisesRequest, UpdateSetRequest } from "./workout-logging.schemas.js";

export interface SessionExerciseShape {
  id: string;
  position: number;
  exercise: SelectableExerciseRecord;
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
  | { ok: true; value: T }
  | { ok: false; reason: "invalid_order" | "not_found" };

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
  updateSet(userId: string, setId: string, input: UpdateSetRequest): Promise<LoggingResult<SetShape>>;
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
      const workoutExists = await options.repository.workoutExists(userId, workoutId);
      const exercise = await options.repository.findSelectableExercise(input.exerciseId);

      if (!workoutExists || !exercise) {
        return { ok: false, reason: "not_found" };
      }

      const count = await options.repository.countSessionExercises(workoutId);
      const position = input.position ?? count + 1;

      if (position > count + 1) {
        return { ok: false, reason: "invalid_order" };
      }

      const sessionExercise = await options.repository.addSessionExercise({
        id: randomUUID(),
        workoutId,
        exerciseId: input.exerciseId,
        position
      });

      return {
        ok: true,
        value: toSessionExerciseShape(sessionExercise)
      };
    },
    async reorderSessionExercises(userId, workoutId, input) {
      const workoutExists = await options.repository.workoutExists(userId, workoutId);

      if (!workoutExists) {
        return { ok: false, reason: "not_found" };
      }

      const currentIds = await options.repository.listSessionExerciseIds(workoutId);

      const reorderError = getReorderError(currentIds, input.items);

      if (reorderError) {
        return { ok: false, reason: reorderError };
      }

      const orderedItems = input.items
        .map((item) => ({
          sessionExerciseId: item.sessionExerciseId,
          position: item.position
        }))
        .sort((left, right) => left.position - right.position);

      await options.repository.reorderSessionExercises(workoutId, orderedItems, now());

      return {
        ok: true,
        value: orderedItems
      };
    },
    async deleteSessionExercise(userId, workoutId, sessionExerciseId) {
      const exists = await options.repository.sessionExerciseExists(
        userId,
        workoutId,
        sessionExerciseId
      );

      if (!exists) {
        return { ok: false, reason: "not_found" };
      }

      const deleted = await options.repository.deleteSessionExercise(
        workoutId,
        sessionExerciseId,
        now()
      );

      return deleted
        ? { ok: true, value: { deleted: true } }
        : { ok: false, reason: "not_found" };
    },
    async addSet(userId, workoutId, sessionExerciseId, input) {
      const exists = await options.repository.sessionExerciseExists(
        userId,
        workoutId,
        sessionExerciseId
      );

      if (!exists) {
        return { ok: false, reason: "not_found" };
      }

      const setOrder = (await options.repository.countSets(sessionExerciseId)) + 1;
      const set = await options.repository.addSet({
        id: randomUUID(),
        sessionExerciseId,
        setOrder,
        values: input
      });

      return { ok: true, value: toSetShape(set) };
    },
    async updateSet(userId, setId, input) {
      const existingSet = await options.repository.setExists(userId, setId);

      if (!existingSet) {
        return { ok: false, reason: "not_found" };
      }

      const set = await options.repository.updateSet(setId, input, now());

      return { ok: true, value: toSetShape(set) };
    },
    async deleteSet(userId, setId) {
      const existingSet = await options.repository.setExists(userId, setId);

      if (!existingSet) {
        return { ok: false, reason: "not_found" };
      }

      const deleted = await options.repository.deleteSet(setId, now());

      return deleted
        ? { ok: true, value: { deleted: true } }
        : { ok: false, reason: "not_found" };
    }
  };
}

function getReorderError(
  currentIds: string[],
  items: { sessionExerciseId: string; position: number }[]
): "invalid_order" | "not_found" | null {
  if (items.length !== currentIds.length) {
    return "invalid_order";
  }

  const expectedIds = new Set(currentIds);
  const seenIds = new Set<string>();
  const seenPositions = new Set<number>();

  for (const item of items) {
    if (!expectedIds.has(item.sessionExerciseId)) {
      return "not_found";
    }

    seenIds.add(item.sessionExerciseId);
    seenPositions.add(item.position);
  }

  if (seenIds.size !== expectedIds.size || seenPositions.size !== currentIds.length) {
    return "invalid_order";
  }

  return [...seenPositions].every((position) => position >= 1 && position <= currentIds.length)
    ? null
    : "invalid_order";
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
