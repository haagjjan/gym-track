"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { formatDateTick, regularTimeTicks, yearBoundaryTimes } from "./progress-chart-data";
import { CHART_HEIGHT_CSS, PinnedAxis, X_AXIS_HEIGHT, Y_AXIS_WIDTH } from "./progress-chart-axes";
import { nearestRow } from "./progress-chart-geometry";
import type { ChartWindow } from "./progress-selection";

export interface ProgressPlotRow { date: string; time: number }
export interface ProgressPlotSeries {
  dataKey: string;
  side: "left" | "right";
  color: string;
  label: string;
  dot?: ComponentProps<typeof Line>["dot"];
  dash?: string;
  axisWidth?: number;
  formatValue?: (value: number) => string;
}
const DAY_MS = 86_400_000;
const WINDOW_DAYS = { "7": 7, "30": 30, "90": 90 };
const EDGE_PX = 18;
const CHART_MARGIN = { top: 8, right: 0, bottom: 4, left: 0 };
const TAP_SLOP_PX = 10;
const DRAW_IN_MS = 900;

/**
 * Shared time plot: pinned axes, native panning, tap inspection and newest-day anchoring.
 * The existing viewport, scroll and gesture coordination stays together here: splitting
 * those effects across components would obscure their shared geometry and pointer state.
 */
export function ProgressChartPlot<T extends ProgressPlotRow>({ marked, onTapDay, rows, series, window }: {
  marked: T | undefined; onTapDay: (date: string) => void; rows: T[];
  series: ProgressPlotSeries[]; window: ChartWindow;
}): ReactNode {
  const leftSeries = series.find((item) => item.side === "left");
  const rightSeries = series.find((item) => item.side === "right");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [viewport, setViewport] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    const preference = globalThis.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

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
  const leftGutter = leftSeries ? leftSeries.axisWidth ?? Y_AXIS_WIDTH : 0;
  const rightGutter = rightSeries ? rightSeries.axisWidth ?? Y_AXIS_WIDTH : 0;
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
      {leftSeries ? <PinnedAxis {...leftSeries} rows={rows} side="left" width={leftGutter} /> : null}
      {rightSeries ? <PinnedAxis {...rightSeries} rows={rows} side="right" width={rightGutter} /> : null}

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
                  yAxisId={leftSeries ? "left" : "right"}
                />
              ))}
              {marked ? (
                <ReferenceLine stroke="var(--text-muted)" strokeDasharray="3 3" x={marked.time} yAxisId={leftSeries ? "left" : "right"} />
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
              <YAxis axisLine={false} domain={["auto", "auto"]} hide={!leftSeries} tick={false} tickLine={false} width={leftGutter} yAxisId="left" />
              <YAxis allowDecimals={false} axisLine={false} domain={["auto", "auto"]} hide={!rightSeries} orientation="right" tick={false} tickLine={false} width={rightGutter} yAxisId="right" />
              {series.map((item) => <Line animationDuration={DRAW_IN_MS} dataKey={item.dataKey} activeDot={false} dot={item.dot ?? { r: 3 }} isAnimationActive={!reducedMotion} key={item.dataKey} name={item.label} stroke={item.color} {...(item.dash ? { strokeDasharray: item.dash } : {})} strokeWidth={2} type="monotone" yAxisId={item.side} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
