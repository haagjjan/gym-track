import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readEnv } from "./env.js";

const databaseUrl = "postgresql://user:password@localhost:5432/app";

describe("readEnv", () => {
  it("uses defaults for optional API settings", () => {
    assert.deepEqual(readEnv({ DATABASE_URL: databaseUrl }), {
      API_HOST: "0.0.0.0",
      API_PORT: 4000,
      AUTH_COOKIE_NAME: "gym_progress_session",
      AUTH_COOKIE_SECURE: false,
      AUTH_SESSION_TTL_DAYS: 30,
      DATABASE_URL: databaseUrl,
      NODE_ENV: "development"
    });
  });

  it("coerces API_PORT from an environment string", () => {
    const env = readEnv({
      API_PORT: "4100",
      DATABASE_URL: databaseUrl
    });

    assert.equal(env.API_PORT, 4100);
  });

  it("parses auth cookie settings", () => {
    const env = readEnv({
      AUTH_COOKIE_NAME: "custom_session",
      AUTH_COOKIE_SECURE: "true",
      AUTH_SESSION_TTL_DAYS: "7",
      DATABASE_URL: databaseUrl
    });

    assert.equal(env.AUTH_COOKIE_NAME, "custom_session");
    assert.equal(env.AUTH_COOKIE_SECURE, true);
    assert.equal(env.AUTH_SESSION_TTL_DAYS, 7);
  });

  it("defaults secure auth cookies on in production", () => {
    const env = readEnv({
      DATABASE_URL: databaseUrl,
      NODE_ENV: "production"
    });

    assert.equal(env.AUTH_COOKIE_SECURE, true);
  });

  it("rejects missing DATABASE_URL", () => {
    assert.throws(() => readEnv({}));
  });
});
