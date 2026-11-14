import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { demoExercises, practiceWorkout, sampleWorkouts, workoutSummary } from "./demo-data";
import { demoCompletedExercises, demoProgress, demoSummary, demoVolume } from "./demo-analytics";
import { selectBestWorkingSets } from "../progress/progress-selection";

const now = Date.parse("2026-09-29T12:00:00Z");
const samples = sampleWorkouts(now);
const bench = demoExercises[0]!.id;
test("fixtures match the reviewed catalog and are recent at any opening date", () => {
  const catalog = JSON.parse(readFileSync(new URL("../../../../api/catalog/system-exercise-catalog.json", import.meta.url), "utf8")) as { records: Array<{ id: string; name: string; primaryMuscleGroupSlugs: string[] }> };
  for (const exercise of demoExercises) {
    const source = catalog.records.find((entry) => entry.id === exercise.id);
    assert.equal(source?.name, exercise.name);
    assert.deepEqual(source?.primaryMuscleGroupSlugs, exercise.primaryMuscleGroups.map((group) => group.slug));
  }
  assert.equal(samples.length, 8);
  for (const at of [now, now + 365 * 86400000]) {
    const logs = sampleWorkouts(at);
    assert.equal(demoCompletedExercises(logs)[0]?.plottedSetCount, 8);
    assert.equal(selectBestWorkingSets(demoProgress(logs, bench), "30", "loadReps", at).length, 8);
    assert.equal(selectBestWorkingSets(demoProgress(logs, bench), "7", "loadReps", at).length, 2);
  }
});
test("summary includes warmups but plotted days and volume count working sets", () => {
  const sets = samples.flatMap((workout) => workout.exercises[0]!.sets);
  const summary = demoSummary(samples, bench, "all", now);
  assert.equal(summary.totalSets, 31);
  assert.equal(summary.totalReps, 276);
  assert.equal(summary.totalVolumeKg, "5767.50");
  assert.equal(summary.totalSets, sets.length);
  assert.equal(summary.totalVolumeKg, sets.reduce((sum, set) => sum + Number(set.weightKg) * set.reps, 0).toFixed(2));
  assert.equal(selectBestWorkingSets(demoProgress(samples, bench), "all", "loadReps", now).length, 8);
  const chestCount = demoVolume(samples, 30, now).weeks.flatMap((week) => week.items).filter((item) => item.muscleGroup.slug === "chest").reduce((n, item) => n + item.workingSets, 0);
  assert.equal(chestCount, sets.filter((set) => set.setType === "working").length);
  assert.equal(chestCount, 23);
  const tricepsCount = demoVolume(samples, 30, now).weeks.flatMap((week) => week.items).filter((item) => item.muscleGroup.slug === "triceps").reduce((total, item) => total + item.workingSets, 0);
  assert.equal(tricepsCount, chestCount * 0.5);
  assert.equal(demoVolume(samples, 7, now).weeks.flatMap((week) => week.items).reduce((total, item) => total + item.workingSets, 0), 37.5);
  assert.equal(demoSummary(samples, bench, "7", now).totalSets, samples.slice(0, 2).flatMap((workout) => workout.exercises[0]!.sets).length);
  assert.equal(demoVolume(samples, 7, now).weeks.flatMap((week) => week.items).some((item) => item.muscleGroup.slug === "triceps"), true);
});
test("finished practice contributes once and weight edits change progress and tonnage", () => {
  const practice = practiceWorkout(now);
  practice.endedAt = new Date(now + 60000).toISOString(); practice.isOpen = false;
  practice.exercises[0]!.sets = [{ ...samples[0]!.exercises[0]!.sets[1]!, id: "practice-set", weightKg: "80", reps: 5 }];
  const combined = [practice, ...samples];
  assert.equal(demoSummary(combined, bench, "all", now).totalSets, demoSummary(samples, bench, "all", now).totalSets + 1);
  assert.equal(demoSummary(combined, bench, "all", now).bestTopSet?.weightKg, "80");
  assert.equal(workoutSummary(practice).tonnageKg, "400.00");
  const working = (logs: typeof samples) => demoVolume(logs, 7, now).weeks.flatMap((week) => week.items).reduce((n, item) => n + item.workingSets, 0);
  assert.equal(working(combined), working(samples) + 1.5);
});
