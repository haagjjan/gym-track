"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Button } from "../../shared/ui/button";
import type { ExerciseProgressItem } from "../../shared/api/types";
import { formatDay } from "../../shared/format";
import type { ChartMode, ChartWindow } from "./progress-selection";
import { Segmented } from "./progress-segmented";
import { ProgressChartControls } from "./progress-chart-controls";
import {
  est1rmDot,
  formatDateTick,
  regularTimeTicks,
  repsDot,
  toChartRows,
  weightDot,
  yearBoundaryTimes
} from "./progress-chart-data";
import {
  CHART_HEIGHT,
  PinnedLeftAxis,
  X_AXIS_HEIGHT,
  Y_AXIS_LEFT_WIDTH
} from "./progress-chart-axes";
import { ProgressChartTable } from "./progress-chart-table";
import { useProgressChartZoom } from "./use-progress-chart-zoom";

export type { ChartMode, ChartWindow } from "./progress-selection";

const POINT_WIDTH_PX = 56;
const MIN_VISIBLE_POINTS = 8;
const TIME_DOMAIN: [string, string] = ["dataMin", "dataMax"];
/** Keeps first/last dots and the tilted date labels clear of the pinned axis strips. */
const X_PADDING: { left: number; right: number } = { left: 36, right: 12 };
/** Target horizontal spacing between X-axis date ticks. */
/** Pinch/wheel zoom bounds: ×0.5 densifies for overview, ×4 spreads for detail. */
const DRAW_IN_MS = 900;
const WINDOW_PHRASE: Record<ChartWindow, string> = { "7": "last week", "30": "last month", "90": "last 3 months", all: "full history" };

/**
 * Strength time series: LOAD_REPS mode plots the day's best working set
 * (weight + its reps, individually toggleable); EST_1RM plots the day's top
 * estimated one-rep max. Working sets only. Scrolls horizontally when dense.
 */
