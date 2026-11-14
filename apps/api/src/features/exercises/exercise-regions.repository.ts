import { sql, type Kysely, type RawBuilder } from "kysely";
import type { AppDatabase } from "../../db/database.js";

export interface ExerciseRegion {
  id: string;
  slug: string;
  name: string;
  role: "PRIMARY" | "SECONDARY";
  sortOrder: number;
}

/** Explicit assignments win within their group; other groups use their default. */
export function effectiveRegions(exerciseId: RawBuilder<unknown>) {
  return sql`(
    select mr.id, mr.slug, mr.name, emr.role, mr.sort_order
    from exercise_muscle_regions emr
    join muscle_regions mr on mr.id = emr.muscle_region_id
    where emr.exercise_id = ${exerciseId}
    union all
    select mr.id, mr.slug, mr.name, emg.role, mr.sort_order
    from exercise_muscle_groups emg
    join muscle_regions mr on mr.muscle_group_id = emg.muscle_group_id and mr.is_group_default
    where emg.exercise_id = ${exerciseId}
      and not exists (
        select 1 from exercise_muscle_regions own
        join muscle_regions assigned on assigned.id = own.muscle_region_id
        where own.exercise_id = ${exerciseId} and assigned.muscle_group_id = emg.muscle_group_id
      )
  )`;
}

export function regionPredicate(exerciseId: RawBuilder<unknown>, regionId: string) {
  return sql<boolean>`exists (select 1 from ${effectiveRegions(exerciseId)} region where region.id = ${regionId})`;
}

export function regionSortOrder() {
  return sql<number>`(select min(region.sort_order) from ${effectiveRegions(sql.ref("exercises.id"))} region where region.role = 'PRIMARY')`;
}

export async function findExerciseRegions(db: Kysely<AppDatabase>, exerciseIds: string[]) {
  const grouped = new Map<string, ExerciseRegion[]>();
  if (!exerciseIds.length) return grouped;
  const { rows } = await sql<ExerciseRegion & { exerciseId: string }>`
    select e.id as "exerciseId", region.id, region.slug, region.name, region.role, region.sort_order as "sortOrder"
    from exercises e cross join lateral ${effectiveRegions(sql.ref("e.id"))} region
    where e.id in (${sql.join(exerciseIds)})
    order by case when region.role = 'PRIMARY' then 0 else 1 end, region.sort_order
  `.execute(db);
  for (const { exerciseId, ...region } of rows) grouped.set(exerciseId, [...(grouped.get(exerciseId) ?? []), region]);
  return grouped;
}
