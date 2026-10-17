"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { SessionExercise, SetInput, WorkoutDetail } from "../../shared/api/types";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { HudButton, Panel } from "../../shared/ui/ui";
import { SessionHeader } from "../session/session-header";
import { SessionExerciseList } from "../session/session-exercise-list";
import { SessionModeNavigation } from "../session/session-mode-navigation";
import { CompletedWorkoutSummary } from "../session/session-completion-summary";
import { calculateSessionTotals, SessionStats } from "../session/session-screen-support";
import { DemoSetPanel } from "./demo-set-panel";
import { demoExercises, practiceWorkout } from "./demo-data";
import { useDemo } from "./demo-provider";

export function DemoSession(): ReactNode {
  const { state, setState, record } = useDemo();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [discard, setDiscard] = useState(false);
  const workout = state.practice;
  const active = workout?.exercises.find((entry) => entry.id === activeId) ?? null;
  function update(change: (current: WorkoutDetail) => WorkoutDetail): void {
    setState((current) => current.practice ? { ...current, practice: change(current.practice) } : current);
  }
  function saveSet(exerciseId: string, input: SetInput, setId?: string): void {
    const now = new Date().toISOString();
    const previous = workout?.exercises.find((entry) => entry.id === exerciseId)?.sets.find((set) => set.id === setId);
    const changed = previous && (Number(input.weightKg) !== Number(previous.weightKg) || input.reps !== previous.reps || input.rir !== previous.rir || input.setType !== previous.setType || input.note !== previous.note);
    update((current) => ({ ...current, exercises: current.exercises.map((entry) => entry.id !== exerciseId ? entry : {
      ...entry, sets: setId ? entry.sets.map((set) => set.id === setId ? { ...set, ...input, updatedAt: now } : set) :
        [...entry.sets, { ...input, id: crypto.randomUUID(), setOrder: entry.sets.length + 1, createdAt: now, updatedAt: now }]
    }) }));
    if (!setId) record("logged");
    else if (changed) record("edited");
  }
  function reorder(fromId: string, toId: string): void {
    update((current) => {
      const entries = [...current.exercises];
      const from = entries.findIndex((entry) => entry.id === fromId);
      const to = entries.findIndex((entry) => entry.id === toId);
      if (from < 0 || to < 0) return current;
      entries.splice(to, 0, entries.splice(from, 1)[0]!);
      return { ...current, exercises: entries.map((entry, index) => ({ ...entry, position: index + 1 })) };
    });
  }
  if (!workout) return <Panel><p className="text-sm text-fg">Start an example workout first.</p><Link className="inline-flex min-h-11 items-center text-cyan" href="/help/demo/workout">Open Workout →</Link></Panel>;
  const totals = calculateSessionTotals(workout.exercises);
  return <div>
    <SessionHeader backHref="/help/demo/history" backLabel="Back to example history" focusName={false} isEnding={false} isOpen={workout.isOpen} isRenaming={false}
      onDelete={() => setDiscard(true)} onEnd={() => { update((current) => ({ ...current, isOpen: false, endedAt: new Date().toISOString() })); record("finished"); }}
      onRename={(title) => update((current) => ({ ...current, title }))} startedAt={workout.startedAt} title={workout.title} />
    <div className="mx-auto grid max-w-5xl gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0 space-y-4">
        {!workout.isOpen && workout.endedAt ? <CompletedWorkoutSummary example totals={totals} workout={{ ...workout, endedAt: workout.endedAt }} /> : null}
        {active ? <>
          <SessionModeNavigation exerciseName={active.exercise.name} onBack={() => setActiveId(null)}
            onNext={() => selectRelative(1)} onPrevious={() => selectRelative(-1)} position={workout.exercises.indexOf(active)} total={workout.exercises.length} />
          <DemoSetPanel exercise={active} key={active.id} onSave={(input, setId) => saveSet(active.id, input, setId)} workout={workout}
            onDelete={(setId) => update((current) => ({ ...current, exercises: current.exercises.map((entry) => entry.id !== active.id ? entry : { ...entry, sets: entry.sets.filter((set) => set.id !== setId).map((set, index) => ({ ...set, setOrder: index + 1 })) }) }))} />
        </> : <SessionExerciseList activeId={null} canEdit={workout.isOpen} exercises={workout.exercises} isReordering={false} onAdd={() => setAdding(true)} onReorder={reorder} onSelect={setActiveId} />}
        {adding ? <Panel eyebrow="Example exercises"><p className="mb-3 text-xs text-fg-muted">Try these exercises in this example.</p>{demoExercises.map((exercise) => <HudButton className="mb-2 w-full" key={exercise.id} onClick={() => {
          const entry: SessionExercise = { id: crypto.randomUUID(), position: workout.exercises.length + 1, exercise, sets: [], previousPerformance: null };
          update((current) => ({ ...current, exercises: [...current.exercises, entry] })); setActiveId(entry.id); setAdding(false);
        }} variant="outline">{exercise.name}</HudButton>)}<HudButton onClick={() => setAdding(false)} variant="ghost">Cancel</HudButton></Panel> : null}
      </div>
      <SessionStats exercises={workout.exercises.length} totals={totals} />
    </div>
    <ConfirmDialog isOpen={discard} isPending={false} title="Reset example workout?" message="Only this practice will reset. Your account is unchanged." confirmLabel="Reset example"
      onCancel={() => setDiscard(false)} onConfirm={() => { setState((current) => ({ ...current, practice: practiceWorkout(Date.now()), events: [] })); setActiveId(null); setDiscard(false); }} />
  </div>;
  function selectRelative(offset: number): void {
    const entry = workout?.exercises[(workout.exercises.findIndex((entry) => entry.id === activeId) ?? 0) + offset];
    if (entry) setActiveId(entry.id);
  }
}
