"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button, buttonClass } from "../../shared/ui/button";
import { Skeleton } from "../../shared/ui/ui";
import type { CompletedExercise } from "../../shared/api/types";
import { ExerciseOption } from "./progress-panels";

interface ProgressExerciseSelectorProps {
  exercises: CompletedExercise[];
  autoCollapse?: boolean;
  isLoading: boolean;
  onSelect: (exerciseId: string) => void;
  selectedId: string | null;
}

const fieldClass = "min-h-[3.125rem] w-full rounded-[var(--radius-control)] border border-control-line bg-surface-raised px-3 text-body text-text placeholder:text-text-muted";

export function ProgressExerciseSelector(props: ProgressExerciseSelectorProps): ReactNode {
  const [muscleSlug, setMuscleSlug] = useState("");
  const [search, setSearch] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const hasAutoCollapsed = useRef(false);

  useEffect(() => {
    if (props.autoCollapse !== false && props.selectedId !== null && !hasAutoCollapsed.current) {
      hasAutoCollapsed.current = true;
      setIsExpanded(false);
    }
  }, [props.selectedId, props.autoCollapse]);

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
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <h2 className="text-title-3 text-text">Choose an exercise</h2>
        {props.exercises.length > 0 ? <Button aria-expanded={isExpanded} className="lg:hidden" onClick={() => setIsExpanded((value) => !value)} size="compact" variant="plain">{isExpanded ? "Hide list" : "Show list"}</Button> : null}
      </div>
      <div className={`${isExpanded ? "block" : "hidden"} lg:block`}>
        <div className="space-y-2">
          <input aria-label="Search exercises" className={fieldClass} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Search" type="search" value={search} />
          <select aria-label="Filter by muscle group" className={fieldClass} onChange={(event) => setMuscleSlug(event.currentTarget.value)} value={muscleSlug}>
            <option value="">All muscle groups</option>
            {muscleGroups.map((group) => <option key={group.slug} value={group.slug}>{group.name}</option>)}
          </select>
        </div>
        <div className="mt-3 max-h-[46dvh] overflow-y-auto lg:max-h-[58dvh]">
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
      </div>
    </section>
  );
}
