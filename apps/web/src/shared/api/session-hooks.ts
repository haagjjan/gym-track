"use client";

import { useMutation, useQueryClient, type QueryClient, type UseMutationResult } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { useExerciseMutations } from "./catalog-hooks";
import { normalizeExercise } from "./normalize-exercise";
import { queryKeys } from "./query-keys";
import { readCatalog } from "../offline/exercise-catalog";
import { overlayWorkout } from "../offline/outbox-overlay";
import { enqueueOp, isLocalId, newLocalId, readOutbox, resolveId } from "../offline/outbox-store";
import { runOrQueue } from "../offline/use-outbox";
import type {
  CreateExerciseInput,
  Exercise,
  SessionExercise,
  SetInput,
  WorkoutDetail,
  WorkoutSet
} from "./types";

interface SessionMutations {
  addExercise: UseMutationResult<
    SessionExercise,
    Error,
    { clientMutationId: string; exerciseId: string; exercise?: Exercise }
  >;
  removeExercise: UseMutationResult<unknown, Error, { sessionExerciseId: string }>;
  reorderExercises: UseMutationResult<unknown, Error, { items: { sessionExerciseId: string; position: number }[] }>;
  addSet: UseMutationResult<
    WorkoutSet,
    Error,
    { clientMutationId: string; sessionExerciseId: string; input: SetInput }
  >;
  updateSet: UseMutationResult<WorkoutSet, Error, { setId: string; input: Partial<SetInput> }>;
  deleteSet: UseMutationResult<unknown, Error, { setId: string }>;
  createExercise: UseMutationResult<Exercise, Error, CreateExerciseInput>;
}

/** The server ID of something that may have been created on the phone. */
function serverId(id: string): string {
  return resolveId(id, readOutbox().idMap);
}

