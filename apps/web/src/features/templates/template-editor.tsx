"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { SortableItem, SortableList } from "../../shared/ui/sortable-list";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { HudButton, Panel } from "../../shared/ui/ui";
import { errorMessage } from "../../shared/api/client";
import type { Exercise, WorkoutTemplate, WorkoutTemplateExercise } from "../../shared/api/types";
import { ExercisePicker } from "../exercises/exercise-picker";

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
      setError("Template name is required.");
      return;
    }
    setError(null);
    try {
      await onSave(name.trim(), entries.map((entry) => entry.exercise.id));
    } catch (caught) {
      setError(errorMessage(caught, "Template could not be saved."));
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6">
      <header>
        <p className="label-caps text-outline">TEMPLATE_EDITOR</p>
        <h1 className="font-display text-2xl font-bold text-fg">
          {initial ? "Edit Template" : "New Workout Template"}
        </h1>
      </header>
      <Panel accent="cyan">
        <label className="block">
          <span className="label-caps text-outline">TEMPLATE_NAME</span>
          <input className="mt-1 min-h-12 w-full rounded border border-outline-dim bg-surface-low px-3 font-mono text-base text-fg focus:border-cyan focus:outline-none" maxLength={120} onChange={(event) => setName(event.currentTarget.value)} value={name} />
        </label>
        <div className="mt-4 space-y-2" role="list">
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
        </div>
        <HudButton className="mt-3 w-full" disabled={isSaving} onClick={() => { setSelectedExercises([]); setPickerOpen(true); }} variant="outline">Choose exercises</HudButton>
        {error ? <p className="mt-2 text-[11px] text-red" role="alert">{error}</p> : null}
        <div className="mt-4 flex gap-2"><HudButton className="flex-1" disabled={isSaving || !dirty} onClick={() => void save()}>{isSaving ? "SAVING…" : "SAVE_TEMPLATE"}</HudButton><HudButton onClick={close} variant="ghost">CANCEL</HudButton></div>
      </Panel>
      <ExercisePicker
        footer={<HudButton className="w-full" disabled={selectedExercises.length === 0 || isSaving} onClick={addSelectedExercises}>Add selected exercises ({selectedExercises.length})</HudButton>}
        isOpen={pickerOpen}
        isSubmitting={isSaving}
        onClose={() => setPickerOpen(false)}
        onSelect={toggleSelectedExercise}
        selectedIds={selectedExercises.map((exercise) => exercise.id)}
        selectionMode="multiple"
        title="Choose template exercises"
      />
      <ConfirmDialog
        confirmLabel="DISCARD CHANGES"
        isOpen={confirmDiscard}
        message="Your unsaved template name, exercise order, and exercise changes will be lost."
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={onCancel}
        title="Discard unsaved template changes?"
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
  return <div className="flex min-h-14 items-center gap-2 rounded border border-outline-dim/60 bg-surface-low/40 p-2" role="listitem"><span className="w-6 shrink-0 text-center font-mono text-xs text-outline">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-1"><p className="min-w-0 flex-1 truncate text-sm text-fg">{name}</p><button aria-label={`Remove ${name}`} className="flex size-11 shrink-0 items-center justify-center rounded text-xl text-red hover:bg-red/10" disabled={isSaving} onClick={onRemove} type="button">×</button></div><p className="truncate text-[9px] uppercase text-outline">{muscles}</p></div>{dragHandle}</div>;
}

function exerciseIds(entries: DraftEntry[]): string {
  return entries.map((entry) => entry.exercise.id).join("|");
}
