import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { createDatabase } from "../../db/database.js";
import { createAdminRepository } from "./admin.repository.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const prefix = `admin_containment_${process.pid}_`;

describe("administrator containment repository", {
  skip: databaseUrl ? false : "INTEGRATION_DATABASE_URL is not set"
}, () => {
  const db = createDatabase(databaseUrl ?? "postgresql://unused");
  const repository = createAdminRepository(db);
  const adminId = randomUUID();
  const targetId = randomUUID();
  const otherAdminId = randomUUID();

  before(async () => {
    await cleanup();
    await db.insertInto("users").values([
      { id: adminId, email: `${prefix}admin@example.test`, username: `${prefix}admin`, password_hash: "unused", role: "ADMIN", email_verified_at: new Date() },
      { id: targetId, email: `${prefix}member@example.test`, username: `${prefix}member`, password_hash: "unused", email_verified_at: new Date("2026-08-01T00:00:00Z") },
      { id: otherAdminId, email: `${prefix}other@example.test`, username: `${prefix}other`, password_hash: "unused", role: "ADMIN" }
    ]).execute();
  });
  after(async () => { await cleanup(); await db.destroy(); });

  it("atomically suspends an ordinary user, revokes sessions, and audits", async () => {
    const now = new Date("2026-08-06T12:00:00Z");
    await insertSession(targetId, new Date(now.getTime() + 60_000));
    await insertSession(targetId, new Date(now.getTime() - 60_000));

    const beforeUsers = await repository.listUsers(now);
    assert.equal(beforeUsers.find((user) => user.id === targetId)?.activeSessionCount, 1);
    const result = await repository.setUserStatus(adminId, targetId, "SUSPENDED", now);
    assert.deepEqual(result, { status: "updated", accountStatus: "SUSPENDED", revokedSessions: 2 });

    const user = await db.selectFrom("users").select(["account_status", "email_verified_at"])
      .where("id", "=", targetId).executeTakeFirstOrThrow();
    assert.equal(user.account_status, "SUSPENDED");
    assert.equal(user.email_verified_at?.toISOString(), "2026-08-01T00:00:00.000Z");
    assert.equal(Number((await db.selectFrom("user_sessions").select((eb) => eb.fn.countAll<string>().as("count"))
      .where("user_id", "=", targetId).where("revoked_at", "is", null).executeTakeFirstOrThrow()).count), 0);
    assert.equal((await latestAudit()).action, "USER_SUSPENDED");
  });

  it("reactivates without creating sessions and rejects invalid targets", async () => {
    const now = new Date("2026-08-06T13:00:00Z");
    assert.deepEqual(await repository.setUserStatus(adminId, targetId, "ACTIVE", now), {
      status: "updated", accountStatus: "ACTIVE", revokedSessions: 0
    });
    assert.equal((await repository.listUsers(now)).find((user) => user.id === targetId)?.activeSessionCount, 0);
    assert.deepEqual(await repository.setUserStatus(adminId, targetId, "ACTIVE", now), { status: "invalid_transition" });
    assert.deepEqual(await repository.setUserStatus(adminId, otherAdminId, "SUSPENDED", now), { status: "forbidden" });
    await db.updateTable("users").set({
      account_status: "DELETION_PENDING", deletion_requested_at: now,
      deletion_due_at: new Date(now.getTime() + 60_000)
    }).where("id", "=", targetId).execute();
    assert.deepEqual(await repository.setUserStatus(adminId, targetId, "SUSPENDED", now), { status: "invalid_transition" });
    await db.updateTable("users").set({
      account_status: "ACTIVE", deletion_requested_at: null, deletion_due_at: null
    }).where("id", "=", targetId).execute();
  });

  it("revokes sessions idempotently and records both operator actions", async () => {
    const now = new Date("2026-08-06T14:00:00Z");
    await insertSession(targetId, new Date(now.getTime() + 60_000));
    assert.deepEqual(await repository.revokeUserSessions(adminId, targetId, now), { status: "updated", revokedSessions: 1 });
    assert.deepEqual(await repository.revokeUserSessions(adminId, targetId, now), { status: "updated", revokedSessions: 0 });
    const audits = await repository.listAuditEvents(undefined, 100);
    assert.equal(audits.filter((event) => event.action === "USER_SESSIONS_REVOKED").length, 2);
    assert.deepEqual(await repository.revokeUserSessions(adminId, otherAdminId, now), { status: "forbidden" });
  });

  async function insertSession(userId: string, expiresAt: Date): Promise<void> {
    await db.insertInto("user_sessions").values({
      id: randomUUID(), user_id: userId, session_token_hash: randomUUID(), expires_at: expiresAt
    }).execute();
  }
  async function latestAudit() {
    return db.selectFrom("admin_audit_events").select(["action", "details"])
      .where("admin_user_id", "=", adminId).orderBy("id", "desc").executeTakeFirstOrThrow();
  }
  async function cleanup(): Promise<void> {
    const ids = [adminId, targetId, otherAdminId];
    await db.deleteFrom("admin_audit_events").where((eb) => eb.or([
      eb("admin_user_id", "in", ids), eb("target_id", "in", ids)
    ])).execute();
    await db.deleteFrom("user_sessions").where("user_id", "in", ids).execute();
    await db.deleteFrom("users").where("id", "in", ids).execute();
  }
});
