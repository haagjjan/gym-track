import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createStatusController, monitoringPresentation, activityPresentation, qualityPresentation } from "./public/status-state.js";
import { parseMonitoringFeed, MONITORING_MAX_AGE } from "./public/status-data.js";
import { monitoringFixture, incidentFixture, metricsFixture, qualityFixture, PROVIDER } from "./status-fixtures.mjs";

const NOW = Date.parse("2026-09-12T12:00:00Z");

function harness(fetchJson, time = NOW) {
  let snapshot;
  const clock = { time };
  const controller = createStatusController({ fetchJson, now: () => clock.time, onChange: (state) => { snapshot = structuredClone(state); } });
  controller.tick();
  return { controller, clock, snapshot: () => snapshot };
}

function responses(url) {
  if (url === "./config.json") return { betterStackStatusUrl: PROVIDER };
  if (url.endsWith("index.json")) return monitoringFixture(NOW);
  if (url === "./quality.json") return qualityFixture(NOW);
  return metricsFixture(NOW);
}

describe("monitoring presentation and refresh", () => {
  it("starts neutral and confirms healthy only after a validated retrieval", async () => {
    const test = harness(async (url) => responses(url));
    assert.equal(monitoringPresentation(test.snapshot().monitoring, NOW).state, "checking");
    await test.controller.refreshMonitoring();
    assert.equal(test.snapshot().monitoring.retrievedAt, NOW);
    assert.equal(monitoringPresentation(test.snapshot().monitoring, NOW).title, "GymTrack is operational");
  });
  for (const [kind, config, payload] of [
    ["unconfigured", {}, null], ["unconfigured", { betterStackStatusUrl: "https://evil.test" }, null],
    ["malformed", { betterStackStatusUrl: PROVIDER }, {}]
  ]) {
    it(`renders ${kind} distinctly`, async () => {
      const test = harness(async (url) => url === "./config.json" ? config : payload);
      await test.controller.refreshMonitoring();
      assert.equal(test.snapshot().monitoring.error, kind);
      assert.equal(monitoringPresentation(test.snapshot().monitoring, NOW).state, "unavailable");
    });
  }
  it("distinguishes provider failure from configuration retrieval failure", async () => {
    const provider = harness(async (url) => {
      if (url === "./config.json") return responses(url);
      throw new Error("network");
    });
    await provider.controller.refreshMonitoring();
    assert.equal(provider.snapshot().monitoring.error, "provider");
    const config = harness(async () => { throw new Error("network"); });
    await config.controller.refreshMonitoring();
    assert.equal(config.snapshot().monitoring.error, "configuration");
  });
  it("expires retrieval at five minutes, including while a resumed refresh is pending", async () => {
    let blocked = false;
    let release;
    const test = harness((url) => blocked ? new Promise((resolve) => { release = () => resolve(responses(url)); }) : Promise.resolve(responses(url)));
    await test.controller.refreshMonitoring();
    test.clock.time += MONITORING_MAX_AGE;
    test.controller.tick();
    assert.equal(monitoringPresentation(test.snapshot().monitoring, test.clock.time).state, "operational");
    test.clock.time++;
    blocked = true;
    const pending = test.controller.refreshMonitoring();
    assert.equal(monitoringPresentation(test.snapshot().monitoring, test.clock.time).state, "stale");
    blocked = false;
    release();
    await pending;
    assert.equal(monitoringPresentation(test.snapshot().monitoring, test.clock.time).state, "operational");
  });
  it("clears healthy confirmation on failure without losing the last active incident", async () => {
    let fail = false;
    const test = harness(async (url) => {
      if (fail) throw new Error("offline");
      const payload = responses(url);
      if (url.endsWith("index.json")) payload.included.push(...incidentFixture(NOW));
      return payload;
    });
    await test.controller.refreshMonitoring();
    fail = true;
    await test.controller.refreshMonitoring();
    assert.equal(monitoringPresentation(test.snapshot().monitoring, NOW).confirmed, false);
    assert.equal(test.snapshot().monitoring.data.activeIncidents.length, 1);
  });
  it("shows incomplete and invalid clock states explicitly", () => {
    const data = parseMonitoringFeed(monitoringFixture(NOW), "", NOW);
    assert.equal(monitoringPresentation({ data: { ...data, overallState: "unknown" }, retrievedAt: NOW }, NOW).state, "incomplete");
    assert.equal(monitoringPresentation({ data, retrievedAt: NOW + 1 }, NOW).state, "unavailable");
  });
});

describe("independent evidence channels", () => {
  it("withholds old/future metrics and qualifies stale builds without affecting monitoring", async () => {
    const test = harness(async (url) => responses(url));
    await Promise.all([test.controller.refreshMonitoring(), test.controller.refreshMetrics(), test.controller.refreshQuality()]);
    const state = test.snapshot();
    assert.equal(activityPresentation(state.metrics, NOW).state, "fresh");
    assert.equal(activityPresentation(state.metrics, NOW + 15 * 60_000 + 1).state, "stale");
    assert.equal(activityPresentation(state.metrics, NOW - 1).state, "invalid");
    assert.equal(qualityPresentation(state.quality, NOW).state, "fresh");
    assert.equal(qualityPresentation(state.quality, NOW + 14 * 86_400_000).state, "stale");
    assert.equal(monitoringPresentation(state.monitoring, NOW).state, "operational");
  });
  it("returns unavailable on missing/invalid metrics and quality", async () => {
    for (const response of [null, {}]) {
      const test = harness(async () => response);
      await Promise.all([test.controller.refreshMetrics(), test.controller.refreshQuality()]);
      assert.equal(activityPresentation(test.snapshot().metrics, NOW).state, "unavailable");
      assert.equal(qualityPresentation(test.snapshot().quality, NOW).state, "unavailable");
    }
  });
  for (const method of ["refreshMonitoring", "refreshMetrics", "refreshQuality"]) {
    it(`prevents an older ${method} success from replacing a newer failure`, async () => {
      let release;
      let first = true;
      const test = harness((url) => {
        if (first) {
          first = false;
          return new Promise((resolve) => { release = () => resolve(responses(url)); });
        }
        return Promise.reject(new Error("latest request failed"));
      });
      const oldRequest = test.controller[method]();
      await test.controller[method]();
      const newer = test.snapshot();
      release();
      await oldRequest;
      assert.deepEqual(test.snapshot(), newer);
    });
    it(`prevents an older ${method} result from overwriting a newer success`, async () => {
      let release;
      let first = true;
      const test = harness((url) => {
        if (first) {
          first = false;
          return new Promise((resolve, reject) => { release = () => reject(new Error("superseded")); });
        }
        return Promise.resolve(responses(url));
      });
      const oldRequest = test.controller[method]();
      await test.controller[method]();
      const newer = test.snapshot();
      release();
      await oldRequest;
      assert.deepEqual(test.snapshot(), newer);
    });
  }
});
