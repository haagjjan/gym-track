"use client";

import { useMemo, useState, type ReactNode } from "react";
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

type ChartMode = "loadReps" | "estimated";
type LoadMetric = "weight" | "reps";

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
  selectedWindowLabel
}: {
  exerciseName: string;
  isLoading: boolean;
  items: ExerciseProgressItem[];
  selectedWindowLabel: string;
}): ReactNode {
  const [chartMode, setChartMode] = useState<ChartMode>("loadReps");
  const [visibleMetrics, setVisibleMetrics] = useState<Set<LoadMetric>>(
    () => new Set(loadMetrics.map((item) => item.value))
  );
  const chartRows = useMemo(() => toChartRows(items), [items]);
  const isWeightVisible = visibleMetrics.has("weight");
  const isRepsVisible = visibleMetrics.has("reps");

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
          return next;
        }

        next.delete(metric);
      } else {
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
          <h2 id="progress-chart-title">{chartTitle(chartMode)} over {selectedWindowLabel}</h2>
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
          message="This window has no working sets. Try MAX or log the exercise again."
        />
      ) : (
        <>
          {chartRows.length < 2 ? (
            <p className="progressChartNotice">One training day is logged. Add another day to reveal direction.</p>
          ) : null}
          <div className="timeSeriesCanvas">
            <ResponsiveContainer width="100%" height={340}>
              <LineChart
                data={chartRows}
                key={chartMode}
                margin={{ top: 18, right: 18, bottom: 8, left: 4 }}
              >
                <CartesianGrid stroke="rgba(0, 219, 231, 0.16)" strokeDasharray="4 8" />
                <XAxis
                  axisLine={{ stroke: "rgba(0, 219, 231, 0.28)" }}
                  dataKey="label"
                  minTickGap={24}
                  tick={{ fill: "rgba(225, 253, 255, 0.72)", fontSize: 12 }}
                  tickLine={false}
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
        </>
      )}
    </section>
  );
}

interface ChartRow {
  estimatedOneRepMax: number;
  label: string;
  reps: number;
  sessionDate: string;
  setOrder: number;
  setType: string;
  weight: number;
}

function toChartRows(items: ExerciseProgressItem[]): ChartRow[] {
  return dailyBestSets(items).map((item) => ({
    estimatedOneRepMax: Number(item.estimatedOneRepMaxKg),
    label: shortSetDate(item.sessionDate),
    reps: item.reps,
    sessionDate: item.sessionDate,
    setOrder: item.setOrder,
    setType: item.setType,
    weight: Number(item.weightKg)
  }));
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
