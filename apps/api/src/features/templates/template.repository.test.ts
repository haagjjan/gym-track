import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { exerciseSignature } from "./template.repository.js";

describe("template exercise multiset signatures", () => {
  it("ignores order but preserves duplicate counts", () => {
    assert.equal(exerciseSignature(["squat", "bench", "bench"]), exerciseSignature(["bench", "squat", "bench"]));
    assert.notEqual(exerciseSignature(["squat", "bench", "bench"]), exerciseSignature(["squat", "bench"]));
    assert.notEqual(exerciseSignature(["squat", "bench"]), exerciseSignature(["squat", "bench", "row"]));
  });
});
