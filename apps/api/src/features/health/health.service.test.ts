import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseHealthCheck } from "../../db/database-health.js";
import { getHealthReport } from "./health.service.js";

describe("getHealthReport", () => {
  it("reports ok when the database check succeeds", async () => {
    const databaseHealth: DatabaseHealthCheck = {
      async check() {}
    };

    assert.deepEqual(await getHealthReport(databaseHealth), {
      status: "ok",
      api: "ok",
      database: "ok"
    });
  });

  it("reports degraded when the database check fails", async () => {
    const databaseHealth: DatabaseHealthCheck = {
      async check() {
        throw new Error("database unavailable");
      }
    };

    assert.deepEqual(await getHealthReport(databaseHealth), {
      status: "degraded",
      api: "ok",
      database: "degraded"
    });
  });
});
