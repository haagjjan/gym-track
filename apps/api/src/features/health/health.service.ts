import { sql, type Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";

export type HealthStatus = "ok" | "degraded";

export interface HealthReport {
  status: HealthStatus;
  api: "ok";
  database: HealthStatus;
}

export async function getHealthReport(
  db: Kysely<AppDatabase>
): Promise<HealthReport> {
  try {
    await sql`select 1`.execute(db);

    return {
      status: "ok",
      api: "ok",
      database: "ok"
    };
  } catch {
    return {
      status: "degraded",
      api: "ok",
      database: "degraded"
    };
  }
}
