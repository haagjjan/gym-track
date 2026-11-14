"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "../../shared/api/client";
import { formatDay } from "../../shared/format";
import { ErrorState, Skeleton } from "../../shared/ui/ui";
import { ProgressExerciseSelector } from "../progress/progress-exercise-selector";
import { Segmented } from "../progress/progress-segmented";
import { progressTimeWindows, type ChartWindow } from "../progress/progress-selection";
import { TrackingChart } from "./tracking-chart";
import { trackingChoices, trackingDays, trackingEntries, type TrackingMetric } from "./tracking-progress-data";
import { TrackingProgressSummary } from "./tracking-progress-summary";
import type { TrackingPayload } from "./tracking-types";

export function TrackingProgress({ initialChoice = "", initialKind = "time", window, onWindowChange }: {
  initialChoice?: string; initialKind?: "time" | "cardio"; window: ChartWindow; onWindowChange: (window: ChartWindow) => void;
}): ReactNode {
  const query = useQuery({ queryKey: ["tracking-progress"], queryFn: () => apiFetch<TrackingPayload>("/api/tracking/progress") });
  const [choice, setChoice] = useState(initialChoice);
  const [metric, setMetric] = useState<TrackingMetric>("duration");
  const exercises = useMemo(() => query.data ? trackingChoices(query.data) : [], [query.data]);
  const selected = exercises.find((exercise) => exercise.id === choice) ?? (initialChoice ? exercises.find((exercise) => exercise.kind === initialKind) : undefined) ?? exercises[0];
  useEffect(() => {
    if (selected && choice !== selected.id) { setChoice(selected.id); setMetric("duration"); }
  }, [choice, selected]);
  const entries = useMemo(() => query.data && selected ? trackingEntries(query.data, selected.id) : [], [query.data, selected]);
  const rows = useMemo(() => trackingDays(entries, metric), [entries, metric]);
  return <section aria-label="Time and cardio progress" className="mx-auto max-w-5xl space-y-4 px-4 pb-8 pt-4 lg:px-6">
    {query.isError ? <ErrorState message="Couldn't load time and cardio progress." retry={() => void query.refetch()} /> : null}
    <div className="-mt-3 space-y-3 lg:mt-0 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
      <ProgressExerciseSelector exercises={exercises} isLoading={query.isLoading} onSelect={(id) => { setChoice(id); setMetric("duration"); }} selectedId={selected?.id ?? null} />
      <div className="space-y-3">
        {selected ? <TrackingProgressSummary entries={entries} kind={selected.kind} metric={metric} rows={rows} window={window} /> : null}
        <section>
          {selected ? <div className="mb-3 hidden px-1 lg:block"><h2 className="break-words text-title-2 text-text">{selected.name}</h2><p className="text-subhead text-text-secondary">{selected.category}, last trained {formatDay(selected.lastDoneAt)}</p></div> : null}
          <Segmented label="Time window" onChange={onWindowChange} options={progressTimeWindows} value={window} />
          <div className="mt-3 rounded-[var(--radius-card)] bg-surface px-2 py-2">
            {query.isLoading ? <Skeleton className="h-64" /> : selected ? <TrackingChart key={selected.id} kind={selected.kind} metric={metric} onMetricChange={setMetric} rows={rows} window={window} /> : <p className="py-6 text-center text-body text-text-secondary">Finish a workout with time sets or cardio to see progress.</p>}
          </div>
        </section>
      </div>
    </div>
  </section>;
}
