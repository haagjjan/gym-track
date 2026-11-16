import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { GET, dynamic } from "./.well-known/apple-app-site-association/route";

const originalValue = process.env.APPLE_TEAM_ID;

afterEach(() => {
  if (originalValue === undefined) delete process.env.APPLE_TEAM_ID;
  else process.env.APPLE_TEAM_ID = originalValue;
});

describe("Apple association", () => {
  it("serves the configured association as JSON at request time", async () => {
    process.env.APPLE_TEAM_ID = " TEAM123456 ";
    const response = GET();
    assert.equal(dynamic, "force-dynamic");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/json");
    assert.equal(response.headers.get("location"), null);
    assert.deepEqual(await response.json(), {
      applinks: { details: [{
        appIDs: ["TEAM123456.ch.gymtrack.app"],
        components: [
          { "/": "/verify-email*" },
          { "/": "/reset-password*" },
          { "/": "/cancel-deletion*" }
        ]
      }] }
    });
  });

  it("returns 404 when configuration is missing or empty", () => {
    delete process.env.APPLE_TEAM_ID;
    assert.equal(GET().status, 404);
    for (const value of ["", "   "]) {
      process.env.APPLE_TEAM_ID = value;
      assert.equal(GET().status, 404);
    }
  });
});
