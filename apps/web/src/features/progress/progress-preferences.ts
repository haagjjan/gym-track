import type { ChartMode, ChartWindow } from "./progress-selection";

export interface ProgressViewPreferences {
  window: ChartWindow;
  mode: ChartMode;
  showWeight: boolean;
  showReps: boolean;
}

export const initialProgressViewPreferences: ProgressViewPreferences = {
  window: "30",
  mode: "loadReps",
  showWeight: true,
  showReps: true
};

export function updateProgressViewPreferences(
  current: ProgressViewPreferences,
  patch: Partial<ProgressViewPreferences>
): ProgressViewPreferences {
  const next = { ...current, ...patch };
  if (next.mode === "loadReps" && !next.showWeight && !next.showReps) return current;
  return next;
}
