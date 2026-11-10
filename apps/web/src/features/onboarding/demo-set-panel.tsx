"use client";

import { useState, type ReactNode } from "react";
import type { SessionExercise, SetInput, WorkoutDetail } from "../../shared/api/types";
import { Button } from "../../shared/ui/button";
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
  return <section>
    <h2 className="break-words text-title-2 text-text">{exercise.exercise.name}</h2>
    <p className="mt-0.5 text-subhead text-text-secondary">{exercise.exercise.primaryMuscleGroups.map((muscle) => muscle.name).join(", ")}</p>
    <ul aria-label="Logged sets" className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">{exercise.sets.map((set) => <SessionSetRow key={set.id} onEdit={() => { setEditingId(set.id); setAdding(false); }} set={set} workoutEndedAt={workout.endedAt} />)}</ul>
    {workout.isOpen ? <Button className="mt-3 w-full" onClick={() => { setDraft(suggestedDraft(exercise)); setAdding(true); setEditingId(null); }}>Add set</Button> : null}
    {adding || editing ? <SessionEditorDock label={editing ? "Edit set" : "New set"} onClose={close}>
      {error ? <p className="mb-2 text-subhead text-danger" role="alert">{error}</p> : null}
      {editing ? <SetEditor isHistorical={!workout.isOpen} isSaving={false} isDeleting={false} set={editing} onClose={close} onError={setError}
        onSave={async (input) => onSave(input, editing.id)} onDelete={async () => onDelete(editing.id)} /> : <SetComposer guidance draft={draft} isSaving={false} onCancel={close} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} onSave={save} savedFlash={null} />}
    </SessionEditorDock> : null}
  </section>;
}
