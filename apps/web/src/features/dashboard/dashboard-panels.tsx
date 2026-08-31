"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState, Skeleton } from "../../shared/ui/ui";
import type { ExerciseSummaryPayload, WorkoutSummary } from "../../shared/api/types";
import { cockpitLabel, formatDuration, formatKgValue, shortDate } from "../../shared/format";
import { IconChevronRight } from "../shell/icons";
import { useBiometrics } from "./use-biometrics";

export interface PerformanceRowItem {
  id: string;
  name: string;
  totalSets: number;
}

export function AvatarFallback({ label }: { label: string }): ReactNode {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="label-caps animate-pulse-slow text-cyan-dim">{label}</p>
    </div>
  );
}

export function IdentityRows(): ReactNode {
  const { biometrics, isLoaded } = useBiometrics();
  const rows = [
    { label: "Height", value: biometrics.heightCm ? `${biometrics.heightCm} cm` : "—" },
    { label: "Weight", value: biometrics.weightKg ? `${biometrics.weightKg} kg` : "—" }
  ];
  if (!isLoaded) return <Skeleton className="mt-3 h-10" />;

  return (
    <dl className="mt-3 space-y-1.5">
      {rows.map((row) => (
        <div className="flex items-baseline justify-between gap-2" key={row.label}>
          <dt className="text-xs text-fg-muted">{row.label}</dt>
          <dd className="font-mono text-sm tracking-[0.05em] text-fg">{row.value}</dd>
        </div>
      ))}
      {!biometrics.heightCm && !biometrics.weightKg ? (
        <Link className="label-caps mt-1 inline-block text-cyan-dim hover:text-cyan" href="/settings">
          Add yours in Settings →
        </Link>
      ) : null}
    </dl>
  );
}

export function PerformanceRows({
  exercises,
  hasPins,
  isLoading,
  summaries
}: {
  exercises: PerformanceRowItem[];
  hasPins: boolean;
  isLoading: boolean;
  summaries: ExerciseSummaryPayload[];
}): ReactNode {
  if (isLoading) {
    return <div className="space-y-2"><Skeleton className="h-9" /><Skeleton className="h-9" /><Skeleton className="h-9" /></div>;
  }
  if (exercises.length === 0) {
    return <EmptyState action={<Link className="label-caps text-cyan-dim hover:text-cyan" href="/settings">Pin lifts in Settings →</Link>} message="Pin your favourite lifts in Settings, or log working sets and they will appear here." title="No lifts tracked yet" />;
  }

  return (
    <>
      <ul className="space-y-2.5">
        {exercises.map((exercise) => {
          const topSet = summaries.find((item) => item.exerciseId === exercise.id)?.bestTopSet;
          return (
            <li className="flex items-baseline justify-between gap-2" key={exercise.id}>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-fg">{exercise.name}</p>
                <p className="truncate text-[10px] uppercase tracking-[0.08em] text-outline">
                  {topSet ? `${formatKgValue(topSet.weightKg)}kg × ${topSet.reps} // ${shortDate(topSet.sessionDate)}` : exercise.totalSets > 0 ? `${exercise.totalSets} sets logged` : "No sets yet"}
                </p>
              </div>
              <p className="whitespace-nowrap font-mono text-base font-medium tracking-[0.05em] text-green">
                {topSet ? `${formatKgValue(topSet.estimatedOneRepMaxKg)} KG` : "—"}
              </p>
            </li>
          );
        })}
      </ul>
      {!hasPins ? <Link className="mt-2.5 block text-[10px] uppercase tracking-[0.08em] text-outline transition-colors hover:text-cyan" href="/settings">Auto-derived — pin your own in Settings →</Link> : null}
    </>
  );
}

