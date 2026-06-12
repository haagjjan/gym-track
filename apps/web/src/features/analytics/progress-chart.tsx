"use client";

import type { ReactNode } from "react";
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
  const chartRows = toChartRows(items);

  if (isLoading) {
    return (
      <section className="progressChartPanel progressReactive" aria-label="Progress chart loading">
        <ProgressEmptyState title="SYNCING_TREND" message="Loading estimated strength trajectory." />
      </section>
    );
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
          <h2 id="progress-chart-title">Estimated 1RM over {selectedWindowLabel}</h2>
        </div>
        <span>{exerciseName}</span>
      </div>
      {chartRows.length === 0 ? (
        <ProgressEmptyState
          title="NO_TREND_DATA"
          message="This window has no working sets. Try MAX or log the exercise again."
        />
      ) : (
        <>
          {chartRows.length < 2 ? (
            <p className="progressChartNotice">One working set is logged. Add another set to reveal direction.</p>
          ) : null}
          <div className="timeSeriesCanvas">
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartRows} margin={{ top: 18, right: 18, bottom: 8, left: 4 }}>
                <CartesianGrid stroke="rgba(0, 219, 231, 0.16)" strokeDasharray="4 8" />
                <XAxis
                  axisLine={{ stroke: "rgba(0, 219, 231, 0.28)" }}
                  dataKey="label"
                  minTickGap={24}
                  tick={{ fill: "rgba(225, 253, 255, 0.72)", fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  axisLine={{ stroke: "rgba(0, 219, 231, 0.28)" }}
                  domain={["auto", "auto"]}
                  tick={{ fill: "rgba(225, 253, 255, 0.72)", fontSize: 12 }}
                  tickFormatter={(value) => `${value} kg`}
                  tickLine={false}
                  width={64}
                />
                <Tooltip content={<ProgressTooltip />} cursor={{ stroke: "rgba(0, 242, 255, 0.42)" }} />
                <Line
                  activeDot={{ fill: "#e1fdff", r: 6, stroke: "#00f2ff", strokeWidth: 2 }}
                  dataKey="estimatedOneRepMax"
                  dot={{ fill: "#0a0a0a", r: 4, stroke: "#00f2ff", strokeWidth: 2 }}
                  isAnimationActive={false}
                  name="Estimated 1RM"
                  stroke="#00f2ff"
                  strokeWidth={3}
                  type="monotone"
                />
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
  return [...items].sort(compareProgressAsc).map((item) => ({
    estimatedOneRepMax: Number(item.estimatedOneRepMaxKg),
    label: `${shortSetDate(item.sessionDate)} · ${item.setOrder}`,
    reps: item.reps,
    sessionDate: item.sessionDate,
    setOrder: item.setOrder,
    setType: item.setType,
    weight: Number(item.weightKg)
  }));
}

function ProgressTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: { payload: ChartRow }[];
}): ReactNode {
  const row = payload?.[0]?.payload;

  if (!active || !row) {
    return null;
  }

  return (
    <div className="chartTooltip">
      <strong>{new Date(row.sessionDate).toLocaleDateString()}</strong>
      <span>Set {row.setOrder} · {row.setType}</span>
      <span>{row.weight.toFixed(1)} kg x {row.reps}</span>
      <span>Est. 1RM {row.estimatedOneRepMax.toFixed(1)} kg</span>
    </div>
  );
}
