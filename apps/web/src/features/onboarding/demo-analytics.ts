import type { CompletedExercise, ExerciseProgressItem, ExerciseSummaryPayload, WeeklyVolumePayload, WeeklyVolumeWeekItem, WorkoutDetail } from "../../shared/api/types";
import { selectBestWorkingSets, windowStart, type ChartWindow } from "../progress/progress-selection";

export function demoProgress(workouts: WorkoutDetail[], exerciseId: string): ExerciseProgressItem[] {
  return workouts.flatMap((workout) => workout.exercises.filter((entry) => entry.exercise.id === exerciseId).flatMap((entry) => entry.sets.map((set) => ({
    workoutId: workout.id, sessionExerciseId: entry.id, setId: set.id, sessionDate: workout.startedAt,
    setOrder: set.setOrder, setType: set.setType, weightKg: set.weightKg, reps: set.reps, rir: set.rir,
    estimatedOneRepMaxKg: (Number(set.weightKg) * (1 + set.reps / 30)).toFixed(2)
  }))));
}

export function demoCompletedExercises(workouts: WorkoutDetail[]): CompletedExercise[] {
  const exercises = new Map(workouts.flatMap((workout) => workout.exercises.map((entry) => [entry.exercise.id, entry.exercise] as const)));
  return [...exercises.values()].flatMap((exercise) => {
    const items = demoProgress(workouts, exercise.id);
    if (!items.length) return [];
    return [{ ...exercise, lastDoneAt: items.map((item) => item.sessionDate).sort().at(-1)!, totalSets: items.length,
      plottedSetCount: selectBestWorkingSets(items, "all", "loadReps").length }];
  });
}

export function demoSummary(workouts: WorkoutDetail[], exerciseId: string, window: ChartWindow, now: number): ExerciseSummaryPayload {
  const cutoff = windowStart(window, now);
  const sets = demoProgress(workouts, exerciseId).filter((set) => cutoff === null || new Date(set.sessionDate).getTime() >= cutoff);
  const best = sets.filter((set) => set.setType === "working").sort((a, b) => Number(b.estimatedOneRepMaxKg) - Number(a.estimatedOneRepMaxKg) || Number(b.weightKg) - Number(a.weightKg))[0];
  return { exerciseId, totalSets: sets.length, totalReps: sets.reduce((n, set) => n + set.reps, 0),
    totalVolumeKg: sets.reduce((n, set) => n + Number(set.weightKg) * set.reps, 0).toFixed(2),
    averageRir: sets.length ? Math.round(sets.reduce((n, set) => n + set.rir, 0) / sets.length * 10) / 10 : null, bestTopSet: best ?? null };
}

export function demoVolume(workouts: WorkoutDetail[], days: number, now: number): WeeklyVolumePayload {
  const start = new Date(now - days * 86_400_000).toISOString().slice(0, 10);
  const end = new Date(now).toISOString().slice(0, 10);
  const weeks = new Map<string, Map<string, WeeklyVolumeWeekItem>>();
  for (const workout of workouts) {
    if (workout.startedAt.slice(0, 10) < start || workout.startedAt.slice(0, 10) > end) continue;
    const weekDate = new Date(`${workout.startedAt.slice(0, 10)}T00:00:00Z`);
    weekDate.setUTCDate(weekDate.getUTCDate() - (weekDate.getUTCDay() + 6) % 7);
    const key = weekDate.toISOString().slice(0, 10);
    const week = weeks.get(key) ?? new Map<string, WeeklyVolumeWeekItem>();
    for (const entry of workout.exercises) {
      const workingSets = entry.sets.filter((set) => set.setType === "working").length;
      if (!workingSets) continue;
      const contributions = [
        ...entry.exercise.primaryMuscleGroups.map((muscle) => ({ muscle, credit: workingSets })),
        ...entry.exercise.secondaryMuscleGroups.map((muscle) => ({ muscle, credit: workingSets * 0.5 }))
      ];
      for (const { muscle, credit } of contributions) {
        const item = week.get(muscle.id) ?? { muscleGroup: muscle, workingSets: 0, exercises: [], recentSessions: [] };
        item.workingSets += credit;
        const exercise = item.exercises.find((value) => value.id === entry.exercise.id);
        if (exercise) exercise.workingSets += credit;
        else item.exercises.push({ id: entry.exercise.id, name: entry.exercise.name, workingSets: credit });
        const session = item.recentSessions.find((value) => value.workoutId === workout.id);
        if (session) session.workingSets += credit;
        else item.recentSessions.push({ workoutId: workout.id, sessionDate: workout.startedAt, workingSets: credit });
        week.set(muscle.id, item);
      }
    }
    if (week.size) weeks.set(key, week);
  }
  return { weeks: [...weeks].sort(([a], [b]) => a.localeCompare(b)).map(([weekStart, items]) => ({
    weekStart, weekEnd: new Date(new Date(`${weekStart}T00:00:00Z`).getTime() + 6 * 86_400_000).toISOString().slice(0, 10),
    items: [...items.values()].map((item) => ({ ...item, recentSessions: item.recentSessions.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate)).slice(0, 5) }))
  })) };
}
