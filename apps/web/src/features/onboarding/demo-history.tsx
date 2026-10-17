"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { HistoryRow } from "../history/history-row";
import { Panel } from "../../shared/ui/ui";
import { formatKgValue } from "../../shared/format";
import { workoutSummary } from "./demo-data";
import { useDemo, useDemoWorkouts } from "./demo-provider";

export function DemoHistory({ workoutId }: { workoutId?: string | undefined }): ReactNode {
  const { record } = useDemo();
  const workouts = useDemoWorkouts();
  const [expanded, setExpanded] = useState<string | null>(null);
  const selected = workouts.find((workout) => workout.id === workoutId);
  // Opening a detail is an action; a bare visit to History never completes a lesson.
  useEffect(() => { if (selected) record("opened"); }, [selected, record]);
  if (workoutId) return <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-6">
    <Link className="inline-flex min-h-11 items-center text-cyan" href="/help/demo/history">← Example history</Link>
    {selected ? <>
      <h1 className="font-display text-2xl font-bold text-fg">{selected.title}</h1>
      {selected.exercises.map((entry) => <Panel key={entry.id}><h2 className="font-display text-lg font-bold text-fg">{entry.exercise.name}</h2><ul className="mt-3 space-y-2 text-sm text-fg-muted">{entry.sets.map((set) => <li className="rounded border border-outline-dim p-3" key={set.id}>{set.setOrder}. {formatKgValue(set.weightKg)} kg × {set.reps} reps · RIR {set.rir} · {set.setType}</li>)}</ul>{!entry.sets.length ? <p className="text-sm text-outline">No sets recorded.</p> : null}</Panel>)}
    </> : <p className="text-sm text-fg">This practice was reset. Choose one of the example logs from History.</p>}
  </div>;
  return <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-6">
    <h1 className="font-display text-2xl font-bold text-fg">Workout history</h1>
    <p className="text-sm text-fg-muted">{workouts.length} example workouts. Expand a row to see its sets.</p>
    <ul className="space-y-3">{workouts.map((workout) => <HistoryRow key={workout.id} detail={workout} detailHref={`/help/demo/history/${workout.id}`} isExpanded={expanded === workout.id}
      onToggle={() => { setExpanded((current) => current === workout.id ? null : workout.id); if (expanded !== workout.id) record("expanded"); }} workout={workoutSummary(workout)} />)}</ul>
  </div>;
}
