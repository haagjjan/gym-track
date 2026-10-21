import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { statusWindow } from "./status-window.js";

describe("status UTC activity windows", () => {
  it("uses UTC Mondays across year boundaries and includes the partial current week", () => {
    const window = statusWindow(new Date("2027-01-04T00:00:00Z"));
    assert.equal(window.since30Days.toISOString(), "2026-12-05T00:00:00.000Z");
    assert.equal(window.weekStarts.length, 8);
    assert.equal(window.weekStarts[0], "2026-11-16");
    assert.equal(window.weekStarts[7], "2027-01-04");
  });
  it("does not put Sunday night into next week's bucket", () => {
    assert.equal(statusWindow(new Date("2027-01-03T23:59:59.999Z")).weekStarts[7], "2026-12-28");
  });
});
