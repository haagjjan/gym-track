import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fastify, { LogController } from "fastify";
import { createApiLogger } from "./logger.js";
import { createRequestId, registerApiRequestLogging } from "./request-logging.js";

describe("API request logging", () => {
  it("logs a normalized route and propagates a validated request id", async () => {
    const output: string[] = [];
    const server = buildLoggingServer(output);
    server.get("/items/:itemId", async () => ({ ok: true }));

    const response = await server.inject({
      method: "GET",
      url: "/items/private-item-value",
      headers: { "x-request-id": "web-request-123" }
    });
    await server.close();

    const event = findEvent(output, "request_completed");
    assert.equal(response.headers["x-request-id"], "web-request-123");
    assert.equal(event.request_id, "web-request-123");
    assert.equal(event.method, "GET");
    assert.equal(event.normalized_route, "/items/:itemId");
    assert.equal(event.status_code, 200);
    assert.equal(typeof event.duration_ms, "number");
    assert.doesNotMatch(JSON.stringify(event), /private-item-value/);
  });

  it("logs error type, code, and a message-free stack for failures", async () => {
    const output: string[] = [];
    const server = buildLoggingServer(output);
    server.get("/failure", async () => {
      const error = new Error("private-error-message") as Error & { code: string };
      error.code = "TEST_FAILURE";
      throw error;
    });

    await server.inject("/failure");
    await server.close();

    const event = findEvent(output, "request_failed");
    assert.equal(event.error_type, "Error");
    assert.equal(event.error_code, "TEST_FAILURE");
    assert.equal(event.status_code, 500);
    assert.equal(typeof event.error_stack, "string");
    assert.doesNotMatch(JSON.stringify(event), /private-error-message/);
  });

  it("rejects unsafe caller-provided request ids", () => {
    assert.equal(createRequestId("safe.id-123"), "safe.id-123");
    assert.notEqual(createRequestId("unsafe request id"), "unsafe request id");
    assert.notEqual(createRequestId("x".repeat(129)), "x".repeat(129));
  });
});

function buildLoggingServer(output: string[]) {
  const server = fastify({
    logger: createApiLogger({
      level: "info",
      nodeEnv: "production",
      environment: "test",
      version: "test-release",
      stream: { write: (message) => output.push(message) }
    }),
    logController: new LogController({ disableRequestLogging: true }),
    genReqId: (request) => createRequestId(request.headers["x-request-id"])
  });
  registerApiRequestLogging(server);
  return server;
}

function findEvent(output: string[], eventName: string): Record<string, unknown> {
  const event = output
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .find((entry) => entry.event === eventName);

  assert.ok(event, `Expected ${eventName} log event.`);
  return event;
}
