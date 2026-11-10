import type { ExerciseProgressItem } from "./analytics-types";
import { compareProgressAsc } from "./progress-items";

export function exportProgressCsv(
  items: ExerciseProgressItem[],
  exerciseName: string,
  selectedWindowLabel: string
): void {
  const rows = [
    [
      "exercise",
      "window",
      "date",
      "set_order",
      "set_type",
      "weight_kg",
      "reps",
      "rir",
      "estimated_1rm_kg",
      "workout_id",
      "set_id"
    ],
    ...[...items].sort(compareProgressAsc).map((item) => [
      exerciseName,
      selectedWindowLabel,
      item.sessionDate,
      item.setOrder.toString(),
      item.setType,
      item.weightKg,
      item.reps.toString(),
      item.rir.toString(),
      item.estimatedOneRepMaxKg,
      item.workoutId,
      item.setId
    ])
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");

  link.href = url;
  link.download = `${slugify(exerciseName)}-${selectedWindowLabel.toLowerCase()}-progress.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string): string {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "exercise";
}
