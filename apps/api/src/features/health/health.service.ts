import type { DatabaseHealthCheck } from "../../db/database-health.js";

export type HealthStatus = "ok" | "degraded";

export interface HealthReport {
  status: HealthStatus;
  api: "ok";
  database: HealthStatus;
}

export async function getHealthReport(
  databaseHealth: DatabaseHealthCheck
): Promise<HealthReport> {
  try {
    await databaseHealth.check();

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
