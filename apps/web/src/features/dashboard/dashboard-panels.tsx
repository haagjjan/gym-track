"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Skeleton } from "../../shared/ui/ui";
import type { ExerciseSummaryPayload, WorkoutSummary } from "../../shared/api/types";
import { formatDay, formatKgValue, formatMinutes } from "../../shared/format";
import { IconForward } from "../../shared/ui/icons";

export interface PerformanceRowItem {
  id: string;
  name: string;
  totalSets: number;
}

const groupClass = "divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface";
const inlineLinkClass = "inline-flex min-h-11 items-center text-body text-accent";

export function AvatarFallback({ label }: { label: string }): ReactNode {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-subhead text-text-secondary">{label}</p>
    </div>
  );
}

function TrophyIcon(): ReactNode {
  return (
    <svg aria-hidden fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" viewBox="0 0 24 24" width="20">
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M8.5 20h7" />
    </svg>
  );
}

function EmptyCard({ action, children }: { action?: ReactNode; children: ReactNode }): ReactNode {
  return (
    <div className="rounded-[var(--radius-card)] bg-surface p-4">
      <p className="text-subhead text-text-secondary">{children}</p>
      {action}
    </div>
  );
}

export function PerformanceRows({
  exercises,
  isLoading,
  summaries
}: {
  exercises: PerformanceRowItem[];
  isLoading: boolean;
  summaries: ExerciseSummaryPayload[];
}): ReactNode {
  if (isLoading) {
    return <div className="space-y-px overflow-hidden rounded-[var(--radius-card)]"><Skeleton className="h-[60px]" /><Skeleton className="h-[60px]" /><Skeleton className="h-[60px]" /></div>;
  }
  if (exercises.length === 0) {
    return (
      <EmptyCard action={<Link className={inlineLinkClass} href="/settings">Pin lifts in Settings</Link>}>
        Log some working sets, or pin your favourite lifts, and your personal bests will show up here.
      </EmptyCard>
    );
  }

  return (
    <>
      <ul className={groupClass}>
        {exercises.map((exercise) => {
          const topSet = summaries.find((item) => item.exerciseId === exercise.id)?.bestTopSet;
          return (
            <li className="flex min-h-[60px] items-center gap-3 px-4 py-2.5" key={exercise.id}>
              <span aria-hidden className="grid size-8 flex-none place-items-center rounded-lg bg-surface-raised text-text"><TrophyIcon /></span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-headline text-text">{exercise.name}</p>
                <p className="text-subhead text-text-secondary">
                  {topSet
                    ? `Est. 1RM, from ${formatKgValue(topSet.weightKg)} kg × ${topSet.reps}`
                    : exercise.totalSets > 0
                      ? `${exercise.totalSets} sets logged`
                      : "No sets yet :("}
                </p>
              </div>
              <p className="num whitespace-nowrap text-headline text-text">
                {topSet ? <>{formatKgValue(topSet.estimatedOneRepMaxKg)} <span className="font-medium text-text-secondary">kg</span></> : "—"}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function SessionRows({ isLoading, sessions }: { isLoading: boolean; sessions: WorkoutSummary[] }): ReactNode {
  if (isLoading) return <div className="space-y-px overflow-hidden rounded-[var(--radius-card)]"><Skeleton className="h-[60px]" /><Skeleton className="h-[60px]" /><Skeleton className="h-[60px]" /></div>;
  if (sessions.length === 0) return <EmptyCard>No finished workouts yet. Your first one will show up here.</EmptyCard>;
  return (
    <ul className={groupClass}>
      {sessions.map((session) => (
        <li key={session.id}>
          <Link className="flex min-h-[60px] items-center gap-3 px-4 py-2.5" href={`/workouts/${session.id}`}>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 block text-headline text-text">{sessionTitle(session)}</span>
              <span className="block text-subhead text-text-secondary">{`${formatDay(session.startedAt)}, ${session.totalSets} sets, ${formatMinutes(session.startedAt, session.endedAt)}`}</span>
            </span>
            <IconForward className="flex-none text-text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function sessionTitle(session: WorkoutSummary): string {
  if (session.title) return session.title;
  if (session.workoutType) {
    const words = session.workoutType.trim().replace(/[_-]+/g, " ").toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
  return `Workout on ${formatDay(session.startedAt)}`;
}
