import assert from "node:assert/strict";
import { it } from "node:test";
import cookie from "@fastify/cookie";
import fastify from "fastify";
import { registerAuthRoutes } from "./auth.routes.js";
import type { AuthService } from "./auth.service.js";
import { providerFixture, providerTestUser } from "./provider-test-helpers.js";

async function setup(enabled = true, signedIn = true, mobile = false) {
  const fixture = providerFixture();
  fixture.state.linked = providerTestUser;
  const server = fastify();
  await server.register(cookie);
  if (mobile) server.addHook("onRequest", async (request) => { request.mobileClient = true; });
  const service: AuthService = {
    async signup() { throw new Error("unused"); }, async login() { throw new Error("unused"); },
    async logout() { return { loggedOut: true }; },
    async currentUser() {
      return signedIn ? { ok: true, value: {
        id: providerTestUser.id, email: providerTestUser.email, username: providerTestUser.username,
        emailVerified: true, createdAt: providerTestUser.createdAt.toISOString()
      } } : { ok: false, reason: "unauthorized" };
    },
    async requestEmailVerification() { return { status: "NOT_REQUIRED" }; },
    async verifyEmail() { return { ok: false, reason: "invalid_token" }; },
    async requestPasswordReset() { return { requested: true }; },
    async resetPassword() { return { ok: false, reason: "invalid_token" }; },
    async cleanupExpiredAuthRecords() {}
  };
  await registerAuthRoutes(server, {
    service, cookie: { name: "session", secure: false, maxAgeSeconds: 3600 },
    ...(enabled ? { providerService: fixture.service } : {})
  });
  return { server, ...fixture };
}

it("flag off omits every provider route", async (t) => {
  const { server } = await setup(false);
  t.after(() => server.close());
  for (const [method, url] of [
    ["POST", "/api/v1/auth/provider/nonce"], ["POST", "/api/v1/auth/provider"],
    ["GET", "/api/v1/users/me/identities"], ["POST", "/api/v1/users/me/identities"],
    ["DELETE", "/api/v1/users/me/identities/apple"]
  ] as const) assert.equal((await server.inject({ method, url })).statusCode, 404);
});
it("issues nonces and uses the password login cookie response on the web", async (t) => {
  const { server } = await setup();
  t.after(() => server.close());
  const issued = await server.inject({ method: "POST", url: "/api/v1/auth/provider/nonce" });
  const response = await server.inject({ method: "POST", url: "/api/v1/auth/provider", payload: {
    provider: "apple", idToken: "signed-token", nonce: issued.json().data.nonce
  } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.user.id, "user-1");
  assert.equal(response.json().data.sessionToken, undefined);
  assert.match(response.headers["set-cookie"] as string, /session=.*HttpOnly/);
});
it("uses the password login bearer response for app requests", async (t) => {
  const { server, input } = await setup(true, true, true);
  t.after(() => server.close());
  const response = await server.inject({ method: "POST", url: "/api/v1/auth/provider", payload: input() });
  assert.equal(response.statusCode, 200);
  assert.equal(typeof response.json().data.sessionToken, "string");
  assert.equal(typeof response.json().data.expiresAt, "string");
  assert.equal(response.headers["set-cookie"], undefined);
});
it("requires authentication for identity management", async (t) => {
  const { server, input } = await setup(true, false);
  t.after(() => server.close());
  for (const method of ["GET", "POST", "DELETE"] as const) {
    const response = await server.inject({ method,
      url: `/api/v1/users/me/identities${method === "DELETE" ? "/apple" : ""}`,
      ...(method === "POST" ? { payload: input() } : {})
    });
    assert.equal(response.statusCode, 401);
  }
});
it("lists, links and unlinks identities with stable errors", async (t) => {
  const { server, state, input } = await setup();
  t.after(() => server.close());
  const list = await server.inject({ method: "GET", url: "/api/v1/users/me/identities" });
  assert.deepEqual(list.json().data.identities, [{ provider: "apple", created_at: providerTestUser.createdAt.toISOString() }]);
  assert.equal((await server.inject({ method: "POST", url: "/api/v1/users/me/identities", payload: input() })).statusCode, 200);
  state.allowLink = false;
  const conflict = await server.inject({ method: "POST", url: "/api/v1/users/me/identities", payload: input() });
  assert.equal(conflict.statusCode, 409);
  assert.equal(conflict.json().error.code, "PROVIDER_IDENTITY_CONFLICT");
  state.allowUnlink = false;
  const refused = await server.inject({ method: "DELETE", url: "/api/v1/users/me/identities/apple" });
  assert.equal(refused.statusCode, 409);
  assert.equal(refused.json().error.code, "LAST_SIGN_IN_METHOD");
});
for (const [reason, status, code] of [
  ["locked", 423, "ACCOUNT_LOCKED"], ["account_unavailable", 403, "ACCOUNT_UNAVAILABLE"]
] as const) {
  it(`preserves password login ${reason} response`, async (t) => {
    const { server, state, input } = await setup();
    t.after(() => server.close());
    state.signInFailure = reason;
    const response = await server.inject({ method: "POST", url: "/api/v1/auth/provider", payload: input() });
    assert.equal(response.statusCode, status);
    assert.equal(response.json().error.code, code);
    assert.equal(response.headers["set-cookie"], undefined);
  });
}
it("validates provider inputs and reports invalid nonces", async (t) => {
  const { server, input } = await setup();
  t.after(() => server.close());
  assert.equal((await server.inject({ method: "POST", url: "/api/v1/auth/provider", payload: {} })).statusCode, 422);
  const response = await server.inject({ method: "POST", url: "/api/v1/auth/provider", payload: { ...input(), nonce: "a".repeat(43) } });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, "INVALID_PROVIDER_NONCE");
});
