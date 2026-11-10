"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { buttonClass } from "../../shared/ui/button";
import { IconChevronDown } from "../../shared/ui/icons";
import { Sheet } from "../../shared/ui/sheet";
import { Skeleton } from "../../shared/ui/ui";
import type { CompletedExercise } from "../../shared/api/types";
import { formatDay } from "../../shared/format";
import { ExerciseOption } from "./progress-panels";

interface ProgressExerciseSelectorProps {
  exercises: CompletedExercise[];
  /** Keep the list on screen on phones too (the guided example teaches with it). */
  inline?: boolean;
  isLoading: boolean;
  onSelect: (exerciseId: string) => void;
  selectedId: string | null;
}

const fieldClass = "min-h-[3.125rem] w-full rounded-[var(--radius-control)] border border-control-line bg-surface-raised px-3 text-body text-text placeholder:text-text-muted";

/**
 * Phones: one row with the current exercise; tapping it opens a picker sheet.
 * Desktop: the searchable list stays in the side column.
 */
export function ProgressExerciseSelector(props: ProgressExerciseSelectorProps): ReactNode {
  const [sheetOpen, setSheetOpen] = useState(false);
  const selected = props.exercises.find((exercise) => exercise.id === props.selectedId) ?? null;

  if (props.inline) return <ExercisePicker {...props} />;

  return (
    <>
      <div className="lg:hidden">
        {props.isLoading ? <Skeleton className="h-[3.75rem]" /> : selected ? (
          // Reads as the screen's subtitle: the exercise you're looking at, tap to change.
          <button
            aria-label={`Exercise: ${selected.name}. Change exercise`}
            className="-mx-1 flex min-h-11 max-w-full items-center gap-1 rounded-[var(--radius-control)] px-1 text-left active:bg-surface-raised"
            onClick={() => setSheetOpen(true)}
            type="button"
          >
            <span className="min-w-0">
              <span className="block truncate text-title-3 text-text">{selected.name}</span>
              <span className="block truncate text-footnote text-text-secondary">{selected.primaryMuscleGroup.name}, last trained {formatDay(selected.lastDoneAt)}</span>
            </span>
            <IconChevronDown className="shrink-0 text-accent" />
          </button>
        ) : (
          <ExercisePicker {...props} />
        )}
        <Sheet className="max-h-[85dvh] overflow-y-auto" isOpen={sheetOpen} labelledBy="progress-exercise-title" onClose={() => setSheetOpen(false)} portal>
          <h2 className="mb-3 mt-1 text-title-3 text-text outline-none" data-modal-initial-focus id="progress-exercise-title" tabIndex={-1}>Choose an exercise</h2>
          <ExercisePicker {...props} onSelect={(id) => { props.onSelect(id); setSheetOpen(false); }} />
        </Sheet>
      </div>
      <div className="hidden lg:block">
        <h2 className="mb-2 px-1 text-title-3 text-text">Choose an exercise</h2>
        <ExercisePicker {...props} />
      </div>
    </>
  );
}

function ExercisePicker(props: ProgressExerciseSelectorProps): ReactNode {
  const [muscleSlug, setMuscleSlug] = useState("");
  const [search, setSearch] = useState("");

  const muscleGroups = useMemo(() => {
    const seen = new Map<string, string>();
    for (const exercise of props.exercises) seen.set(exercise.primaryMuscleGroup.slug, exercise.primaryMuscleGroup.name);
    return [...seen.entries()].map(([slug, name]) => ({ slug, name }));
  }, [props.exercises]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return props.exercises.filter((exercise) => {
      if (muscleSlug && exercise.primaryMuscleGroup.slug !== muscleSlug) return false;
      return query.length === 0 || exercise.name.toLowerCase().includes(query);
    });
  }, [muscleSlug, props.exercises, search]);

  return (
    <section>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <input aria-label="Search exercises" className={fieldClass} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Search" type="search" value={search} />
        <select aria-label="Filter by muscle group" className={fieldClass} onChange={(event) => setMuscleSlug(event.currentTarget.value)} value={muscleSlug}>
          <option value="">All muscles</option>
          {muscleGroups.map((group) => <option key={group.slug} value={group.slug}>{group.name}</option>)}
        </select>
      </div>
      <div className={`mt-3 ${props.inline ? "max-h-[46dvh] overflow-y-auto" : "lg:max-h-[58dvh] lg:overflow-y-auto"}`}>
        {props.isLoading ? <div className="space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div> : filtered.length === 0 ? (
          props.exercises.length === 0 ? (
            <div className="px-1 py-4">
              <p className="text-body text-text-secondary">Log sets in a workout and your exercises will show up here.</p>
              <Link className={`${buttonClass("secondary", "compact")} mt-3`} href="/workout">Start workout</Link>
            </div>
          ) : <p className="px-1 py-4 text-body text-text-secondary">No exercises match your search.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
            {filtered.map((exercise) => <li key={exercise.id}><ExerciseOption exercise={exercise} isActive={exercise.id === props.selectedId} onSelect={() => props.onSelect(exercise.id)} /></li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
