import { randomUUID } from "node:crypto";
import type {
  NewWorkoutSession,
  WorkoutListFilters,
  WorkoutRepository
} from "./workout.repository.js";
import {
  toWorkoutDetail,
  toWorkoutSummary,
  type WorkoutDetail,
  type WorkoutList
} from "./workout-shapes.js";
export type { WorkoutDetail, WorkoutList } from "./workout-shapes.js";
import type {
  CreateWorkoutRequest,
  EndWorkoutRequest,
  ListWorkoutsQuery,
  UpdateWorkoutRequest
} from "./workout.schemas.js";

export interface DeletedWorkout {
  workoutId: string;
  wasOpen: boolean;
}

export type WorkoutResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      reason:
        | "already_closed"
        | "ended_before_started"
        | "not_found"
        | "open_workout_exists"
        | "workout_still_open";
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
  updateWorkout(
    userId: string,
    workoutId: string,
    input: UpdateWorkoutRequest
  ): Promise<WorkoutResult<WorkoutDetail>>;
  deleteWorkout(userId: string, workoutId: string): Promise<WorkoutResult<DeletedWorkout>>;
}

interface WorkoutServiceOptions {
  repository: WorkoutRepository;
  now?: () => Date;
}

interface WorkoutServiceContext {
  repository: WorkoutRepository;
  now: () => Date;
}

export function createWorkoutService(options: WorkoutServiceOptions): WorkoutService {
  const context = {
    repository: options.repository,
    now: options.now ?? (() => new Date())
  };

  return {
    createWorkout: (userId, input) => createWorkout(context, userId, input),
    listWorkouts: (userId, input) => listWorkouts(context, userId, input),
    getWorkout: (userId, workoutId) => getWorkout(context, userId, workoutId),
    endWorkout: (userId, workoutId, input) =>
      endWorkout(context, userId, workoutId, input),
    updateWorkout: (userId, workoutId, input) =>
      updateWorkout(context, userId, workoutId, input),
    deleteWorkout: (userId, workoutId) => deleteWorkout(context, userId, workoutId)
  };
}

async function createWorkout(
  context: WorkoutServiceContext,
  userId: string,
  input: CreateWorkoutRequest
): Promise<WorkoutResult<WorkoutDetail>> {
  const workout = newWorkoutSession(userId, input, context.now());
  const result = await context.repository.createWorkout(workout);

  return result.status === "conflict"
    ? { ok: false, reason: "open_workout_exists" }
    : { ok: true, value: toWorkoutDetail({ ...result.workout, exercises: [] }) };
}

async function listWorkouts(
  context: WorkoutServiceContext,
  userId: string,
  input: ListWorkoutsQuery
): Promise<WorkoutList> {
  const filters: WorkoutListFilters = {
    userId,
    startDate: input.startDate,
    endDate: input.endDate,
    search: input.search,
    muscleGroupIds: input.muscleGroupIds ?? [],
    equipment: input.equipment,
    exerciseType: input.exerciseType,
    sort: input.sort ?? "newest",
    timeZone: input.timeZone ?? "UTC",
    limit: input.limit,
    offset: input.offset
  };
  const result = await context.repository.listWorkouts(filters);

  return {
    items: result.items.map(toWorkoutSummary),
    allTimeSummary: result.allTimeSummary,
    pagination: { limit: input.limit, offset: input.offset, total: result.total }
  };
}

async function getWorkout(
  context: WorkoutServiceContext,
  userId: string,
  workoutId: string
): Promise<WorkoutResult<WorkoutDetail>> {
  const workout = await context.repository.findWorkoutDetail(userId, workoutId);
  return workout
    ? { ok: true, value: toWorkoutDetail(workout) }
    : { ok: false, reason: "not_found" };
}

async function endWorkout(
  context: WorkoutServiceContext,
  userId: string,
  workoutId: string,
  input: EndWorkoutRequest
): Promise<WorkoutResult<WorkoutDetail>> {
  const workout = await context.repository.findWorkoutSession(userId, workoutId);
  if (!workout) return { ok: false, reason: "not_found" };
  if (workout.endedAt) return { ok: false, reason: "already_closed" };

  const updatedAt = context.now();
  const endedAt = input.endedAt ?? updatedAt;
  if (endedAt < workout.startedAt) return { ok: false, reason: "ended_before_started" };

  const updated = await context.repository.endWorkout(userId, workoutId, endedAt, updatedAt);
  return updated
    ? { ok: true, value: toWorkoutDetail(updated) }
    : { ok: false, reason: "not_found" };
}

async function updateWorkout(
  context: WorkoutServiceContext,
  userId: string,
  workoutId: string,
  input: UpdateWorkoutRequest
): Promise<WorkoutResult<WorkoutDetail>> {
  const workout = await context.repository.findWorkoutSession(userId, workoutId);
  if (!workout) return { ok: false, reason: "not_found" };
  if (input.endedAt !== undefined && workout.endedAt === null) {
    return { ok: false, reason: "workout_still_open" };
  }

  const nextStartedAt = input.startedAt ?? workout.startedAt;
  const nextEndedAt = input.endedAt ?? workout.endedAt;
  if (nextEndedAt && nextEndedAt < nextStartedAt) {
    return { ok: false, reason: "ended_before_started" };
  }

  const updated = await context.repository.updateWorkout(
    userId,
    workoutId,
    {
      ...(input.startedAt !== undefined ? { startedAt: input.startedAt } : {}),
      ...(input.endedAt !== undefined ? { endedAt: input.endedAt } : {}),
      ...(input.title !== undefined ? { title: input.title } : {})
    },
    context.now()
  );
  return updated
    ? { ok: true, value: toWorkoutDetail(updated) }
    : { ok: false, reason: "not_found" };
}

async function deleteWorkout(
  context: WorkoutServiceContext,
  userId: string,
  workoutId: string
): Promise<WorkoutResult<DeletedWorkout>> {
  const deleted = await context.repository.deleteWorkout(userId, workoutId, context.now());
  return deleted
    ? { ok: true, value: { workoutId: deleted.id, wasOpen: deleted.endedAt === null } }
    : { ok: false, reason: "not_found" };
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
