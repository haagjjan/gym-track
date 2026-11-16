import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { ApiError } from "../../shared/api/client";
import { apiRequest, configureAppTransport, resetAppTransport } from "../../shared/api/transport";
import type { NativeBridge } from "../../shared/platform/native";
import { PUBLIC_PRIVACY_VERSION, PUBLIC_TERMS_VERSION } from "../../shared/public-policy";
import { availableProviders, providerErrorMessage, providerSignIn } from "./provider-sign-in";

const flag = "NEXT_PUBLIC_ENABLE_PROVIDER_SIGN_IN";
const originalFlag = process.env[flag];
const originalRuntime = process.env.NEXT_PUBLIC_RUNTIME;
const originalFetch = globalThis.fetch;
let saved: string | null;
let calls: { url: string; body: unknown; headers: Headers }[];
let bridgeCalls: string[];
let responseCode: string | null;
let responseStatus: number;
let nonceCount: number;
let events: string[];

function fakeBridge(platform: "ios" | "android" | "web" = "ios", cancel = false): NativeBridge {
  return {
    platform: () => platform,
    async providerSignIn(provider, nonce) { bridgeCalls.push(`${provider}:${nonce}`); return cancel ? "cancelled" : { idToken: `token-${nonce}` }; },
    async openExternal() {}, async shareFile() { return "cancelled"; }, haptic() {},
    async scheduleNotification() {}, async cancelNotifications() {},
    async notificationPermission() { return "denied"; }, async requestNotificationPermission() { return false; }
  };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_RUNTIME = "app";
  process.env[flag] = "true";
  saved = null; calls = []; bridgeCalls = []; responseCode = null; responseStatus = 409; nonceCount = 0; events = [];
  configureAppTransport({
    apiOrigin: "https://api.example.test", appVersion: "1.0.0",
    tokenStore: { async load() { return null; }, async save(token) { saved = token; }, async clear() { saved = null; } },
    onSessionChange: (event) => { events.push(event); }
  });
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) as unknown : undefined, headers: new Headers(init?.headers) });
    if (url.endsWith("/nonce")) return Response.json({ data: { nonce: `nonce-${++nonceCount}` } });
    if (responseCode) return Response.json({ error: { code: responseCode, message: "API explanation." } }, { status: responseStatus });
    return Response.json({ data: { sessionToken: "provider-session", user: { id: "u1" } } });
  };
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  resetAppTransport();
  if (originalFlag === undefined) delete process.env[flag]; else process.env[flag] = originalFlag;
  if (originalRuntime === undefined) delete process.env.NEXT_PUBLIC_RUNTIME; else process.env.NEXT_PUBLIC_RUNTIME = originalRuntime;
});

describe("phone provider availability", () => {
  it("offers Apple and Google on iOS and Google alone on Android", () => {
    assert.deepEqual(availableProviders(fakeBridge()), ["apple", "google"]);
    assert.deepEqual(availableProviders(fakeBridge("android")), ["google"]);
    assert.deepEqual(availableProviders(fakeBridge("web")), []);
    assert.deepEqual(availableProviders(null), []);
  });
  it("makes no calls on the website or with the flag off", async () => {
    for (const runtime of ["app", "web"]) {
      process.env.NEXT_PUBLIC_RUNTIME = runtime;
      for (const value of [undefined, "false", "true"]) {
        if (value === undefined) delete process.env[flag]; else process.env[flag] = value;
        if (runtime === "app" && value === "true") continue;
        assert.deepEqual(availableProviders(fakeBridge()), []);
        assert.deepEqual(await providerSignIn("google", {}, fakeBridge()), { status: "cancelled" });
      }
    }
    assert.equal(calls.length, 0);
    assert.equal(bridgeCalls.length, 0);
  });
  it("does not start Apple sign-in on Android", async () => {
    assert.deepEqual(await providerSignIn("apple", {}, fakeBridge("android")), { status: "cancelled" });
    assert.equal(calls.length, 0);
  });
});

