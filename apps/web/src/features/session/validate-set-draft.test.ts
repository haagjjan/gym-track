import assert from "node:assert/strict";
import { test } from "node:test";
import { validateSetDraft } from "./validate-set-draft";
const draft = { weightKg: "22.5", reps: "8", rir: "2", note: "", setType: "working" as const };
test("shared live and example validation rejects invalid or missing inputs", () => {
  assert.equal(validateSetDraft(draft).input?.weightKg, "22.5");
  assert.equal(validateSetDraft({ ...draft, weightKg: "0" }).input?.weightKg, "0");
  for (const patch of [{ weightKg: "-1" }, { weightKg: "10000" }, { weightKg: "1e2" }, { weightKg: "1.234" }, { reps: "0" }, { reps: "2.5" }, { rir: "" }, { rir: "11" }, { note: "x".repeat(1001) }]) {
    assert.ok(validateSetDraft({ ...draft, ...patch }).error);
  }
});
