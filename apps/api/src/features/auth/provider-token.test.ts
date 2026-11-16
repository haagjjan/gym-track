import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { it } from "node:test";
import { createProviderTokenVerifier, ProviderAuthError } from "./provider-token.js";
import { createProviderNonceStore } from "./provider-nonce.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const otherKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "key-1", alg: "RS256", use: "sig" };
const now = 1_800_000_000_000;
const nonce = "test-nonce";
function token(claims: Record<string, unknown> = {}, header: Record<string, unknown> = {}, badSignature = false) {
  const encodedHeader = Buffer.from(JSON.stringify({ alg: "RS256", kid: "key-1", ...header })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: "https://appleid.apple.com", aud: "client-1", sub: "subject-1",
    iat: now / 1000 - 10, exp: now / 1000 + 300, nonce,
    email: "Person@Example.test", email_verified: "true", ...claims
  })).toString("base64url");
  const signed = `${encodedHeader}.${payload}`;
  return `${signed}.${sign("RSA-SHA256", Buffer.from(signed), badSignature ? otherKey : privateKey).toString("base64url")}`;
}
function verifier(fetcher: typeof fetch = async () => new Response(JSON.stringify({ keys: [jwk] }))) {
  return createProviderTokenVerifier({ audiences: { apple: ["client-1"], google: ["client-1"] }, now: () => now, fetcher });
}

it("verifies signatures, lowercases email, accepts raw and hashed nonces and Apple boolean variants", async () => {
  const verify = verifier();
  assert.deepEqual(await verify("apple", token(), nonce), {
    provider: "apple", subject: "subject-1", email: "person@example.test", emailVerified: true
  });
  const hashed = createHash("sha256").update(nonce).digest("hex");
  assert.equal((await verify("apple", token({ nonce: hashed, email_verified: true }), nonce)).emailVerified, true);
  assert.equal((await verify("apple", token({ email_verified: "false" }), nonce)).emailVerified, false);
  assert.equal((await verify("apple", token({ email: undefined }), nonce)).email, null);
});
for (const issuer of ["https://accounts.google.com", "accounts.google.com"]) {
  it(`accepts Google issuer ${issuer}`, async () => {
    assert.equal((await verifier()("google", token({ iss: issuer }), nonce)).subject, "subject-1");
  });
}
for (const [name, claims, header, badSignature] of [
  ["wrong audience", { aud: "attacker" }, {}, false],
  ["wrong issuer", { iss: "attacker" }, {}, false],
  ["expired token", { exp: now / 1000 - 61, iat: now / 1000 - 300 }, {}, false],
  ["future issued at", { iat: now / 1000 + 61 }, {}, false],
  ["missing issued at", { iat: undefined }, {}, false],
  ["missing nonce", { nonce: undefined }, {}, false],
  ["wrong nonce", { nonce: "another" }, {}, false],
  ["wrong algorithm", {}, { alg: "HS256" }, false],
  ["unknown key", {}, { kid: "other" }, false],
  ["bad signature", {}, {}, true]
] as const) {
  it(`rejects ${name}`, async () => {
    await assert.rejects(verifier()("apple", token(claims, header, badSignature), nonce), { code: "INVALID_PROVIDER_TOKEN" });
  });
}
it("caches keys and refetches once for unknown kid, including rotation", async () => {
  let calls = 0;
  const verify = verifier(async () => {
    calls++;
    return new Response(JSON.stringify({ keys: [{ ...jwk, kid: calls === 1 ? "key-1" : "rotated" }] }));
  });
  await verify("apple", token(), nonce);
  await verify("apple", token(), nonce);
  assert.equal(calls, 1);
  await verify("apple", token({}, { kid: "rotated" }), nonce);
  assert.equal(calls, 2);
  await assert.rejects(verify("apple", token({}, { kid: "missing" }), nonce));
  assert.equal(calls, 3);
});
it("unknown kid on an empty cache triggers only one refetch", async () => {
  let calls = 0;
  await assert.rejects(verifier(async () => {
    calls++;
    return new Response(JSON.stringify({ keys: [jwk] }));
  })("apple", token({}, { kid: "missing" }), nonce));
  assert.equal(calls, 2);
});
it("fails closed on HTTP, network and malformed key set errors", async () => {
  for (const fetcher of [
    async () => new Response("error", { status: 503 }),
    async () => { throw new Error("offline"); },
    async () => new Response("{}")
  ]) await assert.rejects(verifier(fetcher)("apple", token(), nonce), ProviderAuthError);
});
it("does not fetch for an unavailable provider", async () => {
  const verify = createProviderTokenVerifier({ audiences: { apple: [], google: [] }, fetcher: async () => {
    assert.fail("unavailable providers must not fetch");
  } });
  await assert.rejects(verify("apple", token(), nonce), { code: "PROVIDER_UNAVAILABLE", status: 503 });
});
it("nonce store rejects missing, replayed, expired and evicted nonces", () => {
  let time = now;
  const store = createProviderNonceStore({ now: () => time, maxKeys: 2 });
  assert.equal(store.consume("missing"), false);
  const first = store.issue();
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(store.consume(first), true);
  assert.equal(store.consume(first), false);
  const expired = store.issue();
  time += 10 * 60 * 1000;
  assert.equal(store.consume(expired), false);
  const evicted = store.issue();
  store.issue(); store.issue();
  assert.equal(store.consume(evicted), false);
});

it("enforces 60-second clock leeway and fails closed when an expired key cache cannot refresh", async () => {
  let time = now;
  let fail = false;
  const verify = createProviderTokenVerifier({
    audiences: { apple: ["client-1"], google: [] }, now: () => time,
    fetcher: async () => {
      if (fail) throw new Error("offline");
      return new Response(JSON.stringify({ keys: [jwk] }));
    }
  });
  await verify("apple", token({ exp: now / 1000 - 59, iat: now / 1000 - 300 }), nonce);
  await verify("apple", token({ iat: now / 1000 + 60 }), nonce);
  fail = true;
  time += 60 * 60 * 1000;
  await assert.rejects(verify("apple", token({ iat: time / 1000 - 10, exp: time / 1000 + 300 }), nonce), {
    code: "INVALID_PROVIDER_TOKEN"
  });
});
