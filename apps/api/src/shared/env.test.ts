import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readEnv } from "./env.js";

const databaseUrl = "postgresql://user:password@localhost:5432/app";
const bffSecret = "a-production-bff-client-secret-123456789";
const resendApiKey = "re_test_public_beta";
const supportEmail = "support@example.test";
const sender = "Gym Progress Tracker <mail@example.test>";

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
      BFF_CLIENT_IP_SECRET: bffSecret,
      DATABASE_URL: databaseUrl,
      EMAIL_FROM: sender,
      NODE_ENV: "production",
      RESEND_API_KEY: resendApiKey,
      SUPPORT_EMAIL: supportEmail
    });

    assert.equal(env.AUTH_COOKIE_SECURE, true);
    assert.equal(env.APP_ENV, "production");
    assert.equal(env.API_TRUST_PROXY, false);
    assert.equal(env.REGISTRATION_MODE, "DISABLED");
    assert.equal(env.BFF_CLIENT_IP_SECRET, bffSecret);
  });

  it("parses an explicit registration mode", () => {
    const env = readEnv({
      DATABASE_URL: databaseUrl,
      REGISTRATION_MODE: "DISABLED"
    });

    assert.equal(env.REGISTRATION_MODE, "DISABLED");
    assert.equal(readEnv({ DATABASE_URL: databaseUrl, REGISTRATION_MODE: "INVITE_ONLY" }).REGISTRATION_MODE, "INVITE_ONLY");
  });

  it("rejects an unknown registration mode", () => {
    assert.throws(() =>
      readEnv({
        DATABASE_URL: databaseUrl,
        REGISTRATION_MODE: "OPEN"
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
        BFF_CLIENT_IP_SECRET: bffSecret,
        DATABASE_URL: databaseUrl,
        NODE_ENV: "production",
        SUPPORT_EMAIL: supportEmail
      })
    );
  });

  it("requires the private BFF attribution secret in production", () => {
    assert.throws(() => readEnv({
      APP_BASE_URL: "https://app.gymtrack.ch",
      DATABASE_URL: databaseUrl,
      NODE_ENV: "production"
    }), /BFF_CLIENT_IP_SECRET/);
  });

  it("requires a configured email provider in public production", () => {
    assert.throws(() => readEnv({
      APP_BASE_URL: "https://app.gymtrack.ch",
      BFF_CLIENT_IP_SECRET: bffSecret,
      DATABASE_URL: databaseUrl,
      NODE_ENV: "production",
      SUPPORT_EMAIL: supportEmail
    }), /RESEND_API_KEY/);
  });

  it("requires an explicit sender in public production", () => {
    assert.throws(() => readEnv({
      APP_BASE_URL: "https://app.gymtrack.ch",
      BFF_CLIENT_IP_SECRET: bffSecret,
      DATABASE_URL: databaseUrl,
      NODE_ENV: "production",
      RESEND_API_KEY: resendApiKey,
      SUPPORT_EMAIL: supportEmail
    }), /EMAIL_FROM/);
  });

  it("requires and normalizes a recipient allowlist in staging", () => {
    const base = {
      APP_BASE_URL: "https://staging.gymtrack.ch",
      APP_ENV: "staging",
      BFF_CLIENT_IP_SECRET: bffSecret,
      DATABASE_URL: databaseUrl,
      EMAIL_FROM: sender,
      NODE_ENV: "production" as const,
      RESEND_API_KEY: resendApiKey,
      SUPPORT_EMAIL: supportEmail
    };

    assert.throws(() => readEnv(base), /EMAIL_RECIPIENT_ALLOWLIST/);
    assert.throws(() => readEnv({
      APP_ENV: "staging",
      DATABASE_URL: databaseUrl,
      NODE_ENV: "development"
    }), /EMAIL_RECIPIENT_ALLOWLIST/);
    const env = readEnv({
      ...base,
      EMAIL_RECIPIENT_ALLOWLIST: " Admin@Example.test, tester@example.test,admin@example.test "
    });
    assert.deepEqual(env.EMAIL_RECIPIENT_ALLOWLIST, ["admin@example.test", "tester@example.test"]);
  });

  it("rejects malformed staging recipient allowlists", () => {
    assert.throws(() => readEnv({
      APP_BASE_URL: "https://staging.gymtrack.ch",
      APP_ENV: "staging",
      BFF_CLIENT_IP_SECRET: bffSecret,
      DATABASE_URL: databaseUrl,
      EMAIL_FROM: sender,
      EMAIL_RECIPIENT_ALLOWLIST: "owner@example.test,not-an-email",
      NODE_ENV: "production",
      RESEND_API_KEY: resendApiKey,
      SUPPORT_EMAIL: supportEmail
    }), /EMAIL_RECIPIENT_ALLOWLIST/);
  });

  it("rejects malformed sender addresses", () => {
    assert.throws(() => readEnv({ DATABASE_URL: databaseUrl, EMAIL_FROM: "not-an-address" }));
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
        BFF_CLIENT_IP_SECRET: bffSecret,
        DATABASE_URL: databaseUrl,
        NODE_ENV: "production",
        SUPPORT_EMAIL: supportEmail
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

  it("allows the explicit private-LAN HTTP deployment exception", () => {
    const env = readEnv({
      APP_BASE_URL: "http://192.168.1.57",
      APP_ENV: "private-lan",
      AUTH_COOKIE_SECURE: "false",
      DATABASE_URL: databaseUrl,
      NODE_ENV: "production",
      REGISTRATION_MODE: "DISABLED"
    });

    assert.equal(env.APP_ENV, "private-lan");
    assert.equal(env.AUTH_COOKIE_SECURE, false);
    assert.equal(env.REGISTRATION_MODE, "DISABLED");
  });

  it("treats empty optional provider settings as unset for local Compose", () => {
    const env = readEnv({
      APP_ENV: "local",
      BFF_CLIENT_IP_SECRET: "",
      DATABASE_URL: databaseUrl,
      NODE_ENV: "production",
      RESEND_API_KEY: "",
      SUPPORT_EMAIL: "",
      TELEGRAM_BETA_BOT_TOKEN: "",
      TELEGRAM_BETA_CHAT_ID: ""
    });

    assert.equal(env.BFF_CLIENT_IP_SECRET, undefined);
    assert.equal(env.RESEND_API_KEY, undefined);
    assert.equal(env.SUPPORT_EMAIL, undefined);
    assert.equal(env.TELEGRAM_BETA_BOT_TOKEN, undefined);
    assert.equal(env.TELEGRAM_BETA_CHAT_ID, undefined);
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
