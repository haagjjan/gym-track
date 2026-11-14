import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { exerciseMuscles, matchesMuscleRegion, primaryMuscleName } from "./exercise-muscles";

const shoulders = { id: "shoulders", slug: "shoulders", name: "Shoulders" };
const side = { id: "side", slug: "delts_side", name: "Side delts", role: "PRIMARY" as const };
const rear = { id: "rear", slug: "delts_rear", name: "Rear delts", role: "SECONDARY" as const };

describe("exercise region labels and filters", () => {
  it("uses the primary region for badges and muscle grouping", () => {
    const exercise = { muscleRegions: [side, rear], primaryMuscleGroup: shoulders };
    assert.equal(primaryMuscleName(exercise), "Side delts");
    assert.deepEqual(exerciseMuscles(exercise), [side, rear]);
  });
  it("matches both roles without including unrelated regions", () => {
    const exercise = { muscleRegions: [side, rear] };
    assert.equal(matchesMuscleRegion(exercise, "delts_side"), true);
    assert.equal(matchesMuscleRegion(exercise, "delts_rear"), true);
    assert.equal(matchesMuscleRegion(exercise, "delts_front"), false);
    assert.equal(matchesMuscleRegion(exercise, ""), true);
  });
  it("keeps older payloads and examples usable", () => {
    assert.equal(primaryMuscleName({ primaryMuscleGroup: shoulders }), "Shoulders");
    assert.equal(primaryMuscleName({}), "Other");
    assert.equal(matchesMuscleRegion({}, ""), true);
    assert.equal(matchesMuscleRegion({}, "lats"), false);
  });
});
