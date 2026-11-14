import { sql, type Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type { WeeklyVolumeFilters, WeeklyVolumeRegionSetRecord } from "./analytics.repository.js";
import type { VolumeMuscleRole } from "./analytics-volume-attribution.js";

interface RegionRow {
  workoutId: string; sessionDate: Date; exerciseId: string; exerciseName: string;
  id: string; name: string; slug: string; sortOrder: number; groupSlug: string; muscleRole: VolumeMuscleRole;
}

/** Explicit region assignments win; missing groups use their default region and group role. */
export async function findVolumeRegionSets(db: Kysely<AppDatabase>, filters: WeeklyVolumeFilters, kind: "reps" | "time"): Promise<WeeklyVolumeRegionSetRecord[]> {
  const source = kind === "time"
    ? sql`from timed_sets s join workout_sessions ws on ws.id = s.workout_session_id join exercises ex on ex.id = s.exercise_id`
    : sql`from sets s join session_exercises se on se.id = s.session_exercise_id
        join workout_sessions ws on ws.id = se.workout_session_id join exercises ex on ex.id = se.exercise_id`;
  const result = await sql<RegionRow>`select ws.id as "workoutId", ws.started_at as "sessionDate", ex.id as "exerciseId", ex.name as "exerciseName",
    region.id, region.name, region.slug, region.sort_order as "sortOrder", mg.slug as "groupSlug",
    case when emg.role = 'SECONDARY' then 'SECONDARY' else coalesce(assignment.role, emg.role) end as "muscleRole"
    ${source}
    join exercise_muscle_groups emg on emg.exercise_id = ex.id
    join muscle_groups mg on mg.id = emg.muscle_group_id
    join muscle_regions region on region.muscle_group_id = mg.id
    left join exercise_muscle_regions assignment on assignment.exercise_id = ex.id and assignment.muscle_region_id = region.id
    where ws.user_id = ${filters.userId} and ws.deleted_at is null and s.deleted_at is null and s.set_type = 'working'
      and ex.tracking_mode = ${kind}
      ${kind === "reps" ? sql`and se.deleted_at is null` : sql``}
      and (assignment.exercise_id is not null or (region.is_group_default and not exists (
        select 1 from exercise_muscle_regions own join muscle_regions assigned on assigned.id = own.muscle_region_id
        where own.exercise_id = ex.id and assigned.muscle_group_id = mg.id
      )))
      ${filters.startDate ? sql`and ws.started_at >= ${filters.startDate}` : sql``}
      ${filters.endDate ? sql`and ws.started_at <= ${filters.endDate}` : sql``}
      ${filters.muscleGroupIds ? sql`and mg.id in (${sql.join(filters.muscleGroupIds)})` : sql``}
    order by ws.started_at, region.sort_order`.execute(db);
  return result.rows.map((row) => ({ workoutId: row.workoutId, sessionDate: row.sessionDate, muscleRole: row.muscleRole,
    exercise: { id: row.exerciseId, name: row.exerciseName },
    muscleRegion: { id: row.id, name: row.name, slug: row.slug, sortOrder: row.sortOrder, muscleGroupSlug: row.groupSlug } }));
}
