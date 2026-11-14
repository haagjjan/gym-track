import type { ReactNode } from "react";
import { StatTile } from "../../shared/ui/stat-tile";
import type { ChartWindow } from "../progress/progress-selection";
import { formatDuration } from "./tracking-types";
import { formatTrackingValue, trackingRange, type ProgressEntry, type TrackingDay, type TrackingMetric } from "./tracking-progress-data";

const WINDOW_SHORT: Record<ChartWindow, string> = { "7": "1W", "30": "1M", "90": "3M", all: "all" };

export function TrackingProgressSummary({ entries, kind, rows, metric, window }: {
  entries: ProgressEntry[]; kind: "time" | "cardio"; rows: TrackingDay[]; metric: TrackingMetric; window: ChartWindow;
}): ReactNode {
  const range = trackingRange(entries, window);
  const best = rows.length ? Math.max(...rows.map((row) => row.value)) : null;
  const unit = metric === "load" ? "kg" : metric === "distance" ? "km" : undefined;
  return <section aria-label="Summary"><dl className="grid grid-cols-3 gap-3 rounded-[var(--radius-card)] bg-surface px-4 py-3">
    <StatTile label={`${kind === "time" ? "Sets" : "Entries"}, ${WINDOW_SHORT[window]}`} value={String(range.length)} />
    <StatTile label={`Time, ${WINDOW_SHORT[window]}`} value={formatDuration(range.reduce((total, entry) => total + entry.durationSeconds, 0))} />
    <StatTile label={metric === "load" ? "Best weight" : metric === "distance" ? "Best distance" : "Best duration"} unit={best === null ? undefined : unit} value={best === null ? "—" : formatTrackingValue(best, metric)} />
  </dl><p className="sr-only">Count and total time cover the selected time window. The best {metric === "load" ? "added weight" : metric} covers all time.</p></section>;
}
