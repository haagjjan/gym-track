import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { it } from "node:test";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import fastify from "fastify";
import { registerGlobalRateLimits } from "./global-rate-limit.js";

async function buildServer(secret?: string) {
  const server = fastify();
  await server.register(rateLimit, { global: false });
  await server.register(cookie);
  registerGlobalRateLimits(server, "session", secret);
  for (const path of ["/one", "/two", "/api/v1/health", "/api/v1/status-metrics"]) {
    server.get(path, { config: { rateLimit: false } }, async () => ({ data: "ok" }));
  }
  return server;
}

it("caps credentialless traffic across routes at 120 per address with canonical 429 and Retry-After", async (t) => {
  const server = await buildServer();
  t.after(() => server.close());
  for (let index = 0; index < 120; index += 1) {
    assert.equal((await server.inject(index % 2 ? "/one" : "/two")).statusCode, 200);
  }
  const response = await server.inject("/one");
  assert.equal(response.statusCode, 429);
  assert.equal(response.json().error.code, "RATE_LIMITED");
  assert.ok(Number(response.headers["retry-after"]) > 0);
  assert.equal((await server.inject({ url: "/one", remoteAddress: "127.0.0.2" })).statusCode, 200);
  assert.equal((await server.inject({ url: "/one", headers: { cookie: "unrelated=value" } })).statusCode, 429);
});

for (const headers of [{ cookie: "session=looks-authenticated" }, { authorization: "Bearer invalid" }]) {
  it(`allows 300 authenticated-looking requests with ${Object.keys(headers)[0]}`, async (t) => {
    const server = await buildServer();
    t.after(() => server.close());
    for (let index = 0; index < 300; index += 1) {
      assert.equal((await server.inject({ url: "/one", headers })).statusCode, 200);
    }
    assert.equal((await server.inject({ url: "/two", headers })).statusCode, 429);
  });
}

for (const path of ["/api/v1/health", "/api/v1/status-metrics"]) {
  it(`exempts ${path} with query strings only from the anonymous bucket`, async (t) => {
    const server = await buildServer();
    t.after(() => server.close());
    for (let index = 0; index < 300; index += 1) {
      assert.equal((await server.inject(`${path}?probe=1`)).statusCode, 200);
    }
    assert.equal((await server.inject(path)).statusCode, 429);
  });
}

it("keeps the aggregate ceiling when credential types change", async (t) => {
  const server = await buildServer();
  t.after(() => server.close());
  for (let index = 0; index < 300; index += 1) {
    const headers = index < 120 ? {} : { authorization: "present" };
    assert.equal((await server.inject({ url: "/one", headers })).statusCode, 200);
  }
  assert.equal((await server.inject({ url: "/one", headers: { cookie: "session=value" } })).statusCode, 429);
});

it("uses trusted address signatures and ignores forged forwarding headers", async (t) => {
  const secret = "a".repeat(32);
  const server = await buildServer(secret);
  t.after(() => server.close());
  const ip = "192.0.2.1";
  const headers = {
    "x-gym-client-ip": ip,
    "x-gym-client-signature": createHmac("sha256", secret).update(ip).digest("base64url")
  };
  for (let index = 0; index < 120; index += 1) {
    assert.equal((await server.inject({ url: "/one", headers })).statusCode, 200);
  }
  assert.equal((await server.inject({ url: "/one", headers, remoteAddress: "127.0.0.2" })).statusCode, 429);
  assert.equal((await server.inject({ url: "/one", headers: { "x-forwarded-for": ip } })).statusCode, 200);
});
