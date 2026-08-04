import type { ReactNode } from "react";
import type { ExerciseProgressItem } from "../../shared/api/types";
import { shortDate } from "../../shared/format";
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

export function regularTimeTicks(rows: ChartRow[], plotWidth: number): number[] {
  if (rows.length < 2) return rows.map((row) => row.time);
  const count = Math.min(200, Math.max(2, Math.floor(plotWidth / 88)));
  const min = rows[0]!.time;
  const max = rows[rows.length - 1]!.time;
  return Array.from({ length: count }, (_, index) => min + ((max - min) * index) / (count - 1));
}

export function formatDateTick(time: number): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(time));
}

export function yearBoundaryTimes(rows: ChartRow[]): number[] {
  if (rows.length < 2) return [];
  const minTime = rows[0]!.time;
  const maxTime = rows[rows.length - 1]!.time;
  const boundaries: number[] = [];
  for (let year = new Date(minTime).getUTCFullYear() + 1; year <= new Date(maxTime).getUTCFullYear(); year += 1) {
    const boundary = Date.UTC(year, 0, 1);
    if (boundary > minTime && boundary < maxTime) boundaries.push(boundary);
  }
  return boundaries;
}

export function toChartRows(items: ExerciseProgressItem[], window: ChartWindow, mode: ChartMode): ChartRow[] {
  const sorted = selectBestWorkingSets(items, window, mode).map<RawChartRow>((item) => ({ date: item.sessionDate, time: new Date(item.sessionDate).getTime(), label: shortDate(item.sessionDate), weight: Number(item.weightKg), reps: item.reps, est1rm: Number(item.estimatedOneRepMaxKg) })).sort((left, right) => left.time - right.time);
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
