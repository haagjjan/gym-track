import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fastify, { type FastifyInstance } from "fastify";
import { registerApiMetrics } from "./metrics.js";

describe("API metrics", () => {
  it("exports bounded HTTP, build, and default Node.js metrics", async () => {
    const server = fastify();
    registerApiMetrics(server, {
      environment: "test",
      release: "test-release"
    });
    registerStatusRoutes(server);

    try {
      assert.equal((await server.inject("/api/v1/items/raw-item-123")).statusCode, 200);
      assert.equal((await server.inject("/api/v1/missing/raw-user-456")).statusCode, 404);
      assert.equal((await server.inject("/api/v1/fail/raw-request-789")).statusCode, 500);

      const response = await server.inject("/api/v1/metrics");
      const body = response.body;

      assert.equal(response.statusCode, 200);
      assert.equal(
        response.headers["content-type"],
        "text/plain; version=0.0.4; charset=utf-8"
      );
      assert.match(body, /^# HELP gym_progress_tracker_process_start_time_seconds/m);
      assertMetricSample(body, "gym_progress_tracker_build_info", {
        service: "api",
        environment: "test",
        release: "test-release"
      }, "1");

      assertHttpStatusMetrics(body, "/api/v1/items/:itemId", "2xx");
      assertHttpStatusMetrics(body, "/api/v1/missing/:itemId", "4xx");
      assertHttpStatusMetrics(body, "/api/v1/fail/:itemId", "5xx");
      assertMetricSample(body, "gym_progress_tracker_http_requests_in_flight", {
        method: "GET"
      }, "0");

      assert.doesNotMatch(body, /route="\/api\/v1\/metrics"/);
      assert.doesNotMatch(body, /raw-item-123|raw-user-456|raw-request-789/);
    } finally {
      await server.close();
    }
  });

  it("does not register the endpoint when metrics are disabled", async () => {
    const server = fastify();
    registerApiMetrics(server);

    try {
      const response = await server.inject("/api/v1/metrics");
      assert.equal(response.statusCode, 404);
    } finally {
      await server.close();
    }
  });
});

function registerStatusRoutes(server: FastifyInstance): void {
  server.get("/api/v1/items/:itemId", async () => ({ data: { ok: true } }));
  server.get("/api/v1/missing/:itemId", async (_request, reply) => {
    return reply.status(404).send({ error: { code: "NOT_FOUND" } });
  });
  server.get("/api/v1/fail/:itemId", async () => {
    throw new Error("intentional metrics test failure");
  });
}

function assertHttpStatusMetrics(body: string, route: string, statusClass: string): void {
  const labels = { method: "GET", route, status_class: statusClass };
  assertMetricSample(body, "gym_progress_tracker_http_requests_total", {
    method: "GET",
    route
  }, "1");
  assertMetricSample(body, "gym_progress_tracker_http_responses_total", labels, "1");
  assertMetricSample(body, "gym_progress_tracker_http_request_duration_seconds_count", labels, "1");
}

function assertMetricSample(
  body: string,
  metricName: string,
  expectedLabels: Record<string, string>,
  value: string
): void {
  const sample = body
    .split("\n")
    .find((line) =>
      line.startsWith(`${metricName}{`) &&
      Object.entries(expectedLabels).every(([name, labelValue]) =>
        line.includes(`${name}="${labelValue}"`)
      )
    );

  assert.ok(sample, `Expected ${metricName} sample with ${JSON.stringify(expectedLabels)}.`);
  assert.ok(sample.endsWith(` ${value}`), `Expected ${sample} to end with value ${value}.`);
}
