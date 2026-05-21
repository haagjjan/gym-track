import { randomUUID } from "node:crypto";
import type {
  ExerciseListFilters,
  ExerciseRecord,
  ExerciseRepository,
  NewExercise,
  RestoreExerciseInput
} from "./exercise.repository.js";
import type {
  CreateExerciseRequest,
  ListExercisesQuery
} from "./exercise.schemas.js";

export interface MuscleGroupShape {
  id: string;
  slug: string;
  name: string;
}

export interface ExerciseShape {
  id: string;
  name: string;
  equipment: string | null;
  exerciseType: string | null;
  primaryMuscleGroup: MuscleGroupShape;
  secondaryMuscleGroups: MuscleGroupShape[];
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseList {
  items: ExerciseShape[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export type ExerciseResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "name_conflict" | "muscle_group_not_found" };

export interface ExerciseService {
  listExercises(input: ListExercisesQuery): Promise<ExerciseList>;
  createExercise(
    userId: string,
    input: CreateExerciseRequest
  ): Promise<ExerciseResult<ExerciseShape>>;
}

interface ExerciseServiceOptions {
  repository: ExerciseRepository;
  now?: () => Date;
}

export function createExerciseService(options: ExerciseServiceOptions): ExerciseService {
  const now = options.now ?? (() => new Date());

  return {
    async listExercises(input) {
      const filters: ExerciseListFilters = {
        search: input.search,
        primaryMuscleGroupId: input.primaryMuscleGroupId,
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
    async createExercise(userId, input) {
      const existingExercise = await options.repository.findExerciseByName(input.name);

      if (existingExercise && existingExercise.deletedAt === null) {
        return { ok: false, reason: "name_conflict" };
      }

      const muscleGroupIds = uniqueIds([
        input.primaryMuscleGroupId,
        ...input.secondaryMuscleGroupIds
      ]);
      const muscleGroups = await options.repository.findMuscleGroupsByIds(muscleGroupIds);

      if (muscleGroups.length !== muscleGroupIds.length) {
        return { ok: false, reason: "muscle_group_not_found" };
      }

      if (existingExercise) {
        const restored = await options.repository.restoreExercise(
          toRestoreExerciseInput(existingExercise.id, input, now())
        );

        return {
          ok: true,
          value: toExerciseShape(restored)
        };
      }

      const created = await options.repository.createExercise(toNewExercise(userId, input));

      if (created.status === "conflict") {
        return { ok: false, reason: "name_conflict" };
      }

      return {
        ok: true,
        value: toExerciseShape(created.exercise)
      };
    }
  };
}

function toNewExercise(userId: string, input: CreateExerciseRequest): NewExercise {
  return {
    id: randomUUID(),
    name: input.name,
    equipment: input.equipment ?? null,
    exerciseType: input.exerciseType ?? null,
    primaryMuscleGroupId: input.primaryMuscleGroupId,
    secondaryMuscleGroupIds: input.secondaryMuscleGroupIds,
    createdByUserId: userId
  };
}

function toRestoreExerciseInput(
  exerciseId: string,
  input: CreateExerciseRequest,
  updatedAt: Date
): RestoreExerciseInput {
  return {
    id: exerciseId,
    name: input.name,
    equipment: input.equipment ?? null,
    exerciseType: input.exerciseType ?? null,
    primaryMuscleGroupId: input.primaryMuscleGroupId,
    secondaryMuscleGroupIds: input.secondaryMuscleGroupIds,
    updatedAt
  };
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function toExerciseShape(record: ExerciseRecord): ExerciseShape {
  return {
    id: record.id,
    name: record.name,
    equipment: record.equipment,
    exerciseType: record.exerciseType,
    primaryMuscleGroup: toMuscleGroupShape(record.primaryMuscleGroup),
    secondaryMuscleGroups: record.secondaryMuscleGroups.map(toMuscleGroupShape),
    createdByUserId: record.createdByUserId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function toMuscleGroupShape(record: {
  id: string;
  slug: string;
  name: string;
}): MuscleGroupShape {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name
  };
}
