"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { WorkoutSummary } from "../../shared/api/types";
import { formatDay, formatMinutes } from "../../shared/format";
import { IconForward } from "../../shared/ui/icons";

/** One past workout in the grouped list. The whole row opens the full workout page. */
export function HistoryRow({
  detailHref,
  onToggle,
  workout
}: {
  detailHref?: string;
  /** Called when the row is tapped, before navigating (the onboarding demo records the lesson step). */
  onToggle?: () => void;
  /** Accepted so the onboarding demo still compiles; rows no longer expand. */
  detail?: unknown;
  isExpanded?: boolean;
  workout: WorkoutSummary;
}): ReactNode {
  const sets = `${workout.totalSets} ${workout.totalSets === 1 ? "set" : "sets"}`;

  return (
    <li>
      <Link className="flex min-h-[3.75rem] items-center gap-3 px-4 py-2 active:bg-surface-raised" href={detailHref ?? `/workouts/${workout.id}`} {...(onToggle ? { onClick: onToggle } : {})}>
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
          </span>
        </span>
        <IconForward className="shrink-0 text-text-muted" />
      </Link>
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
