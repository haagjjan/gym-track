import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import { createDatabase } from "../../db/database.js";
import { createStatusRepository } from "./status.repository.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;

describe("status metrics repository", {
  skip: databaseUrl ? false : "INTEGRATION_DATABASE_URL is not set"
}, () => {
  const db = createDatabase(databaseUrl ?? "postgresql://unused");

  after(async () => { await db.destroy(); });

  it("counts every workout row while restricting active beta accounts", async () => {
    await db.transaction().setIsolationLevel("repeatable read").execute(async (trx) => {
      const repository = createStatusRepository(trx);
      const baseline = await repository.getMetricCounts();
      const users = accountFixtures();
      await trx.insertInto("users").values(users).execute();

      const workoutRows = workoutFixtures(users);
      const representativeRows = workoutRows.slice(0, 5);
      const importedRows = workoutRows.slice(5);
      await trx.insertInto("workout_sessions").values(representativeRows).execute();
      const beforeImport = await repository.getMetricCounts();

      assert.equal(beforeImport.workoutRecordsProcessed - baseline.workoutRecordsProcessed, 5);

      await trx.insertInto("workout_sessions").values(importedRows).execute();
      const measured = await repository.getMetricCounts();

      assert.equal(measured.activeBetaAccounts - baseline.activeBetaAccounts, 1);
      assert.equal(measured.workoutRecordsProcessed - beforeImport.workoutRecordsProcessed, 100);
      assert.equal(
        measured.workoutRecordsProcessed - baseline.workoutRecordsProcessed,
        workoutRows.length
      );
      assert.equal(workoutRows.length, 105);

      await trx.deleteFrom("workout_sessions")
        .where("user_id", "in", users.map((user) => user.id)).execute();
      await trx.deleteFrom("users").where("id", "in", users.map((user) => user.id)).execute();
    });
  });
});

function accountFixtures() {
  const suffix = randomUUID();
  const now = new Date("2026-09-01T12:00:00.000Z");

  return [
    account(suffix, "active", "USER", "ACTIVE", now),
    account(suffix, "admin", "ADMIN", "ACTIVE", now),
    account(suffix, "suspended", "USER", "SUSPENDED", now),
    {
      ...account(suffix, "deleting", "USER", "DELETION_PENDING", now),
      deletion_requested_at: now,
      deletion_due_at: new Date("2026-09-08T12:00:00.000Z")
    }
  ];
}

function account(
  suffix: string,
  label: string,
  role: "ADMIN" | "USER",
  accountStatus: "ACTIVE" | "DELETION_PENDING" | "SUSPENDED",
  now: Date
) {
  return {
    id: randomUUID(),
    email: `status-${label}-${suffix}@example.test`,
    username: `status-${label}-${suffix}`,
    password_hash: "not-used",
    role,
    account_status: accountStatus,
    created_at: now,
    updated_at: now
  };
}

function workoutFixtures(users: ReturnType<typeof accountFixtures>) {
  const now = new Date("2026-09-01T12:00:00.000Z");
  const historicalStart = new Date("2020-01-01T10:00:00.000Z");
  const historicalEnd = new Date("2020-01-01T11:00:00.000Z");
  const [active, admin, suspended, deleting] = users;

  if (!active || !admin || !suspended || !deleting) throw new Error("fixtures missing");

  const rows = [
    workout(active.id, now, null, null, now),
    workout(admin.id, historicalStart, historicalEnd, null, now),
    workout(active.id, historicalStart, historicalEnd, now, now),
    workout(suspended.id, historicalStart, historicalEnd, null, now),
    workout(deleting.id, historicalStart, historicalEnd, null, now)
  ];

  // CSV imports retain their historical workout dates but receive the import
  // time as created_at. No date predicate means every committed row counts.
  for (let index = 0; index < 100; index += 1) {
    rows.push(workout(active.id, historicalStart, historicalEnd, null, now));
  }

  return rows;
}

function workout(
  userId: string,
  startedAt: Date,
  endedAt: Date | null,
  deletedAt: Date | null,
  createdAt: Date
) {
  return {
    id: randomUUID(),
    user_id: userId,
    started_at: startedAt,
    ended_at: endedAt,
    workout_type: "status-test",
    title: "Status metric fixture",
    notes: null,
    created_at: createdAt,
    updated_at: createdAt,
    deleted_at: deletedAt
  };
}
