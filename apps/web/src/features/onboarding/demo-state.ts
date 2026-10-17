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
export function prepareLesson(state: DemoState, lesson: number): DemoState {
  let practice = lesson === 0 ? null : state.practice;
  if ((lesson === 1 || lesson === 2) && (!practice || !practice.isOpen)) practice = practiceWorkout(state.now);
  if (lesson === 2 && practice?.exercises.length === 0) practice = practiceWorkout(state.now);
  if (lesson === 2 && practice && !practice.exercises.some((exercise) => exercise.sets.length)) {
    const exampleSet = state.samples[0]!.exercises[0]!.sets.find((set) => set.setType === "working")!;
    practice = { ...practice, exercises: practice.exercises.map((entry, index) => index === 0 ? {
      ...entry, sets: [{ ...exampleSet, id: "practice-prepared-set", setOrder: 1, createdAt: practice!.startedAt, updatedAt: practice!.startedAt }]
    } : entry) };
  }
  return { ...state, entered: true, lesson, events: [], practice };
}
export function lessonSatisfied(id: DemoLessonId, events: string[]): boolean {
  const required: Record<DemoLessonId, string[]> = {
    start: ["started"], log: ["logged"], finish: ["edited", "finished"],
    history: ["expanded", "opened"], progress: ["selectedLift", "inspectedPoint", "changedWindow"], volume: ["selectedMuscle"]
  };
  return required[id].every((event) => events.includes(event));
}
