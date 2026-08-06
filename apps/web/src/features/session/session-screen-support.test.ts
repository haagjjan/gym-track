import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SessionExercise } from "../../shared/api/types";
import { resolveActiveExercise } from "./session-screen-support";

describe("current-page exercise selection", () => {
  const first = { id: "first" } as SessionExercise;
  const second = { id: "second" } as SessionExercise;

  it("selects the first exercise initially", () => {
    assert.equal(resolveActiveExercise([first, second], null)?.id, "first");
  });

  it("remembers a later valid selection and recovers when it disappears", () => {
    assert.equal(resolveActiveExercise([first, second], "second")?.id, "second");
    assert.equal(resolveActiveExercise([first], "second")?.id, "first");
  });
});
