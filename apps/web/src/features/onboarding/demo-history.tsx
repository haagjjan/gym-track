"use client";

import { useEffect, type ReactNode } from "react";
import { HistoryRow } from "../history/history-row";
import { formatKgValue } from "../../shared/format";
import { workoutSummary } from "./demo-data";
import { useDemo, useDemoWorkouts } from "./demo-provider";

export function DemoHistory({ workoutId }: { workoutId?: string | undefined }): ReactNode {
  const { record } = useDemo();
  const workouts = useDemoWorkouts();
  const selected = workouts.find((workout) => workout.id === workoutId);
  // Opening a detail is an action; a bare visit to History never completes a lesson.
  useEffect(() => { if (selected) record("opened"); }, [selected, record]);
  if (workoutId) return <div className="mx-auto max-w-3xl space-y-6 px-4 py-4 lg:px-6">
    {selected ? <>
      <h1 className="text-title-1 text-text">{selected.title}</h1>
      {selected.exercises.map((entry) => <section key={entry.id}>
        <h2 className="mb-2 px-4 text-headline text-text">{entry.exercise.name}</h2>
        {entry.sets.length ? <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">{entry.sets.map((set) => <li className="flex min-h-11 items-center justify-between gap-3 px-4 py-2 text-body text-text" key={set.id}><span className="num">Set {set.setOrder}: {formatKgValue(set.weightKg)} kg × {set.reps}</span><span className="text-subhead text-text-secondary">RIR {set.rir}{set.setType === "warmup" ? ", warmup" : ""}</span></li>)}</ul> : <p className="px-4 text-body text-text-secondary">No sets recorded.</p>}
      </section>)}
    </> : <>
      <h1 className="text-title-1 text-text">Example workout</h1>
      <p className="text-body text-text-secondary">This example was reset. Go back to the example history and choose a workout.</p>
    </>}
  </div>;
  return <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 lg:px-6">
    <h1 className="text-title-1 text-text">Workout history</h1>
    <p className="text-body text-text-secondary">{workouts.length} example workouts. Tap one to see its sets.</p>
    <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">{workouts.map((workout) => <HistoryRow key={workout.id} detailHref={`/help/demo/history/${workout.id}`}
      onToggle={() => record("expanded")} workout={workoutSummary(workout)} />)}</ul>
  </div>;
}
