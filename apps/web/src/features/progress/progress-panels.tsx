"use client";

import { useMemo, type ReactNode } from "react";
import { Skeleton } from "../../shared/ui/ui";
import type { CompletedExercise, ExerciseProgressItem } from "../../shared/api/types";
import { formatDayTime, formatKgValue } from "../../shared/format";
import { IconCheck24 } from "../../shared/ui/icons";
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
      className="flex min-h-[3.75rem] w-full items-center justify-between gap-3 px-4 py-2 text-left"
      onClick={onSelect}
      type="button"
    >
      <span className="min-w-0">
        <span className={`block truncate text-body ${isActive ? "font-semibold text-accent" : "text-text"}`}>{exercise.name}</span>
        <span className="block text-footnote text-text-secondary">
          {`${exercise.primaryMuscleGroup.name}, ${exercise.plottedSetCount} plotted sets`}
        </span>
      </span>
      {isActive ? <IconCheck24 aria-hidden className="shrink-0 text-accent" /> : null}
    </button>
  );
}

/** Renders nothing when the range has no sets: the chart already says so. */
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
  if (rows.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 px-1 text-title-3 text-text">Recent sets</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
        {rows.map((item) => (
          <li className="flex min-h-[3.75rem] items-center justify-between gap-3 px-4 py-2" key={item.setId}>
            <div className="min-w-0">
              <p className="num text-body text-text">{formatKgValue(item.weightKg)} kg × {item.reps}</p>
              <p className="text-footnote text-text-secondary">{formatDayTime(item.sessionDate)}</p>
            </div>
            <p className="num shrink-0 text-right text-footnote text-text-secondary">
              {mode === "estimated" ? `Est. 1RM ${formatKgValue(item.estimatedOneRepMaxKg)} kg` : `${item.rir} in reserve`}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
