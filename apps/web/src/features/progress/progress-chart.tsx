"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis
} from "recharts";
import type { ExerciseProgressItem } from "../../shared/api/types";
import { formatKgValue } from "../../shared/format";
import { IconBack, IconForward } from "../../shared/ui/icons";
import type { ChartMode, ChartWindow } from "./progress-selection";
import { ProgressChartControls, SeriesLegend } from "./progress-chart-controls";
import {
  est1rmDot,
  formatDateTick,
  regularTimeTicks,
  repsDot,
  toChartRows,
  weightDot,
  yearBoundaryTimes,
  type ChartRow
} from "./progress-chart-data";
import {
  CHART_HEIGHT_CSS,
  PinnedAxis,
  X_AXIS_HEIGHT,
  Y_AXIS_WIDTH
} from "./progress-chart-axes";
import { ProgressChartTable } from "./progress-chart-table";
import { nearestRow } from "./progress-chart-geometry";

export type { ChartMode, ChartWindow } from "./progress-selection";

const DAY_MS = 86_400_000;
const WINDOW_DAYS: Record<Exclude<ChartWindow, "all">, number> = { "7": 7, "30": 30, "90": 90 };
/** Space between the pinned axes and the first/last dot, so edge points are never cut off. */
const EDGE_PX = 18;
const CHART_MARGIN = { top: 8, right: 0, bottom: 4, left: 0 };
/** A pointer that moves further than this between down and up was a pan, not a tap. */
const TAP_SLOP_PX = 10;
const DRAW_IN_MS = 900;

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
        <ChartPlot
          marked={marked}
          mode={mode}
          onTapDay={tapDay}
          rows={rows}
          showReps={showRepsSeries}
          showWeight={showWeightSeries}
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

