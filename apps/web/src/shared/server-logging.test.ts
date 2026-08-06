import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createBffRequestContext,
  finalizeBffResponse,
  forwardBffRequestId,
  logBffFailure
} from "./server-logging";

describe("BFF server logging", () => {
  it("normalizes identifiers and validates caller request ids", () => {
    const headers = new Headers({ "x-request-id": "web-request-123" });
    const context = createBffRequestContext(
      { method: "get", headers },
      "workouts/2fa5a54f-2c2c-4989-b47e-f1303b4599b4/sets"
    );

    assert.equal(context.requestId, "web-request-123");
    assert.equal(context.method, "GET");
    assert.equal(context.normalizedRoute, "/api/workouts/:id/sets");

    const unsafe = createBffRequestContext(
      { method: "GET", headers: new Headers({ "x-request-id": "unsafe id" }) },
      "workouts"
    );
    assert.notEqual(unsafe.requestId, "unsafe id");
  });

  it("forwards and returns the safe request id", () => {
    const context = createBffRequestContext(
      { method: "GET", headers: new Headers() },
      "workouts"
    );
    const upstreamHeaders = new Headers();
    forwardBffRequestId(upstreamHeaders, context);

    const response = finalizeBffResponse(context, new Response(null, { status: 204 }));

    assert.equal(upstreamHeaders.get("x-request-id"), context.requestId);
    assert.equal(response.headers.get("x-request-id"), context.requestId);
  });

  it("logs bounded failure context without error messages or raw ids", () => {
    const output: string[] = [];
    const context = createBffRequestContext(
      { method: "PATCH", headers: new Headers() },
      "workouts/2fa5a54f-2c2c-4989-b47e-f1303b4599b4"
    );

    logBffFailure(
      context,
      {
        statusCode: 502,
        errorCode: "API_UNAVAILABLE",
        error: new Error("private-upstream-message")
      },
      (message) => output.push(message)
    );

    const event = JSON.parse(output[0] ?? "{}") as Record<string, unknown>;
    assert.equal(event.service, "web");
    assert.equal(event.event, "bff_proxy_error");
    assert.equal(event.normalized_route, "/api/workouts/:id");
    assert.equal(event.error_type, "Error");
    assert.equal(event.error_code, "API_UNAVAILABLE");
    assert.doesNotMatch(JSON.stringify(event), /private-upstream-message|2fa5a54f/);
  });
});
