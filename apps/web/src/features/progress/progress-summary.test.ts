import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { queryKeys } from "../../shared/api/query-keys";
import {
  formatTonnageKg,
  progressSummaryRange,
  progressWindowLabel
} from "./progress-summary";

describe("progress summary windows", () => {
  it("builds an exact selected-window cutoff for the summary endpoint", () => {
    const now = Date.parse("2026-07-16T12:00:00.000Z");

    assert.deepEqual(progressSummaryRange("7", now), {
      startDate: "2026-07-09T12:00:00.000Z",
      endDate: "2026-07-16T12:00:00.000Z"
    });
    assert.equal(progressSummaryRange("all", now), undefined);
    assert.equal(progressWindowLabel("90"), "last 3 months");
  });

  it("keys summary caches by both range bounds", () => {
    assert.deepEqual(
      queryKeys.exerciseSummary(
        "exercise-1",
        "2026-07-09T12:00:00.000Z",
        "2026-07-16T12:00:00.000Z"
      ),
      [
        "exercise-summary",
        "exercise-1",
        "2026-07-09T12:00:00.000Z",
        "2026-07-16T12:00:00.000Z"
      ]
    );
    assert.deepEqual(queryKeys.exerciseSummary("exercise-1"), [
      "exercise-summary",
      "exercise-1",
      "all",
      "all"
    ]);
  });

  it("formats total tonnage without inventing precision", () => {
    assert.equal(formatTonnageKg("1234.50"), "1,234.5 KG");
    assert.equal(formatTonnageKg("not-a-number"), "—");
  });
});
