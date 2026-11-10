import type { ReactNode } from "react";
import type { ExerciseProgressItem } from "../../shared/api/types";
import { formatDay } from "../../shared/format";
import { selectBestWorkingSets, type ChartMode, type ChartWindow } from "./progress-selection";

export interface ChartRow {
  date: string;
  time: number;
  label: string;
  weight: number;
  reps: number;
  est1rm: number;
  weightChanged: boolean;
  repsChanged: boolean;
  est1rmChanged: boolean;
}

type RawChartRow = Omit<ChartRow, "weightChanged" | "repsChanged" | "est1rmChanged">;

/** Evenly spaced date ticks across the domain, about one per 72 px of plot. */
export function regularTimeTicks([min, max]: [number, number], plotWidth: number): number[] {
  if (max <= min) return [min];
  const count = Math.min(400, Math.max(2, Math.floor(plotWidth / 72)));
  return Array.from({ length: count }, (_, index) => min + ((max - min) * index) / (count - 1));
}

export function formatDateTick(time: number): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(time));
}

export function yearBoundaryTimes([minTime, maxTime]: [number, number]): number[] {
  if (maxTime <= minTime) return [];
  const boundaries: number[] = [];
  for (let year = new Date(minTime).getUTCFullYear() + 1; year <= new Date(maxTime).getUTCFullYear(); year += 1) {
    const boundary = Date.UTC(year, 0, 1);
    if (boundary > minTime && boundary < maxTime) boundaries.push(boundary);
  }
  return boundaries;
}

export function toChartRows(items: ExerciseProgressItem[], window: ChartWindow, mode: ChartMode): ChartRow[] {
  const sorted = selectBestWorkingSets(items, window, mode).map<RawChartRow>((item) => ({ date: item.sessionDate, time: new Date(item.sessionDate).getTime(), label: formatDay(item.sessionDate), weight: Number(item.weightKg), reps: item.reps, est1rm: Number(item.estimatedOneRepMaxKg) })).sort((left, right) => left.time - right.time);
  return sorted.map((row, index) => { const previous = sorted[index - 1]; return { ...row, weightChanged: !previous || row.weight !== previous.weight, repsChanged: !previous || row.reps !== previous.reps, est1rmChanged: !previous || row.est1rm !== previous.est1rm }; });
}

interface ChangeDotProps {
  cx?: number | undefined;
  cy?: number | undefined;
  payload?: ChartRow | undefined;
  stroke?: string | undefined;
}
function makeChangeDot(getIsChanged: (row: ChartRow) => boolean) {
  return function ChangeDot({ cx, cy, payload, stroke }: ChangeDotProps): ReactNode {
    if (cx === undefined || cy === undefined || !payload) return <circle cx={0} cy={0} fill="none" r={0} stroke="none" />;
    return getIsChanged(payload) ? <circle cx={cx} cy={cy} fill={stroke} r={4} stroke="none" /> : <circle cx={cx} cy={cy} fill="none" r={2.5} stroke={stroke} strokeWidth={1.5} />;
  };
}

export const weightDot = makeChangeDot((row) => row.weightChanged);
export const repsDot = makeChangeDot((row) => row.repsChanged);
export const est1rmDot = makeChangeDot((row) => row.est1rmChanged);
