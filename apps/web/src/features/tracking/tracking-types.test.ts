import assert from "node:assert/strict";
import { it } from "node:test";
import { cardioLabel, formatDuration, paceLabel, timedLabel } from "./tracking-types";

it("derives minute/kilometre pace only from positive logged distance", () => {
  assert.equal(paceLabel(1500, "5000"), "5:00 /km");
  assert.equal(paceLabel(61, "1000"), "1:01 /km");
  assert.equal(paceLabel(1, "1000"), "0:01 /km");
  assert.equal(paceLabel(100, null), null);
  assert.equal(paceLabel(100, "0"), null);
});

it("shows durations as minutes and seconds, never raw seconds", () => {
  assert.equal(formatDuration(45), "0:45");
  assert.equal(formatDuration(90), "1:30");
  assert.equal(formatDuration(1500), "25:00");
  assert.equal(formatDuration(3725), "1:02:05");
  assert.equal(timedLabel({ durationSeconds: 60, addedWeightKg: "5.00" }), "1:00 + 5 kg");
  assert.equal(timedLabel({ durationSeconds: 60, addedWeightKg: null }), "1:00");
  assert.equal(cardioLabel({ durationSeconds: 1500, distanceMetres: "5000.00" }), "25:00 · 5 km");
});
