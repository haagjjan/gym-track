"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { EmptyState, ErrorState, Skeleton } from "../../shared/ui/ui";
import { useExercises } from "../../shared/api/hooks";
import type { Exercise } from "../../shared/api/types";
import { errorMessage } from "../../shared/api/client";
import { IconCheck, IconClose, IconPlus } from "../shell/icons";
import {
  FacetFilters,
  emptyFacetFilters,
  type FacetFilterValue
} from "../workouts/facet-filters";
import { ExerciseMuscleBadges } from "./exercise-muscle-badges";

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
  onClose,
  onSelect
}: ExercisePickerProps): ReactNode {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filters, setFilters] = useState<FacetFilterValue>(emptyFacetFilters);
  const [sort, setSort] = useState<"name" | "muscle" | "equipment" | "type">("name");
  const inputRef = useRef<HTMLInputElement>(null);
  const exercises = useExercises({ search: debounced, ...filters, sort });

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(query), 180);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !document.querySelector('[role="alertdialog"]')) onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-void/70 backdrop-blur-sm lg:items-center" role="presentation">
      <section aria-labelledby="exercise-picker-title" aria-modal="true" className="glass-cyan flex max-h-[92dvh] w-full flex-col rounded-t-xl p-4 lg:max-h-[84dvh] lg:max-w-2xl lg:rounded-xl" role="dialog">
        <header className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="label-caps text-outline">EXERCISE_CATALOG</p>
            <h2 className="font-display text-lg font-bold text-fg" id="exercise-picker-title">{title}</h2>
          </div>
          <button aria-label="Close exercise picker" className="flex size-11 items-center justify-center rounded border border-outline-dim text-fg-muted hover:border-cyan hover:text-cyan" onClick={onClose} type="button"><IconClose /></button>
        </header>

        <div>
          <input aria-label="Search exercises" className="min-h-12 w-full rounded border border-outline-dim bg-surface-low/60 px-3 font-mono text-base text-fg placeholder:text-outline focus:border-cyan focus:outline-none" onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Scan catalog… Search exercise or muscle" ref={inputRef} type="search" value={query} />
        </div>

        <div className="my-2">
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
          {exercises.isLoading ? <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
            : exercises.isError ? <ErrorState message={errorMessage(exercises.error, "Exercises could not be loaded.")} retry={() => void exercises.refetch()} />
            : (exercises.data ?? []).length === 0 ? <EmptyState title="NO_MATCH" message="No exercise matches the current search and filters." />
            : sort === "muscle" && debounced.length === 0 ? <GroupedResults exercises={exercises.data ?? []} isSubmitting={isSubmitting} onSelect={onSelect} selectedIds={selectedIds} selectionMode={selectionMode} />
            : <div className="space-y-1.5">{(exercises.data ?? []).map((exercise) => <ExerciseResult exercise={exercise} isSubmitting={isSubmitting} key={exercise.id} onSelect={onSelect} selected={selectedIds.includes(exercise.id)} selectionMode={selectionMode} />)}</div>}
        </div>

        {footer ? <footer className="max-h-[60dvh] shrink-0 overflow-y-auto border-t border-outline-dim/60 pt-3">{footer}</footer> : null}
      </section>
    </div>
  );
}

function GroupedResults({ exercises, isSubmitting, onSelect, selectedIds, selectionMode }: { exercises: Exercise[]; isSubmitting: boolean; onSelect: ExercisePickerProps["onSelect"]; selectedIds: readonly string[]; selectionMode: "multiple" | "single" }): ReactNode {
  const groups = new Map<string, Exercise[]>();
  for (const exercise of exercises) {
    const muscle = primaryMuscle(exercise);
    groups.set(muscle, [...(groups.get(muscle) ?? []), exercise]);
  }
  return [...groups.entries()].map(([muscle, items]) => <section className="mb-3" key={muscle}><h3 className="label-caps sticky top-0 z-10 bg-surface/95 py-1 text-lavender">{muscle}</h3><div className="space-y-1.5">{items.map((exercise) => <ExerciseResult exercise={exercise} isSubmitting={isSubmitting} key={exercise.id} onSelect={onSelect} selected={selectedIds.includes(exercise.id)} selectionMode={selectionMode} />)}</div></section>);
}

function ExerciseResult({ exercise, isSubmitting, onSelect, selected, selectionMode }: { exercise: Exercise; isSubmitting: boolean; onSelect: ExercisePickerProps["onSelect"]; selected: boolean; selectionMode: "multiple" | "single" }): ReactNode {
  return <button aria-pressed={selectionMode === "multiple" ? selected : undefined} className={`flex min-h-16 w-full items-center justify-between gap-3 rounded border px-3 text-left disabled:opacity-50 ${selected ? "border-cyan bg-cyan/10" : "border-outline-dim/60 bg-surface-low/40 hover:border-cyan/60"}`} disabled={isSubmitting} onClick={() => void onSelect(exercise)} type="button"><span className="min-w-0"><span className="block truncate text-sm text-fg">{exercise.name}</span><ExerciseMuscleBadges exercise={exercise} /></span>{selected ? <IconCheck className="shrink-0 text-cyan" /> : <IconPlus className="shrink-0 text-cyan-dim" />}</button>;
}

function primaryMuscle(exercise: Exercise): string {
  return exercise.muscleGroups.find((muscle) => muscle.role === "PRIMARY")?.name ?? "Unassigned";
}
