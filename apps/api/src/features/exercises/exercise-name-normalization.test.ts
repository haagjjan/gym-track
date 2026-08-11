import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { boundedExerciseNameDistance } from "./exercise-name-normalization.js";

describe("bounded exercise name distance", () => {
  it("returns exact distances inside the requested bound", () => {
    assert.equal(boundedExerciseNameDistance("bench press", "bench press", 3), 0);
    assert.equal(boundedExerciseNameDistance("kitten", "sitting", 3), 3);
  });

  it("returns one above the bound when the distance exceeds it", () => {
    assert.equal(boundedExerciseNameDistance("kitten", "sitting", 2), 3);
    assert.equal(boundedExerciseNameDistance("press", "press variation", 4), 5);
  });

  it("is symmetric across insertions, deletions, and substitutions", () => {
    assert.equal(boundedExerciseNameDistance("dumbell", "dumbbell", 2), 1);
    assert.equal(boundedExerciseNameDistance("dumbbell", "dumbell", 2), 1);
    assert.equal(boundedExerciseNameDistance("press", "crest", 2), 2);
  });
});
