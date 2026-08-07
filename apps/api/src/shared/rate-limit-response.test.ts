import assert from "node:assert/strict";
import { describe, it } from "node:test";
import rateLimit from "@fastify/rate-limit";
import fastify from "fastify";
import { createRateLimitResponse } from "./rate-limit-response.js";

describe("rate-limit response", () => {
  it("returns 429 with the canonical API error envelope", async () => {
    const server = fastify();
    await server.register(rateLimit, {
      errorResponseBuilder: (_request, context) => createRateLimitResponse(context),
      max: 1,
      timeWindow: "1 minute"
    });
    server.get("/", async () => ({ data: "ok" }));

    try {
      assert.equal((await server.inject("/")).statusCode, 200);

      const limited = await server.inject("/");

      assert.equal(limited.statusCode, 429);
      assert.deepEqual(limited.json(), {
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Try again in 1 minute."
        }
      });
    } finally {
      await server.close();
    }
  });
});
