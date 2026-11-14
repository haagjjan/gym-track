import type { ExerciseMuscleGroup, MuscleGroup } from "./api/types";

type MuscleSource = {
  muscleRegions?: ExerciseMuscleGroup[] | undefined;
  muscleGroups?: ExerciseMuscleGroup[] | undefined;
  primaryMuscleGroup?: MuscleGroup | undefined;
  primaryMuscleGroups?: MuscleGroup[] | undefined;
};

export function exerciseMuscles(exercise: MuscleSource): ExerciseMuscleGroup[] {
  return exercise.muscleRegions ?? exercise.muscleGroups ?? [];
}

export function primaryMuscleName(exercise: MuscleSource): string {
  return exerciseMuscles(exercise).find((muscle) => muscle.role === "PRIMARY")?.name
    ?? exercise.primaryMuscleGroups?.[0]?.name ?? exercise.primaryMuscleGroup?.name ?? "Other";
}

export function matchesMuscleRegion(exercise: MuscleSource, slug: string): boolean {
  return !slug || (exercise.muscleRegions ?? []).some((region) => region.slug === slug);
}
