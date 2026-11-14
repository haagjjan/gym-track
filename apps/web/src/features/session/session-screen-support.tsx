"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ErrorState, Skeleton } from "../../shared/ui/ui";
import { StatTile } from "../../shared/ui/stat-tile";
import { errorMessage } from "../../shared/api/client";
import type { SessionExercise } from "../../shared/api/types";
import { formatCompactNumber } from "../../shared/format";

export interface SessionTotals { cardioEntries?: number; sets: number; workingSets: number; volume: number }

export function resolveActiveExercise(
  exercises: SessionExercise[],
  requestedId: string | null
): SessionExercise | null {
  return exercises.find((exercise) => exercise.id === requestedId) ?? exercises[0] ?? null;
}

export function calculateSessionTotals(exercises: SessionExercise[]): SessionTotals {
  return exercises.reduce<SessionTotals>((total, exercise) => exercise.sets.reduce<SessionTotals>((next, set) => ({ sets: next.sets + 1, workingSets: next.workingSets + (set.setType === "working" ? 1 : 0), volume: next.volume + Number(set.weightKg) * set.reps }), total), { sets: 0, workingSets: 0, volume: 0 });
}

export function SessionStats({ exercises, totals }: { exercises: number; totals: SessionTotals }): ReactNode {
  return (
    <aside aria-label="Workout totals" className="hidden lg:block">
      <dl className="sticky top-20 grid grid-cols-2 gap-4 rounded-[var(--radius-card)] bg-surface p-4">
        <StatTile label="Exercises" value={exercises} />
        <StatTile label="Sets" value={totals.sets} />
        <StatTile label="Working sets" value={totals.workingSets} />
        <StatTile label="Volume" unit="kg" value={formatCompactNumber(totals.volume)} />
      </dl>
    </aside>
  );
}

export function SessionSkeleton(): ReactNode {
  return <main className="mx-auto max-w-3xl space-y-3 p-4"><Skeleton className="h-14" /><Skeleton className="h-56" /><Skeleton className="h-72" /></main>;
}

export function SessionError({ error, retry }: { error: unknown; retry: () => void }): ReactNode {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <h1 className="text-title-1 text-text">Workout</h1>
      <ErrorState message={errorMessage(error, "Check your connection and try again.")} retry={retry} title="Couldn't load this workout" />
      <Link className="inline-flex min-h-11 items-center text-body text-accent" href="/workouts">Go to history</Link>
    </main>
  );
}
