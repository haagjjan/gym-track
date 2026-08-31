import type { ReactNode } from "react";
import { Metric, Panel } from "../../shared/ui/ui";
import type { ExerciseSummaryPayload } from "../../shared/api/types";
import { formatKgValue, shortDate } from "../../shared/format";
import type { ChartWindow } from "./progress-selection";
import { formatTonnageKg, progressWindowLabel } from "./progress-summary";

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
  const detail = progressWindowLabel(window);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Panel accent="cyan">
        <Metric
          detail={detail}
          label="Total sets"
          tone="cyan"
          value={rangeLoading ? "…" : String(range?.totalSets ?? 0)}
        />
      </Panel>
      <Panel accent="lavender">
        <Metric
          detail={detail}
          label="Total tonnage"
          tone="lavender"
          value={rangeLoading ? "…" : formatTonnageKg(range?.totalVolumeKg ?? 0)}
        />
      </Panel>
      <Panel accent="green">
        <Metric
          detail={allTime?.bestTopSet ? shortDate(allTime.bestTopSet.sessionDate) : undefined}
          label="Best set"
          tone="green"
          value={
            allTimeLoading
              ? "…"
              : allTime?.bestTopSet
                ? `${formatKgValue(allTime.bestTopSet.weightKg)}×${allTime.bestTopSet.reps}`
                : "—"
          }
        />
      </Panel>
      <Panel accent="green">
        <Metric
          label="EST_1RM"
          tone="green"
          value={
            allTimeLoading
              ? "…"
              : allTime?.bestTopSet
                ? `${formatKgValue(allTime.bestTopSet.estimatedOneRepMaxKg)} KG`
                : "—"
          }
        />
      </Panel>
    </div>
  );
}
