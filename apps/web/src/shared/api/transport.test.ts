import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { apiRequest, appApiUrl, configureAppTransport, hasAppSession, resetAppTransport, type SessionTokenStore } from "./transport";

const ORIGIN = "https://api.example.test";

interface Call { url: string; init: RequestInit }

function memoryStore(initial: string | null): SessionTokenStore & { value: string | null } {
  return {
    value: initial,
    async load() { return this.value; },
    async save(token) { this.value = token; },
    async clear() { this.value = null; }
  };
}

function stubFetch(respond: (url: string) => Response): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return respond(String(input));
  }) as typeof fetch;
  return calls;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("appApiUrl", () => {
  it("maps BFF paths to the versioned API and keeps the query", () => {
    assert.equal(appApiUrl("/api/workouts?limit=5", ORIGIN), `${ORIGIN}/api/v1/workouts?limit=5`);
    assert.equal(appApiUrl("/api/auth/login", `${ORIGIN}/`), `${ORIGIN}/api/v1/auth/login`);
  });

  it("maps the one renamed path and leaves other URLs alone", () => {
    assert.equal(appApiUrl("/api/public-status", ORIGIN), `${ORIGIN}/api/v1/status-metrics`);
    assert.equal(appApiUrl("/models/body/body.glb", ORIGIN), "/models/body/body.glb");
  });
});

describe("apiRequest", () => {
  const originalFetch = globalThis.fetch;
  const originalRuntime = process.env.NEXT_PUBLIC_RUNTIME;

  beforeEach(() => { process.env.NEXT_PUBLIC_RUNTIME = "app"; });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetAppTransport();
    if (originalRuntime === undefined) delete process.env.NEXT_PUBLIC_RUNTIME;
    else process.env.NEXT_PUBLIC_RUNTIME = originalRuntime;
  });

  it("is a plain same-origin fetch on the web", async () => {
    delete process.env.NEXT_PUBLIC_RUNTIME;
    configureAppTransport({ apiOrigin: ORIGIN, appVersion: "1.0.0", tokenStore: memoryStore("stored-token") });
    const calls = stubFetch(() => json(200, { data: {} }));

    await apiRequest("/api/workouts", { method: "GET" });

    assert.equal(calls[0]?.url, "/api/workouts");
    assert.equal(new Headers(calls[0]?.init.headers).get("authorization"), null);
  });

  it("sends the token, client marker and version to the API in the app", async () => {
    configureAppTransport({ apiOrigin: ORIGIN, appVersion: "1.2.3", tokenStore: memoryStore("stored-token") });
    const calls = stubFetch(() => json(200, { data: {} }));

    await apiRequest("/api/workouts", { method: "GET" });

    const headers = new Headers(calls[0]?.init.headers);
    assert.equal(calls[0]?.url, `${ORIGIN}/api/v1/workouts`);
    assert.equal(headers.get("authorization"), "Bearer stored-token");
    assert.equal(headers.get("x-gym-client"), "app");
    assert.equal(headers.get("x-app-version"), "1.2.3");
    assert.equal(calls[0]?.init.credentials, "omit");
  });

  it("stores the token from login and uses it afterwards", async () => {
    const store = memoryStore(null);
    configureAppTransport({ apiOrigin: ORIGIN, appVersion: "1.0.0", tokenStore: store });
    const calls = stubFetch((url) => url.endsWith("/auth/login")
      ? json(200, { data: { user: { id: "u1" }, sessionToken: "fresh-token" } })
      : json(200, { data: {} }));

    assert.equal(await hasAppSession(), false);
    const login = await apiRequest("/api/auth/login", { method: "POST", body: "{}" });
    assert.deepEqual(await login.json(), { data: { user: { id: "u1" }, sessionToken: "fresh-token" } });
    await apiRequest("/api/auth/me");

    assert.equal(store.value, "fresh-token");
    assert.equal(await hasAppSession(), true);
    assert.equal(new Headers(calls[1]?.init.headers).get("authorization"), "Bearer fresh-token");
  });

  it("forgets the token on logout", async () => {
    const store = memoryStore("stored-token");
    configureAppTransport({ apiOrigin: ORIGIN, appVersion: "1.0.0", tokenStore: store });
    stubFetch(() => json(200, { data: { loggedOut: true } }));

    await apiRequest("/api/auth/logout", { method: "POST" });

    assert.equal(store.value, null);
    assert.equal(await hasAppSession(), false);
  });

  it("forgets the token and reports it when the session has ended", async () => {
    const store = memoryStore("stored-token");
    let signedOut = 0;
    configureAppTransport({ apiOrigin: ORIGIN, appVersion: "1.0.0", tokenStore: store, onSignedOut: () => { signedOut += 1; } });
    stubFetch(() => json(401, { error: { code: "UNAUTHORIZED" } }));

    await apiRequest("/api/workouts");

    assert.equal(store.value, null);
    assert.equal(signedOut, 1);
  });

  it("does not treat a wrong password as a lost session", async () => {
    const store = memoryStore("stored-token");
    let signedOut = 0;
    configureAppTransport({ apiOrigin: ORIGIN, appVersion: "1.0.0", tokenStore: store, onSignedOut: () => { signedOut += 1; } });
    stubFetch(() => json(401, { error: { code: "INVALID_CREDENTIALS" } }));

    await apiRequest("/api/auth/login", { method: "POST", body: "{}" });

    assert.equal(store.value, "stored-token");
    assert.equal(signedOut, 0);
  });

  it("reports a required update and keeps the session", async () => {
    const store = memoryStore("stored-token");
    let updates = 0;
    configureAppTransport({ apiOrigin: ORIGIN, appVersion: "1.0.0", tokenStore: store, onUpdateRequired: () => { updates += 1; } });
    stubFetch(() => json(426, { error: { code: "APP_UPDATE_REQUIRED" } }));

    await apiRequest("/api/workouts");

    assert.equal(updates, 1);
    assert.equal(store.value, "stored-token");
  });
});
