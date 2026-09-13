import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseBetterStackStatusUrl, parseMonitoringFeed, parsePublicMetrics, parseQualitySummary,
  qualityFreshness, parseHistory, historySummary, timestamp
} from "./public/status-data.js";
import { monitoringFixture, incidentFixture, metricsFixture, qualityFixture } from "./status-fixtures.mjs";

const NOW = Date.parse("2026-09-12T12:00:00Z");

describe("monitoring data", () => {
  it("parses healthy services without treating page updated_at or availability as an observation/period", () => {
    const view = parseMonitoringFeed(monitoringFixture(NOW), "", NOW);
    assert.equal(view.overallState, "operational");
    assert.equal(view.components.length, 3);
    assert.equal("updatedAt" in view, false);
    assert.equal("uptime" in view, false);
    assert.equal(view.components[0].history.length, 3);
  });
  for (const state of ["degraded", "downtime", "maintenance"]) {
    it(`respects component and aggregate ${state}`, () => {
      const feed = monitoringFixture(NOW);
      feed.included[1].attributes.status = state;
      assert.equal(parseMonitoringFeed(feed, "", NOW).overallState, state);
      feed.included[1].attributes.status = "operational";
      feed.data.attributes.aggregate_state = state;
      assert.equal(parseMonitoringFeed(feed, "", NOW).overallState, state);
    });
  }
  it("does not claim health for missing, duplicated or unknown resources", () => {
    for (const mutate of [
      (feed) => feed.included.pop(),
      (feed) => feed.included.push(structuredClone(feed.included[0])),
      (feed) => { feed.included[1].attributes.status = "new-provider-state"; },
      (feed) => { delete feed.data.attributes.aggregate_state; }
    ]) {
      const feed = monitoringFixture(NOW);
      mutate(feed);
      assert.equal(parseMonitoringFeed(feed, "", NOW).overallState, "unknown");
    }
  });
  it("rejects malformed top-level responses", () => {
    for (const payload of [null, [], {}, { data: { type: "status_page" } }, { data: { type: "other", attributes: {} }, included: [] }]) {
      assert.throws(() => parseMonitoringFeed(payload));
    }
  });
  it("accepts trusted HTTPS public URLs only", () => {
    assert.equal(parseBetterStackStatusUrl("https://gymtrack.betteruptime.com/?q=x#part"), "https://gymtrack.betteruptime.com");
    for (const url of [null, "http://gymtrack.betteruptime.com", "https://betterstack.com.evil.test", "https://user:pass@gymtrack.betteruptime.com", "https://evil.test"]) {
      assert.throws(() => parseBetterStackStatusUrl(url));
    }
  });
});

describe("incident boundaries", () => {
  it("keeps active incidents and the latest valid update with its own timestamp", () => {
    const feed = monitoringFixture(NOW);
    feed.included.push(...incidentFixture(NOW));
    const report = feed.included[3];
    report.relationships.status_updates.data.push({ id: "invalid" });
    feed.included.push({ id: "invalid", type: "status_update", attributes: { published_at: "2099-01-01T00:00:00Z", message: "Future update" } });
    const view = parseMonitoringFeed(feed, "", NOW);
    assert.equal(view.activeIncidents.length, 1);
    assert.match(view.activeIncidents[0].message, /Some members/);
    assert.equal(view.activeIncidents[0].updatedAt, "2026-09-12T11:50:00.000Z");
    assert.equal(view.incidentsIncomplete, true);
  });
  it("isolates an invalid incident from healthy service readings", () => {
    const feed = monitoringFixture(NOW);
    const incidents = incidentFixture(NOW);
    incidents[0].attributes.starts_at = "invalid";
    feed.included.push(...incidents);
    const view = parseMonitoringFeed(feed, "", NOW);
    assert.equal(view.overallState, "operational");
    assert.equal(view.activeIncidents.length, 0);
    assert.equal(view.incidentsIncomplete, true);
  });
  it("supports resolved reports, including explicit resolved state without ends_at", () => {
    const feed = monitoringFixture(NOW);
    feed.included.push(...incidentFixture(NOW, true));
    assert.equal(parseMonitoringFeed(feed, "", NOW).resolvedIncidents.length, 1);
    feed.included[3].attributes.ends_at = null;
    const view = parseMonitoringFeed(feed, "", NOW);
    assert.equal(view.activeIncidents.length, 0);
    assert.equal(view.resolvedIncidents[0].resolvedAt, "2026-09-12T11:50:00.000Z");
  });
  it("preserves provider prose as text and falls back when no valid update exists", () => {
    const feed = monitoringFixture(NOW);
    feed.included.push(...incidentFixture(NOW));
    feed.included[4].attributes.message = '<img src=x onerror="alert(1)">';
    assert.match(parseMonitoringFeed(feed, "", NOW).activeIncidents[0].message, /<img/);
    feed.included[4].attributes.published_at = "invalid";
    assert.match(parseMonitoringFeed(feed, "", NOW).activeIncidents[0].message, /No incident update/);
  });
});

