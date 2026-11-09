import type { ReactNode } from "react";
import type { CompletedExercise, MuscleGroup } from "./analytics-types";
import { ProgressEmptyState } from "./analytics-widgets";
import { ProgressExerciseList } from "./progress-exercise-list";
import {
  handleProgressPointerLeave,
  handleProgressPointerMove
} from "./progress-pointer";

export function ProgressSelectorPanel({
  exercises,
  filteredExercises,
  isLoadingExercises,
  muscleGroups,
  onClearFilters,
  onSearchQueryChange,
  onSelectExercise,
  onSelectMuscle,
  searchQuery,
  selectedExerciseId,
  selectedMuscleSlug
}: {
  exercises: CompletedExercise[];
  filteredExercises: CompletedExercise[];
  isLoadingExercises: boolean;
  muscleGroups: MuscleGroup[];
  onClearFilters(): void;
  onSearchQueryChange(value: string): void;
  onSelectExercise(id: string): void;
  onSelectMuscle(slug: string): void;
  searchQuery: string;
  selectedExerciseId: string;
  selectedMuscleSlug: string;
}): ReactNode {
  return (
    <aside
      className="progressSelectorPanel progressReactive"
      aria-label="Completed exercises"
      onPointerLeave={handleProgressPointerLeave}
      onPointerMove={handleProgressPointerMove}
    >
      <div className="progressSectionHeader compactHeader">
        <div>
          <p className="eyebrow">Exercise library</p>
          <h2>Logged movements</h2>
        </div>
      </div>

      <label className="progressSearchField">
        <span>Search</span>
        <input
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Bench, squat, pulldown..."
          type="search"
          value={searchQuery}
        />
      </label>

      <label className="progressSearchField">
        <span>Muscle filter</span>
        <select value={selectedMuscleSlug} onChange={(event) => onSelectMuscle(event.target.value)}>
          <option value="">All muscle groups</option>
          {muscleGroups.map((muscle) => (
            <option key={muscle.slug} value={muscle.slug}>{muscle.name}</option>
          ))}
        </select>
      </label>

      <div className="progressSelectorMeta">
        <span>{filteredExercises.length} visible</span>
        <span>{exercises.length} trained</span>
      </div>

      {isLoadingExercises ? (
        <ProgressEmptyState title="LOADING_LIBRARY" message="Reading completed exercise history." />
      ) : null}

      {!isLoadingExercises && exercises.length === 0 ? (
        <ProgressEmptyState
          title="NO_EXERCISES_DONE"
          message="Finish a workout with working sets to activate progress analysis."
        />
      ) : null}

      {!isLoadingExercises && exercises.length > 0 && filteredExercises.length === 0 ? (
        <div className="progressFilteredEmpty">
          <ProgressEmptyState title="NO_MATCHING_EXERCISES" message="Clear filters or search for another lift." />
          <button className="progressGhostButton" onClick={onClearFilters} type="button">CLEAR_FILTERS</button>
        </div>
      ) : null}

      {!isLoadingExercises && filteredExercises.length > 0 ? (
        <ProgressExerciseList
          exercises={filteredExercises}
          selectedExerciseId={selectedExerciseId}
          onSelectExercise={onSelectExercise}
        />
      ) : null}
    </aside>
  );
}
