import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import { createDatabase } from "../../db/database.js";
import { createStatusRepository } from "./status.repository.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const at = new Date("2026-10-21T12:00:00Z");

describe("public recent workout aggregates", {
  skip: databaseUrl ? false : "INTEGRATION_DATABASE_URL is not set"
}, () => {
  const db = createDatabase(databaseUrl ?? "postgresql://unused");
  after(async () => { await db.destroy(); });

  it("uses completion dates, UTC weeks and one exclusive cutoff for every account role/status", async () => {
    await db.transaction().setIsolationLevel("repeatable read").execute(async (trx) => {
      const repository = createStatusRepository(trx);
      const baseline = await repository.getMetricCounts(at);
      const users = ["USER", "ADMIN", "USER", "USER"].map((role, index) => ({
        id: randomUUID(), username: `activity_${randomUUID()}`, email: `${randomUUID()}@example.test`,
        password_hash: "not-used", role: role as "USER" | "ADMIN",
        account_status: (["ACTIVE", "ACTIVE", "SUSPENDED", "DELETION_PENDING"] as const)[index]!,
        deletion_requested_at: index === 3 ? at : null,
        deletion_due_at: index === 3 ? new Date("2026-10-28T12:00:00Z") : null
      }));
      await trx.insertInto("users").values(users).execute();
      const workout = (end: string | null, owner = 0, deleted = false) => ({
        id: randomUUID(), user_id: users[owner]!.id,
        started_at: new Date(new Date(end ?? at).getTime() - 3_600_000),
        ended_at: end ? new Date(end) : null, deleted_at: deleted ? at : null,
        title: "Sample activity", created_at: at, updated_at: at
      });
      const rows = [
        workout("2026-08-30T23:59:59.999Z"), workout("2026-08-31T00:00:00Z"),
        workout("2026-09-21T11:59:59.999Z"), workout("2026-09-21T12:00:00Z"),
        workout("2026-10-18T23:59:59.999Z"), workout("2026-10-19T00:00:00Z"),
        workout("2026-10-20T12:00:00Z", 1), workout("2026-10-20T12:00:00Z", 2),
        workout("2026-10-20T12:00:00Z", 3), workout("2026-10-21T12:00:00Z"),
        workout("2026-10-22T12:00:00Z"), workout("2026-10-20T12:00:00Z", 0, true),
        workout(null, 1), workout("2020-01-01T12:00:00Z")
      ];
      await trx.insertInto("workout_sessions").values(rows).execute();
      const measured = await repository.getMetricCounts(at);
      assert.equal(measured.activeAccounts - baseline.activeAccounts, 2);
      assert.equal(measured.activeBetaAccounts - baseline.activeBetaAccounts, 1);
      assert.equal(measured.workoutRecordsProcessed - baseline.workoutRecordsProcessed, rows.length);
      assert.equal(measured.completedWorkoutsLast30Days - baseline.completedWorkoutsLast30Days, 6);
      const before = new Map(baseline.completedWorkoutsByWeek.map((week) => [week.weekStart, week.count]));
      const changes = measured.completedWorkoutsByWeek.map((week) => ({
        weekStart: week.weekStart, count: week.count - (before.get(week.weekStart) ?? 0)
      })).filter((week) => week.count);
      assert.deepEqual(changes, [
        { weekStart: "2026-08-31", count: 1 }, { weekStart: "2026-09-21", count: 2 },
        { weekStart: "2026-10-12", count: 1 }, { weekStart: "2026-10-19", count: 4 }
      ]);
      await trx.deleteFrom("workout_sessions").where("user_id", "in", users.map((user) => user.id)).execute();
      await trx.deleteFrom("users").where("id", "in", users.map((user) => user.id)).execute();
      assert.deepEqual(await repository.getMetricCounts(at), baseline);
    });
  });
});
