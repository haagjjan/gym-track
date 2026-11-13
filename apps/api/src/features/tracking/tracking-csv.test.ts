import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTrackingCsv, unparseTrackingCsv, type TrackingCsvRow } from "./tracking-csv.js";
import { timedCreateSchema, cardioCreateSchema } from "./tracking.schemas.js";

function row(patch: Partial<TrackingCsvRow> = {}): TrackingCsvRow {
  return { format_version: "gymtrack-tracking-v1", workout_key: "one", workout_started_at: "2026-01-01T10:00:00Z", workout_ended_at: "2026-01-01T11:00:00Z", workout_title: "Time day", workout_type: "", workout_notes: "",
    entry_kind: "time", entry_recorded_at: "2026-01-01T10:05:00Z", exercise_name: "Dead hang", activity: "", set_type: "working", duration_seconds: "45", added_weight_kg: "", distance_metres: "", average_heart_rate: "", note: "", ...patch };
}
describe("time/cardio CSV", () => {
  it("round trips text safely, including formula prefixes, original apostrophes and maximum notes", () => {
    for (const note of ["-" + "x".repeat(999), "'=SUM(1,2)", "=SUM(1,2)", "a, \"quote\"\nand another line"]) {
      const result = parseTrackingCsv(unparseTrackingCsv([row({ note, workout_title: "+Day", workout_notes: "=my original note", workout_type: "Endurance" })]));
      if (!result.ok) throw new Error(JSON.stringify(result.errors));
      assert.equal(result.rows[0]!.values.note, note);
      assert.equal(result.rows[0]!.title, "+Day");
      assert.equal(result.rows[0]!.workoutNotes, "=my original note");
    }
  });
  it("preserves time/load and cardio distance/heart rate as different kinds", () => {
    const result = parseTrackingCsv(unparseTrackingCsv([row({ added_weight_kg: "5.5" }), row({ entry_kind: "cardio", exercise_name: "", activity: "Running", set_type: "", duration_seconds: "1800", distance_metres: "5000", average_heart_rate: "140" })]));
    if (!result.ok) throw new Error("Unexpected parse failure");
    assert.deepEqual(result.rows.map((entry) => entry.values), [
      { exerciseId: "00000000-0000-4000-8000-000000000000", setType: "working", durationSeconds: 45, addedWeightKg: "5.50", note: null },
      { activity: "Running", durationSeconds: 1800, distanceMetres: "5000.00", averageHeartRate: 140, note: null }
    ]);
  });
  it("rejects conflicting metadata for one workout key and invalid values before any writes", () => {
    assert.equal(parseTrackingCsv(unparseTrackingCsv([row(), row({ workout_title: "Different" })])).ok, false);
    assert.equal(parseTrackingCsv(unparseTrackingCsv([row({ duration_seconds: "0" })])).ok, false);
    assert.equal(parseTrackingCsv(unparseTrackingCsv([row({ workout_ended_at: "2025-01-01T00:00:00Z" })])).ok, false);
  });
});
describe("extended tracking validation", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  it("accepts a bodyweight duration without fake load/repetitions and rejects invalid metrics", () => {
    assert.equal(timedCreateSchema.safeParse({ id, exerciseId: id, durationSeconds: 30 }).success, true);
    assert.equal(timedCreateSchema.safeParse({ id, exerciseId: id, durationSeconds: 30, addedWeightKg: -1 }).success, false);
    assert.equal(timedCreateSchema.safeParse({ id, exerciseId: id, durationSeconds: 1.5 }).success, false);
    assert.equal(cardioCreateSchema.safeParse({ id, activity: "Run", durationSeconds: 7200, distanceMetres: "21097.5" }).success, true);
    assert.equal(cardioCreateSchema.safeParse({ id, activity: "Run", durationSeconds: 30, distanceMetres: 0 }).success, false);
    assert.equal(cardioCreateSchema.safeParse({ id, activity: "Run", durationSeconds: 30, averageHeartRate: 10 }).success, false);
  });
});