export function SessionRows({ isLoading, sessions }: { isLoading: boolean; sessions: WorkoutSummary[] }): ReactNode {
  if (isLoading) return <div className="space-y-2"><Skeleton className="h-11" /><Skeleton className="h-11" /><Skeleton className="h-11" /></div>;
  if (sessions.length === 0) return <EmptyState message="Finished workouts collect here, one tap from a full review." title="No workouts yet" />;
  return (
    <ul className="space-y-1.5">
      {sessions.map((session) => (
        <li key={session.id}>
          <Link className="flex min-h-11 items-center justify-between gap-2 rounded border border-cyan/20 bg-surface-low/50 px-3 py-2 transition-colors hover:border-cyan/60 hover:bg-surface-low" href={`/workouts/${session.id}`}>
            <span className="min-w-0">
              <span className="block truncate font-display text-xs font-bold uppercase tracking-[0.1em] text-fg">{sessionTitle(session)}</span>
              <span className="block text-[10px] uppercase tracking-[0.08em] text-outline">{`${shortDate(session.startedAt)} // ${session.totalSets} sets // ${formatDuration(session.startedAt, session.endedAt)}`}</span>
            </span>
            <IconChevronRight className="shrink-0 text-outline" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function QuickLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }): ReactNode {
  return (
    <Link className="flex min-h-11 items-center gap-3 rounded px-3 text-fg-muted transition-colors hover:bg-surface-low hover:text-cyan" href={href}>
      <span aria-hidden className="flex text-cyan-dim"><IconChevronRight /><IconChevronRight className="-ml-2.5" /></span>
      {icon}<span className="label-caps">{label}</span>
    </Link>
  );
}

export function BiometricRows({ systemCharge }: { systemCharge: number }): ReactNode {
  const { biometrics, isLoaded } = useBiometrics();
  if (!isLoaded) return <Skeleton className="h-28" />;
  const rows = [
    { label: "Age", value: biometrics.age !== null ? String(biometrics.age) : "—", unit: "" },
    { label: "Height", value: biometrics.heightCm !== null ? String(biometrics.heightCm) : "—", unit: "CM" },
    { label: "Weight", value: biometrics.weightKg !== null ? String(biometrics.weightKg) : "—", unit: "KG" },
    { label: "Body fat", value: biometrics.bodyFatPct !== null ? String(biometrics.bodyFatPct) : "—", unit: "%" }
  ];
  return (
    <div>
      <dl className="space-y-1.5">
        {rows.map((row) => <div className="flex items-baseline justify-between gap-2" key={row.label}><dt className="label-caps text-outline">{row.label}</dt><dd className="font-mono text-sm tracking-[0.05em] text-fg">{row.value}{row.unit ? <span className="ml-1 text-[10px] text-outline">{row.unit}</span> : null}</dd></div>)}
      </dl>
      <div className="mt-4">
        <div className="flex items-baseline justify-between"><p className="label-caps text-outline">Weekly volume</p><p className="font-mono text-sm text-lavender">{systemCharge}%</p></div>
        <div aria-hidden className="mt-1.5 h-1 rounded-full bg-surface-high"><div className="h-full rounded-full bg-lavender shadow-glow-lavender transition-all duration-700" style={{ width: `${systemCharge}%` }} /></div>
        <p className="mt-1 text-[10px] text-outline">Weekly working sets vs 48-set target.</p>
      </div>
    </div>
  );
}

export function LatestLogs({ isLoading, sessions }: { isLoading: boolean; sessions: WorkoutSummary[] }): ReactNode {
  if (isLoading) return <Skeleton className="mt-2 h-9" />;
  if (sessions.length === 0) return <p className="mt-2 text-xs text-fg-muted">No workouts logged yet — your first one will show up here.</p>;
  return (
    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
      {sessions.map((session) => (
        <Link className="group min-w-0" href={`/workouts/${session.id}`} key={session.id}>
          <span className="block text-[10px] uppercase tracking-[0.08em] text-outline">{shortDate(session.startedAt)}</span>
          <span className="block truncate font-display text-xs font-bold uppercase tracking-[0.1em] text-fg-muted transition-colors group-hover:text-cyan">{sessionTitle(session)}</span>
        </Link>
      ))}
    </div>
  );
}

function sessionTitle(session: WorkoutSummary): string {
  if (session.title) return cockpitLabel(session.title);
  if (session.workoutType) return cockpitLabel(session.workoutType);
  return `SESSION_${shortDate(session.startedAt).replace(/\s+/g, "_")}`;
}
