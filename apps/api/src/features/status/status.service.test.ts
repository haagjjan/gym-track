import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { statusWindow } from "./status-window.js";
import type { StatusRepository } from "./status.repository.js";
import { createStatusService } from "./status.service.js";

const generatedAt = new Date("2026-09-01T12:00:00.000Z");

describe("public status metrics", () => {
  for (const activeBetaAccounts of [0, 1, 4]) {
    it(`hides an exact active-account count of ${activeBetaAccounts}`, async () => {
      const service = createStatusService({
        repository: repository(activeBetaAccounts, 123),
        now: () => generatedAt
      });

      assert.deepEqual(await service.getPublicMetrics(), {
        generatedAt: generatedAt.toISOString(),
        activeBetaAccounts: { kind: "below_threshold", threshold: 5 },
        activeAccounts: { kind: "below_threshold", threshold: 5 },
        completedWorkoutsLast30Days: 0,
        completedWorkoutsByWeek: statusWindow(generatedAt).weekStarts.map((weekStart) => ({ weekStart, count: 0 })),
        workoutRecordsProcessed: 123
      });
    });
  }

  it("publishes the exact active-account count from five accounts onward", async () => {
    const service = createStatusService({
      repository: repository(5, 321),
      now: () => generatedAt
    });

    assert.deepEqual((await service.getPublicMetrics()).activeBetaAccounts, {
      kind: "exact",
      value: 5
    });
  });
});

function repository(
  activeBetaAccounts: number,
  workoutRecordsProcessed: number
): StatusRepository {
  return {
    async getMetricCounts() {
      return { activeBetaAccounts, activeAccounts: activeBetaAccounts, workoutRecordsProcessed, completedWorkoutsLast30Days: 0, completedWorkoutsByWeek: [] };
    }
  };
}

describe("admin-inclusive public activity", () => {
  it("uses one clock read, keeps the old beta count, and fills missing weeks", async () => {
    let calls = 0;
    const service = createStatusService({
      now: () => { calls += 1; return generatedAt; },
      repository: {
        async getMetricCounts(at) {
          assert.equal(at, generatedAt);
          return {
            activeBetaAccounts: 7, activeAccounts: 8, workoutRecordsProcessed: 105,
            completedWorkoutsLast30Days: 3,
            completedWorkoutsByWeek: [{ weekStart: "2026-08-31", count: 2 }]
          };
        }
      }
    });
    const metrics = await service.getPublicMetrics();
    assert.equal(calls, 1);
    assert.deepEqual(metrics.activeBetaAccounts, { kind: "exact", value: 7 });
    assert.deepEqual(metrics.activeAccounts, { kind: "exact", value: 8 });
    assert.equal(metrics.completedWorkoutsByWeek.length, 8);
    assert.equal(metrics.completedWorkoutsByWeek[0]?.count, 0);
    assert.deepEqual(metrics.completedWorkoutsByWeek[7], { weekStart: "2026-08-31", count: 2 });
  });
});
