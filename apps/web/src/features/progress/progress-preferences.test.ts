import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  initialProgressViewPreferences,
  updateProgressViewPreferences
} from "./progress-preferences";

describe("progress view preferences", () => {
  it("retains every chart control when unrelated exercise navigation occurs", () => {
    const customized = updateProgressViewPreferences(initialProgressViewPreferences, {
      window: "90",
      mode: "estimated",
      showWeight: false
    });
    const afterExerciseNavigation = updateProgressViewPreferences(customized, {});

    assert.deepEqual(afterExerciseNavigation, customized);
  });

  it("does not allow both load/reps series to be hidden", () => {
    const weightHidden = updateProgressViewPreferences(initialProgressViewPreferences, {
      showWeight: false
    });
    const rejected = updateProgressViewPreferences(weightHidden, { showReps: false });

    assert.equal(rejected.showReps, true);
  });
});
