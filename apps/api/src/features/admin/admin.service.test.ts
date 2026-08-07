import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdminRepository } from "./admin.repository.js";
import { createAdminService } from "./admin.service.js";

const createdAt = new Date("2026-08-06T12:00:00.000Z");

function repository(): AdminRepository {
  return {
    async listUsers() { return []; },
    async setUserStatus() { return { status: "not_found" }; },
    async revokeUserSessions() { return { status: "not_found" }; },
    async listAuditEvents() { return []; }
  };
}

describe("administrator service", () => {
  it("exposes only bounded audit detail fields", async () => {
    const fake = repository();
    fake.listAuditEvents = async () => [{
      id: "7", adminUserId: "admin", adminUsername: "operator",
      action: "USER_SUSPENDED", targetType: "USER", targetId: "member",
      details: { previousStatus: "ACTIVE", newStatus: "SUSPENDED", revokedSessions: 2, email: "private@example.test" },
      createdAt
    }];
    const page = await createAdminService({ repository: fake }).listAuditEvents(undefined, 50);
    assert.deepEqual(page.items[0]?.details, {
      previousStatus: "ACTIVE", newStatus: "SUSPENDED", revokedSessions: 2
    });
    assert.equal("email" in (page.items[0]?.details ?? {}), false);
  });

  it("returns an opaque cursor only when another page exists", async () => {
    const fake = repository();
    fake.listAuditEvents = async (_cursor, limit) => Array.from({ length: limit }, (_, index) => ({
      id: String(100 - index), adminUserId: null, adminUsername: null,
      action: "TEST", targetType: "USER", targetId: "member", details: {},
      createdAt: new Date(createdAt.getTime() - index)
    }));
    const page = await createAdminService({ repository: fake }).listAuditEvents(undefined, 2);
    assert.equal(page.items.length, 2);
    assert.ok(page.nextCursor);
    const cursor = JSON.parse(Buffer.from(page.nextCursor, "base64url").toString("utf8"));
    assert.deepEqual(cursor, { createdAt: page.items[1]?.createdAt, id: page.items[1]?.id });
  });
});
