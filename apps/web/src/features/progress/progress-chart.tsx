"use client";

import { useMemo, type ReactNode } from "react";
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
import { EmptyState } from "../../shared/ui/ui";
import type { ExerciseProgressItem } from "../../shared/api/types";
import { shortDate } from "../../shared/format";
import type { ChartMode, ChartWindow } from "./progress-selection";
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
  PinnedRightAxis,
  X_AXIS_HEIGHT,
  Y_AXIS_LEFT_WIDTH,
  Y_AXIS_RIGHT_WIDTH
} from "./progress-chart-axes";
import { useProgressChartZoom } from "./use-progress-chart-zoom";

export type { ChartMode, ChartWindow } from "./progress-selection";

const POINT_WIDTH_PX = 56;
const MIN_VISIBLE_POINTS = 8;
const TIME_DOMAIN: [string, string] = ["dataMin", "dataMax"];
/** Keeps first/last dots and the tilted date labels clear of the pinned axis strips. */
const X_PADDING: { left: number; right: number } = { left: 36, right: 26 };
/** Target horizontal spacing between X-axis date ticks. */
/** Pinch/wheel zoom bounds: ×0.5 densifies for overview, ×4 spreads for detail. */
const DRAW_IN_MS = 900;

/**
 * Strength time series: LOAD_REPS mode plots the day's best working set
 * (weight + its reps, individually toggleable); EST_1RM plots the day's top
 * estimated one-rep max. Working sets only. Scrolls horizontally when dense.
 */
export function ProgressChart({
  items,
  mode,
  onModeChange,
  onShowRepsChange,
  onShowWeightChange,
  showReps,
  showWeight,
  window
}: {
  items: ExerciseProgressItem[];
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
  onShowRepsChange: (show: boolean) => void;
  onShowWeightChange: (show: boolean) => void;
  showReps: boolean;
  showWeight: boolean;
  window: ChartWindow;
}): ReactNode {
  const { gestureActive, reducedMotion, reset, scrollerRef, zoom } =
    useProgressChartZoom(window);
  const rows = useMemo(() => toChartRows(items, window, mode), [items, mode, window]);
  const yearBoundaries = useMemo(() => yearBoundaryTimes(rows), [rows]);

  if (rows.length === 0) {
    return (
      <div>
        <ProgressChartControls
          mode={mode}
          onModeChange={onModeChange}
          onShowRepsChange={onShowRepsChange}
          onShowWeightChange={onShowWeightChange}
          showReps={showReps}
          showWeight={showWeight}
        />
        <EmptyState
          message="No working sets in this window. Widen the range or log a session."
          title="Nothing in this window"
        />
      </div>
    );
  }

  const innerWidth = Math.round(
    Math.max(rows.length, MIN_VISIBLE_POINTS) * POINT_WIDTH_PX * zoom
  );
  // Evenly spaced date ticks across the whole time domain — Recharts' default
  // tick picker leaves long ranges (MAX) nearly unlabeled. Density follows the
  // laid-out width, so zooming in labels finer sub-ranges automatically.
  const xTicks = regularTimeTicks(rows, innerWidth);
  // Both modes plot kilograms on the left; reps only exist in LOAD_REPS mode.
  const showLeftAxis = mode === "estimated" || showWeight;
  const showRightAxis = mode === "loadReps" && showReps;
  // Draw-in stays a mount/window-change flourish; it pauses during zoom
  // gestures (constant morphs while pinching read as jitter) and respects
  // prefers-reduced-motion.
  const animate = !reducedMotion && !gestureActive;

  return (
    <div>
      <ProgressChartControls
        mode={mode}
        onModeChange={onModeChange}
        onShowRepsChange={onShowRepsChange}
        onShowWeightChange={onShowWeightChange}
        showReps={showReps}
        showWeight={showWeight}
      />

      {/* Unit captions sit above the pinned strips so axis values always read
          with their unit, and never collide with the topmost tick. */}
      <div className="mb-1 flex items-center justify-between font-mono text-[9px] tracking-[0.14em] text-outline">
        <span>{showLeftAxis ? "KG" : ""}</span>
        {zoom !== 1 ? (
          <button
            className="cursor-pointer rounded border border-outline-dim px-1.5 py-0.5 text-[9px] tracking-[0.14em] text-outline transition-colors hover:border-cyan hover:text-cyan"
            onClick={reset}
            type="button"
          >
            ZOOM ×{zoom.toFixed(1)} — RESET
          </button>
        ) : null}
        <span className={showRightAxis ? "text-lavender-dim" : ""}>
          {showRightAxis ? "REPS" : ""}
        </span>
      </div>

      <div className="relative">
        {showLeftAxis ? <PinnedLeftAxis mode={mode} rows={rows} /> : null}
        {showRightAxis ? <PinnedRightAxis rows={rows} /> : null}

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
              <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                {yearBoundaries.map((boundaryTime) => (
                  <ReferenceLine
                    key={boundaryTime}
                    label={{
                      fill: "#b9cacb",
                      fontSize: 10,
                      position: "insideTopLeft",
                      value: String(new Date(boundaryTime).getUTCFullYear())
                    }}
                    stroke="rgba(185, 202, 203, 0.45)"
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
                  stroke="#849495"
                  tick={{
                    angle: -45,
                    dy: 4,
                    fill: "#849495",
                    fontSize: 10,
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
                {mode === "loadReps" ? (
                  <YAxis
                    axisLine={false}
                    domain={["auto", "auto"]}
                    orientation="right"
                    tick={false}
                    tickLine={false}
                    width={Y_AXIS_RIGHT_WIDTH}
                    yAxisId="right"
                  />
                ) : null}
                <Tooltip
                  contentStyle={{
                    background: "rgba(19,19,19,0.95)",
                    border: "1px solid rgba(0,242,255,0.25)",
                    borderRadius: 8,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11
                  }}
                  labelFormatter={(value) =>
                    typeof value === "number" ? shortDate(new Date(value).toISOString()) : value
                  }
                  labelStyle={{ color: "#b9cacb" }}
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
                    stroke="#51fb37"
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
                        name="Top set (kg)"
                        stroke="#00dbe7"
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
                        stroke="#d9b9ff"
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
    </div>
  );
}
