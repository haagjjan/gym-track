import { randomUUID } from "node:crypto";
import type {
  NewWorkoutSession,
  WorkoutDetailRecord,
  WorkoutListFilters,
  WorkoutListRecord,
  WorkoutRepository
} from "./workout.repository.js";
import type {
  CreateWorkoutRequest,
  EndWorkoutRequest,
  ListWorkoutsQuery
} from "./workout.schemas.js";

export interface WorkoutSummary {
  id: string;
  startedAt: string;
  endedAt: string | null;
  isOpen: boolean;
  workoutType: string | null;
  title: string | null;
  notes: string | null;
  totalExercises: number;
  totalSets: number;
}

export interface MuscleGroupShape {
  id: string;
  slug: string;
  name: string;
}

export interface WorkoutSetShape {
  id: string;
  setOrder: number;
  setType: string;
  weightKg: string;
  reps: number;
  rir: number;
  restTimeSeconds: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionExerciseShape {
  id: string;
  position: number;
  exercise: {
    id: string;
    name: string;
    primaryMuscleGroup: MuscleGroupShape;
  };
  sets: WorkoutSetShape[];
}

export interface WorkoutDetail {
  id: string;
  startedAt: string;
  endedAt: string | null;
  isOpen: boolean;
  workoutType: string | null;
  title: string | null;
  notes: string | null;
  exercises: SessionExerciseShape[];
}

export interface WorkoutList {
  items: WorkoutSummary[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export type WorkoutResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      reason:
        | "already_closed"
        | "ended_before_started"
        | "not_found"
        | "open_workout_exists";
    };

export interface WorkoutService {
  createWorkout(userId: string, input: CreateWorkoutRequest): Promise<WorkoutResult<WorkoutDetail>>;
  listWorkouts(userId: string, input: ListWorkoutsQuery): Promise<WorkoutList>;
  getWorkout(userId: string, workoutId: string): Promise<WorkoutResult<WorkoutDetail>>;
  endWorkout(
    userId: string,
    workoutId: string,
    input: EndWorkoutRequest
  ): Promise<WorkoutResult<WorkoutDetail>>;
}

interface WorkoutServiceOptions {
  repository: WorkoutRepository;
  now?: () => Date;
}

export function createWorkoutService(options: WorkoutServiceOptions): WorkoutService {
  const now = options.now ?? (() => new Date());

  return {
    async createWorkout(userId, input) {
      const workout = newWorkoutSession(userId, input, now());
      const result = await options.repository.createWorkout(workout);

      if (result.status === "conflict") {
        return { ok: false, reason: "open_workout_exists" };
      }

      return {
        ok: true,
        value: toWorkoutDetail({ ...result.workout, exercises: [] })
      };
    },
    async listWorkouts(userId, input) {
      const filters: WorkoutListFilters = {
        userId,
        startDate: input.startDate,
        endDate: input.endDate,
        limit: input.limit,
        offset: input.offset
      };
      const result = await options.repository.listWorkouts(filters);

      return {
        items: result.items.map(toWorkoutSummary),
        pagination: {
          limit: input.limit,
          offset: input.offset,
          total: result.total
        }
      };
    },
    async getWorkout(userId, workoutId) {
      const workout = await options.repository.findWorkoutDetail(userId, workoutId);

      if (!workout) {
        return { ok: false, reason: "not_found" };
      }

      return {
        ok: true,
        value: toWorkoutDetail(workout)
      };
    },
    async endWorkout(userId, workoutId, input) {
      const workout = await options.repository.findWorkoutSession(userId, workoutId);

      if (!workout) {
        return { ok: false, reason: "not_found" };
      }

      if (workout.endedAt) {
        return { ok: false, reason: "already_closed" };
      }

      const updatedAt = now();
      const endedAt = input.endedAt ?? updatedAt;

      if (endedAt < workout.startedAt) {
        return { ok: false, reason: "ended_before_started" };
      }

      const updated = await options.repository.endWorkout(userId, workoutId, endedAt, updatedAt);

      if (!updated) {
        return { ok: false, reason: "not_found" };
      }

      return {
        ok: true,
        value: toWorkoutDetail(updated)
      };
    }
  };
}

function newWorkoutSession(
  userId: string,
  input: CreateWorkoutRequest,
  defaultStartedAt: Date
): NewWorkoutSession {
  return {
    id: randomUUID(),
    userId,
    startedAt: input.startedAt ?? defaultStartedAt,
    workoutType: input.workoutType ?? null,
    title: input.title ?? null,
    notes: input.notes ?? null
  };
}

function toWorkoutSummary(record: WorkoutListRecord): WorkoutSummary {
  return {
    id: record.id,
    startedAt: record.startedAt.toISOString(),
    endedAt: record.endedAt?.toISOString() ?? null,
    isOpen: record.endedAt === null,
    workoutType: record.workoutType,
    title: record.title,
    notes: record.notes,
    totalExercises: record.totalExercises,
    totalSets: record.totalSets
  };
}

function toWorkoutDetail(record: WorkoutDetailRecord): WorkoutDetail {
  return {
    id: record.id,
    startedAt: record.startedAt.toISOString(),
    endedAt: record.endedAt?.toISOString() ?? null,
    isOpen: record.endedAt === null,
    workoutType: record.workoutType,
    title: record.title,
    notes: record.notes,
    exercises: record.exercises.map((item) => ({
      id: item.id,
      position: item.position,
      exercise: {
        id: item.exercise.id,
        name: item.exercise.name,
        primaryMuscleGroup: item.exercise.primaryMuscleGroup
      },
      sets: item.sets.map(toWorkoutSet)
    }))
  };
}

function toWorkoutSet(record: WorkoutDetailRecord["exercises"][number]["sets"][number]) {
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
