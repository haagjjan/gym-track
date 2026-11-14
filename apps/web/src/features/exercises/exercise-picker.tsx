"use client";

import { useExtendedTracking } from "../../shared/extended-tracking";
import type { TrackingModeFilterValue } from "../../shared/api/catalog-hooks";
import { TrackingModeFilter } from "./tracking-mode-filter";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { ErrorState, Skeleton } from "../../shared/ui/ui";
import { useExercisesInfinite } from "../../shared/api/hooks";
import type { Exercise } from "../../shared/api/types";
import { errorMessage } from "../../shared/api/client";
import { Sheet } from "../../shared/ui/sheet";
import { IconCheck24, IconClose, IconPlus24 } from "../../shared/ui/icons";
import {
  FacetFilters,
  emptyFacetFilters,
  type FacetFilterValue
} from "../workouts/facet-filters";
import { ExerciseMuscleBadges } from "./exercise-muscle-badges";
import { fieldClass } from "./field-classes";

const pickerSortOptions = [
  { value: "name", label: "Name A–Z" },
  { value: "muscle", label: "Muscle" },
  { value: "equipment", label: "Equipment" },
  { value: "type", label: "Type" }
];

export interface ExercisePickerProps {
  isOpen: boolean;
  isSubmitting?: boolean;
  title?: string;
  footer?: ReactNode;
  selectionMode?: "multiple" | "single";
  selectedIds?: readonly string[];
  /** Limits the list: `strength` hides cardio, `cardio` shows only cardio. */
  scope?: "strength" | "cardio";
  onClose: () => void;
  onSelect: (exercise: Exercise) => void | Promise<void>;
}

export function ExercisePicker({
  isOpen,
  isSubmitting = false,
  title = "Select exercise",
  footer,
  selectionMode = "single",
  selectedIds = [],
  scope,
  onClose,
  onSelect
}: ExercisePickerProps): ReactNode {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filters, setFilters] = useState<FacetFilterValue>(emptyFacetFilters);
  const [sort, setSort] = useState<"name" | "muscle" | "equipment" | "type">("name");
  const trackingEnabled = useExtendedTracking();
  const [mode, setMode] = useState<TrackingModeFilterValue>("");
  const trackingMode: TrackingModeFilterValue = !trackingEnabled ? "" : scope === "cardio" ? "cardio" : mode || (scope === "strength" ? "strength" : "");
  const exercises = useExercisesInfinite({ search: debounced, ...filters, sort, ...(trackingMode ? { trackingMode } : {}) });
  const exerciseItems = exercises.data?.pages.flatMap((page) => page.items) ?? [];

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(query), 180);
    return () => window.clearTimeout(timeout);
  }, [query]);

  return (
    <Sheet className="flex h-[92dvh] max-h-[92dvh] flex-col sm:h-auto sm:max-h-[84dvh]" closeOnScrim={false} isOpen={isOpen} labelledBy="exercise-picker-title" layer="z-50" onClose={onClose}>
      <header className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-title-3 text-text" id="exercise-picker-title">{title}</h2>
        <button aria-label="Close exercise picker" className="flex size-11 items-center justify-center rounded-full bg-surface text-text-secondary" data-modal-initial-focus onClick={onClose} type="button"><IconClose /></button>
      </header>

      <div className="shrink-0">
        <input aria-label="Search exercises" className={fieldClass} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search by exercise or muscle" type="search" value={query} />
      </div>

      {trackingEnabled && scope !== "cardio" ? (
        <div className="mt-2 shrink-0"><TrackingModeFilter includeCardio={scope !== "strength"} onChange={setMode} value={mode} /></div>
      ) : null}

      <div className="my-2 shrink-0">
        <FacetFilters
          filters={filters}
          onChange={setFilters}
          onClear={() => {
            setFilters(emptyFacetFilters());
            setSort("name");
          }}
          onSortChange={(value) => setSort(value as typeof sort)}
          sort={sort}
          sortOptions={pickerSortOptions}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        {exercises.isLoading ? <div className="space-y-2"><Skeleton className="h-[3.75rem]" /><Skeleton className="h-[3.75rem]" /><Skeleton className="h-[3.75rem]" /></div>
          : exercises.isError ? <ErrorState message={errorMessage(exercises.error, "Couldn't load exercises. Check your connection and try again.")} retry={() => void exercises.refetch()} />
          : exerciseItems.length === 0 ? <p className="rounded-[var(--radius-card)] bg-surface p-4 text-subhead text-text-secondary">No exercises match this search and these filters.</p>
          : <>
              {sort === "muscle" && debounced.length === 0
                ? <GroupedResults exercises={exerciseItems} isSubmitting={isSubmitting} onSelect={onSelect} selectedIds={selectedIds} selectionMode={selectionMode} />
                : <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">{exerciseItems.map((exercise) => <ExerciseResult exercise={exercise} isSubmitting={isSubmitting} key={exercise.id} onSelect={onSelect} selected={selectedIds.includes(exercise.id)} selectionMode={selectionMode} />)}</ul>}
              {exercises.hasNextPage ? <Button className="mt-3 w-full" disabled={exercises.isFetchingNextPage} onClick={() => void exercises.fetchNextPage()} size="compact" variant="secondary">{exercises.isFetchingNextPage ? "Loading…" : "Load more exercises"}</Button> : null}
            </>}
      </div>

      {footer ? <footer className="shrink-0 pt-3">{footer}</footer> : null}
    </Sheet>
  );
}

function GroupedResults({ exercises, isSubmitting, onSelect, selectedIds, selectionMode }: { exercises: Exercise[]; isSubmitting: boolean; onSelect: ExercisePickerProps["onSelect"]; selectedIds: readonly string[]; selectionMode: "multiple" | "single" }): ReactNode {
  const groups = new Map<string, Exercise[]>();
  for (const exercise of exercises) {
    const muscle = primaryMuscle(exercise);
    groups.set(muscle, [...(groups.get(muscle) ?? []), exercise]);
  }
  return [...groups.entries()].map(([muscle, items]) => (
    <section className="mb-4" key={muscle}>
      <h3 className="px-1 pb-1 text-subhead text-text-secondary">{muscle}</h3>
      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">{items.map((exercise) => <ExerciseResult exercise={exercise} isSubmitting={isSubmitting} key={exercise.id} onSelect={onSelect} selected={selectedIds.includes(exercise.id)} selectionMode={selectionMode} />)}</ul>
    </section>
  ));
}

function ExerciseResult({ exercise, isSubmitting, onSelect, selected, selectionMode }: { exercise: Exercise; isSubmitting: boolean; onSelect: ExercisePickerProps["onSelect"]; selected: boolean; selectionMode: "multiple" | "single" }): ReactNode {
  return (
    <li>
      <button aria-pressed={selectionMode === "multiple" ? selected : undefined} className="flex min-h-[3.75rem] w-full items-center justify-between gap-3 px-4 py-2 text-left active:bg-surface-raised disabled:opacity-50" disabled={isSubmitting} onClick={() => void onSelect(exercise)} type="button">
        <span className="min-w-0"><span className="block break-words text-headline text-text">{exercise.name}</span><ExerciseMuscleBadges exercise={exercise} /></span>
        {selected ? <IconCheck24 className="shrink-0 text-accent" /> : <IconPlus24 className="shrink-0 text-text-muted" />}
      </button>
    </li>
  );
}

function primaryMuscle(exercise: Exercise): string {
  return exercise.muscleGroups.find((muscle) => muscle.role === "PRIMARY")?.name ?? "Other";
}
