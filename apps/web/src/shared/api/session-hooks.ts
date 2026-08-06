"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { useExerciseMutations } from "./catalog-hooks";
import { queryKeys } from "./query-keys";
import type {
  CreateExerciseInput,
  Exercise,
  SessionExercise,
  SetInput,
  WorkoutDetail,
  WorkoutSet
} from "./types";

interface SessionMutations {
  addExercise: UseMutationResult<SessionExercise, Error, { exerciseId: string }>;
  removeExercise: UseMutationResult<unknown, Error, { sessionExerciseId: string }>;
  reorderExercises: UseMutationResult<unknown, Error, { items: { sessionExerciseId: string; position: number }[] }>;
  addSet: UseMutationResult<WorkoutSet, Error, { sessionExerciseId: string; input: SetInput }>;
  updateSet: UseMutationResult<WorkoutSet, Error, { setId: string; input: Partial<SetInput> }>;
  deleteSet: UseMutationResult<unknown, Error, { setId: string }>;
  createExercise: UseMutationResult<Exercise, Error, CreateExerciseInput>;
}

export function useSessionMutations({ workoutId }: { workoutId: string }): SessionMutations {
  const queryClient = useQueryClient();
  const exerciseMutations = useExerciseMutations();
  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.workout(workoutId) });
    void queryClient.invalidateQueries({ queryKey: ["workouts"] });
  };
  const addExercise = useMutation({
    mutationFn: async ({ exerciseId }: { exerciseId: string }) => {
      const payload = await apiFetch<{ sessionExercise: SessionExercise }>(`/api/workouts/${workoutId}/exercises`, { method: "POST", body: { exerciseId } });
      return normalizeAddedSessionExercise(payload.sessionExercise);
    },
    onSuccess: (sessionExercise) => {
      queryClient.setQueryData<WorkoutDetail>(queryKeys.workout(workoutId), (current) => {
        if (!current || current.exercises.some((exercise) => exercise.id === sessionExercise.id)) return current;
        return {
          ...current,
          exercises: [...current.exercises, sessionExercise].sort((left, right) => left.position - right.position)
        };
      });
      refresh();
    }
  });
  const removeExercise = useMutation({
    mutationFn: ({ sessionExerciseId }: { sessionExerciseId: string }) => apiFetch(`/api/workouts/${workoutId}/exercises/${sessionExerciseId}`, { method: "DELETE" }),
    onSuccess: refresh
  });
  const reorderExercises = useMutation({
    mutationFn: ({ items }: { items: { sessionExerciseId: string; position: number }[] }) => apiFetch(`/api/workouts/${workoutId}/exercises/reorder`, { method: "PATCH", body: { items } }),
    onMutate: async ({ items }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.workout(workoutId) });
      const previous = queryClient.getQueryData<WorkoutDetail>(queryKeys.workout(workoutId));
      const positions = new Map(items.map((item) => [item.sessionExerciseId, item.position]));
      if (previous) {
        queryClient.setQueryData<WorkoutDetail>(queryKeys.workout(workoutId), {
          ...previous,
          exercises: previous.exercises
            .map((exercise) => ({ ...exercise, position: positions.get(exercise.id) ?? exercise.position }))
            .sort((left, right) => left.position - right.position)
        });
      }
      return { previous };
    },
    onError: (_error, _items, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.workout(workoutId), context.previous);
    },
    onSettled: refresh
  });
  const addSet = useMutation({
    mutationFn: async ({ sessionExerciseId, input }: { sessionExerciseId: string; input: SetInput }) => {
      const payload = await apiFetch<{ set: WorkoutSet }>(`/api/workouts/${workoutId}/exercises/${sessionExerciseId}/sets`, { method: "POST", body: input });
      return payload.set;
    },
    onSuccess: refresh
  });
  const updateSet = useMutation({
    mutationFn: async ({ setId, input }: { setId: string; input: Partial<SetInput> }) => {
      const payload = await apiFetch<{ set: WorkoutSet }>(`/api/sets/${setId}`, { method: "PATCH", body: input });
      return payload.set;
    },
    onSuccess: refresh
  });
  const deleteSet = useMutation({
    mutationFn: ({ setId }: { setId: string }) => apiFetch(`/api/sets/${setId}`, { method: "DELETE" }),
    onSuccess: refresh
  });
  return { addExercise, removeExercise, reorderExercises, addSet, updateSet, deleteSet, createExercise: exerciseMutations.create };
}

function normalizeAddedSessionExercise(value: SessionExercise): SessionExercise {
  const primary = value.exercise.primaryMuscleGroup;
  const primaryMuscles = value.exercise.primaryMuscleGroups ?? [primary];
  const secondaryMuscles = value.exercise.secondaryMuscleGroups ?? [];
  return {
    ...value,
    previousPerformance: value.previousPerformance ?? null,
    exercise: {
      ...value.exercise,
      equipment: value.exercise.equipment ?? null,
      exerciseType: value.exercise.exerciseType ?? null,
      primaryMuscleGroups: primaryMuscles,
      secondaryMuscleGroups: secondaryMuscles,
      muscleGroups: value.exercise.muscleGroups ?? [
        ...primaryMuscles.map((muscle) => ({ ...muscle, role: "PRIMARY" as const })),
        ...secondaryMuscles.map((muscle) => ({ ...muscle, role: "SECONDARY" as const }))
      ],
      createdByUserId: value.exercise.createdByUserId ?? null,
      createdAt: value.exercise.createdAt ?? "",
      updatedAt: value.exercise.updatedAt ?? ""
    }
  };
}
