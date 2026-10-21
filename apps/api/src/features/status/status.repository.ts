import { sql, type Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import { statusWindow } from "./status-window.js";

export interface WeeklyWorkoutCount { weekStart: string; count: number }

export interface StatusMetricCounts {
  activeBetaAccounts: number;
  activeAccounts: number;
  workoutRecordsProcessed: number;
  completedWorkoutsLast30Days: number;
  completedWorkoutsByWeek: WeeklyWorkoutCount[];
}

export interface StatusRepository {
  getMetricCounts(at: Date): Promise<StatusMetricCounts>;
}

export function createStatusRepository(db: Kysely<AppDatabase>): StatusRepository {
  return {
    async getMetricCounts(at) {
      const { since30Days, weekStarts } = statusWindow(at);
      const completed = db.selectFrom("workout_sessions")
        .where("deleted_at", "is", null).where("ended_at", "is not", null)
        .where("ended_at", "<", at);
      const [accounts, workouts, recent, weeks] = await Promise.all([
        db.selectFrom("users").where("account_status", "=", "ACTIVE")
          .select((eb) => [
            eb.fn.countAll<string>().as("all"),
            eb.fn.countAll<string>().filterWhere("role", "=", "USER").as("beta")
          ]).executeTakeFirstOrThrow(),
        db.selectFrom("workout_sessions")
          .select((eb) => eb.fn.countAll<string>().as("count")).executeTakeFirstOrThrow(),
        completed.where("ended_at", ">=", since30Days)
          .select((eb) => eb.fn.countAll<string>().as("count")).executeTakeFirstOrThrow(),
        completed.where("ended_at", ">=", new Date(`${weekStarts[0]}T00:00:00Z`))
          .select((eb) => [
            sql<string>`to_char(date_trunc('week', ended_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`.as("weekStart"),
            eb.fn.countAll<string>().as("count")
          ]).groupBy("weekStart").orderBy("weekStart").execute()
      ]);
      return {
        activeBetaAccounts: Number(accounts.beta), activeAccounts: Number(accounts.all),
        workoutRecordsProcessed: Number(workouts.count),
        completedWorkoutsLast30Days: Number(recent.count),
        completedWorkoutsByWeek: weeks.map((week) => ({ weekStart: week.weekStart, count: Number(week.count) }))
      };
    }
  };
}
