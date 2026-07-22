import { sql, type Kysely, type RawBuilder } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import {
  type AllTimeWorkoutSummaryRecord,
  type WorkoutListFilters,
  type WorkoutListRecord,
  type WorkoutListResult
} from "./workout.repository.js";
import { toWorkoutSessionRecord, workoutSessionSelection } from "./workout-records.js";

export async function listWorkoutRecords(
  db: Kysely<AppDatabase>,
  filters: WorkoutListFilters
): Promise<WorkoutListResult> {
  return {
    items: await listRows(db, filters),
    total: await countRows(db, filters),
    allTimeSummary: await findAllTimeSummary(db, filters.userId)
  };
}

async function listRows(db: Kysely<AppDatabase>, filters: WorkoutListFilters): Promise<WorkoutListRecord[]> {
  let query = db.selectFrom("workout_sessions").select(workoutSessionSelection).select((eb) => [
    eb.selectFrom("session_exercises").select((subquery) => subquery.fn.countAll<string>().as("count")).whereRef("session_exercises.workout_session_id", "=", "workout_sessions.id").where("session_exercises.deleted_at", "is", null).as("totalExercises"),
    eb.selectFrom("sets").innerJoin("session_exercises", "session_exercises.id", "sets.session_exercise_id").select((subquery) => subquery.fn.countAll<string>().as("count")).whereRef("session_exercises.workout_session_id", "=", "workout_sessions.id").where("session_exercises.deleted_at", "is", null).where("sets.deleted_at", "is", null).as("totalSets"),
    eb.selectFrom("sets").innerJoin("session_exercises", "session_exercises.id", "sets.session_exercise_id").select(sql<string>`coalesce(sum(sets.weight_kg * sets.reps), 0)::text`.as("tonnageKg")).whereRef("session_exercises.workout_session_id", "=", "workout_sessions.id").where("session_exercises.deleted_at", "is", null).where("sets.deleted_at", "is", null).as("tonnageKg")
  ]).where("user_id", "=", filters.userId).where("deleted_at", "is", null).where(filterExpression(filters));

  if (filters.sort === "oldest") query = query.orderBy("started_at", "asc");
  else if (filters.sort === "name") query = query.orderBy(sql<string>`lower(coalesce(title, workout_type, ''))`, "asc").orderBy("started_at", "desc");
  else query = query.orderBy("started_at", "desc");

  const rows = await query.limit(filters.limit).offset(filters.offset).execute();
  const previews = await findExercisePreviews(db, rows.map((row) => row.id));
  return rows.map((row) => ({
    ...toWorkoutSessionRecord(row),
    totalExercises: Number(row.totalExercises),
    totalSets: Number(row.totalSets),
    tonnageKg: row.tonnageKg ?? "0",
    exercisePreview: previews.get(row.id) ?? []
  }));
}

async function countRows(db: Kysely<AppDatabase>, filters: WorkoutListFilters): Promise<number> {
  const row = await db.selectFrom("workout_sessions").select((eb) => eb.fn.countAll<string>().as("total")).where("user_id", "=", filters.userId).where("deleted_at", "is", null).where(filterExpression(filters)).executeTakeFirstOrThrow();
  return Number(row.total);
}

function filterExpression(filters: WorkoutListFilters): RawBuilder<boolean> {
  const clauses: RawBuilder<unknown>[] = [];
  if (filters.startDate) clauses.push(sql`workout_sessions.started_at >= ${filters.startDate}`);
  if (filters.endDate) clauses.push(sql`workout_sessions.started_at <= ${filters.endDate}`);
  if (filters.search) clauses.push(searchExpression(filters.search, filters.timeZone));
  const facets = exerciseFilterClauses(filters);
  if (facets.length > 0) clauses.push(sql`exists (
    select 1 from session_exercises filtered_se
    join exercises filtered_e on filtered_e.id = filtered_se.exercise_id
    where filtered_se.workout_session_id = workout_sessions.id
      and filtered_se.deleted_at is null and filtered_e.deleted_at is null
      and ${sql.join(facets, sql` and `)}
  )`);
  return clauses.length > 0 ? sql<boolean>`(${sql.join(clauses, sql` and `)})` : sql<boolean>`true`;
}

