import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import type { FastifyRequest } from "fastify";
import { trustedClientKey } from "./client-attribution.js";

const secret = "a-secure-bff-only-attribution-secret-123456";

describe("trusted BFF client attribution", () => {
  it("uses a correctly signed edge IP", () => {
    const ip = "203.0.113.10";
    const signature = createHmac("sha256", secret).update(ip).digest("base64url");
    assert.equal(trustedClientKey(request({ "x-gym-client-ip": ip, "x-gym-client-signature": signature }), secret), ip);
  });

  it("ignores forged, invalid, and unsigned browser values", () => {
    assert.equal(trustedClientKey(request({ "x-gym-client-ip": "203.0.113.10", "x-gym-client-signature": "forged" }), secret), "10.0.0.5");
    assert.equal(trustedClientKey(request({ "x-gym-client-ip": "not-an-ip" }), secret), "10.0.0.5");
    assert.equal(trustedClientKey(request({ "x-forwarded-for": "203.0.113.10" }), secret), "10.0.0.5");
  });
});

function request(headers: Record<string, string>): FastifyRequest {
  return { headers, ip: "10.0.0.5" } as unknown as FastifyRequest;
}
