import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePublicMetrics } from "./public/status-data.js";
import { scenarioFixture } from "./status-fixtures.mjs";

const NOW = Date.parse("2026-10-21T12:00:00Z");
const fixture = () => scenarioFixture("healthy", NOW).metrics;

describe("public activity breakdown", () => {
  it("keeps admin-inclusive totals separate from legacy beta totals", () => {
    const parsed = parsePublicMetrics(fixture());
    assert.deepEqual(parsed.activeAccounts, { kind: "exact", value: 8 });
    assert.deepEqual(parsed.activeBetaAccounts, { kind: "below_threshold", threshold: 5 });
    assert.equal(parsed.completedWorkoutsLast30Days, 23);
    assert.equal(parsed.completedWorkoutsByWeek[7].weekStart, "2026-10-19");
  });
  it("allows legacy totals without inventing a recent activity breakdown", () => {
    const parsed = parsePublicMetrics(scenarioFixture("metrics-legacy", NOW).metrics);
    assert.equal(parsed.activeAccounts, null);
    assert.equal(parsed.workoutRecordsProcessed, 105);
    assert.equal(parsed.completedWorkoutsLast30Days, null);
    assert.equal(parsed.completedWorkoutsByWeek, null);
  });
  it("retains genuine zero counts", () => {
    const parsed = parsePublicMetrics(scenarioFixture("metrics-empty", NOW).metrics);
    assert.equal(parsed.completedWorkoutsLast30Days, 0);
    assert.ok(parsed.completedWorkoutsByWeek.every((week) => week.count === 0));
  });
  it("isolates malformed optional fields, rejecting gaps, duplicates, future and invalid weeks", () => {
    for (const mutate of [
      (weeks) => { weeks[0].count = -1; },
      (weeks) => { weeks[0].count = 1.5; },
      (weeks) => { weeks[0].count = Number.MAX_SAFE_INTEGER + 1; },
      (weeks) => { weeks[0].weekStart = "2026-02-30"; },
      (weeks) => { weeks[0].weekStart = "2099-01-01"; },
      (weeks) => { weeks[0] = weeks[1]; },
      (weeks) => { weeks.pop(); },
      (weeks) => { weeks.reverse(); }
    ]) {
      const metrics = fixture();
      mutate(metrics.data.completedWorkoutsByWeek);
      const parsed = parsePublicMetrics(metrics);
      assert.equal(parsed.completedWorkoutsByWeek, null);
      assert.equal(parsed.workoutRecordsProcessed, 105);
    }
    const metrics = fixture();
    metrics.data.completedWorkoutsLast30Days = "23";
    assert.equal(parsePublicMetrics(metrics).completedWorkoutsLast30Days, null);
  });
  it("rejects invalid account disclosure instead of showing a misleading total", () => {
    for (const accounts of [{ kind: "exact", value: 4 }, { kind: "below_threshold", threshold: 10 }]) {
      const metrics = fixture();
      metrics.data.activeAccounts = accounts;
      assert.throws(() => parsePublicMetrics(metrics));
    }
  });
});
