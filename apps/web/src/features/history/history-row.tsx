"use client";

import { TrackingReadout } from "../tracking/tracking-readout";
import Link from "next/link";
import { useId, type ReactNode } from "react";
import { useWorkout } from "../../shared/api/hooks";
import type { SessionExercise, WorkoutDetail, WorkoutSummary } from "../../shared/api/types";
import { formatDay, formatKgValue, formatMinutes } from "../../shared/format";
import { buttonClass } from "../../shared/ui/button";
import { IconChevronDown } from "../../shared/ui/icons";
import { Skeleton } from "../../shared/ui/ui";

/**
 * One workout in the History list. Tapping the row opens a quick view of its
 * exercises and sets in place; "Open workout" goes to the full page.
 */
export function HistoryRow({
  extendedTracking = false,
  detail,
  detailHref,
  isExpanded,
  onToggle,
  workout
}: {
  extendedTracking?: boolean;
  /** Preloaded detail (the example). Without it the row fetches when opened. */
  detail?: WorkoutDetail | undefined;
  detailHref?: string;
  isExpanded: boolean;
  onToggle: () => void;
  workout: WorkoutSummary;
}): ReactNode {
  const panelId = useId();
  const sets = `${workout.totalSets} ${workout.totalSets === 1 ? "set" : "sets"}`;

  return (
    <li>
      <button
        aria-controls={panelId}
        aria-expanded={isExpanded}
        className="flex min-h-[3.75rem] w-full items-center gap-3 px-4 py-2 text-left active:bg-surface-raised"
        onClick={onToggle}
        type="button"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-headline text-text">{historyTitle(workout)}</span>
          <span className="mt-0.5 flex flex-wrap gap-x-3 text-subhead text-text-secondary">
            <span>{formatDay(workout.startedAt)}</span>
            {workout.isOpen ? (
              <span className="font-semibold text-accent">In progress</span>
            ) : (
              <span className="num">{formatMinutes(workout.startedAt, workout.endedAt)}</span>
            )}
            <span className="num">{sets}</span>
            {extendedTracking && workout.cardioEntries ? <span className="num">{workout.cardioEntries} cardio</span> : null}
          </span>
        </span>
        <IconChevronDown className={`shrink-0 text-text-muted transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
      </button>
      {isExpanded ? (
        <div className="border-t border-line px-4 pb-4 pt-3" id={panelId}>
          {detail ? <QuickView detail={detail} showEmpty={!extendedTracking} /> : <FetchedQuickView extendedTracking={extendedTracking} workoutId={workout.id} />}
          {extendedTracking ? <TrackingReadout workoutId={workout.id} /> : null}
          <Link className={`${buttonClass("secondary")} mt-4 w-full`} href={detailHref ?? `/workouts/${workout.id}`}>
            Open workout
          </Link>
        </div>
      ) : null}
    </li>
  );
}

function FetchedQuickView({ workoutId, extendedTracking }: { workoutId: string; extendedTracking: boolean }): ReactNode {
  const query = useWorkout(workoutId);
  if (query.isLoading) return <Skeleton className="h-24" />;
  if (query.isError || !query.data) return <p className="text-subhead text-danger" role="alert">Couldn&apos;t load the sets. Check your connection and try again.</p>;
  return <QuickView detail={query.data} showEmpty={!extendedTracking} />;
}

function QuickView({ detail, showEmpty = true }: { detail: WorkoutDetail; showEmpty?: boolean }): ReactNode {
  if (detail.exercises.length === 0) return showEmpty ? <p className="text-subhead text-text-secondary">No exercises recorded.</p> : null;
  return (
    <ul className="space-y-3">
      {detail.exercises.map((exercise) => <QuickExercise exercise={exercise} key={exercise.id} />)}
    </ul>
  );
}

function QuickExercise({ exercise }: { exercise: SessionExercise }): ReactNode {
  return (
    <li>
      <p className="text-callout font-semibold text-text">{exercise.exercise.name}</p>
      {exercise.sets.length === 0 ? (
        <p className="text-subhead text-text-secondary">No sets</p>
      ) : (
        <ul aria-label={`Sets for ${exercise.exercise.name}`} className="mt-1 flex flex-wrap gap-1.5">
          {exercise.sets.map((set) => (
            // Warm-ups get a faint warm tint and muted text; working sets stay neutral.
            <li
              className={`num rounded-full px-2.5 py-1 text-footnote ${set.setType === "warmup" ? "bg-warning/12 text-text-secondary" : "bg-surface-raised text-text"}`}
              key={set.id}
            >
              {set.setType === "warmup" ? <span className="mr-1 font-semibold text-warning">W<span className="sr-only">arm-up</span></span> : null}
              {formatKgValue(set.weightKg)} kg × {set.reps}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function historyTitle(workout: WorkoutSummary): string {
  if (workout.title) return workout.title;
  if (workout.workoutType) return humanise(workout.workoutType);
  return "Workout";
}

function humanise(value: string): string {
  const spaced = value.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
