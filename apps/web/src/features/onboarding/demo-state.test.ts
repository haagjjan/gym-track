import assert from "node:assert/strict";
import { test } from "node:test";
import { demoLessons, lessonFlag } from "./demo-lessons";
import { initialDemoState, lessonSatisfied, prepareLesson } from "./demo-state";

const now = Date.parse("2026-09-29T12:00:00Z");
test("each step prepares the example it needs and keeps the sample logs", () => {
  const initial = initialDemoState(now);
  assert.equal(initial.samples.length, 8);
  assert.equal(initial.entered, false);
  const log = prepareLesson(initial, 0);
  assert.equal(log.practice?.isOpen, true);
  assert.equal(log.practice?.exercises.every((entry) => entry.sets.length === 0), true);
  const finish = prepareLesson(initial, 1);
  assert.equal(finish.practice?.exercises[0]?.sets.length, 1);
  assert.equal(initial.practice, null);
  assert.deepEqual(finish.samples, initial.samples);
  assert.equal(prepareLesson(initial, 2).practice, null);
});
test("steps complete on the action they teach, and skipped flags are distinct", () => {
  for (const lesson of demoLessons) {
    assert.equal(lessonSatisfied(lesson.id, []), false);
    assert.notEqual(lessonFlag(lesson.id), lessonFlag(lesson.id, true));
  }
  assert.equal(lessonSatisfied("log", ["openedExercise"]), false);
  assert.equal(lessonSatisfied("log", ["openedExercise", "logged"]), true);
  assert.equal(lessonSatisfied("finish", ["finished"]), true);
  assert.equal(lessonSatisfied("progress", ["inspectedPoint"]), true);
  assert.equal(lessonSatisfied("volume", ["selectedMuscle"]), true);
});
