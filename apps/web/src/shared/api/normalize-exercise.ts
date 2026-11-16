import type { Exercise } from "./types";

/** Fills the fields list answers leave out, so every screen can render the exercise. */
export function normalizeExercise(exercise: Partial<Exercise> & Pick<Exercise, "id" | "name">): Exercise {
  const fromList = exercise.muscleGroups ?? [];
  const primaryMuscles = exercise.primaryMuscleGroups ?? (exercise.primaryMuscleGroup ? [exercise.primaryMuscleGroup] : fromList.filter((muscle) => muscle.role === "PRIMARY"));
  const secondaryMuscles = exercise.secondaryMuscleGroups ?? fromList.filter((muscle) => muscle.role === "SECONDARY");
  return {
    ...exercise,
    equipment: exercise.equipment ?? null,
    exerciseType: exercise.exerciseType ?? null,
    primaryMuscleGroup: exercise.primaryMuscleGroup ?? primaryMuscles[0] ?? { id: "", name: "Other", slug: "other" },
    primaryMuscleGroups: primaryMuscles,
    secondaryMuscleGroups: secondaryMuscles,
    muscleGroups: exercise.muscleGroups ?? [
      ...primaryMuscles.map((muscle) => ({ ...muscle, role: "PRIMARY" as const })),
      ...secondaryMuscles.map((muscle) => ({ ...muscle, role: "SECONDARY" as const }))
    ],
    createdByUserId: exercise.createdByUserId ?? null,
    createdAt: exercise.createdAt ?? "",
    updatedAt: exercise.updatedAt ?? ""
  };
}
