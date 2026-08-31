"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EmptyState, ErrorState, Panel, Skeleton } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import {
  useCompletedExercises,
  useExerciseProgress,
  useExerciseSummary
} from "../../shared/api/hooks";
import { shortDate } from "../../shared/format";
import { ProgressChart, type ChartWindow } from "./progress-chart";
import { ProgressExerciseSelector } from "./progress-exercise-selector";
import { RecentLogs } from "./progress-panels";
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
  { label: "MAX", value: "all" }
];

/**
 * Single-exercise strength analysis: pick one lift, read the trend, decide
 * what to load next time. Working sets drive the signal.
 */
export function ProgressScreen(): ReactNode {
  const completedExercises = useCompletedExercises();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState(initialProgressViewPreferences);
  const { window, mode: chartMode, showWeight, showReps } = view;

  const exercises = useMemo(
    () =>
      [...(completedExercises.data ?? [])].sort(
        (a, b) => new Date(b.lastDoneAt).getTime() - new Date(a.lastDoneAt).getTime()
      ),
    [completedExercises.data]
  );

  // Auto-select the most recently trained lift once data lands.
  useEffect(() => {
    if (selectedId === null && exercises.length > 0) {
      setSelectedId(exercises[0]?.id ?? null);
    }
  }, [exercises, selectedId]);

  const selected = exercises.find((exercise) => exercise.id === selectedId) ?? null;
  const progress = useExerciseProgress(selectedId);
  const summaryRange = useMemo(() => progressSummaryRange(window), [window]);
  const allTimeSummary = useExerciseSummary(selectedId);
  const rangeSummary = useExerciseSummary(selectedId, summaryRange);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-6">
      <header>
        <p className="label-caps text-outline">Analytics</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
          Progress analytics
        </h1>
      </header>

      {completedExercises.isError ? (
        <ErrorState
          message={errorMessage(
            completedExercises.error,
            "Tracked exercises could not be loaded."
          )}
          retry={() => void completedExercises.refetch()}
        />
      ) : null}

      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-4">
        <ProgressExerciseSelector exercises={exercises} isLoading={completedExercises.isLoading} onSelect={setSelectedId} selectedId={selectedId} />

        {/* ===== Analysis stack ===== */}
        <div className="space-y-4">
          <Panel
            accent="cyan"
            className="glass-cyan"
            eyebrow="Working sets over time"
            right={
              <div className="flex gap-1" role="radiogroup" aria-label="Time window">
                {timeWindows.map((item) => (
                  <button
                    aria-checked={window === item.value}
                    className={`min-h-8 cursor-pointer rounded border px-2.5 font-display text-[10px] font-bold tracking-[0.08em] transition-colors ${
                      window === item.value
                        ? "border-cyan bg-cyan/15 text-cyan"
                        : "border-outline-dim text-outline"
                    }`}
                    key={item.value}
                    onClick={() =>
                      setView((current) =>
                        updateProgressViewPreferences(current, { window: item.value })
                      )
                    }
                    role="radio"
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            }
          >
            <h2 className="break-words font-display text-lg font-bold tracking-tight text-fg">
              {selected?.name ?? "No lift selected"}
            </h2>
            <p className="text-[11px] uppercase tracking-[0.08em] text-outline">
              {selected
                ? `${selected.primaryMuscleGroup.name} // last trained ${shortDate(selected.lastDoneAt)}`
                : "Choose a lift from the selector."}
            </p>

            <div className="mt-4">
              {!selected ? (
                <EmptyState
                  message="Choose a lift above to see how it has progressed."
                  title="No lift selected"
                />
              ) : progress.isLoading ? (
                <Skeleton className="h-64" />
              ) : progress.isError ? (
                <ErrorState
                  message={errorMessage(progress.error, "Progress could not be loaded.")}
                  retry={() => void progress.refetch()}
                />
              ) : (
                <ProgressChart
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
          </Panel>

          {selected ? (
            <>
              <ProgressSummaryMetrics
                allTime={allTimeSummary.data}
                allTimeLoading={allTimeSummary.isLoading}
                range={rangeSummary.data}
                rangeLoading={rangeSummary.isLoading}
                window={window}
              />

              <Panel accent="none" eyebrow="Recent sets">
                <RecentLogs isLoading={progress.isLoading} items={progress.data ?? []} mode={chartMode} window={window} />
              </Panel>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
