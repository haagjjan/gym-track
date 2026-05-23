import type {
  ParsedWorkoutCsvRow,
  WorkoutCsvError,
  WorkoutCsvExercise,
  WorkoutCsvWorkout
} from "./workout-csv.js";

export function groupWorkoutCsvRows(
  rows: ParsedWorkoutCsvRow[]
): { ok: true; workouts: WorkoutCsvWorkout[] } | { ok: false; errors: WorkoutCsvError[] } {
  const workouts = new Map<string, WorkoutCsvWorkout>();
  const errors: WorkoutCsvError[] = [];

  for (const row of rows) {
    const workout = getWorkoutGroup(workouts, row);
    const exercise = getExerciseGroup(workout, row, errors);

    if (exercise) {
      addSet(exercise, row, errors);
    }
  }

  for (const workout of workouts.values()) {
    validateCompactOrders(workout, errors);
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, workouts: [...workouts.values()] };
}

function getWorkoutGroup(
  workouts: Map<string, WorkoutCsvWorkout>,
  row: ParsedWorkoutCsvRow
): WorkoutCsvWorkout {
  const key = [
    row.workoutStartedAt.toISOString(),
    row.workoutEndedAt.toISOString(),
    row.workoutType ?? "",
    row.workoutTitle ?? "",
    row.workoutNotes ?? ""
  ].join("\u001f");
  const existing = workouts.get(key);

  if (existing) {
    return existing;
  }

  const workout: WorkoutCsvWorkout = {
    startedAt: row.workoutStartedAt,
    endedAt: row.workoutEndedAt,
    workoutType: row.workoutType,
    title: row.workoutTitle,
    notes: row.workoutNotes,
    exercises: []
  };

  workouts.set(key, workout);
  return workout;
}

function getExerciseGroup(
  workout: WorkoutCsvWorkout,
  row: ParsedWorkoutCsvRow,
  errors: WorkoutCsvError[]
): WorkoutCsvExercise | null {
  const existing = workout.exercises.find((item) => item.position === row.exercisePosition);

  if (!existing) {
    const exercise: WorkoutCsvExercise = {
      name: row.exerciseName,
      primaryMuscleGroupSlug: row.primaryMuscleGroupSlug,
      equipment: row.equipment,
      exerciseType: row.exerciseType,
      position: row.exercisePosition,
      row: row.row,
      sets: []
    };
    workout.exercises.push(exercise);
    return exercise;
  }

  if (existing.name.toLowerCase() !== row.exerciseName.toLowerCase()) {
    errors.push({
      row: row.row,
      field: "exercise_position",
      message: "Rows with the same exercise_position must use the same exercise."
    });
    return null;
  }

  return existing;
}

function addSet(
  exercise: WorkoutCsvExercise,
  row: ParsedWorkoutCsvRow,
  errors: WorkoutCsvError[]
): void {
  if (exercise.sets.some((set) => set.setOrder === row.setOrder)) {
    errors.push({
      row: row.row,
      field: "set_order",
      message: "set_order must be unique within an exercise."
    });
    return;
  }

  exercise.sets.push({
    setOrder: row.setOrder,
    setType: row.setType,
    weightKg: row.weightKg,
    reps: row.reps,
    rir: row.rir,
    restTimeSeconds: row.restTimeSeconds,
    note: row.setNote
  });
}

function validateCompactOrders(workout: WorkoutCsvWorkout, errors: WorkoutCsvError[]): void {
  workout.exercises.sort((left, right) => left.position - right.position);

  workout.exercises.forEach((exercise, index) => {
    if (exercise.position !== index + 1) {
      errors.push({
        row: exercise.row,
        field: "exercise_position",
        message: "exercise_position values must be compact starting at 1."
      });
    }

    exercise.sets.sort((left, right) => left.setOrder - right.setOrder);
    exercise.sets.forEach((set, setIndex) => {
      if (set.setOrder !== setIndex + 1) {
        errors.push({
          row: exercise.row,
          field: "set_order",
          message: "set_order values must be compact starting at 1 for each exercise."
        });
      }
    });
  });
}
