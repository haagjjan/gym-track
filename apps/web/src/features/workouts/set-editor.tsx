"use client";

import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import { addSet, deleteSet, updateSet } from "./workout-api";
import { parseSetForm, SetFields, type SetFieldErrors } from "./set-form-fields";
import type { SetDraft, SetDraftField } from "./workout-set-drafts";
import type { WorkoutSet } from "./workout-types";

interface SetEditorProps {
  onRefresh: () => Promise<unknown>;
  onShowError: (message: string) => void;
}

interface AddSetFormProps extends SetEditorProps {
  draft: SetDraft;
  onDraftChange: (field: SetDraftField, value: string) => void;
  onSetSaved: (set: WorkoutSet) => void;
  sessionExerciseId: string;
  workoutId: string;
}

export function AddSetForm({
  draft,
  sessionExerciseId,
  workoutId,
  onDraftChange,
  onRefresh,
  onSetSaved,
  onShowError
}: AddSetFormProps): ReactNode {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<SetFieldErrors>({});
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function handleDraftChange(field: SetDraftField, value: string): void {
    setFieldErrors({});
    setSavedMessage(null);
    onDraftChange(field, value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFieldErrors({});

    const form = event.currentTarget;
    const parsed = parseSetForm(new FormData(form));

    if (!parsed.ok) {
      setFieldErrors(parsed.errors);
      return;
    }

    startTransition(async () => {
      const result = await addSet(workoutId, sessionExerciseId, parsed.value);

      if (!result.ok) {
        onShowError(result.message);
        return;
      }

      onSetSaved(result.data.set);
      setSavedMessage(`SET_${result.data.set.setOrder}_SAVED`);
      await onRefresh();
      focusPrimarySetInput(form);
    });
  }

  return (
    <form className="setForm" onSubmit={handleSubmit} noValidate>
      <div className="currentSetHeading">
        <span>CURRENT_SET</span>
      </div>
      <SetFields
        draftValues={draft.values}
        fieldErrors={fieldErrors}
        onDraftChange={handleDraftChange}
      />
      <button className="primaryAction saveSetAction" type="submit" disabled={isPending}>
        {isPending ? "SAVING" : "SAVE_SET"}
      </button>
      {savedMessage ? <p className="setSavedSignal">{savedMessage}</p> : null}
    </form>
  );
}

export function EditableSetRow({
  set,
  onRefresh,
  onShowError
}: SetEditorProps & { set: WorkoutSet }): ReactNode {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<SetFieldErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFieldErrors({});

    const parsed = parseSetForm(new FormData(event.currentTarget));

    if (!parsed.ok) {
      setFieldErrors(parsed.errors);
      return;
    }

    startTransition(async () => {
      const result = await updateSet(set.id, parsed.value);

      if (!result.ok) {
        onShowError(result.message);
        return;
      }

      await onRefresh();
      setIsEditing(false);
    });
  }

  function handleDelete(): void {
    const confirmed = window.confirm(`Delete set ${set.setOrder}?`);

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteSet(set.id);

      if (!result.ok) {
        onShowError(result.message);
        return;
      }

      await onRefresh();
    });
  }

  if (!isEditing) {
    return (
      <div className="setSummaryRow">
        <span className="setOrder">{set.setOrder}</span>
        <div className="setSummaryText">
          <strong>{formatSetHeadline(set)}</strong>
          <span>{formatSetDetail(set)}</span>
        </div>
        <div className="setSummaryActions">
          <button
            className="smallAction"
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={isPending}
          >
            EDIT
          </button>
          <button
            className="dangerAction"
            type="button"
            onClick={handleDelete}
            disabled={isPending}
          >
            DELETE
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="setRow setRowEditing" onSubmit={handleSubmit} noValidate>
      <span className="setOrder">{set.setOrder}</span>
      <SetFields fieldErrors={fieldErrors} set={set} />
      <button className="smallAction" type="submit" disabled={isPending}>
        SAVE
      </button>
      <button
        className="smallAction"
        type="button"
        onClick={() => setIsEditing(false)}
        disabled={isPending}
      >
        CANCEL
      </button>
      <button className="dangerAction" type="button" onClick={handleDelete} disabled={isPending}>
        DELETE
      </button>
    </form>
  );
}

function formatSetHeadline(set: WorkoutSet): string {
  return `${set.weightKg} kg x ${set.reps}`;
}

function formatSetDetail(set: WorkoutSet): string {
  const rest = set.restTimeSeconds === null ? "" : `, ${set.restTimeSeconds}s rest`;
  const note = set.note ? `, ${set.note}` : "";

  return `RIR ${set.rir}, ${set.setType}${rest}${note}`;
}

function focusPrimarySetInput(form: HTMLFormElement): void {
  window.requestAnimationFrame(() => {
    const weightInput = form.querySelector<HTMLInputElement>('input[name="weightKg"]');
    const repsInput = form.querySelector<HTMLInputElement>('input[name="reps"]');

    (weightInput ?? repsInput)?.focus();
  });
}
