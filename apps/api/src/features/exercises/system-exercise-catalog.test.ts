import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveExerciseNameAlias } from "./exercise-name-aliases.js";
import { systemExerciseCatalog } from "./exercise-name-catalog.js";
import { exerciseNameLookup, normalizeExerciseName } from "./exercise-name-normalization.js";

const equipment = new Set([
  "barbell", "dumbbell", "kettlebell", "cable", "machine", "plate-loaded machine",
  "Smith machine", "resistance band", "bodyweight", "EZ bar", "medicine ball",
  "stability ball", "other"
]);
const muscles = new Set([
  "chest", "back", "shoulders", "biceps", "triceps", "forearms", "quads",
  "hamstrings", "glutes", "calves", "abs", "traps"
]);

describe("system exercise catalog", () => {
  it("contains the reviewed union with deterministic unique names and ids", () => {
    assert.equal(systemExerciseCatalog.length, 820);
    assert.equal(new Set(systemExerciseCatalog.map((record) => exerciseNameLookup(record.name))).size, 820);
    assert.equal(new Set(systemExerciseCatalog.map((record) => record.id)).size, 820);
    assert.ok(systemExerciseCatalog.every((record) => record.id.startsWith("10000000-")));
  });

  it("uses only supported classifications and the 12-group muscle taxonomy", () => {
    for (const record of systemExerciseCatalog) {
      assert.ok(equipment.has(record.equipment), `${record.name}: unsupported equipment`);
      assert.ok(record.primaryMuscleGroupSlugs.length > 0, `${record.name}: missing primary muscle`);
      for (const slug of [...record.primaryMuscleGroupSlugs, ...record.secondaryMuscleGroupSlugs]) {
        assert.ok(muscles.has(slug), `${record.name}: unsupported muscle ${slug}`);
      }
    }
  });

  it("preserves meaningful numeric notation and resolves approved aliases", () => {
    assert.equal(normalizeExerciseName("  90/90 Hip   Switch  "), "90/90 Hip Switch");
    assert.deepEqual(resolveExerciseNameAlias("RDL"), ["Romanian Deadlift", "Barbell Romanian Deadlift"]);
    assert.deepEqual(resolveExerciseNameAlias("unrelated movement"), []);
  });
});
