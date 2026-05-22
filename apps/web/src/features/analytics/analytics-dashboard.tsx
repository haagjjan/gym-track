"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LogoutButton } from "../auth/logout-button";
import {
  getExerciseProgress,
  getExerciseSummary,
  getWeeklyVolume,
  listExercises
} from "./analytics-api";
import type {
  Exercise,
  ExerciseProgressPayload,
  ExerciseSummaryPayload,
  WeeklyVolumePayload
} from "./analytics-types";
import {
  ExerciseSummary,
  ProgressChart,
  ProgressTable,
  WeeklyVolumeChart
} from "./analytics-widgets";

export function AnalyticsDashboard(): ReactNode {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [progress, setProgress] = useState<ExerciseProgressPayload | null>(null);
  const [summary, setSummary] = useState<ExerciseSummaryPayload | null>(null);
  const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolumePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);
  const [isLoadingExerciseAnalytics, setIsLoadingExerciseAnalytics] = useState(false);
  const [isLoadingWeeklyVolume, setIsLoadingWeeklyVolume] = useState(true);
  const exerciseRange = useMemo(() => dateRange(90), []);
  const weeklyRange = useMemo(() => dateRange(56), []);

  const loadExercises = useCallback(async (signal: AbortSignal): Promise<void> => {
    const result = await listExercises(signal).catch(() => null);

    if (signal.aborted) {
      return;
    }

    setIsLoadingExercises(false);

    if (!result || !result.ok) {
      setError(result?.message ?? "Exercises could not be loaded.");
      return;
    }

    setExercises(result.data.items);
    setSelectedExerciseId(result.data.items[0]?.id ?? "");
  }, []);

  const loadExerciseAnalytics = useCallback(async (exerciseId: string, signal: AbortSignal): Promise<void> => {
    setIsLoadingExerciseAnalytics(true);
    setError(null);

    const [progressResult, summaryResult] = await Promise.all([
      getExerciseProgress(exerciseId, { ...exerciseRange, signal }),
      getExerciseSummary(exerciseId, { ...exerciseRange, signal })
    ]).catch(() => [null, null] as const);

    if (signal.aborted) {
      return;
    }

    setIsLoadingExerciseAnalytics(false);

    if (!progressResult || !progressResult.ok) {
      setError(progressResult?.message ?? "Exercise analytics could not be loaded.");
      return;
    }

    if (!summaryResult || !summaryResult.ok) {
      setError(summaryResult?.message ?? "Exercise analytics could not be loaded.");
      return;
    }

    setProgress(progressResult.data);
    setSummary(summaryResult.data);
  }, [exerciseRange]);

  const loadWeeklyVolume = useCallback(async (signal: AbortSignal): Promise<void> => {
    const result = await getWeeklyVolume({ ...weeklyRange, signal }).catch(() => null);

    if (signal.aborted) {
      return;
    }

    setIsLoadingWeeklyVolume(false);

    if (!result || !result.ok) {
      setError(result?.message ?? "Weekly volume could not be loaded.");
      return;
    }

    setWeeklyVolume(result.data);
  }, [weeklyRange]);

  useEffect(() => {
    const controller = new AbortController();

    void loadExercises(controller.signal);
    void loadWeeklyVolume(controller.signal);

    return () => controller.abort();
  }, [loadExercises, loadWeeklyVolume]);

  useEffect(() => {
    if (!selectedExerciseId) {
      return;
    }

    const controller = new AbortController();

    void loadExerciseAnalytics(selectedExerciseId, controller.signal);

    return () => controller.abort();
  }, [loadExerciseAnalytics, selectedExerciseId]);

  return (
    <main className="analyticsPage">
      <header className="analyticsHeader">
        <div>
          <nav className="pageNav" aria-label="Analytics navigation">
            <Link className="backLink" href="/">
              Home
            </Link>
            <Link className="backLink" href="/workouts">
              History
            </Link>
          </nav>
          <p className="eyebrow">Analytics</p>
          <h1>Training progress</h1>
        </div>
        <LogoutButton />
      </header>

      {error ? (
        <p className="formError analyticsMessage" role="alert">
          {error}
        </p>
      ) : null}

      <section className="analyticsPanel" aria-labelledby="exercise-progress-title">
        <div className="analyticsPanelHeader">
          <div>
            <p className="eyebrow">Exercise progress</p>
            <h2 id="exercise-progress-title">Progress by exercise</h2>
          </div>
          <label className="compactField exerciseSelect">
            <span>Exercise</span>
            <select
              value={selectedExerciseId}
              onChange={(event) => setSelectedExerciseId(event.target.value)}
              disabled={isLoadingExercises || exercises.length === 0}
            >
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoadingExercises || isLoadingExerciseAnalytics ? (
          <p className="mutedText">Loading exercise analytics.</p>
        ) : null}

        {!isLoadingExercises && exercises.length === 0 ? (
          <p className="mutedText">No exercises available yet.</p>
        ) : null}

        {summary ? <ExerciseSummary summary={summary} /> : null}
        {progress ? <ProgressChart items={progress.items} /> : null}
        {progress ? <ProgressTable items={progress.items} /> : null}
      </section>

      <section className="analyticsPanel" aria-labelledby="weekly-volume-title">
        <div className="analyticsPanelHeader">
          <div>
            <p className="eyebrow">Weekly volume</p>
            <h2 id="weekly-volume-title">Working sets by muscle</h2>
          </div>
        </div>

        {isLoadingWeeklyVolume ? <p className="mutedText">Loading weekly volume.</p> : null}
        {weeklyVolume ? <WeeklyVolumeChart volume={weeklyVolume} /> : null}
      </section>
    </main>
  );
}

function dateRange(days: number): { endDate: string; startDate: string } {
  const end = new Date();
  const start = new Date();

  start.setUTCDate(start.getUTCDate() - days);

  return {
    startDate: dateOnly(start),
    endDate: dateOnly(end)
  };
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
