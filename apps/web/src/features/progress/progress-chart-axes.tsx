"use client";

import type { ReactNode } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { ChartRow } from "./progress-chart-data";
import type { ChartMode } from "./progress-selection";

export const CHART_HEIGHT = 280;
export const X_AXIS_HEIGHT = 44;
export const Y_AXIS_LEFT_WIDTH = 44;
const TIME_DOMAIN: [string, string] = ["dataMin", "dataMax"];

/** The one visible y-axis, pinned over the scrolling plot so values stay readable. */
export function PinnedLeftAxis({ mode, rows }: { mode: ChartMode; rows: ChartRow[] }): ReactNode {
  return (
    <div aria-hidden className="bg-surface pointer-events-none absolute inset-y-0 left-0 z-10" style={{ width: Y_AXIS_LEFT_WIDTH }}>
      <ResponsiveContainer height={CHART_HEIGHT} width="100%">
        <LineChart data={rows} margin={{ top: 8, right: 0, bottom: 4, left: -8 }}>
          <XAxis axisLine={false} dataKey="time" domain={TIME_DOMAIN} height={X_AXIS_HEIGHT} tick={false} tickLine={false} type="number" />
          <YAxis domain={["auto", "auto"]} stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)", fontSize: 12 }} tickLine={false} width={Y_AXIS_LEFT_WIDTH} yAxisId="left" />
          {mode === "estimated" ? <Line dataKey="est1rm" dot={false} isAnimationActive={false} stroke="none" yAxisId="left" /> : <Line dataKey="weight" dot={false} isAnimationActive={false} stroke="none" yAxisId="left" />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
