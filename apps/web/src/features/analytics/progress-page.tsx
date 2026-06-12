"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { dateRange } from "./analytics-date-range";
import {
  getExerciseProgress,
  getExerciseSummary,
  listCompletedExercises
} from "./analytics-api";
import type {
  CompletedExercise,
  ExerciseProgressPayload,
  ExerciseSummaryPayload
} from "./analytics-types";
import { ExerciseSummary, ProgressEmptyState, ProgressRecentLogs } from "./analytics-widgets";
import { ProgressTimeSeries } from "./progress-chart";
import {
  compareCompletedExerciseDesc,
  filterProgressExercises,
  shortProgressDate
} from "./progress-filters";
import { uniqueMuscleGroups } from "./progress-exercise-list";
import { ProgressSelectorPanel } from "./progress-selector-panel";

const timeWindows = [
  { label: "1W", value: "7" },
  { label: "1M", value: "30" },
  { label: "3M", value: "90" },
  { label: "MAX", value: "all" }
] as const;

type TimeWindow = (typeof timeWindows)[number]["value"];

export function ProgressPage(): ReactNode {
  const [exercises, setExercises] = useState<CompletedExercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [selectedMuscleSlug, setSelectedMuscleSlug] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("30");
  const [progress, setProgress] = useState<ExerciseProgressPayload | null>(null);
  const [summary, setSummary] = useState<ExerciseSummaryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const muscleGroups = useMemo(() => uniqueMuscleGroups(exercises), [exercises]);
  const filteredExercises = useMemo(
    () => filterProgressExercises(exercises, selectedMuscleSlug, searchQuery),
    [exercises, searchQuery, selectedMuscleSlug]
  );
  const selectedExercise = exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null;
  const selectedWindowLabel = timeWindows.find((item) => item.value === timeWindow)?.label ?? "MAX";

  const loadExercises = useCallback(async (signal: AbortSignal): Promise<void> => {
    const result = await listCompletedExercises(signal).catch(() => null);

    if (signal.aborted) {
      return;
    }

    setIsLoadingExercises(false);

    if (!result || !result.ok) {
      setError(result?.message ?? "Progress exercises could not be loaded.");
      return;
    }

    const nextExercises = [...result.data.items].sort(compareCompletedExerciseDesc);

    setExercises(nextExercises);
    setSelectedExerciseId(nextExercises[0]?.id ?? "");
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void loadExercises(controller.signal);

    return () => controller.abort();
  }, [loadExercises]);

  useEffect(() => {
    if (!selectedExerciseId) {
      return;
    }

    const controller = new AbortController();

    void loadProgress(selectedExerciseId, timeWindow, controller.signal);

    return () => controller.abort();
  }, [selectedExerciseId, timeWindow]);

  async function loadProgress(
    exerciseId: string,
    windowValue: TimeWindow,
    signal: AbortSignal
  ): Promise<void> {
    setIsLoadingProgress(true);
    setError(null);
    setProgress(null);
    setSummary(null);

    const range = windowValue === "all" ? {} : dateRange(Number(windowValue));
    const [progressResult, summaryResult] = await Promise.all([
      getExerciseProgress(exerciseId, { ...range, signal }),
      getExerciseSummary(exerciseId, { ...range, signal })
    ]).catch(() => [null, null] as const);

    if (signal.aborted) {
      return;
    }

    setIsLoadingProgress(false);

    if (!progressResult || !progressResult.ok) {
      setError(progressResult?.message ?? "Progress could not be loaded.");
      return;
    }

    if (!summaryResult || !summaryResult.ok) {
      setError(summaryResult?.message ?? "Progress could not be loaded.");
      return;
    }

    setProgress(progressResult.data);
    setSummary(summaryResult.data);
  }

  function clearFilters(): void {
    setSearchQuery("");
    setSelectedMuscleSlug("");
  }

  return (
    <main className="analyticsPage progressPage">
      <header className="progressHero">
        <div>
          <nav className="pageNav" aria-label="Analytics navigation">
            <Link className="backLink" href="/">Home</Link>
            <Link className="backLink" href="/workouts">History</Link>
            <Link className="backLink" href="/weekly-volume">Weekly Volume</Link>
          </nav>
          <p className="eyebrow">Evolution analysis</p>
          <h1>Progress analytics</h1>
          <p className="leadText">
            Pick one lift, read the trend, then decide what to load next time.
          </p>
        </div>
        <div className="progressHeroBadge" aria-label="Progress mode">
          <span>WORKING_SET_SIGNAL</span>
          <strong>{selectedExercise?.name ?? "Select exercise"}</strong>
        </div>
      </header>

      {error ? <p className="formError analyticsMessage" role="alert">{error}</p> : null}

      <section className="progressWorkspace" aria-label="Exercise progress workspace">
        <ProgressSelectorPanel
          exercises={exercises}
          filteredExercises={filteredExercises}
          isLoadingExercises={isLoadingExercises}
          muscleGroups={muscleGroups}
          onClearFilters={clearFilters}
          onSearchQueryChange={setSearchQuery}
          onSelectExercise={setSelectedExerciseId}
          onSelectMuscle={setSelectedMuscleSlug}
          searchQuery={searchQuery}
          selectedExerciseId={selectedExerciseId}
          selectedMuscleSlug={selectedMuscleSlug}
        />

        <section className="progressAnalysisStack" aria-labelledby="progress-detail-title">
          <div className="progressStageHeader">
            <div>
              <p className="eyebrow">Selected exercise</p>
              <h2 id="progress-detail-title">{selectedExercise?.name ?? "No exercise selected"}</h2>
              <p>
                {selectedExercise
                  ? `${selectedExercise.primaryMuscleGroup.name} · last trained ${shortProgressDate(selectedExercise.lastDoneAt)}`
                  : "Select an exercise to inspect its strength signal."}
              </p>
            </div>
            <div className="progressRangeTabs" aria-label="Time window">
              {timeWindows.map((item) => (
                <button
                  aria-pressed={timeWindow === item.value}
                  key={item.value}
                  onClick={() => setTimeWindow(item.value)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {!selectedExercise ? (
            <ProgressEmptyState
              title="NO_EXERCISE_SELECTED"
              message="Choose a completed movement from the selector to start analysis."
            />
          ) : (
            <>
              <ExerciseSummary
                isLoading={isLoadingProgress}
                items={progress?.items ?? []}
                selectedWindowLabel={selectedWindowLabel}
                summary={summary}
              />
              <ProgressTimeSeries
                exerciseName={selectedExercise.name}
                isLoading={isLoadingProgress}
                items={progress?.items ?? []}
                selectedWindowLabel={selectedWindowLabel}
              />
              {!isLoadingProgress ? (
                <ProgressRecentLogs
                  exerciseName={selectedExercise.name}
                  items={progress?.items ?? []}
                  selectedWindowLabel={selectedWindowLabel}
                />
              ) : null}
            </>
          )}
        </section>
      </section>
    </main>
  );
}
