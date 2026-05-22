import type { Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";

export interface AnalyticsSetFilters {
  endDate: Date | undefined;
  exerciseId: string;
  includeWarmups: boolean;
  startDate: Date | undefined;
  userId: string;
}

export interface WeeklyVolumeFilters {
  endDate: Date | undefined;
  muscleGroupIds: string[] | undefined;
  startDate: Date | undefined;
  userId: string;
}

export interface AnalyticsSetRecord {
  workoutId: string;
  sessionExerciseId: string;
  setId: string;
  sessionDate: Date;
  setOrder: number;
  setType: string;
  weightKg: string;
  reps: number;
  rir: number;
}

export interface WeeklyVolumeSetRecord {
  sessionDate: Date;
  muscleGroup: {
    id: string;
    slug: string;
    name: string;
    sortOrder: number;
  };
}

export interface AnalyticsRepository {
  findExerciseSets(filters: AnalyticsSetFilters): Promise<AnalyticsSetRecord[]>;
  findWeeklyVolumeSets(filters: WeeklyVolumeFilters): Promise<WeeklyVolumeSetRecord[]>;
}

export function createAnalyticsRepository(db: Kysely<AppDatabase>): AnalyticsRepository {
  return {
    async findExerciseSets(filters) {
      const rows = await db
        .selectFrom("sets")
        .innerJoin("session_exercises", "session_exercises.id", "sets.session_exercise_id")
        .innerJoin("workout_sessions", "workout_sessions.id", "session_exercises.workout_session_id")
        .select([
          "workout_sessions.id as workoutId",
          "session_exercises.id as sessionExerciseId",
          "sets.id as setId",
          "workout_sessions.started_at as sessionDate",
          "sets.set_order as setOrder",
          "sets.set_type as setType",
          "sets.weight_kg as weightKg",
          "sets.reps as reps",
          "sets.rir as rir"
        ])
        .where("workout_sessions.user_id", "=", filters.userId)
        .where("session_exercises.exercise_id", "=", filters.exerciseId)
        .where("workout_sessions.deleted_at", "is", null)
        .where("session_exercises.deleted_at", "is", null)
        .where("sets.deleted_at", "is", null)
        .$if(!filters.includeWarmups, (query) => query.where("sets.set_type", "=", "working"))
        .$if(filters.startDate !== undefined, (query) =>
          query.where("workout_sessions.started_at", ">=", filters.startDate as Date)
        )
        .$if(filters.endDate !== undefined, (query) =>
          query.where("workout_sessions.started_at", "<=", filters.endDate as Date)
        )
        .orderBy("workout_sessions.started_at", "asc")
        .orderBy("session_exercises.position", "asc")
        .orderBy("sets.set_order", "asc")
        .execute();

      return rows;
    },
    async findWeeklyVolumeSets(filters) {
      const rows = await db
        .selectFrom("sets")
        .innerJoin("session_exercises", "session_exercises.id", "sets.session_exercise_id")
        .innerJoin("workout_sessions", "workout_sessions.id", "session_exercises.workout_session_id")
        .innerJoin("exercises", "exercises.id", "session_exercises.exercise_id")
        .innerJoin("muscle_groups", "muscle_groups.id", "exercises.primary_muscle_group_id")
        .select([
          "workout_sessions.started_at as sessionDate",
          "muscle_groups.id as muscleGroupId",
          "muscle_groups.slug as muscleGroupSlug",
          "muscle_groups.name as muscleGroupName",
          "muscle_groups.sort_order as muscleGroupSortOrder"
        ])
        .where("workout_sessions.user_id", "=", filters.userId)
        .where("workout_sessions.deleted_at", "is", null)
        .where("session_exercises.deleted_at", "is", null)
        .where("sets.deleted_at", "is", null)
        .where("sets.set_type", "=", "working")
        .$if(filters.startDate !== undefined, (query) =>
          query.where("workout_sessions.started_at", ">=", filters.startDate as Date)
        )
        .$if(filters.endDate !== undefined, (query) =>
          query.where("workout_sessions.started_at", "<=", filters.endDate as Date)
        )
        .$if(filters.muscleGroupIds !== undefined, (query) =>
          query.where("muscle_groups.id", "in", filters.muscleGroupIds as string[])
        )
        .orderBy("workout_sessions.started_at", "asc")
        .orderBy("muscle_groups.sort_order", "asc")
        .execute();

      return rows.map((row) => ({
        sessionDate: row.sessionDate,
        muscleGroup: {
          id: row.muscleGroupId,
          slug: row.muscleGroupSlug,
          name: row.muscleGroupName,
          sortOrder: row.muscleGroupSortOrder
        }
      }));
    }
  };
}
