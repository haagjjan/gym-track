import type { Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";

export interface StatusMetricCounts {
  activeBetaAccounts: number;
  workoutRecordsProcessed: number;
}

export interface StatusRepository {
  getMetricCounts(): Promise<StatusMetricCounts>;
}

export function createStatusRepository(db: Kysely<AppDatabase>): StatusRepository {
  return {
    async getMetricCounts() {
      const [activeAccounts, workoutRecords] = await Promise.all([
        db.selectFrom("users")
          .select((eb) => eb.fn.countAll<string>().as("count"))
          .where("role", "=", "USER")
          .where("account_status", "=", "ACTIVE")
          .executeTakeFirstOrThrow(),
        db.selectFrom("workout_sessions")
          .select((eb) => eb.fn.countAll<string>().as("count"))
          .executeTakeFirstOrThrow()
      ]);

      return {
        activeBetaAccounts: Number(activeAccounts.count),
        workoutRecordsProcessed: Number(workoutRecords.count)
      };
    }
  };
}
