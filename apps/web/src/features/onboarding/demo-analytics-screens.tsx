"use client";

import { useState, type ReactNode } from "react";
import { ProgressView } from "../progress/progress-screen";
import { initialProgressViewPreferences } from "../progress/progress-preferences";
import { VolumeView } from "../volume/volume-screen";
import type { VolumeWindowDays } from "../volume/volume-panels";
import { demoCompletedExercises, demoProgress, demoSummary, demoVolume } from "./demo-analytics";
import { useDemo, useDemoWorkouts } from "./demo-provider";

function loaded<T>(data: T) { return { data, isLoading: false, isError: false, error: null, refetch: () => undefined }; }

export function DemoProgressScreen(): ReactNode {
  const { state, record } = useDemo();
  const workouts = useDemoWorkouts();
  const exercises = demoCompletedExercises(workouts);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState(initialProgressViewPreferences);
  const id = selectedId ?? exercises[0]?.id ?? "";
  return <ProgressView completedExercises={loaded(exercises)} exercises={exercises} selectedId={id}
    onSelect={(id) => { setSelectedId(id); record("selectedLift"); }} progress={loaded(demoProgress(workouts, id))}
    allTimeSummary={loaded(demoSummary(workouts, id, "all", Date.now()))} rangeSummary={loaded(demoSummary(workouts, id, view.window, Date.now()))}
    onInspectPoint={() => record("inspectedPoint")} view={view} setView={(next) => {
      const resolved = typeof next === "function" ? next(view) : next;
      if (resolved.window !== view.window) record("changedWindow");
      setView(resolved);
    }} key={`progress-${state.entered}`} />;
}

export function DemoVolumeScreen(): ReactNode {
  const { record } = useDemo();
  const workouts = useDemoWorkouts();
  const [days, setDays] = useState<VolumeWindowDays>(7);
  const payload = demoVolume(workouts, days, Date.now());
  return <VolumeView volume={loaded(payload)} windowDays={days} setWindowDays={setDays}
    onSelectMuscle={(slug) => { if (payload.weeks.some((week) => week.items.some((item) => item.muscleGroup.slug === slug && item.workingSets > 0))) record("selectedMuscle"); }}
    workoutHref={(id) => `/help/demo/history/${id}`} />;
}
