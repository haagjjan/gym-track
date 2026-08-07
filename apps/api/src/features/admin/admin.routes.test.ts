import assert from "node:assert/strict";
import { describe, it } from "node:test";
import cookie from "@fastify/cookie";
import fastify from "fastify";
import type { AuthService, PublicUser } from "../auth/auth.service.js";
import type { AdminAuditPage, AdminService, AdminUser } from "./admin.service.js";
import { registerAdminRoutes } from "./admin.routes.js";

const admin: PublicUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "admin@example.test",
  username: "admin",
  emailVerified: true,
  role: "ADMIN",
  createdAt: "2026-08-01T00:00:00.000Z"
};
const targetId = "22222222-2222-4222-8222-222222222222";

class FakeAdminService implements AdminService {
  public users: AdminUser[] = [];
  public statusResult: Awaited<ReturnType<AdminService["setUserStatus"]>> = {
    status: "updated", accountStatus: "SUSPENDED", revokedSessions: 2
  };
  public revocationResult: Awaited<ReturnType<AdminService["revokeUserSessions"]>> = {
    status: "updated", revokedSessions: 0
  };
  public auditPage: AdminAuditPage = { items: [], nextCursor: null };
  public statusCall: { adminId: string; userId: string; status: string } | null = null;

  async listUsers(): Promise<AdminUser[]> { return this.users; }
  async setUserStatus(adminId: string, userId: string, status: "ACTIVE" | "SUSPENDED") {
    this.statusCall = { adminId, userId, status };
    return this.statusResult;
  }
  async revokeUserSessions() { return this.revocationResult; }
  async listAuditEvents() { return this.auditPage; }
}

function authService(role: "ADMIN" | "USER" | "NONE" = "ADMIN"): AuthService {
  return {
    async signup() { throw new Error("not used"); },
    async login() { throw new Error("not used"); },
    async logout() { return { loggedOut: true }; },
    async currentUser() {
      if (role === "NONE") return { ok: false, reason: "unauthorized" } as const;
      return { ok: true, value: { ...admin, role } } as const;
    },
    async requestEmailVerification() { return { status: "SENT" }; },
    async verifyEmail() { return { ok: true, value: { verified: true } }; },
    async requestPasswordReset() { return { requested: true }; },
    async resetPassword() { return { ok: true, value: { reset: true } }; },
    async cleanupExpiredAuthRecords() {}
  };
}

async function buildAdminServer(service: AdminService, role: "ADMIN" | "USER" | "NONE" = "ADMIN") {
  const server = fastify();
  await server.register(cookie);
  await registerAdminRoutes(server, { authService: authService(role), cookieName: "session", service });
  return server;
}

describe("administrator containment routes", () => {
  it("requires an authenticated administrator", async () => {
    for (const [role, expected] of [["NONE", 401], ["USER", 403]] as const) {
      const server = await buildAdminServer(new FakeAdminService(), role);
      const response = await server.inject("/api/v1/admin/users");
      assert.equal(response.statusCode, expected);
    }
  });

  it("lists canonical user records", async () => {
    const service = new FakeAdminService();
    service.users = [{
      id: targetId, email: "member@example.test", username: "member", role: "USER",
      status: "ACTIVE", cohort: "FOUNDING_BETA_2026",
      createdAt: "2026-08-02T00:00:00.000Z", activeSessionCount: 1
    }];
    const response = await (await buildAdminServer(service)).inject("/api/v1/admin/users");
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.items[0].activeSessionCount, 1);
  });

  it("validates and forwards a status transition", async () => {
    const service = new FakeAdminService();
    const server = await buildAdminServer(service);
    const response = await server.inject({
      method: "PATCH", url: `/api/v1/admin/users/${targetId}/status`, payload: { status: "SUSPENDED" }
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(service.statusCall, { adminId: admin.id, userId: targetId, status: "SUSPENDED" });
    assert.equal(response.json().data.revokedSessions, 2);
    assert.equal((await server.inject({
      method: "PATCH", url: "/api/v1/admin/users/not-a-uuid/status", payload: { status: "DELETION_PENDING" }
    })).statusCode, 422);
  });

  it("uses stable containment error codes", async () => {
    const scenarios = [
      [{ status: "not_found" }, 404, "USER_NOT_FOUND"],
      [{ status: "forbidden" }, 403, "ADMIN_TARGET_FORBIDDEN"],
      [{ status: "invalid_transition" }, 409, "INVALID_ACCOUNT_TRANSITION"]
    ] as const;
    for (const [result, expectedStatus, expectedCode] of scenarios) {
      const service = new FakeAdminService();
      service.statusResult = result;
      const response = await (await buildAdminServer(service)).inject({
        method: "PATCH", url: `/api/v1/admin/users/${targetId}/status`, payload: { status: "ACTIVE" }
      });
      assert.equal(response.statusCode, expectedStatus);
      assert.equal(response.json().error.code, expectedCode);
    }
  });

  it("returns idempotent session-revocation counts", async () => {
    const response = await (await buildAdminServer(new FakeAdminService())).inject({
      method: "POST", url: `/api/v1/admin/users/${targetId}/sessions/revoke`, payload: {}
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.revokedSessions, 0);
  });

  it("paginates audit events and rejects malformed cursors", async () => {
    const service = new FakeAdminService();
    service.auditPage = { items: [], nextCursor: "next" };
    const server = await buildAdminServer(service);
    const response = await server.inject("/api/v1/admin/audit-events?limit=100");
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.nextCursor, "next");
    assert.equal((await server.inject("/api/v1/admin/audit-events?limit=101")).statusCode, 422);
    assert.equal((await server.inject("/api/v1/admin/audit-events?cursor=invalid")).statusCode, 422);
  });
});
