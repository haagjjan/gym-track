import assert from "node:assert/strict";
import { describe, it } from "node:test";
import cookie from "@fastify/cookie";
import fastify from "fastify";
import type { AuthService, AuthenticatedUser, PublicUser } from "./auth.service.js";
import { registerAuthRoutes } from "./auth.routes.js";

const user: PublicUser = {
  id: "user-1",
  email: "jan@example.com",
  username: "jan",
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
    ...overrides
  };
}

async function buildAuthServer(service: AuthService) {
  const server = fastify();

  await server.register(cookie);
  await registerAuthRoutes(server, {
    service,
    cookie: {
      name: "gym_progress_session",
      secure: false,
      maxAgeSeconds: 60
    }
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
        password: "secret"
      }
    });

    assert.equal(response.statusCode, 201);
    assert.deepEqual(response.json(), { data: { user } });
    assert.match(response.headers["set-cookie"]?.toString() ?? "", /gym_progress_session=/);
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
});
