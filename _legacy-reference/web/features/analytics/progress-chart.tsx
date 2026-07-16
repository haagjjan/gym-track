"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { ExerciseProgressItem } from "./analytics-types";
import { ProgressEmptyState } from "./analytics-widgets";
import {
  handleProgressPointerLeave,
  handleProgressPointerMove
} from "./progress-pointer";
import { compareProgressAsc, shortSetDate } from "./progress-items";
import {
  recordProgressChartDiagnostic,
  type ProgressChartDiagnosticReason
} from "./progress-diagnostics";

type ChartMode = "loadReps" | "estimated";
type ChartWindowValue = "7" | "30" | "90" | "all";
type LoadMetric = "weight" | "reps";

const dayMs = 24 * 60 * 60 * 1000;

const chartModes: { label: string; value: ChartMode }[] = [
  { label: "LOAD_REPS", value: "loadReps" },
  { label: "EST_1RM", value: "estimated" }
];

const loadMetrics: { label: string; value: LoadMetric }[] = [
  { label: "WEIGHT", value: "weight" },
  { label: "REPS", value: "reps" }
];

export function ProgressTimeSeries({
  exerciseName,
  isLoading,
  items,
  selectedWindowLabel,
  selectedWindowValue
}: {
  exerciseName: string;
  isLoading: boolean;
  items: ExerciseProgressItem[];
  selectedWindowLabel: string;
  selectedWindowValue: ChartWindowValue;
}): ReactNode {
  const [chartMode, setChartMode] = useState<ChartMode>("loadReps");
  const [visibleMetrics, setVisibleMetrics] = useState<Set<LoadMetric>>(
    () => new Set(loadMetrics.map((item) => item.value))
  );
  const chartScrollerRef = useRef<HTMLDivElement>(null);
  const chartRows = useMemo(() => toChartRows(items), [items]);
  const chartTimeline = useMemo(
    () => getChartTimeline(chartRows, selectedWindowValue),
    [chartRows, selectedWindowValue]
  );
  const isWeightVisible = visibleMetrics.has("weight");
  const isRepsVisible = visibleMetrics.has("reps");
  const hasScrollableTimeline = chartTimeline.widthRatio > 1;
  const recordChartState = useCallback((reason: ProgressChartDiagnosticReason): void => {
    recordProgressChartDiagnostic({
      chartMode,
      chartRowCount: chartRows.length,
      itemCount: items.length,
      reason,
      scroller: chartScrollerRef.current,
      selectedWindowValue,
      visibleReps: isRepsVisible,
      visibleWeight: isWeightVisible,
      widthRatio: chartTimeline.widthRatio
    });
  }, [
    chartMode,
    chartRows.length,
    chartTimeline.widthRatio,
    isRepsVisible,
    isWeightVisible,
    items.length,
    selectedWindowValue
  ]);

  useEffect(() => {
    recordChartState("data");
  }, [recordChartState]);

  useEffect(() => {
    recordChartState("mode");
  }, [chartMode, recordChartState]);

  useEffect(() => {
    recordChartState("window");
  }, [recordChartState, selectedWindowValue]);

  useEffect(() => {
    recordChartState("metric");
  }, [isRepsVisible, isWeightVisible, recordChartState]);

  useEffect(() => {
    const chartScroller = chartScrollerRef.current;

    if (!chartScroller || !hasScrollableTimeline) {
      return;
    }

    chartScroller.scrollLeft = chartScroller.scrollWidth;
  }, [
    chartMode,
    exerciseName,
    hasScrollableTimeline,
    selectedWindowValue,
    chartRows.length
  ]);

  function handleChartScroll(): void {
    recordChartState("scroll");
  }

  if (isLoading) {
    return (
      <section className="progressChartPanel progressReactive" aria-label="Progress chart loading">
        <ProgressEmptyState title="SYNCING_TREND" message="Loading daily best-set trajectory." />
      </section>
    );
  }

  function toggleMetric(metric: LoadMetric): void {
    setVisibleMetrics((current) => {
      const next = new Set(current);

      if (next.has(metric)) {
        if (next.size === 1) {
          const otherMetric = loadMetrics.find((item) => item.value !== metric)?.value;

          return new Set(otherMetric ? [otherMetric] : [metric]);
        }

        next.delete(metric);
      } else {
        if (next.size === 0) {
          return new Set([metric]);
        }

        next.add(metric);
      }

      return next;
    });
  }

  return (
    <section
      className="progressChartPanel progressReactive"
      onPointerLeave={handleProgressPointerLeave}
      onPointerMove={handleProgressPointerMove}
      aria-labelledby="progress-chart-title"
    >
      <div className="progressSectionHeader">
        <div>
          <p className="eyebrow">Strength trajectory</p>
          <h2 id="progress-chart-title">{chartTitle(chartMode)} over {selectedWindowLabel} viewport</h2>
        </div>
        <div className="progressChartControls" aria-label="Progress chart controls">
          <div className="progressChartToggleGroup" aria-label="Chart version">
            {chartModes.map((item) => (
              <button
                aria-pressed={chartMode === item.value}
                key={item.value}
                onClick={() => setChartMode(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
          {chartMode === "loadReps" ? (
            <div className="progressChartToggleGroup" aria-label="Visible load metrics">
              {loadMetrics.map((item) => (
                <button
                  aria-pressed={visibleMetrics.has(item.value)}
                  key={item.value}
                  onClick={() => toggleMetric(item.value)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
          <span>{exerciseName}</span>
        </div>
      </div>
      {chartRows.length === 0 ? (
        <ProgressEmptyState
          title="NO_TREND_DATA"
          message="This exercise has no working-set trend yet. Log it again to build the timeline."
        />
      ) : (
        <>
          {chartRows.length < 2 ? (
            <p className="progressChartNotice">One training day is logged. Add another day to reveal direction.</p>
          ) : null}
          <div className="timeSeriesMeta">
            <span>{chartRows.length} best-day points loaded</span>
            <span>
              {hasScrollableTimeline
                ? `Scroll sideways to inspect older ${selectedWindowLabel} slices.`
                : "Full timeline is visible."}
            </span>
          </div>
          <div
            aria-label={`Scrollable ${selectedWindowLabel} progress timeline`}
            className="timeSeriesViewport"
            onScroll={handleChartScroll}
            ref={chartScrollerRef}
            tabIndex={hasScrollableTimeline ? 0 : -1}
          >
            <div
              className="timeSeriesCanvas"
              style={{ width: `${chartTimeline.widthRatio * 100}%` }}
            >
              <ResponsiveContainer width="100%" height={340}>
                <LineChart
                  data={chartRows}
                  key={chartMode}
                  margin={{ top: 18, right: 18, bottom: 8, left: 4 }}
                >
                  <CartesianGrid stroke="rgba(0, 219, 231, 0.16)" strokeDasharray="4 8" />
                  <XAxis
                    allowDataOverflow
                    axisLine={{ stroke: "rgba(0, 219, 231, 0.28)" }}
                    dataKey="timestamp"
                    domain={[chartTimeline.startMs, chartTimeline.endMs]}
                    minTickGap={24}
                    scale="time"
                    tick={{ fill: "rgba(225, 253, 255, 0.72)", fontSize: 12 }}
                    tickFormatter={formatChartDate}
                    tickLine={false}
                    type="number"
                  />
                  {chartMode === "loadReps" ? (
                    <>
                      <YAxis
                        axisLine={{ stroke: "rgba(0, 219, 231, 0.28)" }}
                        domain={["auto", "auto"]}
                        tick={{ fill: "rgba(225, 253, 255, 0.72)", fontSize: 12 }}
                        tickFormatter={(value) => `${value} kg`}
                        tickLine={false}
                        width={64}
                        yAxisId="weight"
                      />
                      <YAxis
                        axisLine={{ stroke: "rgba(217, 185, 255, 0.32)" }}
                        domain={["auto", "auto"]}
                        orientation="right"
                        tick={{ fill: "rgba(217, 185, 255, 0.78)", fontSize: 12 }}
                        tickFormatter={(value) => `${value}`}
                        tickLine={false}
                        width={42}
                        yAxisId="reps"
                      />
                      <Tooltip content={<ProgressTooltip mode={chartMode} />} cursor={{ stroke: "rgba(0, 242, 255, 0.42)" }} />
                      {isWeightVisible ? (
                        <Line
                          activeDot={{ fill: "#e1fdff", r: 6, stroke: "#00f2ff", strokeWidth: 2 }}
                          dataKey="weight"
                          dot={{ fill: "#0a0a0a", r: 4, stroke: "#00f2ff", strokeWidth: 2 }}
                          isAnimationActive={false}
                          name="Weight"
                          stroke="#00f2ff"
                          strokeWidth={3}
                          type="monotone"
                          yAxisId="weight"
                        />
                      ) : null}
                      {isRepsVisible ? (
                        <Line
                          activeDot={{ fill: "#eedcff", r: 6, stroke: "#d9b9ff", strokeWidth: 2 }}
                          dataKey="reps"
                          dot={{ fill: "#0a0a0a", r: 4, stroke: "#d9b9ff", strokeWidth: 2 }}
                          isAnimationActive={false}
                          name="Reps"
                          stroke="#d9b9ff"
                          strokeWidth={3}
                          type="monotone"
                          yAxisId="reps"
                        />
                      ) : null}
                    </>
                  ) : (
                    <>
                      <YAxis
                        axisLine={{ stroke: "rgba(0, 219, 231, 0.28)" }}
                        domain={["auto", "auto"]}
                        tick={{ fill: "rgba(225, 253, 255, 0.72)", fontSize: 12 }}
                        tickFormatter={(value) => `${value} kg`}
                        tickLine={false}
                        width={64}
                        yAxisId="estimated"
                      />
                      <Tooltip content={<ProgressTooltip mode={chartMode} />} cursor={{ stroke: "rgba(0, 242, 255, 0.42)" }} />
                      <Line
                        activeDot={{ fill: "#e1fdff", r: 6, stroke: "#00f2ff", strokeWidth: 2 }}
                        dataKey="estimatedOneRepMax"
                        dot={{ fill: "#0a0a0a", r: 4, stroke: "#00f2ff", strokeWidth: 2 }}
                        isAnimationActive={false}
                        name="Estimated 1RM"
                        stroke="#00f2ff"
                        strokeWidth={3}
                        type="monotone"
                        yAxisId="estimated"
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

interface ChartRow {
  estimatedOneRepMax: number;
  reps: number;
  sessionDate: string;
  setOrder: number;
  setType: string;
  timestamp: number;
  weight: number;
}

function toChartRows(items: ExerciseProgressItem[]): ChartRow[] {
  return dailyBestSets(items).map((item) => ({
    estimatedOneRepMax: Number(item.estimatedOneRepMaxKg),
    reps: item.reps,
    sessionDate: item.sessionDate,
    setOrder: item.setOrder,
    setType: item.setType,
    timestamp: startOfUtcDayMs(item.sessionDate),
    weight: Number(item.weightKg)
  }));
}

function getChartTimeline(
  rows: ChartRow[],
  selectedWindowValue: ChartWindowValue
): {
  endMs: number;
  startMs: number;
  widthRatio: number;
} {
  if (rows.length === 0) {
    const now = startOfUtcDayMs(new Date().toISOString());

    return {
      endMs: now + dayMs,
      startMs: now,
      widthRatio: 1
    };
  }

  const timestamps = rows.map((row) => row.timestamp);
  const startMs = Math.min(...timestamps);
  const latestMs = Math.max(...timestamps);

  if (selectedWindowValue === "all") {
    return {
      endMs: Math.max(latestMs, startMs + dayMs),
      startMs,
      widthRatio: 1
    };
  }

  const visibleDays = Number(selectedWindowValue);
  const timelineDays = Math.max(
    visibleDays,
    Math.ceil((latestMs - startMs) / dayMs) + 1
  );

  return {
    endMs: startMs + timelineDays * dayMs,
    startMs,
    widthRatio: timelineDays / visibleDays
  };
}

function dailyBestSets(items: ExerciseProgressItem[]): ExerciseProgressItem[] {
  const bestByDay = new Map<string, ExerciseProgressItem>();

  [...items].sort(compareProgressAsc).forEach((item) => {
    const key = dayKey(item.sessionDate);
    const current = bestByDay.get(key);

    if (!current || compareBestSet(item, current) < 0) {
      bestByDay.set(key, item);
    }
  });

  return [...bestByDay.values()].sort(compareProgressAsc);
}

function compareBestSet(left: ExerciseProgressItem, right: ExerciseProgressItem): number {
  const estimatedDifference = Number(right.estimatedOneRepMaxKg) - Number(left.estimatedOneRepMaxKg);

  if (estimatedDifference !== 0) {
    return estimatedDifference;
  }

  const weightDifference = Number(right.weightKg) - Number(left.weightKg);

  if (weightDifference !== 0) {
    return weightDifference;
  }

  return right.reps - left.reps || left.setOrder - right.setOrder;
}

function dayKey(value: string): string {
  return value.slice(0, 10);
}

function startOfUtcDayMs(value: string): number {
  const date = new Date(value);

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatChartDate(value: number | string): string {
  const timestamp = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  return shortSetDate(new Date(timestamp).toISOString());
}

function chartTitle(mode: ChartMode): string {
  return mode === "loadReps" ? "Weight and reps" : "Estimated 1RM";
}

function ProgressTooltip({
  active,
  mode,
  payload
}: {
  active?: boolean;
  mode: ChartMode;
  payload?: { payload: ChartRow }[];
}): ReactNode {
  const row = payload?.[0]?.payload;

  if (!active || !row) {
    return null;
  }

  return (
    <div className="chartTooltip">
      <strong>{new Date(row.sessionDate).toLocaleDateString()}</strong>
      <span>Best set of day · Set {row.setOrder} · {row.setType}</span>
      <span>{row.weight.toFixed(1)} kg x {row.reps}</span>
      {mode === "estimated" ? (
        <span>Est. 1RM {row.estimatedOneRepMax.toFixed(1)} kg</span>
      ) : null}
    </div>
  );
}
