"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult
} from "@tanstack/react-query";
import { apiFetch } from "./client";
import { overlayWorkout, overlayWorkoutList } from "../offline/outbox-overlay";
import { enqueueOp, isLocalId, newLocalId, readOutbox, resolveId } from "../offline/outbox-store";
import { runOrQueue, useOutbox } from "../offline/use-outbox";
import { appendExerciseFilters, queryKeys } from "./query-keys";
import type {
  CompletedExercise,
  ExerciseProgressItem,
  ExerciseSummaryPayload,
  ListWorkoutsPayload,
  MergeExercisesResult,
  UpdateWorkoutInput,
  WeeklyVolumePayload,
  WorkoutDetail
} from "./types";

export { queryKeys } from "./query-keys";
export * from "./catalog-hooks";
export * from "./session-hooks";

export const HISTORY_PAGE_SIZE = 20;

export interface WorkoutListOptions {
  search?: string;
  muscleGroupIds?: string[];
  equipment?: string;
  exerciseType?: string;
  sort?: "newest" | "oldest" | "name";
  timeZone?: string;
}

export function useWorkoutsInfinite(options: WorkoutListOptions = {}): UseInfiniteQueryResult<{
  pages: ListWorkoutsPayload[];
  pageParams: number[];
}> {
  return useInfiniteQuery({
    queryKey: [...queryKeys.workoutsInfinite, options],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      apiFetch<ListWorkoutsPayload>(
        `/api/workouts?${workoutListParams(options, HISTORY_PAGE_SIZE, pageParam)}`,
        { signal }
      ),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((total, page) => total + page.items.length, 0);

      return loaded < lastPage.pagination.total ? loaded : undefined;
    }
  });
}

/**
 * Details for a set of workouts (expanded rows, tonnage, exercise-name search).
 * One query per workout so the cache is shared with the session screen.
 */
export function useExerciseProgress(
  exerciseId: string | null
): UseQueryResult<ExerciseProgressItem[]> {
  return useQuery({
    enabled: exerciseId !== null,
    queryKey: queryKeys.exerciseProgress(exerciseId ?? "none"),
    queryFn: async ({ signal }) => {
      const payload = await apiFetch<{ exerciseId: string; items: ExerciseProgressItem[] }>(
        `/api/analytics/exercises/${exerciseId}/progress`,
        { signal }
      );

      return payload.items;
    }
  });
}

export function useWorkouts(limit = 10): UseQueryResult<ListWorkoutsPayload> {
  const outbox = useOutbox();

  return useQuery({
    queryKey: queryKeys.workouts(limit),
    // In the phone app the list also shows what is still waiting to be sent.
    ...(outbox ? { select: (payload: ListWorkoutsPayload) => overlayWorkoutList(payload, outbox.state, outbox.userId) } : {}),
    queryFn: ({ signal }) =>
      apiFetch<ListWorkoutsPayload>(`/api/workouts?limit=${limit}&offset=0`, { signal })
  });
}

export function useWorkout(workoutId: string): UseQueryResult<WorkoutDetail> {
  const outbox = useOutbox();
  const id = outbox ? resolveId(workoutId, outbox.state.idMap) : workoutId;
  // A workout started on the phone has no server copy until it is sent.
  const onlyOnPhone = isLocalId(id);

  return useQuery<WorkoutDetail | null, Error, WorkoutDetail>({
    queryKey: queryKeys.workout(id),
    queryFn: async ({ signal }) => {
      if (onlyOnPhone) return null;
      const payload = await apiFetch<{ workout: WorkoutDetail }>(
        `/api/workouts/${id}`,
        { signal }
      );

      return sortWorkout(payload.workout);
    },
    ...(onlyOnPhone ? { networkMode: "always" as const, staleTime: Infinity } : {}),
    select: (workout) => {
      const shown = outbox ? overlayWorkout(workout, outbox.state, outbox.userId, workoutId) : workout;
      if (!shown) throw new Error("This workout is no longer on this phone.");
      return shown;
    }
  });
}

export function useCompletedExercises(): UseQueryResult<CompletedExercise[]> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return useQuery({
    queryKey: [...queryKeys.completedExercises, timeZone],
    queryFn: async ({ signal }) => {
      const payload = await apiFetch<{ items: CompletedExercise[] }>(
        `/api/analytics/exercises?timeZone=${encodeURIComponent(timeZone)}`,
        { signal }
      );

      return payload.items;
    }
  });
}

export function useExerciseSummary(
  exerciseId: string | null,
  range?: AnalyticsDateRange
): UseQueryResult<ExerciseSummaryPayload> {
  return useQuery({
    enabled: exerciseId !== null,
    queryKey: queryKeys.exerciseSummary(
      exerciseId ?? "none",
      range?.startDate,
      range?.endDate
    ),
    queryFn: ({ signal }) =>
      apiFetch<ExerciseSummaryPayload>(
        exerciseSummaryUrl(exerciseId ?? "none", range),
        { signal }
      )
  });
}

export interface AnalyticsDateRange {
  startDate: string;
  endDate: string;
}

export function useWeeklyVolume(days: number): UseQueryResult<WeeklyVolumePayload> {
  const { startDate, endDate } = dateRange(days);

  return useQuery({
    queryKey: queryKeys.weeklyVolume(startDate, endDate),
    queryFn: ({ signal }) =>
      apiFetch<WeeklyVolumePayload>(
        `/api/analytics/weekly-volume?startDate=${startDate}&endDate=${endDate}`,
        { signal }
      )
  });
}

