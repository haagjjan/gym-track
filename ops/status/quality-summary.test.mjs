import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildQualitySummary } from "./scripts/build-quality-summary.mjs";
import { buildRuntimeConfig } from "./scripts/build-runtime-config.mjs";

describe("status quality summary", () => {
  it("extracts the two all-source line coverage values", () => {
    assert.deepEqual(buildQualitySummary({
      apiSummary: coverage(82.4),
      webSummary: coverage(71.25),
      commitSha: "1234567890abcdef1234567890abcdef12345678",
      verifiedAt: "2026-09-01T12:00:00.000Z"
    }), {
      schemaVersion: 1,
      commitSha: "1234567890abcdef1234567890abcdef12345678",
      verifiedAt: "2026-09-01T12:00:00.000Z",
      coverage: { apiLines: 82.4, webLines: 71.25 }
    });
  });

  it("rejects a shortened commit or malformed coverage input", () => {
    assert.throws(() => buildQualitySummary({
      apiSummary: coverage(80),
      webSummary: coverage(70),
      commitSha: "1234567",
      verifiedAt: "2026-09-01T12:00:00.000Z"
    }));
    assert.throws(() => buildQualitySummary({
      apiSummary: {},
      webSummary: coverage(70),
      commitSha: "1234567890abcdef1234567890abcdef12345678",
      verifiedAt: "2026-09-01T12:00:00.000Z"
    }));
  });

  it("rejects non-finite coverage instead of serializing it as null", () => {
    for (const value of [NaN, Infinity]) {
      assert.throws(() => buildQualitySummary({
        apiSummary: coverage(value), webSummary: coverage(70),
        commitSha: "1234567890abcdef1234567890abcdef12345678",
        verifiedAt: "2026-09-01T12:00:00.000Z"
      }));
    }
  });
});

describe("status runtime configuration", () => {
  it("keeps the public provider URL and fails closed for other hosts", () => {
    assert.deepEqual(buildRuntimeConfig("https://gymtrack.betteruptime.com/"), {
      betterStackStatusUrl: "https://gymtrack.betteruptime.com"
    });
    assert.deepEqual(buildRuntimeConfig("https://attacker.example/status"), {
      betterStackStatusUrl: null
    });
    assert.deepEqual(buildRuntimeConfig(undefined), { betterStackStatusUrl: null });
  });
});

function coverage(pct) {
  return { total: { lines: { total: 100, covered: pct, skipped: 0, pct } } };
}
