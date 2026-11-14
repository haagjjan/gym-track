"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ExerciseProgressItem } from "../../shared/api/types";
import { formatKgValue } from "../../shared/format";
import { IconBack, IconForward } from "../../shared/ui/icons";
import type { ChartMode, ChartWindow } from "./progress-selection";
import { ProgressChartControls, SeriesLegend } from "./progress-chart-controls";
import {
  est1rmDot,
  repsDot,
  toChartRows,
  weightDot,
  type ChartRow
} from "./progress-chart-data";
import { ProgressChartPlot, type ProgressPlotSeries } from "./progress-chart-plot";
import { ProgressChartTable } from "./progress-chart-table";

export type { ChartMode, ChartWindow } from "./progress-selection";

export const WEIGHT_COLOR = "var(--accent)";
export const REPS_COLOR = "var(--chart-reps)";

/**
 * Strength over time for one exercise. The chart always holds every logged
 * day; the time window only sets how much of it fits on screen, newest at the
 * right. Swipe to move back in time; a short tap picks a day.
 */
export function ProgressChart({
  items,
  onInspectPoint,
  mode,
  onModeChange,
  onShowRepsChange,
  onShowWeightChange,
  showReps,
  showWeight,
  window
}: {
  items: ExerciseProgressItem[];
  onInspectPoint?: ((date: string) => void) | undefined;
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
  onShowRepsChange: (show: boolean) => void;
  onShowWeightChange: (show: boolean) => void;
  showReps: boolean;
  showWeight: boolean;
  window: ChartWindow;
}): ReactNode {
  const [view, setView] = useState<"chart" | "table">("chart");
  const rows = useMemo(() => toChartRows(items, "all", mode), [items, mode]);
  const [inspectedDate, setInspectedDate] = useState<string | null>(null);
  // No pick yet (or a stale one) reads out the newest day without a marker.
  const pickedIndex = rows.findIndex((row) => row.date === inspectedDate);
  const inspectedIndex = pickedIndex >= 0 ? pickedIndex : rows.length - 1;
  const inspected: ChartRow | undefined = rows[inspectedIndex];
  const marked: ChartRow | undefined = pickedIndex >= 0 ? rows[pickedIndex] : undefined;

  // A new exercise or mode starts on its newest day.
  useEffect(() => setInspectedDate(null), [items, mode]);

  if (rows.length === 0) {
    return (
      <>
        <ProgressChartControls mode={mode} onModeChange={onModeChange} onViewChange={setView} view={view} />
        <p className="py-6 text-center text-body text-text-secondary">No sets logged for this exercise yet.</p>
      </>
    );
  }

  function inspect(date: string): void {
    setInspectedDate(date);
    onInspectPoint?.(date);
  }
  // Tapping the marked day again hides the marker.
  function tapDay(date: string): void {
    if (date === inspectedDate) setInspectedDate(null);
    else inspect(date);
  }

  const showWeightSeries = mode === "estimated" || showWeight;
  const showRepsSeries = mode === "loadReps" && showReps;

  const series: ProgressPlotSeries[] = [
    ...(showWeightSeries ? [{ side: "left" as const, dataKey: mode === "estimated" ? "est1rm" : "weight", color: WEIGHT_COLOR, label: mode === "estimated" ? "Est. 1RM (kg)" : "Weight (kg)", dot: mode === "estimated" ? est1rmDot : weightDot }] : []),
    ...(showRepsSeries ? [{ side: "right" as const, dataKey: "reps", color: REPS_COLOR, label: "Reps", dot: repsDot, dash: "5 3" }] : [])
  ];
  return (
    <div>
      <ProgressChartControls mode={mode} onModeChange={onModeChange} onViewChange={setView} view={view} />
      <SeriesLegend
        mode={mode}
        onShowRepsChange={onShowRepsChange}
        onShowWeightChange={onShowWeightChange}
        showReps={showReps}
        showWeight={showWeight}
      />

      {view === "table" ? (
        <ProgressChartTable mode={mode} rows={rows} showReps={showReps} showWeight={showWeight} />
      ) : (
        <ProgressChartPlot
          marked={marked}
          onTapDay={tapDay}
          rows={rows}
          series={series}
          window={window}
        />
      )}

      {inspected ? (
        <div className="mt-1 flex items-center gap-1 px-1">
          <button
            aria-label="Previous day"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-accent disabled:text-text-muted"
            disabled={inspectedIndex <= 0}
            onClick={() => { const row = rows[inspectedIndex - 1]; if (row) inspect(row.date); }}
            type="button"
          >
            <IconBack />
          </button>
          {/* Fixed two lines (truncate, never wrap), so stepping through days never makes the layout jump. */}
          <p aria-live="polite" className="min-w-0 flex-1 text-center text-callout text-text">
            <span className="block truncate font-semibold">{inspected.label}</span>
            <span className="num block truncate text-subhead text-text-secondary">
              {mode === "estimated"
                ? `${formatKgValue(Math.round(inspected.est1rm * 10) / 10)} kg est. 1RM, from ${formatKgValue(inspected.weight)} × ${inspected.reps}`
                : `${formatKgValue(inspected.weight)} kg × ${inspected.reps}, est. 1RM ${formatKgValue(Math.round(inspected.est1rm * 10) / 10)} kg`}
            </span>
          </p>
          <button
            aria-label="Next day"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-accent disabled:text-text-muted"
            disabled={inspectedIndex >= rows.length - 1}
            onClick={() => { const row = rows[inspectedIndex + 1]; if (row) inspect(row.date); }}
            type="button"
          >
            <IconForward />
          </button>
        </div>
      ) : null}
    </div>
  );
}
