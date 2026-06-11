import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateExerciseName } from "./exercise-name-quality.js";

describe("exercise name quality", () => {
  it("accepts exact allowlist matches case-insensitively", () => {
    const result = evaluateExerciseName("  incline dumbbell press ");

    assert.equal(result.status, "accepted");
    assert.equal(result.normalizedName, "incline dumbbell press");
  });

  it("prioritizes standard exercises in suggestions", () => {
    const result = evaluateExerciseName("incline dumbell press");

    assert.equal(result.status, "warn");
    assert.equal(result.suggestions[0], "Incline Dumbbell Press");
  });

  it("blocks names with dates or export noise", () => {
    const result = evaluateExerciseName("csv row bench press 2026-05-20");

    assert.equal(result.status, "blocked");
    assert.match(result.reasons.map((reason) => reason.code).join(","), /contains_date/);
  });
});
