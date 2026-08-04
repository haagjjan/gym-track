"use client";

import { useMemo, type ReactNode } from "react";
import { EmptyState, Skeleton } from "../../shared/ui/ui";
import type { CompletedExercise, ExerciseProgressItem } from "../../shared/api/types";
import { formatDateTime, formatKgValue } from "../../shared/format";
import type { ChartMode, ChartWindow } from "./progress-chart";
import { selectBestWorkingSets } from "./progress-selection";

export function ExerciseOption({
  exercise,
  isActive,
  onSelect
}: {
  exercise: CompletedExercise;
  isActive: boolean;
  onSelect: () => void;
}): ReactNode {
  return (
    <button
      aria-pressed={isActive}
      className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded border px-3 text-left transition-colors ${isActive ? "border-cyan bg-cyan/10 text-cyan" : "border-outline-dim/50 bg-surface-low/30 text-fg-muted hover:border-outline"}`}
      onClick={onSelect}
      type="button"
    >
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-fg">{exercise.name}</span>
        <span className="block text-[9px] uppercase tracking-[0.08em] text-outline">
          {`${exercise.primaryMuscleGroup.name} // ${exercise.plottedSetCount} plotted sets`}
        </span>
      </span>
    </button>
  );
}

export function RecentLogs({
  isLoading,
  items,
  mode,
  window
}: {
  isLoading: boolean;
  items: ExerciseProgressItem[];
  mode: ChartMode;
  window: ChartWindow;
}): ReactNode {
  const rows = useMemo(
    () => selectBestWorkingSets(items, window, mode)
      .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
      .slice(0, 12),
    [items, mode, window]
  );
  if (isLoading) return <Skeleton className="h-24" />;
  if (rows.length === 0) return <EmptyState message="Sets logged in this window will appear here." title="NO_SET_TELEMETRY" />;

  return (
    <ul className="divide-y divide-outline-dim/30">
      {rows.map((item) => (
        <li className="flex items-baseline gap-3 py-2" key={item.setId}>
          <span className="w-24 shrink-0 font-mono text-[10px] uppercase text-outline">{formatDateTime(item.sessionDate)}</span>
          <span className="flex-1 font-mono text-sm tracking-[0.05em] text-fg">{formatKgValue(item.weightKg)} kg × {item.reps}</span>
          <span className="font-mono text-[11px] text-fg-muted">RIR {item.rir}</span>
          <span className={`font-mono text-[11px] ${mode === "estimated" ? "text-green-dim" : "text-outline"}`}>{mode === "estimated" ? `e1RM ${formatKgValue(item.estimatedOneRepMaxKg)}` : "plotted set"}</span>
        </li>
      ))}
    </ul>
  );
}
