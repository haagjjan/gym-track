export const demoLessons = [
  { id: "start", title: "Start a workout", path: "workout", instruction: "Use the Example full-body template to start an example workout." },
  { id: "log", title: "Log a set", path: "session", instruction: "Select an exercise, add a set and enter weight, reps and RIR." },
  { id: "finish", title: "Edit and finish", path: "session", instruction: "Open your saved set, change its weight, save, then finish the workout." },
  { id: "history", title: "Find your log", path: "history", instruction: "Open a workout to inspect its recorded sets." },
  { id: "progress", title: "Explore Progress", path: "progress", instruction: "Choose a lift, inspect a plotted day and change the time window." },
  { id: "volume", title: "Explore Volume", path: "volume", instruction: "Select a trained muscle on the body or in All muscles to see its working sets." }
] as const;
export type DemoLessonId = typeof demoLessons[number]["id"];
export function lessonFlag(id: DemoLessonId, skipped = false): string { return `demo_${id}_${skipped ? "skipped" : "completed"}`; }

export function currentInstruction(id: DemoLessonId, events: string[]): string {
  if (id === "finish") return events.includes("edited") ? "Now tap Finish, then Confirm finish, to complete the example workout." : "Tap a saved set, change its weight and save the edit.";
  if (id === "history") return events.includes("expanded") ? "Open a workout to inspect its recorded sets." : "Open a workout from the list to find its exercises and sets.";
  if (id === "progress") {
    if (!events.includes("selectedLift")) return "Choose a lift from the exercise list.";
    if (!events.includes("inspectedPoint")) return "Tap a chart point, or use Inspect plotted day, to see its values.";
    return "Change the time window above the chart to compare a different range.";
  }
  return demoLessons.find((lesson) => lesson.id === id)!.instruction;
}
