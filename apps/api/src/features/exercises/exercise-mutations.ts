import { randomUUID } from "node:crypto";
import { evaluateExerciseName } from "./exercise-name-quality.js";
import type {
  ExerciseRepository,
  NewExercise,
  RestoreExerciseInput
} from "./exercise.repository.js";
import type { ExerciseMergeSummary, ExerciseResult } from "./exercise-results.js";
import type {
  CreateExerciseRequest,
  MergeExerciseRequest,
  UpdateExerciseRequest
} from "./exercise.schemas.js";
import { toExerciseShape, type ExerciseShape } from "./exercise-shapes.js";

interface ExerciseMutationContext {
  repository: ExerciseRepository;
  now: () => Date;
}

export async function createExerciseMutation(
  context: ExerciseMutationContext,
  userId: string,
  input: CreateExerciseRequest
): Promise<ExerciseResult<ExerciseShape>> {
  const evaluation = evaluateExerciseName(input.name);
  const nameFailure = reviewName(evaluation, input.confirmNameWarning ?? false);
  if (nameFailure) return nameFailure;

  const existing = await context.repository.findExerciseByName(evaluation.normalizedName);
  if (existing?.deletedAt === null) return { ok: false, reason: "name_conflict" };

  if (!(await muscleGroupsExist(context.repository, input))) {
    return { ok: false, reason: "muscle_group_not_found" };
  }

  if (existing) {
    const restored = await context.repository.restoreExercise(
      toRestoreInput(existing.id, input, evaluation.normalizedName, context.now())
    );
    return { ok: true, value: toExerciseShape(restored) };
  }

  const created = await context.repository.createExercise(
    toNewExercise(userId, input, evaluation.normalizedName)
  );
  return created.status === "conflict"
    ? { ok: false, reason: "name_conflict" }
    : { ok: true, value: toExerciseShape(created.exercise) };
}

export async function updateExerciseMutation(
  context: ExerciseMutationContext,
  userId: string,
  exerciseId: string,
  input: UpdateExerciseRequest
): Promise<ExerciseResult<ExerciseShape>> {
  const existing = await context.repository.findActiveExerciseById(exerciseId);
  if (!existing) return { ok: false, reason: "exercise_not_found" };
  if (existing.createdByUserId !== userId) return { ok: false, reason: "exercise_forbidden" };

  const evaluation = evaluateExerciseName(input.name);
  const nameFailure = reviewName(evaluation, input.confirmNameWarning ?? false);
  if (nameFailure) return nameFailure;

  const conflicting = await context.repository.findExerciseByName(evaluation.normalizedName);
  if (conflicting && conflicting.id !== exerciseId && conflicting.deletedAt === null) {
    return { ok: false, reason: "name_conflict" };
  }

  if (!(await muscleGroupsExist(context.repository, input))) {
    return { ok: false, reason: "muscle_group_not_found" };
  }

  const updated = await context.repository.updateExercise(
    toRestoreInput(exerciseId, input, evaluation.normalizedName, context.now())
  );
  return updated
    ? { ok: true, value: toExerciseShape(updated) }
    : { ok: false, reason: "exercise_not_found" };
}

export async function mergeExercisesMutation(
  context: ExerciseMutationContext,
  userId: string,
  sourceExerciseId: string,
  input: MergeExerciseRequest
): Promise<ExerciseResult<ExerciseMergeSummary>> {
  if (sourceExerciseId === input.targetExerciseId) {
    return { ok: false, reason: "merge_same_exercise" };
  }

  const [source, target] = await Promise.all([
    context.repository.findActiveExerciseById(sourceExerciseId),
    context.repository.findActiveExerciseById(input.targetExerciseId)
  ]);
  if (!source || !target) return { ok: false, reason: "exercise_not_found" };

  const merged = await context.repository.mergeExerciseHistory(
    userId,
    source.id,
    target.id,
    context.now()
  );
  return {
    ok: true,
    value: {
      source: { id: source.id, name: source.name, retired: merged.sourceRetired },
      target: { id: target.id, name: target.name },
      reassignedSessionExercises: merged.reassignedSessionExercises,
      reassignedTemplateExercises: merged.reassignedTemplateExercises,
      affectedWorkouts: merged.affectedWorkouts,
      affectedTemplates: merged.affectedTemplates,
      affectedSets: merged.affectedSets
    }
  };
}

function reviewName(
  evaluation: ReturnType<typeof evaluateExerciseName>,
  confirmed: boolean
): Extract<ExerciseResult<never>, { ok: false; evaluation: unknown }> | null {
  if (evaluation.status === "blocked") {
    return { ok: false, reason: "name_blocked", evaluation };
  }
  if (evaluation.status === "warn" && !confirmed) {
    return { ok: false, reason: "name_review_required", evaluation };
  }
  return null;
}

async function muscleGroupsExist(
  repository: ExerciseRepository,
  input: CreateExerciseRequest
): Promise<boolean> {
  const ids = uniqueIds([...input.primaryMuscleGroupIds, ...input.secondaryMuscleGroupIds]);
  return (await repository.findMuscleGroupsByIds(ids)).length === ids.length;
}

function toNewExercise(
  userId: string,
  input: CreateExerciseRequest,
  normalizedName: string
): NewExercise {
  return {
    id: randomUUID(),
    name: normalizedName,
    equipment: input.equipment ?? null,
    exerciseType: input.exerciseType ?? null,
    primaryMuscleGroupIds: input.primaryMuscleGroupIds,
    secondaryMuscleGroupIds: input.secondaryMuscleGroupIds,
    createdByUserId: userId
  };
}

function toRestoreInput(
  id: string,
  input: CreateExerciseRequest,
  name: string,
  updatedAt: Date
): RestoreExerciseInput {
  return {
    id,
    name,
    equipment: input.equipment ?? null,
    exerciseType: input.exerciseType ?? null,
    primaryMuscleGroupIds: input.primaryMuscleGroupIds,
    secondaryMuscleGroupIds: input.secondaryMuscleGroupIds,
    updatedAt
  };
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}
