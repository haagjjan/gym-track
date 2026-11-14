"use client";

import { useState, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { useConfirmTap } from "../session/use-confirm-tap";

export interface EntryFormProps<Entry, Values> {
  /** The entry being edited; absent for a new one. */
  entry?: Entry | undefined;
  exerciseId: string;
  /** Starting values for a new entry, usually the last one logged. */
  initial?: Entry | undefined;
  onCancel: () => void;
  onDelete?: (() => void) | undefined;
  onSave: (values: Values) => void;
  pending: boolean;
  title: string;
}

export function NoteField({ onChange, open = false, value }: { onChange: (note: string) => void; open?: boolean; value: string }): ReactNode {
  const [shown, setShown] = useState(open || value.length > 0);
  if (!shown) return <Button className="mt-2 -ml-4" onClick={() => setShown(true)} size="compact" variant="plain">Add note</Button>;
  return (
    <label className="mt-4 block">
      <span className="text-subhead text-text-secondary">Note</span>
      <input
        className="mt-1.5 min-h-[3.125rem] w-full rounded-[var(--radius-control)] border border-control-line bg-surface px-3 text-body text-text placeholder:text-text-muted"
        maxLength={1_000}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder="How it felt"
        value={value}
      />
    </label>
  );
}

export function EntryActions({ canSave, isEdit, noun, onCancel, onDelete, onSave, pending }: {
  canSave: boolean; isEdit: boolean; noun: "set" | "entry"; onCancel: () => void; onDelete?: (() => void) | undefined; onSave: () => void; pending: boolean;
}): ReactNode {
  const confirmDelete = useConfirmTap(() => onDelete?.());
  return (
    <>
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2" data-sheet-actions>
        <Button disabled={pending || !canSave} onClick={onSave}>{pending ? "Saving…" : isEdit ? "Save" : `Save ${noun}`}</Button>
        <Button disabled={pending} onClick={onCancel} variant="secondary">Cancel</Button>
      </div>
      {isEdit && onDelete ? (
        <Button className="mt-2 w-full" disabled={pending} onClick={confirmDelete.trigger} variant="destructive">
          {confirmDelete.isArmed ? "Tap again to delete" : `Delete ${noun}`}
        </Button>
      ) : null}
    </>
  );
}
