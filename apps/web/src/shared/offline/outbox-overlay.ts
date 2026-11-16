import type { ListWorkoutsPayload, SessionExercise, WorkoutDetail, WorkoutSet, WorkoutSummary } from "../api/types";
import { resolveId, type OutboxOp, type OutboxState } from "./outbox-store";

/**
 * What the logger shows: the server copy of a workout with the phone's queued
 * changes applied on top. Applying a change twice has no further effect, so a
 * confirmed operation can stay in the list until the server copy is reloaded.
 */
export function overlayWorkout(base: WorkoutDetail | null, state: OutboxState, userId: string, workoutId: string): WorkoutDetail | null {
  const same = (left: string, right: string): boolean => left === right || resolveId(left, state.idMap) === resolveId(right, state.idMap);
  const ops = state.ops.filter((op) => op.userId === userId && same(op.workoutId, workoutId));
  let workout: WorkoutDetail | null = base;

  for (const op of ops) {
    if (op.kind === "startWorkout") {
      workout ??= { id: workoutId, title: null, workoutType: null, startedAt: op.startedAt, endedAt: null, isOpen: true, sourceTemplateId: null, exercises: [] };
      continue;
    }

    if (!workout) continue;
    if (op.kind === "deleteWorkout") return null;
    workout = applyOp(workout, op, same);
  }

  return workout;
}

function applyOp(workout: WorkoutDetail, op: OutboxOp, same: (left: string, right: string) => boolean): WorkoutDetail {
  const mapExercises = (change: (exercise: SessionExercise) => SessionExercise): WorkoutDetail => ({ ...workout, exercises: workout.exercises.map(change) });

  switch (op.kind) {
    case "updateWorkout":
      return { ...workout, ...op.input };
    case "endWorkout":
      return { ...workout, endedAt: op.endedAt, isOpen: false };
    case "addExercise":
      if (workout.exercises.some((exercise) => same(exercise.id, op.sessionExerciseId))) return workout;
      return {
        ...workout,
        exercises: [...workout.exercises, { id: op.sessionExerciseId, position: workout.exercises.length + 1, exercise: op.exercise, sets: [], previousPerformance: null }]
      };
    case "removeExercise":
      return { ...workout, exercises: workout.exercises.filter((exercise) => !same(exercise.id, op.sessionExerciseId)).map((exercise, index) => ({ ...exercise, position: index + 1 })) };
    case "reorderExercises": {
      const rank = (exercise: SessionExercise): number => {
        const index = op.order.findIndex((id) => same(id, exercise.id));
        return index === -1 ? op.order.length + exercise.position : index;
      };
      return { ...workout, exercises: [...workout.exercises].sort((left, right) => rank(left) - rank(right)).map((exercise, index) => ({ ...exercise, position: index + 1 })) };
    }
    case "addSet":
      return mapExercises((exercise) => {
        if (!same(exercise.id, op.sessionExerciseId) || exercise.sets.some((set) => same(set.id, op.setId))) return exercise;
        const set: WorkoutSet = { id: op.setId, setOrder: exercise.sets.length + 1, ...op.input, createdAt: op.queuedAt, updatedAt: op.queuedAt };
        return { ...exercise, sets: [...exercise.sets, set] };
      });
    case "updateSet":
      return mapExercises((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => same(set.id, op.setId) ? { ...set, ...op.input, updatedAt: op.queuedAt } : set)
      }));
    case "deleteSet":
      return mapExercises((exercise) => exercise.sets.some((set) => same(set.id, op.setId))
        ? { ...exercise, sets: exercise.sets.filter((set) => !same(set.id, op.setId)).map((set, index) => ({ ...set, setOrder: index + 1 })) }
        : exercise);
    default:
      return workout;
  }
}

function summarize(workout: WorkoutDetail): WorkoutSummary {
  const sets = workout.exercises.flatMap((exercise) => exercise.sets);
  const tonnage = sets.filter((set) => set.setType === "working").reduce((total, set) => total + Number(set.weightKg) * set.reps, 0);

  return {
    id: workout.id,
    title: workout.title,
    workoutType: workout.workoutType,
    startedAt: workout.startedAt,
    endedAt: workout.endedAt,
    isOpen: workout.isOpen,
    sourceTemplateId: workout.sourceTemplateId,
    totalExercises: workout.exercises.length,
    totalSets: sets.length,
    tonnageKg: String(tonnage),
    exercisePreview: workout.exercises.slice(0, 3).map(({ exercise }) => ({ id: exercise.id, name: exercise.name, equipment: exercise.equipment, exerciseType: exercise.exerciseType }))
  };
}

/**
 * The first page of the workout list with queued changes applied: workouts
 * started on the phone appear, finished ones close, discarded ones go.
 */
export function overlayWorkoutList(payload: ListWorkoutsPayload, state: OutboxState, userId: string): ListWorkoutsPayload {
  const ops = state.ops.filter((op) => op.userId === userId);

  if (ops.length === 0) return payload;

  const known = new Set(payload.items.map((item) => item.id));
  const started = ops
    .filter((op) => op.kind === "startWorkout" && !known.has(resolveId(op.workoutId, state.idMap)))
    .map((op) => overlayWorkout(null, state, userId, op.workoutId))
    .filter((workout): workout is WorkoutDetail => workout !== null)
    .map(summarize);
  const items = payload.items.flatMap((item) => {
    const touched = ops.filter((op) => resolveId(op.workoutId, state.idMap) === item.id);

    if (touched.some((op) => op.kind === "deleteWorkout")) return [];
    const ended = touched.find((op) => op.kind === "endWorkout");
    const renamed = touched.filter((op) => op.kind === "updateWorkout").at(-1);

    return [{
      ...item,
      ...(ended?.kind === "endWorkout" ? { endedAt: ended.endedAt, isOpen: false } : {}),
      ...(renamed?.kind === "updateWorkout" && renamed.input.title !== undefined ? { title: renamed.input.title } : {})
    }];
  });

  return { ...payload, items: [...started.reverse(), ...items] };
}
