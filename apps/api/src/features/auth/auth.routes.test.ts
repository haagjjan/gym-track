import assert from "node:assert/strict";
import { describe, it } from "node:test";
import cookie from "@fastify/cookie";
import fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { registerMobileClient } from "./mobile-client.js";
import { createRateLimitResponse } from "../../shared/rate-limit-response.js";
import type { AuthService, AuthenticatedUser, PublicUser } from "./auth.service.js";
import { registerAuthRoutes } from "./auth.routes.js";

const user: PublicUser = {
  id: "user-1",
  email: "jan@example.com",
  username: "jan",
  emailVerified: false,
  createdAt: "2026-05-20T10:00:00.000Z"
};

const authenticatedUser: AuthenticatedUser = {
  user,
  sessionToken: "raw-session-token",
  expiresAt: new Date("2026-06-19T10:00:00.000Z")
};

function authService(overrides: Partial<AuthService> = {}): AuthService {
  return {
    async signup() {
      return { ok: true, value: authenticatedUser };
    },
    async login() {
      return { ok: true, value: authenticatedUser };
    },
    async logout() {
      return { loggedOut: true };
    },
    async currentUser() {
      return { ok: true, value: user };
    },
    async requestEmailVerification() {
      return { status: "SENT" as const };
    },
    async verifyEmail() {
      return { ok: true, value: { verified: true } };
    },
    async requestPasswordReset() {
      return { requested: true };
    },
    async resetPassword() {
      return { ok: true, value: { reset: true } };
    },
    async cleanupExpiredAuthRecords() {},
    ...overrides
  };
}

async function buildAuthServer(
  service: AuthService,
  options: { registrationEnabled?: boolean; secure?: boolean; rateLimits?: boolean } = {}
) {
  const server = fastify();

  registerMobileClient(server, { origins: ["capacitor://localhost"] });
  if (options.rateLimits) {
    await server.register(rateLimit, {
      keyGenerator: (request) => request.ip,
      errorResponseBuilder: (_request, context) => createRateLimitResponse(context)
    });
  }
  await server.register(cookie);
  await registerAuthRoutes(server, {
    service,
    cookie: {
      name: "gym_progress_session",
      secure: options.secure ?? false,
      maxAgeSeconds: 60
    },
    registrationEnabled: options.registrationEnabled ?? true
  });

  return server;
}

