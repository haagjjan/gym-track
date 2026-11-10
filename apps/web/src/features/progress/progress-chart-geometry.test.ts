import assert from "node:assert/strict";
import { test } from "node:test";
import type { ChartRow } from "./progress-chart-data";
import { nearestRow } from "./progress-chart-geometry";

const day = 86_400_000;
const row = (time: number): ChartRow => ({ date: String(time), time, label: "", weight: 60, reps: 8, est1rm: 76, weightChanged: false, repsChanged: false, est1rmChanged: false });

test("a tap picks the plotted day nearest to its x position", () => {
  const rows = [row(0), row(7 * day), row(14 * day)];
  const geometry = { domainMax: 14 * day, domainMin: 0, plotLeft: 40, plotWidth: 280 };
  assert.equal(nearestRow(rows, 40, geometry)?.time, 0);
  assert.equal(nearestRow(rows, 40 + 150, geometry)?.time, 7 * day);
  assert.equal(nearestRow(rows, 40 + 280, geometry)?.time, 14 * day);
  assert.equal(nearestRow([], 100, geometry), undefined);
});
