"use client";

import type { ReactNode } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { ChartRow } from "./progress-chart-data";

export const CHART_HEIGHT = 196;
export const X_AXIS_HEIGHT = 44;
export const Y_AXIS_WIDTH = 40;

/**
 * A y-axis pinned over the scrolling plot so its values stay readable. Its
 * ticks take the series color, so each axis reads as "this line's scale".
 */
export function PinnedAxis({ color, dataKey, rows, side }: { color: string; dataKey: "weight" | "reps" | "est1rm"; rows: ChartRow[]; side: "left" | "right" }): ReactNode {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-y-0 z-10 bg-surface ${side === "left" ? "left-0" : "right-0"}`} style={{ width: Y_AXIS_WIDTH }}>
      <ResponsiveContainer height={CHART_HEIGHT} width="100%">
        <LineChart data={rows} margin={{ top: 8, right: 0, bottom: 4, left: 0 }}>
          <XAxis axisLine={false} dataKey="time" height={X_AXIS_HEIGHT} tick={false} tickLine={false} type="number" />
          <YAxis
            allowDecimals={dataKey !== "reps"}
            domain={["auto", "auto"]}
            orientation={side}
            stroke={color}
            tick={{ fill: color, fontSize: 12, fontWeight: 600 }}
            tickLine={false}
            width={Y_AXIS_WIDTH}
            yAxisId={side}
          />
          <Line dataKey={dataKey} dot={false} isAnimationActive={false} stroke="none" yAxisId={side} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
