import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_REST_SECONDS,
  REST_MAX_SECONDS,
  formatRestSeconds,
  normaliseRestSeconds
} from "./use-rest-preferences";

describe("rest length preference", () => {
  it("keeps every value inside zero to ten minutes", () => {
    assert.equal(normaliseRestSeconds(-90), 0);
    assert.equal(normaliseRestSeconds(0), 0);
    assert.equal(normaliseRestSeconds(REST_MAX_SECONDS + 300), REST_MAX_SECONDS);
  });

  it("snaps to quarter minutes so the slider and steppers agree", () => {
    assert.equal(normaliseRestSeconds(7), 0);
    assert.equal(normaliseRestSeconds(8), 15);
    assert.equal(normaliseRestSeconds(97), 90);
    assert.equal(normaliseRestSeconds(105), 105);
  });

  it("falls back to the default for a value that is not a number", () => {
    assert.equal(normaliseRestSeconds(Number.NaN), DEFAULT_REST_SECONDS);
    assert.equal(normaliseRestSeconds(Number.POSITIVE_INFINITY), DEFAULT_REST_SECONDS);
  });

  it("formats minutes and seconds, and names zero as off", () => {
    assert.equal(formatRestSeconds(0), "Off");
    assert.equal(formatRestSeconds(45), "0:45");
    assert.equal(formatRestSeconds(120), "2:00");
    assert.equal(formatRestSeconds(REST_MAX_SECONDS), "10:00");
  });
});
