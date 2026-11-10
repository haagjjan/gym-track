import type { ReactNode } from "react";
import type { CompletedExercise, MuscleGroup } from "./analytics-types";
import {
  handleProgressPointerLeave,
  handleProgressPointerMove
} from "./progress-pointer";

export function ProgressExerciseList(props: {
  exercises: CompletedExercise[];
  selectedExerciseId: string;
  onSelectExercise(id: string): void;
}): ReactNode {
  return (
    <div className="progressExerciseList">
      {props.exercises.map((exercise) => (
        <ExerciseButton key={exercise.id} exercise={exercise} {...props} />
      ))}
    </div>
  );
}

export function uniqueMuscleGroups(exercises: CompletedExercise[]): MuscleGroup[] {
  const groups = new Map<string, MuscleGroup>();

  for (const exercise of exercises) {
    groups.set(exercise.primaryMuscleGroup.slug, exercise.primaryMuscleGroup);
    for (const muscle of exercise.secondaryMuscleGroups) {
      groups.set(muscle.slug, muscle);
    }
  }

  return [...groups.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function ExerciseButton(props: {
  exercise: CompletedExercise;
  selectedExerciseId: string;
  onSelectExercise(id: string): void;
}): ReactNode {
  return (
    <button
      className="exerciseChoice"
      data-selected={props.selectedExerciseId === props.exercise.id}
      onClick={() => props.onSelectExercise(props.exercise.id)}
      onPointerLeave={handleProgressPointerLeave}
      onPointerMove={handleProgressPointerMove}
      type="button"
    >
      <span className="exerciseChoice__name">{props.exercise.name}</span>
      <span className="exerciseChoice__meta">
        <small>{props.exercise.primaryMuscleGroup.name}</small>
        <strong>{props.exercise.totalSets} sets</strong>
      </span>
      <small className="exerciseChoice__date">Last trained {shortDate(props.exercise.lastDoneAt)}</small>
    </button>
  );
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}
