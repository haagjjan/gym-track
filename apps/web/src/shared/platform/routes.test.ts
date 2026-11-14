import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { workoutHref } from "./routes";

describe("workoutHref", () => {
  it("uses the path form on the web", () => {
    assert.equal(workoutHref("w 1", {}, false), "/workouts/w%201");
    assert.equal(workoutHref("w1", { focusName: true }, false), "/workouts/w1?focusName=1");
  });

  it("uses the query form in the app", () => {
    assert.equal(workoutHref("w1", {}, true), "/workouts/session/?id=w1");
    assert.equal(workoutHref("w1", { focusName: true }, true), "/workouts/session/?id=w1&focusName=1");
  });
});
