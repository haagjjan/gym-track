import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
      return { activeBetaAccounts, workoutRecordsProcessed };
    }
  };
}
