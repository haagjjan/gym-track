import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { NextRequest } from "next/server";
import { proxyPublicStatus, STATUS_PAGE_ORIGIN } from "./public-status-proxy";

const originalApiBaseUrl = process.env.API_BASE_URL;
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiBaseUrl === undefined) delete process.env.API_BASE_URL;
  else process.env.API_BASE_URL = originalApiBaseUrl;
});

describe("public status BFF", () => {
  it("forwards aggregate metrics without cookies and allows the status origin", async () => {
    process.env.API_BASE_URL = "https://api.example.test/api/v1";
    let forwarded: RequestInit | undefined;
    globalThis.fetch = async (input, init) => {
      assert.equal(input, "https://api.example.test/api/v1/status-metrics");
      forwarded = init;
      return Response.json({ data: { workoutRecordsProcessed: 123 } });
    };
    const request = statusRequest(STATUS_PAGE_ORIGIN, { cookie: "session=private" });

    const response = await proxyPublicStatus(request);
    const headers = new Headers(forwarded?.headers);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("access-control-allow-origin"), STATUS_PAGE_ORIGIN);
    assert.equal(headers.get("cookie"), null);
    assert.equal(forwarded?.cache, "no-store");
  });

  it("rejects an explicit untrusted browser origin before contacting the API", async () => {
    let contacted = false;
    globalThis.fetch = async () => {
      contacted = true;
      return Response.json({});
    };

    const response = await proxyPublicStatus(statusRequest("https://attacker.example"));

    assert.equal(response.status, 403);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
    assert.equal(contacted, false);
  });

  it("allows an originless uptime probe without granting cross-origin access", async () => {
    globalThis.fetch = async () => Response.json({ data: { workoutRecordsProcessed: 1 } });

    const response = await proxyPublicStatus(statusRequest(null));

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  });

  it("returns a bounded no-store error when the API cannot be reached", async () => {
    globalThis.fetch = async () => { throw new Error("network unavailable"); };
    const originalError = console.error;
    console.error = () => {};

    try {
      const response = await proxyPublicStatus(statusRequest(STATUS_PAGE_ORIGIN));

      assert.equal(response.status, 502);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("access-control-allow-origin"), STATUS_PAGE_ORIGIN);
      assert.deepEqual(await response.json(), {
        error: {
          code: "API_UNAVAILABLE",
          message: "Live project metrics are unavailable."
        }
      });
    } finally {
      console.error = originalError;
    }
  });
});

function statusRequest(origin: string | null, extraHeaders: HeadersInit = {}): NextRequest {
  const headers = new Headers(extraHeaders);
  if (origin) headers.set("origin", origin);

  return new NextRequest("https://app.gymtrack.ch/api/public-status", {
    method: "GET",
    headers
  });
}