export function useSessionMutations({ workoutId }: { userId?: string; workoutId: string }): SessionMutations {
  const queryClient = useQueryClient();
  const exerciseMutations = useExerciseMutations();
  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.workout(serverId(workoutId)) });
    void queryClient.invalidateQueries({ queryKey: ["workouts"] });
  };
  /** The workout as the logger shows it, with queued changes applied. */
  const shown = (userId: string): WorkoutDetail | null =>
    overlayWorkout(queryClient.getQueryData<WorkoutDetail>(queryKeys.workout(serverId(workoutId))) ?? null, readOutbox(), userId, workoutId);
  const shownSet = (userId: string, setId: string): WorkoutSet => {
    const set = shown(userId)?.exercises.flatMap((exercise) => exercise.sets).find((item) => item.id === setId || item.id === serverId(setId));
    if (!set) throw new Error("This set is no longer in the workout.");
    return set;
  };
  const addExercise = useMutation({
    mutationFn: ({ clientMutationId, exerciseId, exercise }: { clientMutationId: string; exerciseId: string; exercise?: Exercise }) => runOrQueue(
      [workoutId],
      async () => {
        const payload = await apiFetch<{ replayed: boolean; sessionExercise: SessionExercise }>(`/api/workouts/${serverId(workoutId)}/exercises`, { method: "POST", body: { clientMutationId, exerciseId } });
        return normalizeAddedSessionExercise(payload.sessionExercise);
      },
      (userId) => {
        const known = exercise ?? findCachedExercise(queryClient, exerciseId);
        if (!known) throw new Error("Couldn't add this exercise without a connection.");
        const sessionExerciseId = newLocalId();
        enqueueOp({ kind: "addExercise", userId, workoutId, sessionExerciseId, exercise: known });
        const added = shown(userId)?.exercises.find((item) => item.id === sessionExerciseId);
        if (!added) throw new Error("Couldn't add this exercise.");
        return added;
      }
    ),
    onSuccess: (sessionExercise) => {
      // A queued exercise is shown from the queue, not written into the server copy.
      if (isLocalId(sessionExercise.id)) return;
      queryClient.setQueryData<WorkoutDetail>(queryKeys.workout(serverId(workoutId)), (current) => {
        if (!current || current.exercises.some((exercise) => exercise.id === sessionExercise.id)) return current;
        return {
          ...current,
          exercises: [...current.exercises, sessionExercise].sort((left, right) => left.position - right.position)
        };
      });
    },
    onSettled: refresh
  });
  const removeExercise = useMutation({
    mutationFn: ({ sessionExerciseId }: { sessionExerciseId: string }) => runOrQueue<unknown>(
      [workoutId, sessionExerciseId],
      () => apiFetch(`/api/workouts/${serverId(workoutId)}/exercises/${serverId(sessionExerciseId)}`, { method: "DELETE" }),
      (userId) => enqueueOp({ kind: "removeExercise", userId, workoutId, sessionExerciseId })
    ),
    onSettled: refresh
  });
  const reorderExercises = useMutation({
    mutationFn: ({ items }: { items: { sessionExerciseId: string; position: number }[] }) => runOrQueue<unknown>(
      [workoutId, ...items.map((item) => item.sessionExerciseId)],
      () => apiFetch(`/api/workouts/${serverId(workoutId)}/exercises/reorder`, { method: "PATCH", body: { items: items.map((item) => ({ ...item, sessionExerciseId: serverId(item.sessionExerciseId) })) } }),
      (userId) => enqueueOp({ kind: "reorderExercises", userId, workoutId, order: [...items].sort((left, right) => left.position - right.position).map((item) => item.sessionExerciseId) })
    ),
    onMutate: async ({ items }) => {
      const key = queryKeys.workout(serverId(workoutId));
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<WorkoutDetail>(key);
      const positions = new Map(items.map((item) => [serverId(item.sessionExerciseId), item.position]));
      if (previous) {
        queryClient.setQueryData<WorkoutDetail>(key, {
          ...previous,
          exercises: previous.exercises
            .map((exercise) => ({ ...exercise, position: positions.get(exercise.id) ?? exercise.position }))
            .sort((left, right) => left.position - right.position)
        });
      }
      return { key, previous };
    },
    onError: (_error, _items, context) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous);
    },
    onSettled: refresh
  });
  const addSet = useMutation({
    mutationFn: ({ clientMutationId, sessionExerciseId, input }: { clientMutationId: string; sessionExerciseId: string; input: SetInput }) => runOrQueue(
      [workoutId, sessionExerciseId],
      async () => {
        const payload = await apiFetch<{ replayed: boolean; set: WorkoutSet }>(`/api/workouts/${serverId(workoutId)}/exercises/${serverId(sessionExerciseId)}/sets`, { method: "POST", body: { ...input, clientMutationId } });
        return payload.set;
      },
      // Kept on the phone and sent later with its own mutation ID (ADR 0025).
      (userId) => {
        const setId = newLocalId();
        enqueueOp({ kind: "addSet", userId, workoutId, sessionExerciseId, setId, input });
        return shownSet(userId, setId);
      }
    ),
    onSettled: refresh
  });
  const updateSet = useMutation({
    mutationFn: ({ setId, input }: { setId: string; input: Partial<SetInput> }) => runOrQueue(
      [workoutId, setId],
      async () => {
        const payload = await apiFetch<{ set: WorkoutSet }>(`/api/sets/${serverId(setId)}`, { method: "PATCH", body: input });
        return payload.set;
      },
      (userId) => {
        enqueueOp({ kind: "updateSet", userId, workoutId, setId, input });
        return shownSet(userId, setId);
      }
    ),
    onSettled: refresh
  });
  const deleteSet = useMutation({
    mutationFn: ({ setId }: { setId: string }) => runOrQueue<unknown>(
      [workoutId, setId],
      () => apiFetch(`/api/sets/${serverId(setId)}`, { method: "DELETE" }),
      (userId) => enqueueOp({ kind: "deleteSet", userId, workoutId, setId })
    ),
    onSettled: refresh
  });
  return { addExercise, removeExercise, reorderExercises, addSet, updateSet, deleteSet, createExercise: exerciseMutations.create };
}

/** Looks an exercise up in the lists the phone already loaded. */
function findCachedExercise(queryClient: QueryClient, exerciseId: string): Exercise | null {
  const fromCatalog = readCatalog()?.find((item) => item.id === exerciseId);
  if (fromCatalog) return normalizeExercise(fromCatalog);
  for (const [, data] of queryClient.getQueriesData<unknown>({ predicate: (query) => String(query.queryKey[0]).startsWith("exercise") })) {
    const pages = (data as { pages?: { items?: Exercise[] }[] } | null)?.pages;
    const items = Array.isArray(data) ? data as Exercise[] : pages?.flatMap((page) => page.items ?? []) ?? (data as { items?: Exercise[] } | null)?.items ?? [];
    const found = items.find((item) => item?.id === exerciseId && typeof item.name === "string");
    if (found) return normalizeExercise(found);
  }
  return null;
}

function normalizeAddedSessionExercise(value: SessionExercise): SessionExercise {
  return { ...value, previousPerformance: value.previousPerformance ?? null, exercise: normalizeExercise(value.exercise) };
}
