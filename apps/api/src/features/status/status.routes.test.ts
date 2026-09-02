import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fastify from "fastify";
import { registerStatusRoutes } from "./status.routes.js";

describe("status metrics route", () => {
  it("returns aggregate-only metrics without allowing caching", async () => {
    const server = fastify();
    await registerStatusRoutes(server, {
      async getPublicMetrics() {
        return {
          generatedAt: "2026-09-01T12:00:00.000Z",
          activeBetaAccounts: { kind: "exact", value: 12 },
          workoutRecordsProcessed: 456
        };
      }
    });

    const response = await server.inject("/api/v1/status-metrics");

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.deepEqual(response.json(), {
      data: {
        generatedAt: "2026-09-01T12:00:00.000Z",
        activeBetaAccounts: { kind: "exact", value: 12 },
        workoutRecordsProcessed: 456
      }
    });
    assert.equal(JSON.stringify(response.json()).includes("email"), false);
  });

  it("fails without a cacheable or stale success response when recounting fails", async () => {
    const server = fastify({ logger: false });
    await registerStatusRoutes(server, {
      async getPublicMetrics() {
        throw new Error("database unavailable");
      }
    });

    const response = await server.inject("/api/v1/status-metrics");

    assert.equal(response.statusCode, 500);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.equal(response.json().statusCode, 500);
  });
});