function searchExpression(search: string, timeZone: string): RawBuilder<unknown> {
  const pattern = `%${search.toLowerCase()}%`;
  return sql`(
    lower(coalesce(workout_sessions.title, '')) like ${pattern}
    or lower(coalesce(workout_sessions.workout_type, '')) like ${pattern}
    or lower(to_char(workout_sessions.started_at at time zone ${timeZone}, 'YYYY-MM-DD')) like ${pattern}
    or lower(to_char(workout_sessions.started_at at time zone ${timeZone}, 'DD.MM.YYYY')) like ${pattern}
    or lower(to_char(workout_sessions.started_at at time zone ${timeZone}, 'FMMonth DD YYYY')) like ${pattern}
    or exists (
      select 1 from session_exercises search_se
      join exercises search_e on search_e.id = search_se.exercise_id
      where search_se.workout_session_id = workout_sessions.id and search_se.deleted_at is null
        and (lower(search_e.name) like ${pattern} or lower(coalesce(search_e.equipment, '')) like ${pattern}
          or exists (select 1 from exercise_muscle_groups search_emg join muscle_groups search_mg on search_mg.id = search_emg.muscle_group_id where search_emg.exercise_id = search_e.id and lower(search_mg.name) like ${pattern}))
    )
  )`;
}

function exerciseFilterClauses(filters: WorkoutListFilters): RawBuilder<unknown>[] {
  const clauses = filters.muscleGroupIds.map((id) => sql`exists (select 1 from exercise_muscle_groups facet_emg where facet_emg.exercise_id = filtered_e.id and facet_emg.muscle_group_id = ${id})`);
  if (filters.equipment === "unspecified") clauses.push(sql`filtered_e.equipment is null`);
  else if (filters.equipment) clauses.push(sql`filtered_e.equipment = ${filters.equipment}`);
  if (filters.exerciseType === "unspecified") clauses.push(sql`filtered_e.exercise_type is null`);
  else if (filters.exerciseType) clauses.push(sql`filtered_e.exercise_type = ${filters.exerciseType}`);
  return clauses;
}

async function findExercisePreviews(db: Kysely<AppDatabase>, workoutIds: string[]): Promise<Map<string, WorkoutListRecord["exercisePreview"]>> {
  const grouped = new Map<string, WorkoutListRecord["exercisePreview"]>();
  if (workoutIds.length === 0) return grouped;
  const rows = await db.selectFrom("session_exercises").innerJoin("exercises", "exercises.id", "session_exercises.exercise_id").select(["session_exercises.workout_session_id as workoutId", "session_exercises.position as position", "exercises.id as id", "exercises.name as name", "exercises.equipment as equipment", "exercises.exercise_type as exerciseType"]).where("session_exercises.workout_session_id", "in", workoutIds).where("session_exercises.deleted_at", "is", null).orderBy("session_exercises.position", "asc").execute();
  for (const row of rows) {
    const current = grouped.get(row.workoutId) ?? [];
    if (current.length < 4) grouped.set(row.workoutId, [...current, { id: row.id, name: row.name, equipment: row.equipment, exerciseType: row.exerciseType }]);
  }
  return grouped;
}

async function findAllTimeSummary(db: Kysely<AppDatabase>, userId: string): Promise<AllTimeWorkoutSummaryRecord> {
  const sessions = await db.selectFrom("workout_sessions").select((eb) => [eb.fn.countAll<string>().as("totalSessions"), sql<string>`count(*) filter (where ended_at is not null)`.as("completedSessions"), sql<string>`avg(extract(epoch from (ended_at - started_at))) filter (where ended_at is not null)`.as("averageDuration")]).where("user_id", "=", userId).where("deleted_at", "is", null).executeTakeFirstOrThrow();
  const tonnage = await db.selectFrom("sets").innerJoin("session_exercises", "session_exercises.id", "sets.session_exercise_id").innerJoin("workout_sessions", "workout_sessions.id", "session_exercises.workout_session_id").select(sql<string>`coalesce(sum(sets.weight_kg * sets.reps), 0)::text`.as("value")).where("workout_sessions.user_id", "=", userId).where("workout_sessions.deleted_at", "is", null).where("session_exercises.deleted_at", "is", null).where("sets.deleted_at", "is", null).executeTakeFirstOrThrow();
  const totalSessions = Number(sessions.totalSessions);
  const completedSessions = Number(sessions.completedSessions);
  return { totalSessions, completedSessions, cumulativeTonnageKg: tonnage.value, averageCompletedDurationSeconds: sessions.averageDuration === null ? null : Number(sessions.averageDuration), completionRate: totalSessions === 0 ? 0 : completedSessions / totalSessions };
}
