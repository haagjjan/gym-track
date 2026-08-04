"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ErrorState, Metric, Skeleton } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import type { SessionExercise } from "../../shared/api/types";
import { formatNumber } from "../../shared/format";

export interface SessionTotals { sets: number; workingSets: number; volume: number }

export function calculateSessionTotals(exercises: SessionExercise[]): SessionTotals {
  return exercises.reduce<SessionTotals>((total, exercise) => exercise.sets.reduce<SessionTotals>((next, set) => ({ sets: next.sets + 1, workingSets: next.workingSets + (set.setType === "working" ? 1 : 0), volume: next.volume + Number(set.weightKg) * set.reps }), total), { sets: 0, workingSets: 0, volume: 0 });
}

export function SessionStats({ exercises, totals }: { exercises: number; totals: SessionTotals }): ReactNode {
  return <aside className="hidden lg:block"><div className="glass sticky top-20 rounded-xl p-4"><div className="grid grid-cols-2 gap-3"><Metric label="EXERCISES" value={exercises} /><Metric label="SETS" value={totals.sets} /><Metric label="WORKING" tone="cyan" value={totals.workingSets} /><Metric detail="kg total" label="TONNAGE" value={formatNumber(totals.volume)} /></div></div></aside>;
}

export function SessionSkeleton(): ReactNode {
  return <main className="mx-auto max-w-3xl space-y-3 p-4"><Skeleton className="h-14" /><Skeleton className="h-56" /><Skeleton className="h-72" /></main>;
}

export function SessionError({ error, retry }: { error: unknown; retry: () => void }): ReactNode {
  return <main className="mx-auto max-w-3xl p-4"><ErrorState message={errorMessage(error, "This workout could not be loaded.")} retry={retry} title="WORKOUT_UNREACHABLE" /><Link className="label-caps mt-4 inline-block text-cyan" href="/workouts">← Back to workouts</Link></main>;
}