export function ProgressChart({
  items,
  onInspectPoint,
  mode,
  onModeChange,
  onShowAllTime,
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
  onShowAllTime?: (() => void) | undefined;
  onShowRepsChange: (show: boolean) => void;
  onShowWeightChange: (show: boolean) => void;
  showReps: boolean;
  showWeight: boolean;
  window: ChartWindow;
}): ReactNode {
  const [inspectedDate, setInspectedDate] = useState("");
  const [view, setView] = useState<"chart" | "table">("chart");
  const { gestureActive, reducedMotion, reset, scrollerRef, zoom } =
    useProgressChartZoom(window);
  const rows = useMemo(() => toChartRows(items, window, mode), [items, mode, window]);
  const yearBoundaries = useMemo(() => yearBoundaryTimes(rows), [rows]);

  if (rows.length === 0) {
    const hasOlderSets = window !== "all" && items.some((item) => item.setType === "working");
    return (
      <div className="py-6 text-center">
        <p className="text-body text-text-secondary">
          {hasOlderSets ? `No sets in the ${WINDOW_PHRASE[window]}.` : "No sets logged for this exercise yet."}
        </p>
        {hasOlderSets && onShowAllTime ? (
          <Button className="mt-3" onClick={onShowAllTime} size="compact" variant="secondary">Show all time</Button>
        ) : null}
      </div>
    );
  }

  const inspected = rows.find((row) => row.date === inspectedDate);
  function inspect(date: string): void { setInspectedDate(date); onInspectPoint?.(date); }
  const innerWidth = Math.round(
    Math.max(rows.length, MIN_VISIBLE_POINTS) * POINT_WIDTH_PX * zoom
  );
  // Evenly spaced date ticks across the whole time domain — Recharts' default
  // tick picker leaves long ranges (MAX) nearly unlabeled. Density follows the
  // laid-out width, so zooming in labels finer sub-ranges automatically.
  const xTicks = regularTimeTicks(rows, innerWidth);
  // Both modes plot kilograms on the left; reps only exist in LOAD_REPS mode.
  const showLeftAxis = mode === "estimated" || showWeight;
  const showRightAxis = mode === "loadReps" && showReps && showWeight;
  // Draw-in stays a mount/window-change flourish; it pauses during zoom
  // gestures (constant morphs while pinching read as jitter) and respects
  // prefers-reduced-motion.
  const animate = !reducedMotion && !gestureActive;

  return (
    <div>
      <div className="mb-3">
        <Segmented label="Chart view" onChange={setView} options={[{ label: "Chart", value: "chart" }, { label: "Table", value: "table" }]} value={view} />
      </div>
      <ProgressChartControls
        mode={mode}
        onModeChange={onModeChange}
        onShowRepsChange={onShowRepsChange}
        onShowWeightChange={onShowWeightChange}
        showReps={showReps}
        showWeight={showWeight}
      />

      {view === "table" ? <ProgressChartTable mode={mode} rows={rows} showReps={showReps} showWeight={showWeight} /> : (
      <>
      {/* The unit caption sits above the pinned axis so values always read with their unit. */}
      <div className="mb-1 flex items-center justify-between text-caption text-text-muted">
        <span>{showLeftAxis ? "kg" : ""}</span>
        {zoom !== 1 ? (
          <button
            className="flex min-h-11 cursor-pointer items-center px-2 text-caption text-accent"
            onClick={reset}
            type="button"
          >
            Zoom ×{zoom.toFixed(1)}, reset
          </button>
        ) : null}
      </div>

      <div className="relative">
        {showLeftAxis ? <PinnedLeftAxis mode={mode} rows={rows} /> : null}

        {/* rtl scroll container: newest data starts in view. Stable scrollbar
            gutter so a scrollbar appearing mid-draw can't remeasure the chart
            and restart the animation (the doc-14 MAX glitch). touch-action
            keeps native pans but hands two-finger pinches to the zoom code. */}
        <div
          className="overflow-x-auto pb-1 [scrollbar-gutter:stable] [touch-action:pan-x_pan-y]"
          dir="rtl"
          ref={scrollerRef}
        >
          <div dir="ltr" style={{ minWidth: "100%", width: innerWidth }}>
            <ResponsiveContainer height={CHART_HEIGHT} width="100%">
              <LineChart data={rows} onClick={(state) => { if (state.activeIndex == null) return; const row = rows[Number(state.activeIndex)]; if (row) inspect(row.date); }} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                {yearBoundaries.map((boundaryTime) => (
                  <ReferenceLine
                    key={boundaryTime}
                    label={{
                      fill: "var(--text-muted)",
                      fontSize: 12,
                      position: "insideTopLeft",
                      value: String(new Date(boundaryTime).getUTCFullYear())
                    }}
                    stroke="var(--line)"
                    strokeWidth={2}
                    x={boundaryTime}
                    yAxisId="left"
                  />
                ))}
                <XAxis
                  dataKey="time"
                  domain={TIME_DOMAIN}
                  height={X_AXIS_HEIGHT}
                  // Render every provided tick — the defaults thin them out again.
                  interval={0}
                  padding={X_PADDING}
                  stroke="var(--text-muted)"
                  tick={{
                    angle: -45,
                    dy: 4,
                    fill: "var(--text-muted)",
                    fontSize: 12,
                    textAnchor: "end"
                  }}
                  tickFormatter={(value: number) => formatDateTick(value)}
                  tickLine={false}
                  ticks={xTicks}
                  type="number"
                />
                {/* Invisible but PRESENT gutter axes (`hide` would skip layout
                    reservation): the pinned strips cover exactly these widths,
                    so data and date labels stay clear of them. */}
                <YAxis
                  axisLine={false}
                  domain={["auto", "auto"]}
                  tick={false}
                  tickLine={false}
                  width={Y_AXIS_LEFT_WIDTH}
                  yAxisId="left"
                />
                {/* Reps share the plot on their own hidden scale: only one y-axis is ever drawn. */}
                {mode === "loadReps" ? <YAxis domain={["auto", "auto"]} hide yAxisId="right" /> : null}
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    fontSize: 14
                  }}
                  cursor={{ stroke: "var(--text-muted)", strokeWidth: 1 }}
                  itemStyle={{ color: "var(--text)" }}
                  labelFormatter={(value) =>
                    typeof value === "number" ? formatDay(new Date(value).toISOString()) : value
                  }
                  labelStyle={{ color: "var(--text-secondary)" }}
                />
                {/* Left→right draw-in on mount/window change. The doc-14 "skip"
                    glitch was the scrollbar appearing mid-draw and remeasuring
                    the chart — the stable scrollbar gutter on the scroll
                    container removes that trigger, so the animation can stay. */}
                {mode === "estimated" ? (
                  <Line
                    animationDuration={DRAW_IN_MS}
                    dataKey="est1rm"
                    dot={est1rmDot}
                    isAnimationActive={animate}
                    name="Est. 1RM (kg)"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    type="monotone"
                    yAxisId="left"
                  />
                ) : (
                  <>
                    {showWeight ? (
                      <Line
                        animationDuration={DRAW_IN_MS}
                        dataKey="weight"
                        dot={weightDot}
                        isAnimationActive={animate}
                        name="Best set (kg)"
                        stroke="var(--accent)"
                        strokeWidth={2}
                        type="monotone"
                        yAxisId="left"
                      />
                    ) : null}
                    {showReps ? (
                      <Line
                        animationDuration={DRAW_IN_MS}
                        dataKey="reps"
                        dot={repsDot}
                        isAnimationActive={animate}
                        name="Reps"
                        stroke="var(--text-secondary)"
                        strokeDasharray="4 3"
                        strokeWidth={1.5}
                        type="monotone"
                        yAxisId="right"
                      />
                    ) : null}
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {showRightAxis ? <p className="mt-1 text-caption text-text-muted">Reps are drawn to fit the plot. Open the table for exact values.</p> : null}
      <label className="mt-3 block text-subhead text-text-secondary">Inspect plotted day
        <select aria-label="Inspect plotted day" className="mt-1 min-h-[3.125rem] w-full rounded-[var(--radius-control)] border border-control-line bg-surface-raised px-3 text-body text-text" onChange={(event) => { if (event.target.value) inspect(event.target.value); }} value={inspected?.date ?? ""}>
          <option value="">Choose a day</option>
          {rows.map((row) => <option key={row.date} value={row.date}>{row.label}: {row.weight} kg × {row.reps}</option>)}
        </select>
      </label>
      <p aria-live="polite" className="mt-2 text-callout text-text">{inspected ? `${inspected.label}: ${inspected.weight} kg × ${inspected.reps}, estimated 1RM ${inspected.est1rm} kg` : "Tap a point or choose a day to see its values."}</p>
      </>
      )}
    </div>
  );
}
