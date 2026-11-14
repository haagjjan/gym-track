import { findVolumeRegionSets } from "../analytics/analytics-volume-region.repository.js";
import { sql, type Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type { WeeklyVolumeFilters, WeeklyVolumeSetRecord } from "../analytics/analytics.repository.js";
import { toWeeklyVolume } from "../analytics/analytics-weekly-volume.js";

export interface TimedRegionSet extends Omit<WeeklyVolumeSetRecord, "muscleGroup"> {
  muscleRegion: WeeklyVolumeSetRecord["muscleGroup"] & { muscleGroupSlug: string };
}
/** Remains compatible with a deployment that has not enabled the optional region schema. */
export async function findTimedRegionSets(db: Kysely<AppDatabase>, filters: WeeklyVolumeFilters): Promise<TimedRegionSet[]> {
  const available = await sql<{ present: boolean }>`select to_regclass('public.muscle_regions') is not null as present`.execute(db);
  return available.rows[0]?.present ? findVolumeRegionSets(db, filters, "time") : [];
}
interface RegionItem {
  muscleRegion: { id: string; name: string; slug: string; muscleGroupSlug: string };
  workingSets: number; exercises: { id: string; name: string; workingSets: number }[];
  recentSessions: { workoutId: string; sessionDate: string; workingSets: number }[];
}
export function addTimedRegionVolume<Volume extends { weeks: { weekStart: string }[] }>(volume: Volume, rows: TimedRegionSet[]): Volume {
  if (!rows.length) return volume;
  const extra = toWeeklyVolume(rows.map((row) => ({ ...row, muscleGroup: row.muscleRegion })));
  const groups = new Map(rows.map((row) => [row.muscleRegion.slug, row.muscleRegion.muscleGroupSlug]));
  for (const base of volume.weeks) {
    const week = base as typeof base & { regionItems?: RegionItem[] };
    // A legacy payload must not acquire a partial region list containing only time sets.
    if (!week.regionItems) continue;
    const additional = extra.weeks.find((item) => item.weekStart === week.weekStart);
    for (const item of additional?.items ?? []) {
      const current = week.regionItems.find((region) => region.muscleRegion.slug === item.muscleGroup.slug);
      if (!current) {
        const { muscleGroup, ...totals } = item;
        week.regionItems.push({ ...totals, muscleRegion: { ...muscleGroup, muscleGroupSlug: groups.get(muscleGroup.slug)! } });
      }
      else {
        current.workingSets += item.workingSets;
        current.exercises = addCounts(current.exercises, item.exercises, (exercise) => exercise.id).sort((left, right) => right.workingSets - left.workingSets);
        current.recentSessions = addCounts(current.recentSessions, item.recentSessions, (session) => session.workoutId)
          .sort((left, right) => right.sessionDate.localeCompare(left.sessionDate)).slice(0, 5);
      }
    }
  }
  return volume;
}
function addCounts<T extends { workingSets: number }>(left: T[], right: T[], key: (entry: T) => string): T[] {
  const items = new Map(left.map((entry) => [key(entry), { ...entry }]));
  for (const entry of right) {
    const current = items.get(key(entry));
    if (current) current.workingSets += entry.workingSets;
    else items.set(key(entry), { ...entry });
  }
  return [...items.values()];
}
