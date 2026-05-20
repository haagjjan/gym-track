import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fastify from "fastify";
import type { DatabaseHealthCheck } from "../../db/database-health.js";
import { registerHealthRoutes } from "./health.routes.js";

describe("health routes", () => {
  it("returns 200 when the database is healthy", async () => {
    const server = fastify();
    const databaseHealth: DatabaseHealthCheck = {
      async check() {}
    };

    await registerHealthRoutes(server, databaseHealth);
    const response = await server.inject("/api/v1/health");

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      data: {
        status: "ok",
        api: "ok",
        database: "ok"
      }
    });
  });

  it("returns 503 when the database is degraded", async () => {
    const server = fastify();
    const databaseHealth: DatabaseHealthCheck = {
      async check() {
        throw new Error("database unavailable");
      }
    };

    await registerHealthRoutes(server, databaseHealth);
    const response = await server.inject("/api/v1/health");

    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.json(), {
      data: {
        status: "degraded",
        api: "ok",
        database: "degraded"
      }
    });
  });
});
