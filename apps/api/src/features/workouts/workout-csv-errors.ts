export class TimeExerciseCsvError extends Error {
  constructor(readonly row: number) {
    super("This exercise records time. Use the time/cardio CSV.");
  }
}
