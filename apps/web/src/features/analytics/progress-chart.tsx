"use client";

import type { ReactNode } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { ExerciseProgressItem } from "./analytics-types";

const repColors = ["#7b2cbf", "#d00000", "#e85d04", "#2f6655", "#006d77", "#9d4edd"];

export function ProgressTimeSeries({ items }: { items: ExerciseProgressItem[] }): ReactNode {
  const chartRows = toChartRows(items);
  const repSegments = toRepSegments(chartRows);

  if (items.length === 0) {
    return <p className="mutedText">No working sets in this window.</p>;
  }

  return (
    <div className="timeSeriesScroller" aria-label="Weight and reps over time">
      <div className="timeSeriesCanvas">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartRows} margin={{ top: 18, right: 18, bottom: 8, left: 4 }}>
            <CartesianGrid stroke="#d9dfd5" strokeDasharray="4 4" />
            <XAxis dataKey="label" minTickGap={24} />
            <YAxis yAxisId="weight" width={54} unit=" kg" />
            <YAxis yAxisId="reps" orientation="right" width={44} />
            <Tooltip content={<ProgressTooltip />} />
            <Legend />
            <Line
              yAxisId="weight"
              type="monotone"
              dataKey="weight"
              name="Weight"
              stroke="#20483d"
              strokeWidth={3}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
            {repSegments.map((segment, index) => (
              <Line
                connectNulls={false}
                dataKey={segment.key}
                dot={{ r: 3 }}
                isAnimationActive={false}
                key={segment.key}
                name={index === 0 ? "Reps" : "Reps after weight change"}
                stroke={repColors[index % repColors.length] ?? "#7b2cbf"}
                strokeDasharray="6 5"
                strokeWidth={2}
                yAxisId="reps"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface ChartRow {
  [key: string]: number | string | null;
  label: string;
  reps: number;
  sessionDate: string;
  setOrder: number;
  weight: number;
}

interface RepSegment {
  key: `reps${number}`;
}

function toChartRows(items: ExerciseProgressItem[]): ChartRow[] {
  return items.map((item, index) => ({
    label: `${shortDate(item.sessionDate)} · ${item.setOrder}`,
    reps: item.reps,
    sessionDate: item.sessionDate,
    setOrder: item.setOrder,
    weight: Number(item.weightKg),
    [`reps${index}`]: null
  }));
}

function toRepSegments(rows: ChartRow[]): RepSegment[] {
  let currentWeight: number | null = null;
  let segmentIndex = -1;
  const segments: RepSegment[] = [];

  for (const row of rows) {
    if (row.weight !== currentWeight) {
      segmentIndex += 1;
      currentWeight = row.weight;
      segments.push({ key: `reps${segmentIndex}` });
    }

    row[`reps${segmentIndex}`] = row.reps;
  }

  return segments;
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
      <span>Set {row.setOrder}</span>
      <span>{row.weight.toFixed(2)} kg</span>
      <span>{row.reps} reps</span>
    </div>
  );
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}
