import type { ExerciseProgressItem } from "./analytics-types";

export function compareProgressAsc(
  left: ExerciseProgressItem,
  right: ExerciseProgressItem
): number {
  return progressTime(left) - progressTime(right) || left.setOrder - right.setOrder;
}

export function compareProgressDesc(
  left: ExerciseProgressItem,
  right: ExerciseProgressItem
): number {
  return compareProgressAsc(right, left);
}

export function formatProgressWeight(value: string): string {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return `${value} kg`;
  }

  return `${numberValue.toFixed(numberValue % 1 === 0 ? 0 : 1)} kg`;
}

export function shortSetDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function progressTime(item: ExerciseProgressItem): number {
  return new Date(item.sessionDate).getTime();
}
