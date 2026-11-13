import assert from "node:assert/strict";
import { it } from "node:test";
import { paceLabel } from "./tracking-types";

it("derives minute/kilometre pace only from positive logged distance", () => {
  assert.equal(paceLabel(1500, "5000"), "5:00 /km");
  assert.equal(paceLabel(61, "1000"), "1:01 /km");
  assert.equal(paceLabel(1, "1000"), "0:01 /km");
  assert.equal(paceLabel(100, null), null);
  assert.equal(paceLabel(100, "0"), null);
});
