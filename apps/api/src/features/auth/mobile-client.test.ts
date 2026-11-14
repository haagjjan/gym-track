import assert from "node:assert/strict";
import { describe, it } from "node:test";
import cookie from "@fastify/cookie";
import fastify from "fastify";
import type { AuthService, AuthenticatedUser, PublicUser } from "./auth.service.js";
import { registerAuthRoutes } from "./auth.routes.js";
import { bearerToken, compareVersions, parseVersion, registerMobileClient } from "./mobile-client.js";

const user: PublicUser = {
  id: "user-1",
  email: "jan@example.com",
  username: "jan",
  emailVerified: false,
  createdAt: "2026-05-20T10:00:00.000Z"
};

const authenticatedUser: AuthenticatedUser = {
  user,
  sessionToken: "raw-session-token-0001",
  expiresAt: new Date("2026-06-19T10:00:00.000Z")
};

const APP_ORIGIN = "capacitor://localhost";
const APP_HEADERS = { "x-gym-client": "app", origin: APP_ORIGIN };
const credentials = { username: "jan", password: "correct horse battery staple" };

async function buildServer(options: { mobile?: boolean; minAppVersion?: string } = {}) {
  const seenTokens: Array<string | undefined> = [];
  const loggedOut: Array<string | undefined> = [];
  const service = {
    async login() {
      return { ok: true, value: authenticatedUser };
    },
    async signup() {
      return { ok: true, value: authenticatedUser };
    },
    async logout(token: string | undefined) {
      loggedOut.push(token);
      return { loggedOut: true };
    },
    async currentUser(token: string | undefined) {
      seenTokens.push(token);
      return token ? { ok: true, value: user } : { ok: false };
    }
  } as unknown as AuthService;
  const server = fastify();

  if (options.mobile ?? true) {
    registerMobileClient(server, {
      origins: [APP_ORIGIN],
      ...(options.minAppVersion ? { minAppVersion: options.minAppVersion } : {})
    });
  }

  await server.register(cookie);
  await registerAuthRoutes(server, {
    service,
    cookie: { name: "gym_progress_session", secure: false, maxAgeSeconds: 60 }
  });

  return { server, seenTokens, loggedOut };
}

describe("mobile client transport", () => {
  it("returns the session token in the body, and no cookie, to the app", async () => {
    const { server } = await buildServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: APP_HEADERS,
      payload: credentials
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["set-cookie"], undefined);
    assert.deepEqual(response.json().data, {
      user,
      sessionToken: "raw-session-token-0001",
      expiresAt: "2026-06-19T10:00:00.000Z"
    });
    assert.equal(response.headers["access-control-allow-origin"], APP_ORIGIN);
    assert.equal(response.headers["access-control-allow-credentials"], undefined);
  });

  it("keeps the web contract: cookie set, no token in the body", async () => {
    const { server } = await buildServer();
    const response = await server.inject({ method: "POST", url: "/api/v1/auth/login", payload: credentials });

    assert.equal(response.statusCode, 200);
    assert.match(String(response.headers["set-cookie"]), /gym_progress_session=raw-session-token-0001/);
    assert.deepEqual(response.json().data, { user });
    assert.equal(response.headers["access-control-allow-origin"], undefined);
  });

  it("never returns a token when the transport is not registered", async () => {
    const { server } = await buildServer({ mobile: false });
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: APP_HEADERS,
      payload: credentials
    });

    assert.deepEqual(response.json().data, { user });
    assert.match(String(response.headers["set-cookie"]), /gym_progress_session=/);
    assert.equal(response.headers["access-control-allow-origin"], undefined);
  });

  it("authenticates app requests with the bearer token and ignores their cookie", async () => {
    const { server, seenTokens } = await buildServer();
    const withBearer = await server.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { ...APP_HEADERS, authorization: "Bearer app-session-token-0001", cookie: "gym_progress_session=cookie-token" }
    });
    const cookieOnly = await server.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { ...APP_HEADERS, cookie: "gym_progress_session=cookie-token" }
    });

    assert.equal(withBearer.statusCode, 200);
    assert.equal(cookieOnly.statusCode, 401);
    assert.deepEqual(seenTokens, ["app-session-token-0001", undefined]);
  });

  it("ignores a bearer token on requests that are not from the app", async () => {
    const { server, seenTokens } = await buildServer();
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: "Bearer app-session-token-0001" }
    });

    assert.equal(response.statusCode, 401);
    assert.deepEqual(seenTokens, [undefined]);
  });

  it("ignores the bearer token when the transport is not registered", async () => {
    const { server, seenTokens } = await buildServer({ mobile: false });
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { ...APP_HEADERS, authorization: "Bearer app-session-token-0001" }
    });

    assert.equal(response.statusCode, 401);
    assert.deepEqual(seenTokens, [undefined]);
  });

  it("revokes the bearer session on logout", async () => {
    const { server, loggedOut } = await buildServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: { ...APP_HEADERS, authorization: "Bearer app-session-token-0001" }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["set-cookie"], undefined);
    assert.deepEqual(loggedOut, ["app-session-token-0001"]);
  });

  it("answers preflights for allowed origins only", async () => {
    const { server } = await buildServer();
    const preflight = { "access-control-request-method": "POST", "access-control-request-headers": "authorization" };
    const allowed = await server.inject({
      method: "OPTIONS",
      url: "/api/v1/auth/login",
      headers: { ...preflight, origin: APP_ORIGIN }
    });
    const denied = await server.inject({
      method: "OPTIONS",
      url: "/api/v1/auth/login",
      headers: { ...preflight, origin: "https://evil.example" }
    });

    assert.equal(allowed.statusCode, 204);
    assert.equal(allowed.headers["access-control-allow-origin"], APP_ORIGIN);
    assert.match(String(allowed.headers["access-control-allow-headers"]), /Authorization/);
    assert.equal(denied.statusCode, 403);
    assert.equal(denied.headers["access-control-allow-origin"], undefined);
  });

  it("asks old app versions to update and leaves the web alone", async () => {
    const { server } = await buildServer({ minAppVersion: "1.2.0" });
    const old = await server.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { ...APP_HEADERS, "x-app-version": "1.1.9", authorization: "Bearer app-session-token-0001" }
    });
    const missing = await server.inject({ method: "GET", url: "/api/v1/auth/me", headers: APP_HEADERS });
    const current = await server.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { ...APP_HEADERS, "x-app-version": "1.2.0", authorization: "Bearer app-session-token-0001" }
    });
    const web = await server.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { cookie: "gym_progress_session=cookie-token" }
    });

    assert.equal(old.statusCode, 426);
    assert.equal(old.json().error.code, "APP_UPDATE_REQUIRED");
    assert.equal(missing.statusCode, 426);
    assert.equal(current.statusCode, 200);
    assert.equal(web.statusCode, 200);
  });
});

describe("mobile client helpers", () => {
  it("reads only well-formed bearer tokens", () => {
    assert.equal(bearerToken("Bearer abcdefghijklmnop"), "abcdefghijklmnop");
    assert.equal(bearerToken("bearer abcdefghijklmnop"), undefined);
    assert.equal(bearerToken("Bearer short"), undefined);
    assert.equal(bearerToken("Bearer has space inside it"), undefined);
    assert.equal(bearerToken(undefined), undefined);
  });

  it("compares versions numerically", () => {
    assert.equal(parseVersion("1.2"), null);
    assert.ok(compareVersions(parseVersion("1.10.0")!, parseVersion("1.9.9")!) > 0);
    assert.equal(compareVersions(parseVersion("2.0.0")!, parseVersion("2.0.0")!), 0);
  });
});
