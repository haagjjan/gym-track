import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HEAT_STAGE_COLORS, heatBarWidth, heatBucket, heatRangeLabel, volumeRampCss } from "./heatmap";

describe("volume heat buckets", () => {
  it("uses five proportional positive buckets and a neutral zero", () => {
    assert.deepEqual(
      [0, 0.1, 4, 4.1, 8.1, 12.1, 16.1, 100].map((sets) => heatBucket(sets, 20)),
      [0, 1, 1, 2, 3, 4, 5, 5]
    );
  });

  it("keeps proportional bar widths inside each color bucket", () => {
    assert.equal(heatBarWidth(1, 20), 5);
    assert.equal(heatBarWidth(2, 20), 10);
    assert.equal(heatBucket(1, 20), heatBucket(2, 20));
  });

  it("describes the exact range behind each heat stage", () => {
    assert.equal(heatRangeLabel(1, 20), ">0–4 sets / WK");
    assert.equal(heatRangeLabel(5, 20), ">16 sets / WK (20+ stays at max heat)");
  });

  it("maps each bucket to the exact required purple stage", () => {
    assert.deepEqual(
      [1, 5, 9, 13, 17].map((sets) => volumeRampCss(sets, 20)),
      [...HEAT_STAGE_COLORS]
    );
    assert.equal(volumeRampCss(0, 20), "#2f353c");
  });
});
