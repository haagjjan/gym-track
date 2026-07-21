import {
  createExerciseMutation,
  mergeExercisesMutation,
  updateExerciseMutation
} from "./exercise-mutations.js";
import type { ExerciseListFilters, ExerciseRepository } from "./exercise.repository.js";
import type { ExerciseMergeSummary, ExerciseResult } from "./exercise-results.js";
export type { ExerciseMergeSummary, ExerciseResult } from "./exercise-results.js";
import {
  toExerciseShape,
  toMuscleGroupShape,
  type ExerciseList,
  type ExerciseShape,
  type MuscleGroupList
} from "./exercise-shapes.js";
export type {
  ExerciseList,
  ExerciseShape,
  MuscleGroupList
} from "./exercise-shapes.js";
import type {
  CreateExerciseRequest,
  ListExercisesQuery,
  MergeExerciseRequest,
  UpdateExerciseRequest
} from "./exercise.schemas.js";
import { EXERCISE_EQUIPMENT, EXERCISE_TYPES } from "./exercise-classifications.js";

export interface ExerciseService {
  listExercises(userId: string, input: ListExercisesQuery): Promise<ExerciseList>;
  listMuscleGroups(): Promise<MuscleGroupList>;
  listOptions(): Promise<{ equipment: readonly string[]; exerciseTypes: readonly string[] }>;
  findNameSuggestions(name: string): Promise<ExerciseShape[]>;
  createExercise(
    userId: string,
    input: CreateExerciseRequest
  ): Promise<ExerciseResult<ExerciseShape>>;
  updateExercise(
    userId: string,
    exerciseId: string,
    input: UpdateExerciseRequest
  ): Promise<ExerciseResult<ExerciseShape>>;
  mergeExercises(
    userId: string,
    sourceExerciseId: string,
    input: MergeExerciseRequest
  ): Promise<ExerciseResult<ExerciseMergeSummary>>;
}

interface ExerciseServiceOptions {
  repository: ExerciseRepository;
  now?: () => Date;
}

export function createExerciseService(options: ExerciseServiceOptions): ExerciseService {
  const now = options.now ?? (() => new Date());

  return {
    async listExercises(userId, input) {
      const filters: ExerciseListFilters = {
        search: input.search,
        muscleGroupIds: uniqueIds([
          ...(input.muscleGroupIds ?? []),
          ...(input.muscleGroupId ? [input.muscleGroupId] : [])
        ]),
        primaryMuscleGroupId: input.primaryMuscleGroupId,
        equipment: input.equipment,
        exerciseType: input.exerciseType,
        ownership: input.ownership,
        userId,
        sort: input.sort ?? "name",
        limit: input.limit,
        offset: input.offset
      };
      const result = await options.repository.listExercises(filters);

      return {
        items: result.items.map(toExerciseShape),
        pagination: {
          limit: input.limit,
          offset: input.offset,
          total: result.total
        }
      };
    },
    async listMuscleGroups() {
      const items = await options.repository.listMuscleGroups();

      return {
        items: items.map(toMuscleGroupShape)
      };
    },
    async listOptions() {
      return { equipment: EXERCISE_EQUIPMENT, exerciseTypes: EXERCISE_TYPES };
    },
    async findNameSuggestions(name) {
      const result = await options.repository.listExercises({
        search: name,
        muscleGroupIds: [],
        primaryMuscleGroupId: undefined,
        equipment: undefined,
        exerciseType: undefined,
        ownership: undefined,
        userId: undefined,
        sort: "name",
        limit: 5,
        offset: 0
      });

      return result.items.map(toExerciseShape);
    },
    createExercise: (userId, input) =>
      createExerciseMutation({ repository: options.repository, now }, userId, input),
    updateExercise: (userId, exerciseId, input) =>
      updateExerciseMutation(
        { repository: options.repository, now },
        userId,
        exerciseId,
        input
      ),
    mergeExercises: (userId, sourceExerciseId, input) =>
      mergeExercisesMutation(
        { repository: options.repository, now },
        userId,
        sourceExerciseId,
        input
      )
  };
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}