interface WorkoutMutations {
  createWorkout: UseMutationResult<WorkoutDetail, Error, void>;
  endWorkout: UseMutationResult<WorkoutDetail, Error, string>;
  updateWorkout: UseMutationResult<
    WorkoutDetail,
    Error,
    { workoutId: string; input: UpdateWorkoutInput }
  >;
  deleteWorkout: UseMutationResult<void, Error, string>;
}

export function useWorkoutMutations(): WorkoutMutations {
  const queryClient = useQueryClient();

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["workouts"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.workoutsInfinite });
    void queryClient.invalidateQueries({ queryKey: ["workout"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.completedExercises });
    void queryClient.invalidateQueries({ queryKey: ["exercise-summary"] });
    void queryClient.invalidateQueries({ queryKey: ["exercise-progress"] });
    void queryClient.invalidateQueries({ queryKey: ["weekly-volume"] });
    void queryClient.invalidateQueries({ queryKey: ["tracking"] });
    void queryClient.invalidateQueries({ queryKey: ["tracking-progress"] });
  };

  const serverId = (id: string): string => resolveId(id, readOutbox().idMap);
  /** The workout with queued changes applied, for the answer of a queued change. */
  const shown = (userId: string, workoutId: string): WorkoutDetail => {
    const workout = overlayWorkout(queryClient.getQueryData<WorkoutDetail>(queryKeys.workout(serverId(workoutId))) ?? null, readOutbox(), userId, workoutId);
    if (!workout) throw new Error("This workout is no longer on this phone.");
    return workout;
  };

  const createWorkout = useMutation({
    mutationFn: () => runOrQueue(
      [],
      async () => {
        const payload = await apiFetch<{ workout: WorkoutDetail }>("/api/workouts", {
          method: "POST",
          body: {}
        });

        return payload.workout;
      },
      (userId) => {
        const workoutId = newLocalId();
        enqueueOp({ kind: "startWorkout", userId, workoutId, startedAt: new Date().toISOString() });
        return shown(userId, workoutId);
      }
    ),
    onSuccess: invalidate
  });

  const endWorkout = useMutation({
    mutationFn: (workoutId: string) => runOrQueue(
      [workoutId],
      async () => {
        const payload = await apiFetch<{ workout: WorkoutDetail }>(
          `/api/workouts/${serverId(workoutId)}/end`,
          { method: "POST", body: {} }
        );

        return payload.workout;
      },
      (userId) => {
        enqueueOp({ kind: "endWorkout", userId, workoutId, endedAt: new Date().toISOString() });
        return shown(userId, workoutId);
      }
    ),
    onSuccess: invalidate
  });

  const updateWorkout = useMutation({
    mutationFn: ({ workoutId, input }: { workoutId: string; input: UpdateWorkoutInput }) => runOrQueue(
      [workoutId],
      async () => {
        const payload = await apiFetch<{ workout: WorkoutDetail }>(
          `/api/workouts/${serverId(workoutId)}`,
          { method: "PATCH", body: input }
        );

        return payload.workout;
      },
      (userId) => {
        enqueueOp({ kind: "updateWorkout", userId, workoutId, input });
        return shown(userId, workoutId);
      }
    ),
    onSuccess: invalidate
  });

  const deleteWorkout = useMutation({
    mutationFn: (workoutId: string) => runOrQueue<void>(
      [workoutId],
      () => apiFetch<void>(`/api/workouts/${serverId(workoutId)}`, { method: "DELETE" }),
      (userId) => {
        enqueueOp({ kind: "deleteWorkout", userId, workoutId });
      }
    ),
    onSuccess: invalidate
  });

  return { createWorkout, endWorkout, updateWorkout, deleteWorkout };
}

/**
 * Merging rewrites exercise history, so every cache keyed by exercise or
 * derived from logged sets is invalidated wholesale afterwards.
 */
export function useMergeExercises(): UseMutationResult<
  MergeExercisesResult,
  Error,
  { sourceExerciseId: string; targetExerciseId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sourceExerciseId, targetExerciseId }) => {
      const payload = await apiFetch<{ merge: MergeExercisesResult }>(
        `/api/exercises/${sourceExerciseId}/merge`,
        { method: "POST", body: { targetExerciseId } }
      );

      return payload.merge;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["exercise-search"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.completedExercises });
      void queryClient.invalidateQueries({ queryKey: ["exercise-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["exercise-progress"] });
      void queryClient.invalidateQueries({ queryKey: ["weekly-volume"] });
    void queryClient.invalidateQueries({ queryKey: ["tracking"] });
    void queryClient.invalidateQueries({ queryKey: ["tracking-progress"] });
      void queryClient.invalidateQueries({ queryKey: ["workouts"] });
      void queryClient.invalidateQueries({ queryKey: ["workouts-infinite"] });
      void queryClient.invalidateQueries({ queryKey: ["workout"] });
    }
  });
}

export function sortWorkout(workout: WorkoutDetail): WorkoutDetail {
  return {
    ...workout,
    exercises: [...workout.exercises]
      .sort((a, b) => a.position - b.position)
      .map((exercise) => ({
        ...exercise,
        sets: [...exercise.sets].sort((a, b) => a.setOrder - b.setOrder)
      }))
  };
}

export function dateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

function exerciseSummaryUrl(exerciseId: string, range?: AnalyticsDateRange): string {
  const path = `/api/analytics/exercises/${exerciseId}/summary`;

  if (!range) {
    return path;
  }

  const params = new URLSearchParams({
    startDate: range.startDate,
    endDate: range.endDate
  });

  return `${path}?${params}`;
}

function workoutListParams(options: WorkoutListOptions, limit: number, offset: number): string {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    timeZone: options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  appendExerciseFilters(params, options);
  return params.toString();
}
