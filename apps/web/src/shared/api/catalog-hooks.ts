"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseInfiniteQueryResult,
  type UseQueryResult
} from "@tanstack/react-query";
import { apiFetch } from "./client";
import { appendExerciseFilters, queryKeys } from "./query-keys";
import type {
  CreateExerciseInput,
  Exercise,
  ExerciseOptions,
  MuscleGroup,
  UpdateExerciseInput,
  UserPreferences,
  WorkoutTemplate
} from "./types";

export function useMuscleGroups(): UseQueryResult<MuscleGroup[]> {
  return useQuery({
    queryKey: queryKeys.muscleGroups,
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const payload = await apiFetch<{ items: MuscleGroup[] }>("/api/muscle-groups", { signal });
      return payload.items;
    }
  });
}

export function useExerciseSearch(search: string, muscleGroupId = ""): UseQueryResult<Exercise[]> {
  const trimmed = search.trim();
  return useQuery({
    queryKey: queryKeys.exerciseSearch(trimmed, muscleGroupId),
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ limit: "100", offset: "0" });
      if (trimmed.length > 0) params.set("search", trimmed);
      if (muscleGroupId) params.set("muscleGroupId", muscleGroupId);
      const payload = await apiFetch<{ items: Exercise[] }>(`/api/exercises?${params}`, { signal });
      return payload.items;
    }
  });
}

export interface ExerciseListOptions {
  search?: string;
  muscleGroupIds?: string[];
  equipment?: string;
  exerciseType?: string;
  ownership?: "editable" | "readOnly" | "";
  sort?: "name" | "muscle" | "equipment" | "type";
}

export const EXERCISE_PAGE_SIZE = 50;

interface ExerciseListPayload {
  items: Exercise[];
  pagination: { total: number; limit: number; offset: number };
}

export function useExercisesInfinite(
  options: ExerciseListOptions
): UseInfiniteQueryResult<{ pages: ExerciseListPayload[]; pageParams: number[] }> {
  return useInfiniteQuery({
    queryKey: ["exercise-list-infinite", options],
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams({
        limit: String(EXERCISE_PAGE_SIZE),
        offset: String(pageParam)
      });
      appendExerciseFilters(params, options);
      return apiFetch<ExerciseListPayload>(`/api/exercises?${params}`, { signal });
    },
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((total, page) => total + page.items.length, 0);
      return loaded < lastPage.pagination.total ? loaded : undefined;
    }
  });
}

export function useExercises(options: ExerciseListOptions): UseQueryResult<Exercise[]> {
  const params = new URLSearchParams({ limit: "100", offset: "0" });
  appendExerciseFilters(params, options);
  return useQuery({
    queryKey: ["exercise-list", options],
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const payload = await apiFetch<{ items: Exercise[] }>(`/api/exercises?${params}`, { signal });
      return payload.items;
    }
  });
}

export function useExerciseOptions(): UseQueryResult<ExerciseOptions> {
  return useQuery({
    queryKey: queryKeys.exerciseOptions,
    staleTime: Infinity,
    queryFn: ({ signal }) => apiFetch<ExerciseOptions>("/api/exercises/options", { signal })
  });
}

export function useExerciseNameSuggestions(name: string): UseQueryResult<Exercise[]> {
  const trimmed = name.trim();
  return useQuery({
    enabled: trimmed.length >= 2,
    queryKey: queryKeys.exerciseNameSuggestions(trimmed),
    queryFn: async ({ signal }) => {
      const payload = await apiFetch<{ items: Exercise[] }>(`/api/exercises/name-suggestions?name=${encodeURIComponent(trimmed)}`, { signal });
      return payload.items;
    }
  });
}

export interface ExerciseMutations {
  create: UseMutationResult<Exercise, Error, CreateExerciseInput>;
  update: UseMutationResult<Exercise, Error, { exerciseId: string; input: UpdateExerciseInput }>;
}

export function useExerciseMutations(): ExerciseMutations {
  const queryClient = useQueryClient();
  const refresh = (): void => {
    [["exercise-list"], ["exercise-search"], queryKeys.completedExercises, ["exercise-summary"], ["exercise-progress"], ["weekly-volume"], ["workout-template"], queryKeys.templates, ["workout"]]
      .forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }));
  };
  const create = useMutation({
    mutationFn: async (input: CreateExerciseInput) => {
      const payload = await apiFetch<{ exercise: Exercise }>("/api/exercises", { method: "POST", body: input });
      return payload.exercise;
    },
    onSuccess: refresh
  });
  const update = useMutation({
    mutationFn: async ({ exerciseId, input }: { exerciseId: string; input: UpdateExerciseInput }) => {
      const payload = await apiFetch<{ exercise: Exercise }>(`/api/exercises/${exerciseId}`, { method: "PATCH", body: input });
      return payload.exercise;
    },
    onSuccess: refresh
  });
  return { create, update };
}

