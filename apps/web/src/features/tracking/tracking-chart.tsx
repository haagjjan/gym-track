"use client";

import { useEffect, useState, type ReactNode } from "react";
import { formatDay } from "../../shared/format";
import { IconBack, IconForward } from "../../shared/ui/icons";
import { ProgressChartPlot } from "../progress/progress-chart-plot";
import { ProgressChartViewToggle, ProgressInfoHint } from "../progress/progress-chart-controls";
import { Segmented } from "../progress/progress-segmented";
import type { ChartWindow } from "../progress/progress-selection";
import { formatTrackingValue, trackingMetricLabel, type TrackingDay, type TrackingMetric } from "./tracking-progress-data";

export function TrackingChart({ rows, kind, metric, onMetricChange, window }: {
  rows: TrackingDay[]; kind: "time" | "cardio"; metric: TrackingMetric;
  onMetricChange: (metric: TrackingMetric) => void; window: ChartWindow;
}): ReactNode {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [inspectedDate, setInspectedDate] = useState<string | null>(null);
  useEffect(() => setInspectedDate(null), [rows]);
  const picked = rows.findIndex((row) => row.date === inspectedDate);
  const index = picked >= 0 ? picked : rows.length - 1;
  const inspected = rows[index];
  const label = trackingMetricLabel(metric);
  const formatValue = (value: number): string => formatTrackingValue(value, metric);
  const options: { label: string; value: TrackingMetric }[] = [{ label: "Duration", value: "duration" }, kind === "time" ? { label: "Added weight", value: "load" } : { label: "Distance", value: "distance" }];
  return <div>
    <div className="relative flex items-center gap-1 px-1">
      <div className="min-w-0 flex-1"><Segmented label="Measure" onChange={onMetricChange} options={options} value={metric} /></div>
      <ProgressInfoHint label="How the best daily entry is selected">
        One best working entry per day. Duration measures endurance and shows the longest effort, added weight the heaviest hold, and distance the longest effort. Equal-distance efforts favor the faster time. Warm-ups are excluded.
      </ProgressInfoHint>
      <ProgressChartViewToggle onViewChange={setView} view={view} />
    </div>
    <p className="flex min-h-11 items-center gap-2 px-2 text-subhead font-semibold text-accent"><span aria-hidden className="size-2.5 rounded-full bg-accent" />{label}</p>
    {rows.length === 0 ? <p className="py-6 text-center text-body text-text-secondary">{metric === "distance" ? "No distance is logged for this activity. Choose duration to see its progress." : "Finish a workout with a working entry to see progress."}</p> : view === "table" ? <TrackingTable rows={rows} metric={metric} /> : <ProgressChartPlot
      marked={picked >= 0 ? rows[picked] : undefined} onTapDay={(date) => setInspectedDate(date === inspectedDate ? null : date)} rows={rows} window={window}
      series={[{ side: "left", dataKey: "value", color: "var(--accent)", label, axisWidth: metric === "duration" ? 52 : 36, formatValue, dot: trackingDot }]} />}
    {inspected ? <div className="mt-1 flex items-center gap-1 px-1">
      <button aria-label="Previous day" className="flex size-11 shrink-0 items-center justify-center rounded-full text-accent disabled:text-text-muted" disabled={index <= 0} onClick={() => setInspectedDate(rows[index - 1]!.date)} type="button"><IconBack /></button>
      <p className="min-w-0 flex-1 text-center text-callout text-text" role="status"><span className="block truncate font-semibold">{formatDay(inspected.date)}</span><span className="num block truncate text-subhead text-text-secondary" title={inspected.detail}>{inspected.detail}</span></p>
      <button aria-label="Next day" className="flex size-11 shrink-0 items-center justify-center rounded-full text-accent disabled:text-text-muted" disabled={index >= rows.length - 1} onClick={() => setInspectedDate(rows[index + 1]!.date)} type="button"><IconForward /></button>
    </div> : null}
  </div>;
}

function trackingDot({ cx, cy, payload, stroke }: { cx?: number | undefined; cy?: number | undefined; payload?: TrackingDay | undefined; stroke?: string | undefined }): ReactNode {
  if (cx === undefined || cy === undefined || !payload) return <circle r={0} />;
  return <circle cx={cx} cy={cy} fill={payload.changed ? stroke : "none"} r={payload.changed ? 4 : 2.5} stroke={stroke} strokeWidth={payload.changed ? 0 : 1.5} />;
}

function TrackingTable({ rows, metric }: { rows: TrackingDay[]; metric: TrackingMetric }): ReactNode {
  return <div className="max-h-[22rem] overflow-auto"><table className="w-full text-left text-callout">
    <caption className="sr-only">Best daily entries, newest first</caption>
    <thead><tr className="text-footnote text-text-secondary"><th className="py-2 pr-3 font-normal" scope="col">Date</th><th className="px-3 py-2 text-right font-normal" scope="col">{trackingMetricLabel(metric)}</th><th className="px-3 py-2 font-normal" scope="col">Best entry</th></tr></thead>
    <tbody className="divide-y divide-line">{[...rows].reverse().map((row) => <tr key={row.date}><th className="py-3 pr-3 font-normal text-text" scope="row">{formatDay(row.date)}</th><td className="num px-3 py-3 text-right text-text">{formatTrackingValue(row.value, metric)}</td><td className="num px-3 py-3 text-subhead text-text-secondary">{row.detail}</td></tr>)}</tbody>
  </table></div>;
}
