import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readEnv } from "./env.js";

const databaseUrl = "postgresql://user:password@localhost:5432/app";

describe("readEnv", () => {
  it("uses defaults for optional API settings", () => {
    assert.deepEqual(readEnv({ DATABASE_URL: databaseUrl }), {
      API_HOST: "0.0.0.0",
      API_PORT: 4000,
      API_TRUST_PROXY: false,
      APP_BASE_URL: "http://localhost:3000",
      APP_ENV: "development",
      APP_RELEASE: "unknown",
      AUTH_COOKIE_NAME: "gym_progress_session",
      AUTH_COOKIE_SECURE: false,
      AUTH_SESSION_TTL_DAYS: 30,
      DATABASE_URL: databaseUrl,
      EMAIL_FROM: "Gym Progress Tracker <onboarding@resend.dev>",
      LOG_LEVEL: "info",
      METRICS_ENABLED: false,
      NODE_ENV: "development",
      REGISTRATION_MODE: "ENABLED"
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
      APP_BASE_URL: "https://app.gymtrack.ch",
      DATABASE_URL: databaseUrl,
      NODE_ENV: "production"
    });

    assert.equal(env.AUTH_COOKIE_SECURE, true);
    assert.equal(env.APP_ENV, "production");
    assert.equal(env.API_TRUST_PROXY, false);
    assert.equal(env.REGISTRATION_MODE, "DISABLED");
  });

  it("parses an explicit registration mode", () => {
    const env = readEnv({
      DATABASE_URL: databaseUrl,
      REGISTRATION_MODE: "DISABLED"
    });

    assert.equal(env.REGISTRATION_MODE, "DISABLED");
  });

  it("rejects an unknown registration mode", () => {
    assert.throws(() =>
      readEnv({
        DATABASE_URL: databaseUrl,
        REGISTRATION_MODE: "INVITE_ONLY"
      })
    );
  });

  it("requires a canonical HTTPS base URL in production", () => {
    assert.throws(() =>
      readEnv({
        DATABASE_URL: databaseUrl,
        NODE_ENV: "production"
      })
    );
    assert.throws(() =>
      readEnv({
        APP_BASE_URL: "http://app.gymtrack.ch",
        DATABASE_URL: databaseUrl,
        NODE_ENV: "production"
      })
    );
  });

  it("rejects base URLs with paths, queries, or fragments", () => {
    for (const APP_BASE_URL of [
      "https://app.gymtrack.ch/base",
      "https://app.gymtrack.ch?source=config",
      "https://app.gymtrack.ch#fragment"
    ]) {
      assert.throws(() => readEnv({ APP_BASE_URL, DATABASE_URL: databaseUrl }));
    }
  });

  it("rejects insecure production cookies", () => {
    assert.throws(() =>
      readEnv({
        APP_BASE_URL: "https://app.gymtrack.ch",
        AUTH_COOKIE_SECURE: "false",
        DATABASE_URL: databaseUrl,
        NODE_ENV: "production"
      })
    );
  });

  it("allows the explicit local Compose HTTP exception", () => {
    const env = readEnv({
      APP_BASE_URL: "http://localhost:3000",
      APP_ENV: "local",
      AUTH_COOKIE_SECURE: "false",
      DATABASE_URL: databaseUrl,
      NODE_ENV: "production",
      REGISTRATION_MODE: "ENABLED"
    });

    assert.equal(env.APP_ENV, "local");
    assert.equal(env.AUTH_COOKIE_SECURE, false);
    assert.equal(env.REGISTRATION_MODE, "ENABLED");
  });

  it("parses metrics and release settings", () => {
    const env = readEnv({
      APP_ENV: "home-production",
      APP_RELEASE: "git-abc123",
      DATABASE_URL: databaseUrl,
      METRICS_ENABLED: "true"
    });

    assert.equal(env.APP_ENV, "home-production");
    assert.equal(env.APP_RELEASE, "git-abc123");
    assert.equal(env.METRICS_ENABLED, true);
  });

  it("parses LOG_LEVEL", () => {
    const env = readEnv({
      DATABASE_URL: databaseUrl,
      LOG_LEVEL: "debug"
    });

    assert.equal(env.LOG_LEVEL, "debug");
  });

  it("rejects unsupported LOG_LEVEL values", () => {
    assert.throws(() =>
      readEnv({
        DATABASE_URL: databaseUrl,
        LOG_LEVEL: "verbose"
      })
    );
  });

  it("rejects missing DATABASE_URL", () => {
    assert.throws(() => readEnv({}));
  });
});
