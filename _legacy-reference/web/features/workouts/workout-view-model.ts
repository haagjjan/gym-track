import type { SessionExercise, WorkoutDetail } from "./workout-types";

export function sortWorkout(workout: WorkoutDetail): WorkoutDetail {
  return {
    ...workout,
    exercises: [...workout.exercises]
      .sort((left, right) => left.position - right.position)
      .map((exercise) => ({
        ...exercise,
        sets: [...exercise.sets].sort((left, right) => left.setOrder - right.setOrder)
      }))
  };
}

export function moveSessionExercise(
  exercises: SessionExercise[],
  sessionExerciseId: string,
  direction: "down" | "up"
): SessionExercise[] | null {
  const index = exercises.findIndex((item) => item.id === sessionExerciseId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || targetIndex < 0 || targetIndex >= exercises.length) {
    return null;
  }

  const reordered = [...exercises];
  const [moved] = reordered.splice(index, 1);

  if (!moved) {
    return null;
  }

  reordered.splice(targetIndex, 0, moved);

  return reordered;
}

export function formatStartedAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function chooseActiveExerciseId(
  workout: WorkoutDetail | null,
  preferredExerciseId: string | null
): string | null {
  if (!workout || workout.exercises.length === 0) {
    return null;
  }

  if (preferredExerciseId && workout.exercises.some((item) => item.id === preferredExerciseId)) {
    return preferredExerciseId;
  }

  return workout.exercises[0]?.id ?? null;
}

export function findFallbackExerciseId(
  workout: WorkoutDetail | null,
  removedExerciseId: string
): string | null {
  if (!workout) {
    return null;
  }

  const removedIndex = workout.exercises.findIndex((item) => item.id === removedExerciseId);

  if (removedIndex < 0) {
    return null;
  }

  return (
    workout.exercises[removedIndex + 1]?.id ??
    workout.exercises[removedIndex - 1]?.id ??
    null
  );
}
