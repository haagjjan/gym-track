"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EmptyState, Panel, Skeleton } from "../../shared/ui/ui";
import type { CompletedExercise } from "../../shared/api/types";
import { IconChevronRight } from "../shell/icons";
import { ExerciseOption } from "./progress-panels";

interface ProgressExerciseSelectorProps {
  exercises: CompletedExercise[];
  isLoading: boolean;
  onSelect: (exerciseId: string) => void;
  selectedId: string | null;
}

export function ProgressExerciseSelector(props: ProgressExerciseSelectorProps): ReactNode {
  const [muscleSlug, setMuscleSlug] = useState("");
  const [search, setSearch] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const hasAutoCollapsed = useRef(false);

  useEffect(() => {
    if (props.selectedId !== null && !hasAutoCollapsed.current) {
      hasAutoCollapsed.current = true;
      setIsExpanded(false);
    }
  }, [props.selectedId]);

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
    <Panel
      accent="cyan"
      className={`mb-4 lg:mb-0 ${isExpanded ? "" : "[&>header]:mb-0 lg:[&>header]:mb-3"}`}
      eyebrow="SELECT_LIFT"
      right={<SelectorToggle expanded={isExpanded} onToggle={() => setIsExpanded((value) => !value)} />}
    >
      <div className={`${isExpanded ? "block" : "hidden"} lg:block`}>
        <div className="space-y-2">
          <input aria-label="Search exercises" className="min-h-10 w-full rounded border border-outline-dim bg-surface-low/60 px-3 font-mono text-sm text-fg placeholder:text-outline focus:border-cyan focus:outline-none" onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Search…" type="search" value={search} />
          <select aria-label="Filter by muscle group" className="min-h-10 w-full rounded border border-outline-dim bg-surface-low/60 px-2 font-mono text-xs text-fg focus:border-cyan focus:outline-none" onChange={(event) => setMuscleSlug(event.currentTarget.value)} value={muscleSlug}>
            <option value="">All muscle groups</option>
            {muscleGroups.map((group) => <option key={group.slug} value={group.slug}>{group.name}</option>)}
          </select>
        </div>
        <div className="mt-3 max-h-[46dvh] space-y-1 overflow-y-auto lg:max-h-[58dvh]">
          {props.isLoading ? <><Skeleton className="h-11" /><Skeleton className="h-11" /><Skeleton className="h-11" /></> : filtered.length === 0 ? (
            <EmptyState message={props.exercises.length === 0 ? "Log working sets and lifts will appear here." : "No lift matches the current filter."} title={props.exercises.length === 0 ? "NO_TRACKED_LIFTS" : "NO_MATCH"} />
          ) : filtered.map((exercise) => <ExerciseOption exercise={exercise} isActive={exercise.id === props.selectedId} key={exercise.id} onSelect={() => props.onSelect(exercise.id)} />)}
        </div>
      </div>
    </Panel>
  );
}

function SelectorToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }): ReactNode {
  return <button aria-expanded={expanded} className="label-caps flex cursor-pointer items-center gap-1 text-outline hover:text-cyan lg:hidden" onClick={onToggle} type="button">{expanded ? "COLLAPSE" : "EXPAND"}<IconChevronRight className={`transition-transform ${expanded ? "rotate-90" : ""}`} /></button>;
}