describe("auth routes", () => {
  it("signs up and sets a session cookie", async () => {
    const server = await buildAuthServer(authService());
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/signup",
      payload: {
        email: "jan@example.com",
        username: "jan",
        password: "long-enough-secret",
        termsVersion: "terms-test",
        privacyVersion: "privacy-test",
        adultAttested: true
      }
    });

    assert.equal(response.statusCode, 201);
    assert.deepEqual(response.json(), { data: { user } });
    assert.match(response.headers["set-cookie"]?.toString() ?? "", /gym_progress_session=/);
  });

  it("rejects signup without the age, residence and policy attestation", async () => {
    const server = await buildAuthServer(authService());
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/signup",
      payload: {
        email: "jan@example.com",
        username: "jan",
        password: "long-enough-secret",
        termsVersion: "terms-test",
        privacyVersion: "privacy-test"
      }
    });

    assert.equal(response.statusCode, 422);
  });

  it("returns validation errors for invalid signup payloads", async () => {
    const server = await buildAuthServer(authService());
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/signup",
      payload: {
        email: "not-an-email",
        username: "",
        password: "123"
      }
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "VALIDATION_ERROR");
  });

  it("rejects registration before validating or creating an account when disabled", async () => {
    let signupCalls = 0;
    const server = await buildAuthServer(
      authService({
        async signup() {
          signupCalls += 1;
          return { ok: true, value: authenticatedUser };
        }
      }),
      { registrationEnabled: false }
    );

    for (const payload of [
      {
        email: "blocked@example.invalid",
        username: "blocked",
        password: "long-enough-secret"
      },
      { email: "invalid", username: "", password: "short" }
    ]) {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/signup",
        payload
      });

      assert.equal(response.statusCode, 403);
      assert.deepEqual(response.json(), {
        error: {
          code: "REGISTRATION_DISABLED",
          message: "Registration is currently disabled."
        }
      });
      assert.equal(response.headers["set-cookie"], undefined);
    }

    const malformedResponse = await server.inject({
      method: "POST",
      url: "/api/v1/auth/signup",
      headers: { "content-type": "application/json" },
      payload: "{not-json"
    });

    assert.equal(malformedResponse.statusCode, 403);
    assert.equal(malformedResponse.json().error.code, "REGISTRATION_DISABLED");
    assert.equal(signupCalls, 0);
  });

  it("sets hardened cookie attributes when secure cookies are enabled", async () => {
    const server = await buildAuthServer(authService(), { secure: true });
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { username: "jan", password: "long-enough-secret" }
    });
    const setCookie = response.headers["set-cookie"]?.toString() ?? "";

    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /Path=\//i);
    assert.match(setCookie, /SameSite=Lax/i);
    assert.match(setCookie, /Secure/i);
  });

  it("does not opt the internal API into cross-origin browser access", async () => {
    const server = await buildAuthServer(authService());
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { origin: "https://attacker.example" },
      payload: { username: "jan", password: "long-enough-secret" }
    });

    assert.equal(response.headers["access-control-allow-origin"], undefined);
    assert.equal(response.headers["access-control-allow-credentials"], undefined);
  });

  it("returns 401 for invalid login credentials", async () => {
    const server = await buildAuthServer(
      authService({
        async login() {
          return { ok: false, reason: "invalid_credentials" };
        }
      })
    );
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        username: "jan",
        password: "wrong"
      }
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, "INVALID_CREDENTIALS");
  });

  it("returns the current user when a session cookie is present", async () => {
    const server = await buildAuthServer(authService());
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: {
        gym_progress_session: "raw-session-token"
      }
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { data: { user } });
  });

  it("clears the session cookie on logout", async () => {
    const server = await buildAuthServer(authService());
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      cookies: {
        gym_progress_session: "raw-session-token"
      }
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { data: { loggedOut: true } });
    assert.match(response.headers["set-cookie"]?.toString() ?? "", /gym_progress_session=/);
  });

  it("clears a production cookie with the same hardened scope", async () => {
    const server = await buildAuthServer(authService(), { secure: true });
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      cookies: {
        gym_progress_session: "raw-session-token"
      }
    });
    const setCookie = response.headers["set-cookie"]?.toString() ?? "";

    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /Path=\//i);
    assert.match(setCookie, /SameSite=Lax/i);
    assert.match(setCookie, /Secure/i);
  });

  it("returns 423 when the account is locked", async () => {
    const server = await buildAuthServer(
      authService({
        async login() {
          return { ok: false, reason: "locked" };
        }
      })
    );
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { username: "jan", password: "whatever" }
    });

    assert.equal(response.statusCode, 423);
    assert.equal(response.json().error.code, "ACCOUNT_LOCKED");
  });

  it("verifies an email token", async () => {
    const server = await buildAuthServer(authService());
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/verify-email",
      payload: { token: "raw-verification-token-value" }
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { data: { verified: true } });
  });

  it("rejects invalid verification tokens with 400", async () => {
    const server = await buildAuthServer(
      authService({
        async verifyEmail() {
          return { ok: false, reason: "invalid_token" };
        }
      })
    );
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/verify-email",
      payload: { token: "raw-verification-token-value" }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, "INVALID_TOKEN");
  });

  it("always reports success for forgot-password requests", async () => {
    const server = await buildAuthServer(authService());
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/forgot-password",
      payload: { email: "ghost@example.com" }
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { data: { requested: true } });
  });

  it("resets a password with a valid token", async () => {
    const server = await buildAuthServer(authService());
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/reset-password",
      payload: { token: "raw-reset-token-value-here", password: "brand-new-secret" }
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { data: { reset: true } });
  });

  it("rejects weak passwords on reset", async () => {
    const server = await buildAuthServer(authService());
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/reset-password",
      payload: { token: "raw-reset-token-value-here", password: "short" }
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "VALIDATION_ERROR");
  });
});

for (const identifier of ["jan", "jan@example.com"]) {
  for (const exists of [true, false]) {
    it(`limits login by normalized identifier ${identifier}, exists=${exists}, across addresses`, async (t) => {
      let calls = 0;
      const server = await buildAuthServer(authService({
        async login() {
          calls += 1;
          return exists ? { ok: true, value: authenticatedUser } : { ok: false, reason: "invalid_credentials" };
        }
      }), { rateLimits: true });
      t.after(() => server.close());
      for (let attempt = 0; attempt < 11; attempt += 1) {
        const response = await server.inject({
          method: "POST", url: "/api/v1/auth/login", remoteAddress: `127.0.0.${attempt + 1}`,
          payload: { username: attempt % 2 ? ` ${identifier.toUpperCase()} ` : identifier, password: "password" }
        });
        assert.equal(response.statusCode, attempt < 10 ? (exists ? 200 : 401) : 429);
        if (attempt === 10) {
          assert.equal(response.json().error.code, "RATE_LIMITED");
          assert.ok(Number(response.headers["retry-after"]) > 0);
          assert.deepEqual(Object.keys(response.json()), ["error"]);
        }
      }
      assert.equal(calls, 10);
    });
  }
}

for (const mobile of [false, true]) {
  it(`enforces the ${mobile ? 60 : 10} auth address limit for ${mobile ? "app" : "web"}`, async (t) => {
    const server = await buildAuthServer(authService(), { rateLimits: true });
    t.after(() => server.close());
    const max = mobile ? 60 : 10;
    for (let attempt = 0; attempt <= max; attempt += 1) {
      const response = await server.inject({
        method: "POST", url: "/api/v1/auth/login",
        headers: mobile ? { "x-gym-client": "app" } : {},
        payload: { username: `person-${attempt}`, password: "password" }
      });
      assert.equal(response.statusCode, attempt < max ? 200 : 429);
    }
  });
}