export interface TemplateListOptions {
  search?: string;
  muscleGroupIds?: string[];
  equipment?: string;
  exerciseType?: string;
  sort?: "lastUsed" | "name" | "lastEdited";
}

export function useTemplates(options: TemplateListOptions = {}): UseQueryResult<WorkoutTemplate[]> {
  const params = new URLSearchParams();
  appendExerciseFilters(params, options);
  return useQuery({
    queryKey: [...queryKeys.templates, options],
    queryFn: async ({ signal }) => {
      const payload = await apiFetch<{ items: WorkoutTemplate[] }>(`/api/workout-templates?${params}`, { signal });
      return payload.items;
    }
  });
}

export function useUserPreferences(): UseQueryResult<UserPreferences> {
  return useQuery({
    queryKey: queryKeys.userPreferences,
    queryFn: async ({ signal }) => {
      const payload = await apiFetch<{ preferences: UserPreferences }>("/api/users/me/preferences", { signal });
      return payload.preferences;
    }
  });
}

export function useUpdateUserPreferences(): UseMutationResult<UserPreferences, Error, Partial<UserPreferences>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      const payload = await apiFetch<{ preferences: UserPreferences }>("/api/users/me/preferences", { method: "PATCH", body: input });
      return payload.preferences;
    },
    onSuccess: (preferences) => queryClient.setQueryData(queryKeys.userPreferences, preferences)
  });
}

export interface TemplateMutations {
  create: UseMutationResult<WorkoutTemplate, Error, { name: string; exerciseIds: string[] }>;
  update: UseMutationResult<WorkoutTemplate, Error, { templateId: string; name?: string; exerciseIds?: string[] }>;
  duplicate: UseMutationResult<WorkoutTemplate, Error, { templateId: string }>;
  remove: UseMutationResult<unknown, Error, { templateId: string }>;
  start: UseMutationResult<{ workoutId: string }, Error, { templateId: string }>;
  createFromWorkout: UseMutationResult<WorkoutTemplate, Error, { workoutId: string; name: string }>;
  updateFromWorkout: UseMutationResult<WorkoutTemplate, Error, { templateId: string; workoutId: string }>;
}

export function useTemplateMutations(): TemplateMutations {
  const queryClient = useQueryClient();
  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.templates });
    void queryClient.invalidateQueries({ queryKey: ["workout-template"] });
    void queryClient.invalidateQueries({ queryKey: ["workouts"] });
  };
  const useTemplateMutation = <T, V>(fn: (variables: V) => Promise<T>) =>
    useMutation<T, Error, V>({ mutationFn: fn, onSuccess: refresh });
  const create = useTemplateMutation(async (input: { name: string; exerciseIds: string[] }) => (await apiFetch<{ template: WorkoutTemplate }>("/api/workout-templates", { method: "POST", body: input })).template);
  const update = useTemplateMutation(async ({ templateId, ...input }: { templateId: string; name?: string; exerciseIds?: string[] }) => (await apiFetch<{ template: WorkoutTemplate }>(`/api/workout-templates/${templateId}`, { method: "PATCH", body: input })).template);
  const duplicate = useTemplateMutation(async ({ templateId }: { templateId: string }) => (await apiFetch<{ template: WorkoutTemplate }>(`/api/workout-templates/${templateId}/duplicate`, { method: "POST", body: {} })).template);
  const remove = useTemplateMutation(({ templateId }: { templateId: string }) => apiFetch(`/api/workout-templates/${templateId}`, { method: "DELETE" }));
  const start = useTemplateMutation(async ({ templateId }: { templateId: string }) => (await apiFetch<{ workout: { workoutId: string } }>(`/api/workout-templates/${templateId}/start`, { method: "POST", body: {} })).workout);
  const createFromWorkout = useTemplateMutation(async ({ workoutId, name }: { workoutId: string; name: string }) => (await apiFetch<{ template: WorkoutTemplate }>(`/api/workouts/${workoutId}/templates`, { method: "POST", body: { name } })).template);
  const updateFromWorkout = useTemplateMutation(async ({ templateId, workoutId }: { templateId: string; workoutId: string }) => (await apiFetch<{ template: WorkoutTemplate }>(`/api/workout-templates/${templateId}/from-workout`, { method: "POST", body: { workoutId } })).template);
  return { create, update, duplicate, remove, start, createFromWorkout, updateFromWorkout };
}
