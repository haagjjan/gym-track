import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseBetterStackStatusUrl,
  parseMonitoringFeed,
  parsePublicMetrics,
  parseQualitySummary,
  qualityFreshness
} from "./public/status.js";

describe("status page data", () => {
  it("builds a conservative uptime and separates active from resolved incidents", () => {
    const view = parseMonitoringFeed(feed(), "https://gymtrack.betteruptime.com");

    assert.equal(view.overallState, "operational");
    assert.equal(view.uptime, 99.5);
    assert.deepEqual(view.components.map((component) => component.key), [
      "web-application", "api-and-database", "independent-status-page"
    ]);
    assert.equal(view.activeIncidents[0]?.message, "Investigating from the edge.");
    assert.equal(view.resolvedIncidents[0]?.title, "Resolved test");
  });

  it("does not show operational when a required monitor is degraded or absent", () => {
    const degraded = feed();
    degraded.included[1].attributes.status = "degraded";
    assert.equal(parseMonitoringFeed(degraded).overallState, "degraded");

    const incomplete = feed();
    incomplete.included = incomplete.included.filter((item) =>
      item.attributes?.public_name !== "Independent status page");
    assert.equal(parseMonitoringFeed(incomplete).overallState, "unknown");
  });

  it("accepts only the Better Stack-hosted public feed", () => {
    assert.equal(
      parseBetterStackStatusUrl("https://gymtrack.betteruptime.com/"),
      "https://gymtrack.betteruptime.com"
    );
    assert.throws(() => parseBetterStackStatusUrl("https://attacker.example/status"));
  });

  it("parses thresholded aggregate metrics without personal fields", () => {
    assert.deepEqual(parsePublicMetrics({
      data: {
        generatedAt: "2026-09-01T12:00:00.000Z",
        activeBetaAccounts: { kind: "below_threshold", threshold: 5 },
        workoutRecordsProcessed: 105
      }
    }), {
      generatedAt: "2026-09-01T12:00:00.000Z",
      activeAccounts: { kind: "below_threshold", threshold: 5 },
      workoutRecordsProcessed: 105
    });
    assert.throws(() => parsePublicMetrics({ data: { workoutRecordsProcessed: -1 } }));
  });

  it("marks old build evidence stale and validates coverage bounds", () => {
    const quality = parseQualitySummary({
      schemaVersion: 1,
      commitSha: "1234567890abcdef1234567890abcdef12345678",
      verifiedAt: "2026-09-01T12:00:00.000Z",
      coverage: { apiLines: 82.45, webLines: 71.2 }
    });

    assert.equal(quality.apiLines, 82.45);
    assert.equal(qualityFreshness(quality.verifiedAt, new Date("2026-09-10T12:00:00.000Z")), "verified");
    assert.equal(qualityFreshness(quality.verifiedAt, new Date("2026-09-20T12:00:00.000Z")), "stale");
    assert.throws(() => parseQualitySummary({
      schemaVersion: 1,
      commitSha: "1234567",
      verifiedAt: "2026-09-01T12:00:00.000Z",
      coverage: { apiLines: 101, webLines: 50 }
    }));
  });
});

function feed() {
  return {
    data: {
      type: "status_page",
      attributes: {
        aggregate_state: "operational",
        updated_at: "2026-09-01T12:00:00.000Z"
      }
    },
    included: [
      resource("Web application", "operational", 0.999),
      resource("API & database", "operational", 0.995),
      resource("Independent status page", "operational", 99.8),
      report("active", "Active test", null, ["update-active"]),
      report("resolved", "Resolved test", "2026-08-31T13:00:00.000Z", []),
      {
        id: "update-active",
        type: "status_update",
        attributes: {
          message: "Investigating from the edge.",
          published_at: "2026-09-01T12:05:00.000Z"
        }
      }
    ]
  };
}

function resource(publicName, status, availability) {
  return {
    type: "status_page_resource",
    attributes: { public_name: publicName, status, availability }
  };
}

function report(id, title, endsAt, updateIds) {
  return {
    id,
    type: "status_report",
    attributes: {
      title,
      starts_at: "2026-08-31T12:00:00.000Z",
      ends_at: endsAt,
      aggregate_state: endsAt ? "operational" : "downtime"
    },
    relationships: {
      status_updates: {
        data: updateIds.map((updateId) => ({ id: updateId, type: "status_update" }))
      }
    }
  };
}
