import assert from "node:assert/strict";
import { describe, it } from "node:test";
import cookie from "@fastify/cookie";
import fastify from "fastify";
import type { AuthService, PublicUser } from "../auth/auth.service.js";
import { registerUserPreferencesRoutes } from "./user-preferences.routes.js";
import type {
  UserPreferencesService,
  UserPreferencesShape
} from "./user-preferences.service.js";

const user: PublicUser = {
  id: "user-1",
  email: "jan@example.com",
  username: "jan",
  emailVerified: true,
  createdAt: "2026-07-15T10:00:00.000Z"
};

class FakePreferencesService implements UserPreferencesService {
  public value: UserPreferencesShape = { volumeHeatCeiling: 20 };

  async get(): Promise<UserPreferencesShape> {
    return this.value;
  }

  async update(_userId: string, input: { volumeHeatCeiling: number }): Promise<UserPreferencesShape> {
    this.value = input;
    return this.value;
  }
}

function authService(): AuthService {
  return {
    async signup() { throw new Error("not used"); },
    async login() { throw new Error("not used"); },
    async logout() { return { loggedOut: true }; },
    async currentUser() { return { ok: true, value: user }; },
    async requestEmailVerification() { return { status: "SENT" as const }; },
    async verifyEmail() { return { ok: true, value: { verified: true } }; },
    async requestPasswordReset() { return { requested: true }; },
    async resetPassword() { return { ok: true, value: { reset: true } }; },
    async cleanupExpiredAuthRecords() {}
  };
}

async function buildServer() {
  const server = fastify();
  const service = new FakePreferencesService();
  await server.register(cookie);
  await registerUserPreferencesRoutes(server, {
    authService: authService(),
    cookieName: "gym_progress_session",
    service
  });
  return { server, service };
}

describe("user preferences routes", () => {
  it("returns the account-synced heat ceiling", async () => {
    const { server } = await buildServer();
    const response = await server.inject("/api/v1/users/me/preferences");

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().data.preferences, { volumeHeatCeiling: 20 });
  });

  it("updates an in-range whole-number heat ceiling", async () => {
    const { server } = await buildServer();
    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/users/me/preferences",
      payload: { volumeHeatCeiling: 35 }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.preferences.volumeHeatCeiling, 35);
  });

  it("rejects heat ceilings outside 5–50", async () => {
    const { server } = await buildServer();
    for (const value of [4, 51, 20.5]) {
      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/users/me/preferences",
        payload: { volumeHeatCeiling: value }
      });
      assert.equal(response.statusCode, 422);
    }
  });
});
