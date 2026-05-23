import type { ReactNode } from "react";
import type { CompletedExercise, MuscleGroup } from "./analytics-types";

export function ProgressExerciseList(props: {
  exercises: CompletedExercise[];
  muscleGroups: MuscleGroup[];
  openMuscleSlug: string;
  selectedExerciseId: string;
  selectedMuscleSlug: string;
  onOpenMuscle(slug: string): void;
  onSelectExercise(id: string): void;
}): ReactNode {
  if (!props.selectedMuscleSlug) {
    return (
      <div className="exerciseChoiceList">
        {props.exercises.map((exercise) => (
          <ExerciseButton key={exercise.id} exercise={exercise} {...props} />
        ))}
      </div>
    );
  }

  return (
    <div className="muscleAccordion">
      {props.muscleGroups.map((muscle) => (
        <MuscleExerciseSection key={muscle.slug} muscle={muscle} {...props} />
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

function MuscleExerciseSection(props: {
  exercises: CompletedExercise[];
  muscle: MuscleGroup;
  openMuscleSlug: string;
  selectedExerciseId: string;
  onOpenMuscle(slug: string): void;
  onSelectExercise(id: string): void;
}): ReactNode {
  const isOpen = props.openMuscleSlug === props.muscle.slug;
  const primary = props.exercises.filter(
    (exercise) => exercise.primaryMuscleGroup.slug === props.muscle.slug
  );
  const secondary = props.exercises.filter((exercise) =>
    exercise.secondaryMuscleGroups.some((item) => item.slug === props.muscle.slug)
  );

  return (
    <section className="muscleGroupSection">
      <button type="button" onClick={() => props.onOpenMuscle(isOpen ? "" : props.muscle.slug)}>
        <span>{props.muscle.name}</span>
        <strong>{primary.length + secondary.length}</strong>
      </button>
      {isOpen ? (
        <div className="exerciseChoiceList">
          <p className="listSubhead">Primary</p>
          {primary.map((exercise) => <ExerciseButton key={exercise.id} exercise={exercise} {...props} />)}
          <p className="listSubhead">Secondary</p>
          {secondary.map((exercise) => <ExerciseButton key={exercise.id} exercise={exercise} {...props} />)}
        </div>
      ) : null}
    </section>
  );
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
      type="button"
    >
      <span>{props.exercise.name}</span>
      <small>
        {props.exercise.primaryMuscleGroup.name} · {shortDate(props.exercise.lastDoneAt)}
      </small>
    </button>
  );
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}
