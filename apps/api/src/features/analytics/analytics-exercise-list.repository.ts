import type { Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type { AnalyticsMuscleGroupRecord, CompletedExerciseRecord } from "./analytics.repository.js";

export interface CompletedExerciseRow {
  exerciseId: string;
  exerciseName: string;
  sessionDate: Date;
  setType: string;
  primaryMuscleGroupId: string;
  primaryMuscleGroupSlug: string;
  primaryMuscleGroupName: string;
  primaryMuscleGroupSortOrder: number;
}

export async function findSecondaryMuscleGroups(
  db: Kysely<AppDatabase>,
  exerciseIds: string[]
): Promise<Map<string, AnalyticsMuscleGroupRecord[]>> {
  const grouped = new Map<string, AnalyticsMuscleGroupRecord[]>();
  if (exerciseIds.length === 0) return grouped;

  const rows = await db
    .selectFrom("exercise_secondary_muscles")
    .innerJoin("muscle_groups", "muscle_groups.id", "exercise_secondary_muscles.muscle_group_id")
    .select([
      "exercise_secondary_muscles.exercise_id as exerciseId",
      "muscle_groups.id as id",
      "muscle_groups.slug as slug",
      "muscle_groups.name as name",
      "muscle_groups.sort_order as sortOrder"
    ])
    .where("exercise_secondary_muscles.exercise_id", "in", exerciseIds)
    .orderBy("muscle_groups.sort_order", "asc")
    .execute();

  for (const row of rows) {
    grouped.set(row.exerciseId, [...(grouped.get(row.exerciseId) ?? []), row]);
  }
  return grouped;
}

export function groupCompletedExercises(
  rows: CompletedExerciseRow[],
  secondaryMuscles: Map<string, AnalyticsMuscleGroupRecord[]>,
  timeZone: string
): CompletedExerciseRecord[] {
  const grouped = new Map<string, { record: CompletedExerciseRecord; plottedDays: Set<string> }>();
  const dayFormatter = new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "2-digit", timeZone, year: "numeric" });

  for (const row of rows) {
    const current = grouped.get(row.exerciseId);
    if (current) {
      addCompletedExerciseRow(current, row, dayFormatter);
    } else {
      grouped.set(row.exerciseId, initialCompletedExercise(row, secondaryMuscles, dayFormatter));
    }
  }

  return [...grouped.values()]
    .map((item) => item.record)
    .sort((left, right) => right.lastDoneAt.getTime() - left.lastDoneAt.getTime());
}

function addCompletedExerciseRow(
  current: { record: CompletedExerciseRecord; plottedDays: Set<string> },
  row: CompletedExerciseRow,
  dayFormatter: Intl.DateTimeFormat
): void {
  current.record.totalSets += 1;
  if (row.setType === "working") current.plottedDays.add(dayFormatter.format(row.sessionDate));
  current.record.plottedSetCount = current.plottedDays.size;
  if (row.sessionDate > current.record.lastDoneAt) current.record.lastDoneAt = row.sessionDate;
}

function initialCompletedExercise(
  row: CompletedExerciseRow,
  secondaryMuscles: Map<string, AnalyticsMuscleGroupRecord[]>,
  dayFormatter: Intl.DateTimeFormat
): { record: CompletedExerciseRecord; plottedDays: Set<string> } {
  const plottedDays = new Set<string>();
  if (row.setType === "working") plottedDays.add(dayFormatter.format(row.sessionDate));
  return {
    record: {
      exercise: {
        id: row.exerciseId,
        name: row.exerciseName,
        primaryMuscleGroup: {
          id: row.primaryMuscleGroupId,
          slug: row.primaryMuscleGroupSlug,
          name: row.primaryMuscleGroupName,
          sortOrder: row.primaryMuscleGroupSortOrder
        },
        secondaryMuscleGroups: secondaryMuscles.get(row.exerciseId) ?? []
      },
      lastDoneAt: row.sessionDate,
      plottedSetCount: plottedDays.size,
      totalSets: 1
    },
    plottedDays
  };
}
