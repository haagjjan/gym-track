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
