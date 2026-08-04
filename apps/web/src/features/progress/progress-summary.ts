import { formatNumber } from "../../shared/format";
import type { AnalyticsDateRange } from "../../shared/api/hooks";
import type { ChartWindow } from "./progress-selection";

const DAY_MS = 24 * 60 * 60 * 1000;

export function progressSummaryRange(
  window: ChartWindow,
  now = Date.now()
): AnalyticsDateRange | undefined {
  if (window === "all") {
    return undefined;
  }

  return {
    startDate: new Date(now - Number(window) * DAY_MS).toISOString(),
    endDate: new Date(now).toISOString()
  };
}

export function progressWindowLabel(window: ChartWindow): string {
  if (window === "all") return "full history";
  if (window === "7") return "last 1 week";
  if (window === "30") return "last 1 month";
  return "last 3 months";
}

export function formatTonnageKg(value: string | number): string {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? `${formatNumber(parsed)} KG` : "—";
}
