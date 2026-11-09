import type { ReactNode } from "react";
import { StatTile } from "../../shared/ui/stat-tile";
import type { ExerciseSummaryPayload } from "../../shared/api/types";
import { formatKgValue, formatNumber } from "../../shared/format";
import type { ChartWindow } from "./progress-selection";
import { progressWindowLabel } from "./progress-summary";

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
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-[var(--radius-card)] bg-surface p-4 lg:grid-cols-4">
        <StatTile label="Total sets" value={rangeLoading ? "…" : String(range?.totalSets ?? 0)} />
        <StatTile label="Total volume" unit={rangeLoading ? undefined : "kg"} value={rangeLoading ? "…" : Number.isFinite(volume) ? formatNumber(volume) : "—"} />
        <StatTile label="Best set" unit={best ? "kg" : undefined} value={allTimeLoading ? "…" : best ? `${formatKgValue(best.weightKg)}×${best.reps}` : "—"} />
        <StatTile label="Estimated 1RM" unit={best ? "kg" : undefined} value={allTimeLoading ? "…" : best ? formatKgValue(best.estimatedOneRepMaxKg) : "—"} />
      </dl>
      <p className="mt-2 px-1 text-footnote text-text-muted">
        Sets and volume cover the {progressWindowLabel(window)}. Best set and estimated 1RM cover all time.
      </p>
    </section>
  );
}
