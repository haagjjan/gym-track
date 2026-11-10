/**
 * The tour covers only what the screens don't already say: the core loop of
 * logging a set, finishing (a two-tap confirm), and seeing that set show up
 * in Progress and Volume. Starting a workout (the pulsing centre tab), opening
 * History rows and editing a set explain themselves.
 *
 * Ids match the flags stored since the first tour (`demo_<id>_completed`).
 */
export const demoLessons = [
  { id: "log", title: "Log a set", path: "session" },
  { id: "finish", title: "Finish the workout", path: "session" },
  { id: "progress", title: "Check your progress", path: "progress" },
  { id: "volume", title: "See your muscle volume", path: "volume" }
] as const;
export type DemoLessonId = typeof demoLessons[number]["id"];
export function lessonFlag(id: DemoLessonId, skipped = false): string { return `demo_${id}_${skipped ? "skipped" : "completed"}`; }

/** One short instruction for where the user is in the step right now. */
export function currentInstruction(id: DemoLessonId, events: string[]): string {
  switch (id) {
    case "log":
      return events.includes("openedExercise") ? "Tap Add set, enter weight and reps, then save." : "Tap Barbell Bench Press to open it.";
    case "finish":
      return "Tap Finish workout at the bottom, then tap it again to confirm.";
    case "progress":
      return "Tap a day on the chart to see that session's best set.";
    case "volume":
      return "Tap a colored muscle to see how many sets it got.";
  }
}
