import type { Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type { WeeklyVolumeFilters, WeeklyVolumeSetRecord } from "../analytics/analytics.repository.js";

export async function findTimedVolumeSets(db: Kysely<AppDatabase>, filters: WeeklyVolumeFilters): Promise<WeeklyVolumeSetRecord[]> {
  const rows = await db.selectFrom("timed_sets")
    .innerJoin("workout_sessions", "workout_sessions.id", "timed_sets.workout_session_id")
    .innerJoin("exercises", "exercises.id", "timed_sets.exercise_id")
    .innerJoin("exercise_muscle_groups", "exercise_muscle_groups.exercise_id", "exercises.id")
    .innerJoin("muscle_groups", "muscle_groups.id", "exercise_muscle_groups.muscle_group_id")
    .select(["exercise_muscle_groups.role as muscleRole", "workout_sessions.id as workoutId", "workout_sessions.started_at as sessionDate", "exercises.id as exerciseId", "exercises.name as exerciseName",
      "muscle_groups.id as muscleGroupId", "muscle_groups.slug as muscleGroupSlug", "muscle_groups.name as muscleGroupName", "muscle_groups.sort_order as sortOrder"])
    .where("workout_sessions.user_id", "=", filters.userId).where("workout_sessions.deleted_at", "is", null)
    .where("exercises.tracking_mode", "=", "time")
    .where("timed_sets.deleted_at", "is", null).where("timed_sets.set_type", "=", "working")
    .$if(filters.startDate !== undefined, (query) => query.where("workout_sessions.started_at", ">=", filters.startDate as Date))
    .$if(filters.endDate !== undefined, (query) => query.where("workout_sessions.started_at", "<=", filters.endDate as Date))
    .$if(filters.muscleGroupIds !== undefined, (query) => query.where("muscle_groups.id", "in", filters.muscleGroupIds as string[]))
    .execute();
  return rows.map((row) => ({ muscleRole: row.muscleRole, workoutId: row.workoutId, sessionDate: row.sessionDate,
    exercise: { id: row.exerciseId, name: row.exerciseName },
    muscleGroup: { id: row.muscleGroupId, name: row.muscleGroupName, slug: row.muscleGroupSlug, sortOrder: row.sortOrder } }));
}
