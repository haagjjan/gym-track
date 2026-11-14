"use client";

import type { ReactNode } from "react";
import type { CompletedExercise } from "../../shared/api/types";
import { IconCheck24 } from "../../shared/ui/icons";

export interface ProgressExerciseChoice extends Pick<CompletedExercise, "id" | "name" | "lastDoneAt" | "plottedSetCount"> {
  primaryMuscleGroup?: CompletedExercise["primaryMuscleGroup"];
  category?: string;
  plottedUnit?: "days";
}

export function ExerciseOption({
  exercise,
  isActive,
  onSelect
}: {
  exercise: ProgressExerciseChoice;
  isActive: boolean;
  onSelect: () => void;
}): ReactNode {
  return (
    <button
      aria-pressed={isActive}
      className="flex min-h-[3.75rem] w-full items-center justify-between gap-3 px-4 py-2 text-left"
      onClick={onSelect}
      type="button"
    >
      <span className="min-w-0">
        <span className={`block truncate text-body ${isActive ? "font-semibold text-accent" : "text-text"}`}>{exercise.name}</span>
        <span className="block text-footnote text-text-secondary">
          {`${exercise.category ?? exercise.primaryMuscleGroup?.name ?? "Exercise"}, ${exercise.plottedSetCount} plotted ${exercise.plottedUnit ?? "sets"}`}
        </span>
      </span>
      {isActive ? <IconCheck24 aria-hidden className="shrink-0 text-accent" /> : null}
    </button>
  );
}

/** Renders nothing when the range has no sets: the chart already says so. */
