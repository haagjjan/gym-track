import type { Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import { findSecondaryMuscleGroups, groupCompletedExercises } from "./analytics-exercise-list.repository.js";

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

export interface CompletedExerciseRecord {
  exercise: AnalyticsExerciseRecord;
  lastDoneAt: Date;
  plottedSetCount: number;
  totalSets: number;
}

interface AnalyticsExerciseRecord {
  id: string;
  name: string;
  primaryMuscleGroup: AnalyticsMuscleGroupRecord;
  secondaryMuscleGroups: AnalyticsMuscleGroupRecord[];
}

export interface AnalyticsMuscleGroupRecord {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
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
  workoutId: string;
  sessionDate: Date;
  exercise: {
    id: string;
    name: string;
  };
  muscleGroup: AnalyticsMuscleGroupRecord;
}

export interface AnalyticsRepository {
  findCompletedExercises(userId: string, timeZone: string): Promise<CompletedExerciseRecord[]>;
  findExerciseSets(filters: AnalyticsSetFilters): Promise<AnalyticsSetRecord[]>;
  findWeeklyVolumeSets(filters: WeeklyVolumeFilters): Promise<WeeklyVolumeSetRecord[]>;
}

export function createAnalyticsRepository(db: Kysely<AppDatabase>): AnalyticsRepository {
  return {
    async findCompletedExercises(userId, timeZone) {
      const rows = await db
        .selectFrom("sets")
        .innerJoin("session_exercises", "session_exercises.id", "sets.session_exercise_id")
        .innerJoin("workout_sessions", "workout_sessions.id", "session_exercises.workout_session_id")
        .innerJoin("exercises", "exercises.id", "session_exercises.exercise_id")
        .innerJoin("muscle_groups", "muscle_groups.id", "exercises.primary_muscle_group_id")
        .select([
          "exercises.id as exerciseId",
          "exercises.name as exerciseName",
          "workout_sessions.started_at as sessionDate",
          "sets.set_type as setType",
          "muscle_groups.id as primaryMuscleGroupId",
          "muscle_groups.slug as primaryMuscleGroupSlug",
          "muscle_groups.name as primaryMuscleGroupName",
          "muscle_groups.sort_order as primaryMuscleGroupSortOrder"
        ])
        .where("workout_sessions.user_id", "=", userId)
        .where("workout_sessions.deleted_at", "is", null)
        .where("session_exercises.deleted_at", "is", null)
        .where("sets.deleted_at", "is", null)
        .orderBy("workout_sessions.started_at", "desc")
        .execute();
      const secondaryMuscles = await findSecondaryMuscleGroups(
        db,
        [...new Set(rows.map((row) => row.exerciseId))]
      );

      return groupCompletedExercises(rows, secondaryMuscles, timeZone);
    },
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
        .innerJoin("exercise_muscle_groups", (join) =>
          join.onRef("exercise_muscle_groups.exercise_id", "=", "exercises.id")
            .on("exercise_muscle_groups.role", "=", "PRIMARY")
        )
        .innerJoin("muscle_groups", "muscle_groups.id", "exercise_muscle_groups.muscle_group_id")
        .select([
          "workout_sessions.id as workoutId",
          "workout_sessions.started_at as sessionDate",
          "exercises.id as exerciseId",
          "exercises.name as exerciseName",
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
        workoutId: row.workoutId,
        sessionDate: row.sessionDate,
        exercise: {
          id: row.exerciseId,
          name: row.exerciseName
        },
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