describe("provider credentials and sessions", () => {
  it("passes the nonce to the bridge and stores and uses the session like password login", async () => {
    assert.deepEqual(await providerSignIn("apple", {}, fakeBridge()), { status: "signed-in" });
    assert.deepEqual(bridgeCalls, ["apple:nonce-1"]);
    assert.equal(calls[0]?.url, "https://api.example.test/api/v1/auth/provider/nonce");
    assert.deepEqual(calls[1]?.body, { provider: "apple", idToken: "token-nonce-1", nonce: "nonce-1" });
    assert.equal(saved, "provider-session");
    assert.deepEqual(events, ["started"]);
    await apiRequest("/api/auth/me");
    assert.equal(calls[2]?.headers.get("authorization"), "Bearer provider-session");
  });
  it("cancels silently without posting credentials or saving a session", async () => {
    assert.deepEqual(await providerSignIn("google", {}, fakeBridge("android", true)), { status: "cancelled" });
    assert.equal(calls.length, 1);
    assert.equal(saved, null);
  });
  it("repeats consent completion with a new nonce and token and current policies", async () => {
    responseCode = "PROVIDER_SIGNUP_CONSENT_REQUIRED";
    assert.deepEqual(await providerSignIn("apple", {}, fakeBridge()), { status: "consent-required" });
    assert.equal(saved, null);
    responseCode = null;
    assert.deepEqual(await providerSignIn("apple", { consent: true }, fakeBridge()), { status: "signed-in" });
    assert.deepEqual(bridgeCalls, ["apple:nonce-1", "apple:nonce-2"]);
    assert.deepEqual(calls[3]?.body, {
      provider: "apple", nonce: "nonce-2", idToken: "token-nonce-2",
      signup: { adultAttested: true, termsVersion: PUBLIC_TERMS_VERSION, privacyVersion: PUBLIC_PRIVACY_VERSION }
    });
  });
  it("connects through the identity endpoint without starting a new session", async () => {
    assert.deepEqual(await providerSignIn("google", { connect: true }, fakeBridge()), { status: "connected" });
    assert.equal(calls[1]?.url, "https://api.example.test/api/v1/users/me/identities");
    assert.deepEqual(calls[1]?.body, { provider: "google", nonce: "nonce-1", idToken: "token-nonce-1" });
    assert.equal(saved, null);
    assert.deepEqual(events, []);
  });
  it("explains required password sign-in and preserves other API errors", async () => {
    responseCode = "PROVIDER_LINK_REQUIRES_SIGN_IN";
    assert.deepEqual(await providerSignIn("google", {}, fakeBridge()), {
      status: "error", message: "An account with this email already exists. Sign in with your password, then connect Google in Settings."
    });
    for (const code of ["PROVIDER_IDENTITY_CONFLICT", "PROVIDER_UNAVAILABLE", "INVALID_PROVIDER_TOKEN", "INVALID_PROVIDER_NONCE", "PASSWORD_REQUIRED"]) {
      responseCode = code;
      assert.deepEqual(await providerSignIn("apple", {}, fakeBridge()), { status: "error", message: "API explanation." });
    }
    assert.equal(providerErrorMessage(new ApiError(409, "Last method", "LAST_SIGN_IN_METHOD"), "apple"), "Set a password first, so you can still sign in.");
  });
  it("preserves the app session when linking rejects provider credentials but expires a rejected bearer", async () => {
    await providerSignIn("apple", {}, fakeBridge());
    responseStatus = 401;
    for (const code of ["INVALID_PROVIDER_TOKEN", "INVALID_PROVIDER_NONCE"]) {
      responseCode = code;
      await providerSignIn("google", { connect: true }, fakeBridge());
      assert.equal(saved, "provider-session");
      assert.deepEqual(events, ["started"]);
    }
    responseCode = "UNAUTHORIZED";
    await providerSignIn("google", { connect: true }, fakeBridge());
    assert.equal(saved, null);
    assert.deepEqual(events, ["started", "expired"]);
  });
  it("shows the build setup error from a native stub without submitting a token", async () => {
    const bridge = fakeBridge();
    bridge.providerSignIn = async () => { throw new Error("Sign-in with this provider is not set up in this build."); };
    assert.deepEqual(await providerSignIn("apple", {}, bridge), { status: "error", message: "Sign-in with this provider is not set up in this build." });
    assert.equal(calls.length, 1);
  });
});
