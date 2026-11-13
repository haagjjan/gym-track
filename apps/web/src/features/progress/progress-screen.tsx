"use client";

import { TrackingProgress } from "../tracking/tracking-progress";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { CompletedExercise, ExerciseProgressItem, ExerciseSummaryPayload } from "../../shared/api/types";
import type { ProgressViewPreferences } from "./progress-preferences";
import { ErrorState, Skeleton } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import {
  useCompletedExercises,
  useExerciseProgress,
  useExerciseSummary
} from "../../shared/api/hooks";
import { formatDay } from "../../shared/format";
import { ProgressChart, type ChartWindow } from "./progress-chart";
import { ProgressExerciseSelector } from "./progress-exercise-selector";
import { Segmented } from "./progress-segmented";
import {
  initialProgressViewPreferences,
  updateProgressViewPreferences
} from "./progress-preferences";
import { ProgressSummaryMetrics } from "./progress-summary-metrics";
import { progressSummaryRange } from "./progress-summary";

const timeWindows: { label: string; value: ChartWindow }[] = [
  { label: "1W", value: "7" },
  { label: "1M", value: "30" },
  { label: "3M", value: "90" },
  { label: "Max", value: "all" }
];

/**
 * Single-exercise strength analysis: pick one exercise, read the trend, decide
 * what to load next time. Working sets drive the signal.
 */
export function ProgressScreen({ extendedTracking = false }: { extendedTracking?: boolean }): ReactNode {
  const completedExercises = useCompletedExercises();
  // `?exercise=<id>` opens that exercise (the shortcut from the workout logger).
  const requestedId = useSearchParams().get("exercise");
  const [selectedId, setSelectedId] = useState<string | null>(requestedId);
  const [trackingView, setTrackingView] = useState<"strength" | "extended">("strength");
  const [view, setView] = useState(initialProgressViewPreferences);
  const { window } = view;

  const exercises = useMemo(
    () =>
      [...(completedExercises.data ?? [])].sort(
        (a, b) => new Date(b.lastDoneAt).getTime() - new Date(a.lastDoneAt).getTime()
      ),
    [completedExercises.data]
  );

  // Auto-select the most recently trained exercise once data lands, or when
  // the requested one has no logged sets yet.
  useEffect(() => {
    if (exercises.length === 0) return;
    if (selectedId === null || (completedExercises.isSuccess && !exercises.some((exercise) => exercise.id === selectedId))) {
      setSelectedId(exercises[0]?.id ?? null);
    }
  }, [completedExercises.isSuccess, exercises, selectedId]);

  const progress = useExerciseProgress(selectedId);
  const summaryRange = useMemo(() => progressSummaryRange(window), [window]);
  const allTimeSummary = useExerciseSummary(selectedId);
  const rangeSummary = useExerciseSummary(selectedId, summaryRange);

  const strength = <ProgressView hideTitle={extendedTracking} completedExercises={completedExercises} exercises={exercises} selectedId={selectedId} onSelect={setSelectedId}
    progress={progress} allTimeSummary={allTimeSummary} rangeSummary={rangeSummary} view={view} setView={setView} />;
  if (!extendedTracking) return strength;
  return <>
    <div className="mx-auto max-w-5xl space-y-4 px-4 pt-4 lg:px-6">
      <h1 className="text-large-title text-text">Progress</h1>
      <Segmented label="Progress tracking" onChange={setTrackingView} options={[{ value: "strength", label: "Strength" }, { value: "extended", label: "Time and cardio" }]} value={trackingView} />
    </div>
    {trackingView === "strength" ? strength : <div className="mx-auto max-w-5xl px-4 pb-8 lg:px-6"><TrackingProgress /></div>}
  </>;

}

interface ViewQuery<T> { data: T | undefined; isLoading: boolean; isError: boolean; error: Error | null; refetch: () => unknown; }
export function ProgressView({ hideTitle = false, completedExercises, exercises, selectedId, onSelect, progress, allTimeSummary, rangeSummary, view, setView, onInspectPoint, autoCollapseSelector = true }: {
  hideTitle?: boolean;
  autoCollapseSelector?: boolean;
  completedExercises: ViewQuery<CompletedExercise[]>; exercises: CompletedExercise[]; selectedId: string | null;
  onSelect: (id: string) => void; progress: ViewQuery<ExerciseProgressItem[]>;
  allTimeSummary: Pick<ViewQuery<ExerciseSummaryPayload>, "data" | "isLoading">; rangeSummary: Pick<ViewQuery<ExerciseSummaryPayload>, "data" | "isLoading">;
  view: ProgressViewPreferences; setView: Dispatch<SetStateAction<ProgressViewPreferences>>; onInspectPoint?: (date: string) => void;
}): ReactNode {
  const selected = exercises.find((exercise) => exercise.id === selectedId) ?? null;
  const { window, mode: chartMode, showWeight, showReps } = view;

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 pb-8 pt-4 lg:px-6">
      {!hideTitle ? <h1 className="text-large-title text-text">Progress</h1> : null}

      {completedExercises.isError ? (
        <ErrorState
          message={errorMessage(
            completedExercises.error,
            "Couldn't load your exercises. Check your connection and try again."
          )}
          retry={() => void completedExercises.refetch()}
        />
      ) : null}

      <div className="-mt-3 space-y-3 lg:mt-0 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
        <ProgressExerciseSelector exercises={exercises} inline={!autoCollapseSelector} isLoading={completedExercises.isLoading} onSelect={onSelect} selectedId={selectedId} />

        <div className="space-y-3">
          {/* Summary first: always on screen without scrolling. */}
          {selected ? (
            <>
              <ProgressSummaryMetrics
                allTime={allTimeSummary.data}
                allTimeLoading={allTimeSummary.isLoading}
                range={rangeSummary.data}
                rangeLoading={rangeSummary.isLoading}
                window={window}
              />

            </>
          ) : null}
          <section>
            {selected ? (
              <div className="mb-3 hidden px-1 lg:block">
                <h2 className="break-words text-title-2 text-text">{selected.name}</h2>
                <p className="text-subhead text-text-secondary">
                  {selected.primaryMuscleGroup.name}, last trained {formatDay(selected.lastDoneAt)}
                </p>
              </div>
            ) : null}

            <div>
              <Segmented label="Time window" onChange={(next: ChartWindow) => setView((current) => updateProgressViewPreferences(current, { window: next }))} options={timeWindows} value={window} />
            </div>

            <div className="mt-3 rounded-[var(--radius-card)] bg-surface px-2 py-2">
              {!selected ? (
                completedExercises.isLoading ? <Skeleton className="h-64" /> : (
                  <p className="py-6 text-center text-body text-text-secondary">Choose an exercise to see how it has progressed.</p>
                )
              ) : progress.isLoading ? (
                <Skeleton className="h-64" />
              ) : progress.isError ? (
                <ErrorState
                  message={errorMessage(progress.error, "Couldn't load progress. Check your connection and try again.")}
                  retry={() => void progress.refetch()}
                />
              ) : (
                <ProgressChart
                  onInspectPoint={onInspectPoint}
                  items={progress.data ?? []}
                  mode={chartMode}
                  onModeChange={(mode) =>
                    setView((current) => updateProgressViewPreferences(current, { mode }))
                  }
                  onShowRepsChange={(next) =>
                    setView((current) =>
                      updateProgressViewPreferences(current, { showReps: next })
                    )
                  }
                  onShowWeightChange={(next) =>
                    setView((current) =>
                      updateProgressViewPreferences(current, { showWeight: next })
                    )
                  }
                  showReps={showReps}
                  showWeight={showWeight}
                  window={window}
                />
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
