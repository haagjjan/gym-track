import { sql, type Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type { WeeklyVolumeFilters, WeeklyVolumeSetRecord } from "../analytics/analytics.repository.js";
import { toWeeklyVolume } from "../analytics/analytics-weekly-volume.js";

export interface TimedRegionSet extends Omit<WeeklyVolumeSetRecord, "muscleGroup"> {
  muscleRegion: WeeklyVolumeSetRecord["muscleGroup"] & { muscleGroupSlug: string };
}
interface RegionRow { workoutId: string; sessionDate: Date; exerciseId: string; exerciseName: string; id: string; name: string; slug: string; sortOrder: number; groupSlug: string }

/** Batch C is independent of the optional region schema added by Batch B. */
export async function findTimedRegionSets(db: Kysely<AppDatabase>, filters: WeeklyVolumeFilters): Promise<TimedRegionSet[]> {
  const available = await sql<{ present: boolean }>`select to_regclass('public.muscle_regions') is not null as present`.execute(db);
  if (!available.rows[0]?.present) return [];
  // Time exercises are new catalog entries and have no region assignments.
  // Match the accepted fallback for custom exercises: each primary group's default.
  const result = await sql<RegionRow>`select ws.id as "workoutId", ws.started_at as "sessionDate", ex.id as "exerciseId", ex.name as "exerciseName",
    region.id, region.name, region.slug, region.sort_order as "sortOrder", mg.slug as "groupSlug"
    from timed_sets ts join workout_sessions ws on ws.id = ts.workout_session_id
    join exercises ex on ex.id = ts.exercise_id
    join exercise_muscle_groups emg on emg.exercise_id = ex.id and emg.role = 'PRIMARY'
    join muscle_groups mg on mg.id = emg.muscle_group_id
    join muscle_regions region on region.muscle_group_id = mg.id and region.is_group_default
    where ws.user_id = ${filters.userId} and ws.deleted_at is null and ts.deleted_at is null and ts.set_type = 'working'
      ${filters.startDate ? sql`and ws.started_at >= ${filters.startDate}` : sql``}
      ${filters.endDate ? sql`and ws.started_at <= ${filters.endDate}` : sql``}
      ${filters.muscleGroupIds ? sql`and mg.id in (${sql.join(filters.muscleGroupIds)})` : sql``}`.execute(db);
  return result.rows.map((row) => ({ workoutId: row.workoutId, sessionDate: row.sessionDate,
    exercise: { id: row.exerciseId, name: row.exerciseName }, muscleRegion: { id: row.id, name: row.name, slug: row.slug, sortOrder: row.sortOrder, muscleGroupSlug: row.groupSlug } }));
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