function ChartPlot({ marked, mode, onTapDay, rows, showReps, showWeight, window }: {
  marked: ChartRow | undefined;
  mode: ChartMode;
  onTapDay: (date: string) => void;
  rows: ChartRow[];
  showReps: boolean;
  showWeight: boolean;
  window: ChartWindow;
}): ReactNode {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [viewport, setViewport] = useState(0);
  const reducedMotion = useMemo(() => typeof globalThis.matchMedia === "function" && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useLayoutEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;
    const measure = (): void => setViewport(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const first = rows[0]!.time;
  const last = rows[rows.length - 1]!.time;
  const spanMs = window === "all" ? Math.max(last - first, DAY_MS) : WINDOW_DAYS[window] * DAY_MS;
  const dataMin = Math.min(first, last - spanMs);
  const leftGutter = showWeight ? Y_AXIS_WIDTH : 0;
  const rightGutter = showReps ? Y_AXIS_WIDTH : 0;
  const chrome = leftGutter + rightGutter;
  const visiblePlot = Math.max(viewport - chrome, 1);
  // The visible window spans spanMs between the two edge paddings.
  const msPerPx = spanMs / Math.max(visiblePlot - 2 * EDGE_PX, 1);
  const plotWidth = viewport === 0 ? 0 : Math.max(visiblePlot, Math.round((last - dataMin) / msPerPx + 2 * EDGE_PX));
  const innerWidth = plotWidth + chrome;
  // Pad the time range itself: Recharts ignores axis padding on a fixed range,
  // which left the first and last dots under the pinned axes.
  const padMs = EDGE_PX * msPerPx;
  const domain: [number, number] = [dataMin - padMs, dataMin - padMs + plotWidth * msPerPx];
  // Start the date labels a little inside the plot: the first tilted label
  // would otherwise sit under the pinned left axis.
  const tickInset = 28 * msPerPx;
  const xTicks = regularTimeTicks([Math.min(dataMin + tickInset, last), last], plotWidth - 2 * EDGE_PX - 28);
  const yearBoundaries = yearBoundaryTimes([dataMin, last]);

  // Each window (and each exercise) opens on the newest day, at the right edge.
  useLayoutEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollLeft = 0;
  }, [window, rows]);

  // Stepping to a day off screen brings it into view.
  useEffect(() => {
    const element = scrollerRef.current;
    if (!element || !marked || innerWidth <= viewport) return;
    const x = leftGutter + ((marked.time - domain[0]) / (domain[1] - domain[0])) * plotWidth;
    const left = element.scrollWidth - element.clientWidth + element.scrollLeft; // rtl: scrollLeft is 0 at the right edge
    if (x < left + leftGutter + 8 || x > left + element.clientWidth - rightGutter - 8) {
      element.scrollTo({ left: x - element.clientWidth / 2 - (element.scrollWidth - element.clientWidth), behavior: reducedMotion ? "auto" : "smooth" });
    }
    // Only when the picked day changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marked?.date]);

  return (
    <div className="relative" style={{ height: CHART_HEIGHT_CSS }}>
      {showWeight ? <PinnedAxis color={WEIGHT_COLOR} dataKey={mode === "estimated" ? "est1rm" : "weight"} rows={rows} side="left" /> : null}
      {showReps ? <PinnedAxis color={REPS_COLOR} dataKey="reps" rows={rows} side="right" /> : null}

      {/* rtl: the newest data starts in view. pan-x/pan-y keep native swiping;
          a tap is a pointer that barely moved, so swiping never picks a day. */}
      <div
        className="h-full overflow-x-auto overflow-y-hidden overscroll-x-contain [touch-action:pan-x_pan-y]"
        dir="rtl"
        onPointerDown={(event) => { pointerRef.current = { x: event.clientX, y: event.clientY, moved: false }; }}
        onPointerMove={(event) => {
          const start = pointerRef.current;
          if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_SLOP_PX) start.moved = true;
        }}
        onScroll={() => { if (pointerRef.current) pointerRef.current.moved = true; }}
        ref={scrollerRef}
      >
        <div
          dir="ltr"
          onClick={(event) => {
            const gesture = pointerRef.current;
            pointerRef.current = null;
            if (gesture?.moved) return;
            const row = nearestRow(rows, event.clientX - event.currentTarget.getBoundingClientRect().left, {
              domainMax: domain[1],
              domainMin: domain[0],
              plotLeft: leftGutter,
              plotWidth
            });
            if (row) onTapDay(row.date);
          }}
          style={{ height: "100%", width: innerWidth || "100%" }}
        >
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={rows} margin={CHART_MARGIN}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              {yearBoundaries.map((boundaryTime) => (
                <ReferenceLine
                  key={boundaryTime}
                  label={{ fill: "var(--text-muted)", fontSize: 12, position: "insideTopLeft", value: String(new Date(boundaryTime).getUTCFullYear()) }}
                  stroke="var(--line)"
                  strokeWidth={2}
                  x={boundaryTime}
                  yAxisId={showWeight ? "left" : "right"}
                />
              ))}
              {marked ? (
                <ReferenceLine stroke="var(--text-muted)" strokeDasharray="3 3" x={marked.time} yAxisId={showWeight ? "left" : "right"} />
              ) : null}
              <XAxis
                allowDataOverflow
                dataKey="time"
                domain={domain}
                height={X_AXIS_HEIGHT}
                interval={0}
                stroke="var(--text-muted)"
                tick={{ angle: -45, dy: 4, fill: "var(--text-muted)", fontSize: 12, textAnchor: "end" }}
                tickFormatter={(value: number) => formatDateTick(value)}
                tickLine={false}
                ticks={xTicks}
                type="number"
              />
              {/* Invisible but present gutter axes: the pinned strips cover them. */}
              <YAxis axisLine={false} domain={["auto", "auto"]} hide={!showWeight} tick={false} tickLine={false} width={Y_AXIS_WIDTH} yAxisId="left" />
              <YAxis allowDecimals={false} axisLine={false} domain={["auto", "auto"]} hide={!showReps} orientation="right" tick={false} tickLine={false} width={Y_AXIS_WIDTH} yAxisId="right" />
              {mode === "estimated" ? (
                <Line animationDuration={DRAW_IN_MS} dataKey="est1rm" activeDot={false} dot={est1rmDot} isAnimationActive={!reducedMotion} name="Est. 1RM (kg)" stroke={WEIGHT_COLOR} strokeWidth={2} type="monotone" yAxisId="left" />
              ) : (
                <>
                  {showWeight ? (
                    <Line animationDuration={DRAW_IN_MS} dataKey="weight" activeDot={false} dot={weightDot} isAnimationActive={!reducedMotion} name="Weight (kg)" stroke={WEIGHT_COLOR} strokeWidth={2} type="monotone" yAxisId="left" />
                  ) : null}
                  {showReps ? (
                    <Line animationDuration={DRAW_IN_MS} dataKey="reps" activeDot={false} dot={repsDot} isAnimationActive={!reducedMotion} name="Reps" stroke={REPS_COLOR} strokeDasharray="5 3" strokeWidth={1.75} type="monotone" yAxisId="right" />
                  ) : null}
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
