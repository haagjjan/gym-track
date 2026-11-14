import assert from "node:assert/strict";
import { it } from "node:test";
import { createIdentifierLimiter, identifierKey } from "./identifier-limiter.js";

it("hashes only trimmed, lower-case identifiers with sha256", () => {
  assert.equal(identifierKey("  Alice@Example.com "), identifierKey("alice@example.com"));
  assert.equal(identifierKey("alice@example.com"), "ff8d9819fc0e12bf0d24892e45987e249a28dce836a85cad60e28eaaa8c6d976");
});

it("counts each identifier independently and resets at the fixed window boundary", () => {
  let now = 100;
  const limiter = createIdentifierLimiter({ max: 10, windowMs: 900_000, now: () => now });
  for (let attempt = 0; attempt < 10; attempt += 1) assert.equal(limiter.consume("Alice").allowed, true);
  assert.deepEqual(limiter.consume(" ALICE "), { allowed: false, retryAfterSeconds: 900 });
  assert.equal(limiter.consume("other").allowed, true);
  now += 899_999;
  assert.deepEqual(limiter.consume("alice"), { allowed: false, retryAfterSeconds: 1 });
  now += 1;
  assert.equal(limiter.consume("alice").allowed, true);
});

it("evicts the oldest key at capacity without refreshing its order on use", () => {
  const limiter = createIdentifierLimiter({ max: 1, windowMs: 1000, maxKeys: 2 });
  limiter.consume("first");
  limiter.consume("second");
  assert.equal(limiter.consume("first").allowed, false);
  limiter.consume("third");
  assert.equal(limiter.consume("second").allowed, false);
  assert.equal(limiter.consume("first").allowed, true);
});
