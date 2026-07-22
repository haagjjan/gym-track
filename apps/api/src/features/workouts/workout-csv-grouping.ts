import type {
  ParsedWorkoutCsvRow,
  WorkoutCsvError,
  WorkoutCsvExercise,
  WorkoutCsvWorkout
} from "./workout-csv.js";

interface WorkoutGroup {
  workout: WorkoutCsvWorkout;
  exercisesByPosition: Map<number, WorkoutCsvExercise>;
  setOrdersByExercise: Map<WorkoutCsvExercise, Set<number>>;
}

export function groupWorkoutCsvRows(
  rows: ParsedWorkoutCsvRow[]
): { ok: true; workouts: WorkoutCsvWorkout[] } | { ok: false; errors: WorkoutCsvError[] } {
  const groups = new Map<string, WorkoutGroup>();
  const errors: WorkoutCsvError[] = [];

  for (const row of rows) {
    const group = getWorkoutGroup(groups, row);
    const exercise = getExerciseGroup(group, row, errors);

    if (exercise) {
      addSet(group, exercise, row, errors);
    }
  }

  for (const group of groups.values()) {
    validateCompactOrders(group.workout, errors);
  }

  const workouts = [...groups.values()].map((group) => group.workout);
  return errors.length > 0 ? { ok: false, errors } : { ok: true, workouts };
}

function getWorkoutGroup(
  groups: Map<string, WorkoutGroup>,
  row: ParsedWorkoutCsvRow
): WorkoutGroup {
  const key = [
    row.workoutStartedAt.toISOString(),
    row.workoutEndedAt.toISOString(),
    row.workoutType ?? "",
    row.workoutTitle ?? "",
    row.workoutNotes ?? ""
  ].join("\u001f");
  const existing = groups.get(key);

  if (existing) {
    return existing;
  }

  const group: WorkoutGroup = {
    workout: {
      startedAt: row.workoutStartedAt,
      endedAt: row.workoutEndedAt,
      workoutType: row.workoutType,
      title: row.workoutTitle,
      notes: row.workoutNotes,
      exercises: []
    },
    exercisesByPosition: new Map(),
    setOrdersByExercise: new Map()
  };

  groups.set(key, group);
  return group;
}

function getExerciseGroup(
  group: WorkoutGroup,
  row: ParsedWorkoutCsvRow,
  errors: WorkoutCsvError[]
): WorkoutCsvExercise | null {
  const existing = group.exercisesByPosition.get(row.exercisePosition);

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
    group.workout.exercises.push(exercise);
    group.exercisesByPosition.set(exercise.position, exercise);
    group.setOrdersByExercise.set(exercise, new Set());
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
  group: WorkoutGroup,
  exercise: WorkoutCsvExercise,
  row: ParsedWorkoutCsvRow,
  errors: WorkoutCsvError[]
): void {
  const setOrders = group.setOrdersByExercise.get(exercise);

  if (!setOrders) {
    throw new Error("CSV exercise grouping index is missing.");
  }

  if (setOrders.has(row.setOrder)) {
    errors.push({
      row: row.row,
      field: "set_order",
      message: "set_order must be unique within an exercise."
    });
    return;
  }

  setOrders.add(row.setOrder);
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
