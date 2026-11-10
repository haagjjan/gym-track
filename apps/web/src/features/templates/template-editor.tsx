"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { SortableItem, SortableList } from "../../shared/ui/sortable-list";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { Button } from "../../shared/ui/button";
import { errorMessage } from "../../shared/api/client";
import type { Exercise, WorkoutTemplate, WorkoutTemplateExercise } from "../../shared/api/types";
import { ExercisePicker } from "../exercises/exercise-picker";
import { IconClose } from "../../shared/ui/icons";

interface DraftEntry {
  key: string;
  exercise: WorkoutTemplateExercise["exercise"];
}

interface TemplateEditorProps {
  initial: WorkoutTemplate | null;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (name: string, exerciseIds: string[]) => Promise<void>;
}

export function TemplateEditor({
  initial,
  isSaving,
  onCancel,
  onSave
}: TemplateEditorProps): ReactNode {
  const initialEntries = useMemo<DraftEntry[]>(
    () => initial?.exercises.map((entry) => ({ key: entry.id, exercise: entry.exercise })) ?? [],
    [initial]
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [entries, setEntries] = useState<DraftEntry[]>(initialEntries);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirty =
    name !== (initial?.name ?? "") ||
    exerciseIds(entries) !== exerciseIds(initialEntries);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent): void => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function close(): void {
    if (dirty) setConfirmDiscard(true);
    else onCancel();
  }

  function reorder(activeId: string, overId: string): void {
    const from = entries.findIndex((entry) => entry.key === activeId);
    const to = entries.findIndex((entry) => entry.key === overId);
    if (from < 0 || to < 0) return;
    const next = [...entries];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setEntries(next);
  }

  async function save(): Promise<void> {
    if (!name.trim()) {
      setError("Give the template a name.");
      return;
    }
    setError(null);
    try {
      await onSave(name.trim(), entries.map((entry) => entry.exercise.id));
    } catch (caught) {
      setError(errorMessage(caught, "Couldn't save the template. Check your connection and try again."));
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pb-6 pt-4 lg:px-6">
      <h1 className="text-title-1 text-text">{initial ? "Edit template" : "New template"}</h1>
      <label className="block">
        <span className="text-subhead text-text-secondary">Template name</span>
        <input className="mt-1.5 min-h-[3.125rem] w-full rounded-[var(--radius-control)] border border-control-line bg-surface-raised px-3 text-body text-text" maxLength={120} onChange={(event) => setName(event.currentTarget.value)} value={name} />
      </label>
      <section aria-labelledby="template-exercises-title">
        <h2 className="mb-2 text-title-2 text-text" id="template-exercises-title">Exercises</h2>
        {entries.length === 0 ? <p className="rounded-[var(--radius-card)] bg-surface p-4 text-subhead text-text-secondary">No exercises yet. Choose the exercises this template should start with.</p> : null}
        {entries.length > 0 ? <div className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface" role="list">
          <SortableList disabled={isSaving} ids={entries.map((entry) => entry.key)} onReorder={reorder}>
            {entries.map((entry, index) => (
              <SortableItem disabled={isSaving} id={entry.key} key={entry.key} label={entry.exercise.name}>
                {({ dragHandle }) => (
                  <TemplateExerciseRow
                    dragHandle={dragHandle}
                    entry={entry}
                    index={index}
                    isSaving={isSaving}
                    onRemove={() => setEntries(entries.filter((item) => item.key !== entry.key))}
                  />
                )}
              </SortableItem>
            ))}
          </SortableList>
        </div> : null}
        <Button className="mt-3 w-full" disabled={isSaving} onClick={() => { setSelectedExercises([]); setPickerOpen(true); }} variant="secondary">Choose exercises</Button>
      </section>
      {error ? <p className="text-subhead text-danger" role="alert">{error}</p> : null}
      <div className="grid gap-2">
        <Button disabled={isSaving || !dirty} onClick={() => void save()}>{isSaving ? "Saving…" : "Save template"}</Button>
        <Button onClick={close} variant="plain">Cancel</Button>
      </div>
      <ExercisePicker
        footer={<Button className="w-full" disabled={selectedExercises.length === 0 || isSaving} onClick={addSelectedExercises}>Add selected exercises ({selectedExercises.length})</Button>}
        isOpen={pickerOpen}
        isSubmitting={isSaving}
        onClose={() => setPickerOpen(false)}
        onSelect={toggleSelectedExercise}
        selectedIds={selectedExercises.map((exercise) => exercise.id)}
        selectionMode="multiple"
        title="Choose template exercises"
      />
      <ConfirmDialog
        confirmLabel="Discard changes"
        isOpen={confirmDiscard}
        message="Your changes to this template will be lost."
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={onCancel}
        title="Discard changes?"
      />
    </div>
  );

  function toggleSelectedExercise(exercise: Exercise): void {
    setSelectedExercises((current) => current.some((item) => item.id === exercise.id)
      ? current.filter((item) => item.id !== exercise.id)
      : [...current, exercise]);
  }

  function addSelectedExercises(): void {
    setEntries((current) => [
      ...current,
      ...selectedExercises.map((exercise) => ({ key: crypto.randomUUID(), exercise }))
    ]);
    setSelectedExercises([]);
    setPickerOpen(false);
  }
}

function TemplateExerciseRow({ dragHandle, entry, index, isSaving, onRemove }: { dragHandle: ReactNode; entry: DraftEntry; index: number; isSaving: boolean; onRemove: () => void }): ReactNode {
  const name = entry.exercise.name;
  const muscles = entry.exercise.muscleGroups.filter((muscle) => muscle.role === "PRIMARY").map((muscle) => muscle.name).join(", ");
  return (
    <div className="flex min-h-[3.75rem] items-center gap-2 py-1 pl-4 pr-1">
      <span className="num w-5 shrink-0 text-center text-subhead text-text-muted">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-headline text-text">{name}</p>
        {muscles ? <p className="truncate text-subhead text-text-secondary">{muscles}</p> : null}
      </div>
      <button aria-label={`Remove ${name}`} className="flex size-11 shrink-0 items-center justify-center rounded-full text-danger active:bg-surface-raised" disabled={isSaving} onClick={onRemove} type="button"><IconClose /></button>
      {dragHandle}
    </div>
  );
}

function exerciseIds(entries: DraftEntry[]): string {
  return entries.map((entry) => entry.exercise.id).join("|");
}
