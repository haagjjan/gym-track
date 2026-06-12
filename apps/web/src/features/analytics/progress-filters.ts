import type { CompletedExercise } from "./analytics-types";

export function filterProgressExercises(
  exercises: CompletedExercise[],
  selectedMuscleSlug: string,
  searchQuery: string
): CompletedExercise[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return exercises.filter((exercise) => {
    const matchesMuscle = selectedMuscleSlug === "" || exerciseHasMuscle(exercise, selectedMuscleSlug);
    const searchableText = [
      exercise.name,
      exercise.primaryMuscleGroup.name,
      ...exercise.secondaryMuscleGroups.map((muscle) => muscle.name)
    ].join(" ").toLowerCase();
    const matchesSearch = normalizedQuery === "" || searchableText.includes(normalizedQuery);

    return matchesMuscle && matchesSearch;
  });
}

export function compareCompletedExerciseDesc(
  left: CompletedExercise,
  right: CompletedExercise
): number {
  return new Date(right.lastDoneAt).getTime() - new Date(left.lastDoneAt).getTime();
}

export function shortProgressDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function exerciseHasMuscle(exercise: CompletedExercise, muscleSlug: string): boolean {
  return exercise.primaryMuscleGroup.slug === muscleSlug
    || exercise.secondaryMuscleGroups.some((muscle) => muscle.slug === muscleSlug);
}
