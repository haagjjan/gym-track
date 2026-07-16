"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getExerciseSummary,
  getWeeklyVolume,
  listCompletedExercises
} from "../analytics/analytics-api";
import { dateRange } from "../analytics/analytics-date-range";
import type {
  CompletedExercise,
  ExerciseSummaryPayload,
  WeeklyVolumePayload
} from "../analytics/analytics-types";
import { listWorkouts } from "../workouts/workout-api";
import type { DashboardData, PerformanceSignal, VolumeBar } from "./dashboard-types";
import { emptyDashboardData } from "./dashboard-types";

const dashboardVolumeGroups = [
  { name: "Chest", slug: "chest", sourceSlugs: ["chest"] },
  { name: "Back", slug: "back", sourceSlugs: ["back", "traps"] },
  { name: "Shoulders", slug: "shoulders", sourceSlugs: ["shoulders"] },
  { name: "Arms", slug: "arms", sourceSlugs: ["biceps", "triceps", "forearms"] },
  { name: "Core", slug: "core", sourceSlugs: ["abs"] },
  { name: "Legs", slug: "legs", sourceSlugs: ["quads", "hamstrings", "glutes", "calves"] }
];

interface DashboardState {
  data: DashboardData;
  error: string | null;
  isLoading: boolean;
}

export function useDashboardData(): DashboardState {
  const [data, setData] = useState<DashboardData>(emptyDashboardData);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const range = useMemo(() => dateRange(7), []);

  const loadDashboard = useCallback(async (signal: AbortSignal): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const [workoutResult, exerciseResult, volumeResult] = await Promise.all([
        listWorkouts({ limit: 6, offset: 0, signal }),
        listCompletedExercises(signal),
        getWeeklyVolume({ ...range, signal })
      ]);

      if (signal.aborted) {
        return;
      }

      const completedExercises = exerciseResult.ok ? exerciseResult.data.items : [];
      const summaryResults = await Promise.all(
        completedExercises
          .slice(0, 3)
          .map((exercise) => getExerciseSummary(exercise.id, { ...range, signal }).catch(() => null))
      );

      if (signal.aborted) {
        return;
      }

      const messages = [workoutResult, exerciseResult, volumeResult]
        .filter((result) => !result.ok)
        .map((result) => result.message);

      setData({
        completedExercises,
        exerciseSummaries: summaryResults
          .filter((result): result is { ok: true; data: ExerciseSummaryPayload } => result?.ok === true)
          .map((result) => result.data),
        weeklyVolume: volumeResult.ok ? volumeResult.data : null,
        workouts: workoutResult.ok ? workoutResult.data.items : []
      });
      setError(messages[0] ?? null);
    } catch {
      if (!signal.aborted) {
        setError("Dashboard telemetry could not be loaded.");
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [range]);

  useEffect(() => {
    const controller = new AbortController();

    void loadDashboard(controller.signal);

    return () => controller.abort();
  }, [loadDashboard]);

  return { data, error, isLoading };
}

export function performanceFromData(
  exercises: CompletedExercise[],
  summaries: ExerciseSummaryPayload[]
): PerformanceSignal[] {
  return exercises.slice(0, 3).map((exercise) => {
    const summary = summaries.find((item) => item.exerciseId === exercise.id);
    const topSet = summary?.bestTopSet;

    if (topSet) {
      return {
        detail: `${topSet.weightKg}kg x ${topSet.reps} reps / ${shortDate(topSet.sessionDate)}`,
        id: exercise.id,
        name: exercise.name,
        value: `${formatKg(topSet.estimatedOneRepMaxKg)} KG`
      };
    }

    return {
      detail: `${shortDate(exercise.lastDoneAt)} / ${exercise.primaryMuscleGroup.name}`,
      id: exercise.id,
      name: exercise.name,
      value: `${exercise.totalSets} SETS`
    };
  });
}

export function weeklyVolumeBars(volume: WeeklyVolumePayload | null): VolumeBar[] {
  const latestWeek = volume?.weeks.reduce<WeeklyVolumePayload["weeks"][number] | null>(
    (latest, week) => {
      if (!latest || new Date(week.weekStart) > new Date(latest.weekStart)) {
        return week;
      }

      return latest;
    },
    null
  );

  const setsBySlug = new Map(
    (latestWeek?.items ?? []).map((item) => [item.muscleGroup.slug, item.workingSets])
  );

  return dashboardVolumeGroups.map((group) => ({
    name: group.name,
    slug: group.slug,
    workingSets: group.sourceSlugs.reduce(
      (total, slug) => total + (setsBySlug.get(slug) ?? 0),
      0
    )
  }));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(new Date(value));
}

export function shortDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short"
  }).format(new Date(value));
}

function formatKg(value: string): string {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return value;
  }

  return parsed.toFixed(parsed % 1 === 0 ? 0 : 1);
}
