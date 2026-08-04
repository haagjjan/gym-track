import type { ExerciseProgressItem } from "../../shared/api/types";

export type ChartWindow = "7" | "30" | "90" | "all";
export type ChartMode = "loadReps" | "estimated";

export function windowStart(window: ChartWindow, now = Date.now()): number | null {
  if (window === "all") return null;
  return now - Number(window) * 24 * 60 * 60 * 1000;
}

export function selectBestWorkingSets(
  items: ExerciseProgressItem[],
  window: ChartWindow,
  mode: ChartMode,
  now = Date.now()
): ExerciseProgressItem[] {
  const cutoff = windowStart(window, now);
  const selected = new Map<string, ExerciseProgressItem>();

  for (const item of items) {
    const time = new Date(item.sessionDate).getTime();
    if (item.setType !== "working" || (cutoff !== null && time < cutoff)) continue;
    const day = localDayKey(item.sessionDate);
    const existing = selected.get(day);
    if (!existing || compareProgressSets(item, existing, mode) > 0) {
      selected.set(day, item);
    }
  }

  return [...selected.values()].sort(
    (left, right) =>
      new Date(left.sessionDate).getTime() - new Date(right.sessionDate).getTime()
  );
}

function localDayKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function compareProgressSets(
  left: ExerciseProgressItem,
  right: ExerciseProgressItem,
  mode: ChartMode
): number {
  const primary =
    mode === "estimated"
      ? Number(left.estimatedOneRepMaxKg) - Number(right.estimatedOneRepMaxKg)
      : Number(left.weightKg) - Number(right.weightKg);
  if (primary !== 0) return primary;

  const secondary =
    mode === "estimated"
      ? Number(left.weightKg) - Number(right.weightKg)
      : left.reps - right.reps;
  if (secondary !== 0) return secondary;
  if (mode === "estimated" && left.reps !== right.reps) return left.reps - right.reps;
  if (left.rir !== right.rir) return right.rir - left.rir;
  if (left.setOrder !== right.setOrder) return right.setOrder - left.setOrder;
  return right.setId.localeCompare(left.setId);
}
