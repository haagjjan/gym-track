import assert from "node:assert/strict";
import { test } from "node:test";
import { demoLessons, lessonFlag } from "./demo-lessons";
import { initialDemoState, lessonSatisfied, prepareLesson } from "./demo-state";

const now = Date.parse("2026-09-29T12:00:00Z");
test("fresh and restarted demos have separate practice and preserve sample logs", () => {
  const initial = initialDemoState(now);
  assert.equal(initial.samples.length, 8);
  assert.equal(initial.entered, false);
  const editLesson = prepareLesson(initial, 2);
  assert.equal(editLesson.practice?.exercises[0]?.sets.length, 1);
  assert.equal(initial.practice, null);
  assert.deepEqual(editLesson.samples, initial.samples);
  assert.equal(prepareLesson(editLesson, 0).practice, null);
  assert.equal(initialDemoState(now).practice, null);
});
test("lessons require successful actions, not visits, and skipped flags are distinct", () => {
  for (const lesson of demoLessons) {
    assert.equal(lessonSatisfied(lesson.id, []), false);
    assert.notEqual(lessonFlag(lesson.id), lessonFlag(lesson.id, true));
  }
  assert.equal(lessonSatisfied("finish", ["finished"]), false);
  assert.equal(lessonSatisfied("finish", ["edited", "finished"]), true);
  assert.equal(lessonSatisfied("progress", ["selectedLift", "changedWindow"]), false);
  assert.equal(lessonSatisfied("progress", ["selectedLift", "inspectedPoint", "changedWindow"]), true);
  assert.equal(lessonSatisfied("history", ["expanded"]), false);
  assert.equal(lessonSatisfied("history", ["expanded", "opened"]), true);
});
