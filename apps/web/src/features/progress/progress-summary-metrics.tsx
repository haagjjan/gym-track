import type { ReactNode } from "react";
import { StatTile } from "../../shared/ui/stat-tile";
import type { ExerciseSummaryPayload } from "../../shared/api/types";
import { formatCompactNumber, formatKgValue } from "../../shared/format";
import type { ChartWindow } from "./progress-selection";
import { progressWindowLabel } from "./progress-summary";

const WINDOW_SHORT: Record<ChartWindow, string> = { "7": "1W", "30": "1M", "90": "3M", all: "all" };

export function ProgressSummaryMetrics({
  allTime,
  allTimeLoading,
  range,
  rangeLoading,
  window
}: {
  allTime: ExerciseSummaryPayload | undefined;
  allTimeLoading: boolean;
  range: ExerciseSummaryPayload | undefined;
  rangeLoading: boolean;
  window: ChartWindow;
}): ReactNode {
  const best = allTime?.bestTopSet;
  const volume = Number(range?.totalVolumeKg ?? 0);

  return (
    <section aria-label="Summary">
      {/* One row of three; the labels say which span each number covers. The best
          set is already on the chart and in the readout. */}
      <dl className="grid grid-cols-3 gap-3 rounded-[var(--radius-card)] bg-surface px-4 py-3">
        <StatTile label={`Sets, ${WINDOW_SHORT[window]}`} value={rangeLoading ? "…" : String(range?.totalSets ?? 0)} />
        <StatTile label={`Volume, ${WINDOW_SHORT[window]}`} unit={rangeLoading ? undefined : "kg"} value={rangeLoading ? "…" : Number.isFinite(volume) ? formatCompactNumber(volume) : "—"} />
        <StatTile label="Best est. 1RM" unit={best ? "kg" : undefined} value={allTimeLoading ? "…" : best ? formatKgValue(best.estimatedOneRepMaxKg) : "—"} />
      </dl>
      <p className="sr-only">Sets and volume cover the {progressWindowLabel(window)}. Best estimated 1RM covers all time.</p>
    </section>
  );
}
