"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { dateRange } from "./analytics-date-range";
import { AnalyticsHeader } from "./analytics-header";
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
import { ExerciseSummary, ProgressTable } from "./analytics-widgets";
import { ProgressExerciseList, uniqueMuscleGroups } from "./progress-exercise-list";
import { ProgressTimeSeries } from "./progress-chart";

const timeWindows = [
  { label: "1W", value: "7" },
  { label: "2W", value: "14" },
  { label: "4W", value: "28" },
  { label: "3M", value: "90" },
  { label: "1Y", value: "365" },
  { label: "All", value: "all" }
] as const;

type TimeWindow = (typeof timeWindows)[number]["value"];

export function ProgressPage(): ReactNode {
  const [exercises, setExercises] = useState<CompletedExercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [selectedMuscleSlug, setSelectedMuscleSlug] = useState("");
  const [openMuscleSlug, setOpenMuscleSlug] = useState("");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("14");
  const [progress, setProgress] = useState<ExerciseProgressPayload | null>(null);
  const [summary, setSummary] = useState<ExerciseSummaryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const muscleGroups = useMemo(() => uniqueMuscleGroups(exercises), [exercises]);
  const selectedExercise = exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null;

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

    setExercises(result.data.items);
    setSelectedExerciseId(result.data.items[0]?.id ?? "");
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

  function chooseMuscle(slug: string): void {
    setSelectedMuscleSlug(slug);
    setOpenMuscleSlug(slug);
  }

  return (
    <main className="analyticsPage progressPage">
      <AnalyticsHeader
        eyebrow="Progress"
        links={[{ href: "/weekly-volume", label: "Weekly Volume" }]}
        title="Exercise progress"
      />
      {error ? <p className="formError analyticsMessage" role="alert">{error}</p> : null}
      <section className="analyticsSplit" aria-label="Exercise progress workspace">
        <aside className="analyticsPanel exerciseLibraryPanel" aria-label="Completed exercises">
          <div className="analyticsPanelHeader compactHeader">
            <div>
              <p className="eyebrow">Exercises done</p>
              <h2>Last trained first</h2>
            </div>
          </div>
          <label className="compactField">
            <span>Muscle group</span>
            <select value={selectedMuscleSlug} onChange={(event) => chooseMuscle(event.target.value)}>
              <option value="">Last done</option>
              {muscleGroups.map((muscle) => (
                <option key={muscle.slug} value={muscle.slug}>{muscle.name}</option>
              ))}
            </select>
          </label>
          {isLoadingExercises ? <p className="mutedText">Loading exercises.</p> : null}
          {!isLoadingExercises && exercises.length === 0 ? (
            <p className="mutedText">Log a workout to start seeing progress.</p>
          ) : null}
          <ProgressExerciseList
            exercises={exercises}
            muscleGroups={muscleGroups}
            openMuscleSlug={openMuscleSlug}
            selectedExerciseId={selectedExerciseId}
            selectedMuscleSlug={selectedMuscleSlug}
            onOpenMuscle={setOpenMuscleSlug}
            onSelectExercise={setSelectedExerciseId}
          />
        </aside>
        <section className="analyticsPanel progressDetailPanel" aria-labelledby="progress-detail-title">
          <div className="analyticsPanelHeader">
            <div>
              <p className="eyebrow">Selected exercise</p>
              <h2 id="progress-detail-title">{selectedExercise?.name ?? "No exercise selected"}</h2>
            </div>
            <div className="segmentedControl" aria-label="Time window">
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
          {isLoadingProgress ? <p className="mutedText">Loading progress.</p> : null}
          {summary ? <ExerciseSummary summary={summary} /> : null}
          {progress ? <ProgressTimeSeries items={progress.items} /> : null}
          {progress ? <ProgressTable items={progress.items} /> : null}
        </section>
      </section>
    </main>
  );
}
