import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  COUNTERFACTUALS,
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

describe("counterfactual machine", () => {
  it("names only decisions that exist, and quotes them verbatim", async () => {
    const decisions = fileURLToPath(new URL("../../docs/decisions/", import.meta.url));
    const files = await readdir(decisions);
    const html = await readFile(new URL("./public/index.html", import.meta.url), "utf8");
    const inMarkup = [...html.matchAll(/data-adr="(\d{4})"/g)].map((match) => match[1]).sort();

    assert.deepEqual(inMarkup, Object.keys(COUNTERFACTUALS).sort(),
      "every switch in the markup must have consequence copy, and vice versa");

    for (const [id, entry] of Object.entries(COUNTERFACTUALS)) {
      const name = files.find((file) => file.startsWith(`${id}-`) && file.endsWith(".md"));
      assert.ok(name, `adr ${id} has no record in docs/decisions/`);
      assert.equal(entry.cite, `docs/decisions/${name}`, `adr ${id} cites the wrong file`);

      const flatten = (value) => value.replace(/\s+/g, " ").trim();
      const source = flatten(await readFile(join(decisions, name), "utf8"));
      assert.ok(source.includes(flatten(entry.quote)),
        `adr ${id} quotation is not verbatim in ${name}`);
    }
  });
});
