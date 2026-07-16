import { recordClientDiagnostic } from "../../shared/client-diagnostics";

export type ProgressChartDiagnosticReason =
  | "data"
  | "metric"
  | "mode"
  | "scroll"
  | "window";

export interface ProgressChartDiagnosticInput {
  chartMode: "estimated" | "loadReps";
  chartRowCount: number;
  itemCount: number;
  reason: ProgressChartDiagnosticReason;
  scroller: HTMLDivElement | null;
  selectedWindowValue: "7" | "30" | "90" | "all";
  visibleReps: boolean;
  visibleWeight: boolean;
  widthRatio: number;
}

export function recordProgressChartDiagnostic({
  chartMode,
  chartRowCount,
  itemCount,
  reason,
  scroller,
  selectedWindowValue,
  visibleReps,
  visibleWeight,
  widthRatio
}: ProgressChartDiagnosticInput): void {
  recordClientDiagnostic({
    chartMode,
    chartRowCount,
    clientWidth: scroller?.clientWidth ?? 0,
    event: "progress_chart_state",
    itemCount,
    reason,
    route: "/progress",
    scrollLeft: scroller?.scrollLeft ?? 0,
    scrollWidth: scroller?.scrollWidth ?? 0,
    selectedWindowValue,
    visibleReps,
    visibleWeight,
    widthRatio
  });
}