describe("historical status entries", () => {
  it("retains sorted valid entries and durations, deriving ranges from actual dates", () => {
    const history = parseHistory([
      { day: "2026-09-10", status: "downtime", downtime_duration: 120, maintenance_duration: 0 },
      { day: "2026-09-08", status: "operational" }
    ], NOW);
    assert.equal(history[0].day, "2026-09-08");
    assert.equal(history[1].downtimeDuration, 120);
    assert.deepEqual(historySummary([{ key: "web-application", history }])[0], {
      key: "web-application", count: 2, from: "2026-09-08", to: "2026-09-10", nonOperationalDays: 1
    });
  });
  it("rejects impossible/future days, invalid statuses/durations and ambiguous duplicate dates", () => {
    const valid = { day: "2026-09-10", status: "operational" };
    const history = parseHistory([
      valid, valid, { ...valid, day: "2026-02-30" }, { ...valid, day: "2099-01-01" },
      { ...valid, day: "2026-09-09", status: "unknown" },
      { ...valid, day: "2026-09-08", downtime_duration: -1 },
      { ...valid, day: "2026-09-07", maintenance_duration: Infinity }
    ], NOW);
    assert.deepEqual(history, []);
    assert.deepEqual(parseHistory({}), []);
  });
});

describe("metrics and build contracts", () => {
  it("keeps thresholded account and workout row semantics", () => {
    const parsed = parsePublicMetrics(metricsFixture(NOW));
    assert.deepEqual(parsed.activeAccounts, { kind: "below_threshold", threshold: 5 });
    assert.equal(parsed.workoutRecordsProcessed, 105);
    const exact = metricsFixture(NOW);
    exact.data.activeBetaAccounts = { kind: "exact", value: 6 };
    assert.equal(parsePublicMetrics(exact).activeAccounts.value, 6);
    exact.data.activeBetaAccounts.value = 2;
    assert.throws(() => parsePublicMetrics(exact));
    exact.data.workoutRecordsProcessed = -1;
    assert.throws(() => parsePublicMetrics(exact));
  });
  it("validates the full commit and finite coverage bounds", () => {
    const quality = qualityFixture(NOW);
    assert.equal(parseQualitySummary(quality).apiLines, 49.96);
    for (const bad of [NaN, Infinity, -1, 101]) {
      assert.throws(() => parseQualitySummary({ ...quality, coverage: { apiLines: bad, webLines: 8 } }));
    }
    assert.throws(() => parseQualitySummary({ ...quality, commitSha: "1234567" }));
    assert.throws(() => parseQualitySummary({ ...quality, verifiedAt: "invalid" }));
  });
  it("distinguishes old evidence from future or invalid timestamps", () => {
    assert.equal(qualityFreshness("2026-09-01T00:00:00Z", new Date(NOW)), "verified");
    assert.equal(qualityFreshness("2026-08-01T00:00:00Z", new Date(NOW)), "stale");
    assert.equal(qualityFreshness("2099-01-01T00:00:00Z", new Date(NOW)), "invalid");
    assert.equal(qualityFreshness("invalid", new Date(NOW)), "invalid");
    assert.throws(() => timestamp("2026-02-30T12:00:00Z"));
    assert.throws(() => timestamp("2026-09-01T24:00:00Z"));
    assert.throws(() => timestamp("2026-09-01"));
  });
});
