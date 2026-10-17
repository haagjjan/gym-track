"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { SessionExercise, SetInput, WorkoutDetail } from "../../shared/api/types";
import { HudButton } from "../../shared/ui/ui";
import { SetComposer } from "../session/set-composer";
import { SetEditor, SessionSetRow } from "../session/session-set-list";
import { SessionEditorDock } from "../session/session-editor-dock";
import { suggestedDraft, type SetDraft } from "../session/set-draft-storage";
import { validateSetDraft } from "../session/validate-set-draft";

export function DemoSetPanel({ exercise, workout, onSave, onDelete }: {
  exercise: SessionExercise; workout: WorkoutDetail; onSave: (input: SetInput, setId?: string) => void; onDelete: (id: string) => void;
}): ReactNode {
  const [draft, setDraft] = useState<SetDraft>(() => suggestedDraft(exercise));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = exercise.sets.find((set) => set.id === editingId);
  const close = (): void => { setAdding(false); setEditingId(null); setError(null); };
  function save(): void {
    const result = validateSetDraft(draft);
    if (result.error) { setError(result.error); return; }
    if (result.input) { onSave(result.input); close(); }
  }
  return <section className="rounded-xl border border-outline-dim p-3">
    <h2 className="font-display text-lg font-bold text-fg">{exercise.exercise.name}</h2>
    <p className="mt-1 text-sm text-fg-muted">Tap a saved set to edit it. Working sets contribute to the chart and muscle map.</p>
    <div className="mt-3 space-y-2">{exercise.sets.map((set) => <SessionSetRow key={set.id} onEdit={() => { setEditingId(set.id); setAdding(false); }} set={set} workoutEndedAt={workout.endedAt} />)}</div>
    {workout.isOpen ? <HudButton className="mt-3 w-full" onClick={() => { setDraft(suggestedDraft(exercise)); setAdding(true); setEditingId(null); }}>Add set</HudButton> : null}
    {adding || editing ? <SessionEditorDock label={editing ? "Edit set" : "New set"} onClose={close}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-cyan">Example data — separate from your account</p><Link className="inline-flex min-h-11 items-center text-xs text-fg-muted" href="/">Exit example →</Link></div>
      {error ? <p className="mb-2 text-sm text-red" role="alert">{error}</p> : null}
      {editing ? <SetEditor isHistorical={!workout.isOpen} isSaving={false} isDeleting={false} set={editing} onClose={close} onError={setError}
        onSave={async (input) => onSave(input, editing.id)} onDelete={async () => onDelete(editing.id)} /> : <SetComposer guidance draft={draft} isSaving={false} onCancel={close} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} onSave={save} savedFlash={null} />}
    </SessionEditorDock> : null}
  </section>;
}
