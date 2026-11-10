import type { WorkoutDetail } from "../../shared/api/types";
import { practiceWorkout, sampleWorkouts } from "./demo-data";
import type { DemoLessonId } from "./demo-lessons";

export interface DemoState {
  now: number;
  samples: WorkoutDetail[];
  practice: WorkoutDetail | null;
  entered: boolean;
  lesson: number | null;
  events: string[];
  copiedTemplateId: string | null;
}
export function initialDemoState(now: number): DemoState {
  return { now, samples: sampleWorkouts(now), practice: null, entered: false, lesson: null, events: [], copiedTemplateId: null };
}
/**
 * Sets the example up for a step, so each step can also be opened directly
 * from Help: Log needs an open workout, Finish needs one with a logged set,
 * Progress and Volume work from whatever has been logged.
 */
export function prepareLesson(state: DemoState, lesson: number): DemoState {
  let practice = state.practice;
  if (lesson === 0 && (!practice || !practice.isOpen)) practice = practiceWorkout(state.now);
  if (lesson === 1) {
    if (!practice || !practice.isOpen || practice.exercises.length === 0) practice = practiceWorkout(state.now);
    if (!practice.exercises.some((exercise) => exercise.sets.length)) {
      const exampleSet = state.samples[0]!.exercises[0]!.sets.find((set) => set.setType === "working")!;
      const prepared = practice;
      practice = { ...prepared, exercises: prepared.exercises.map((entry, index) => index === 0 ? {
        ...entry, sets: [{ ...exampleSet, id: "practice-prepared-set", setOrder: 1, createdAt: prepared.startedAt, updatedAt: prepared.startedAt }]
      } : entry) };
    }
  }
  return { ...state, entered: true, lesson, events: [], practice };
}
export function lessonSatisfied(id: DemoLessonId, events: string[]): boolean {
  const required: Record<DemoLessonId, string[]> = {
    log: ["logged"], finish: ["finished"], progress: ["inspectedPoint"], volume: ["selectedMuscle"]
  };
  return required[id].every((event) => events.includes(event));
}
