"use client";

import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import { addSet, deleteSet, updateSet } from "./workout-api";
import { parseSetForm, SetFields, type SetFieldErrors } from "./set-form-fields";
import type { WorkoutSet } from "./workout-types";

interface SetEditorProps {
  onRefresh: () => Promise<unknown>;
  onShowError: (message: string) => void;
}

interface AddSetFormProps extends SetEditorProps {
  sessionExerciseId: string;
  workoutId: string;
}

export function AddSetForm({
  sessionExerciseId,
  workoutId,
  onRefresh,
  onShowError
}: AddSetFormProps): ReactNode {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<SetFieldErrors>({});

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

      form.reset();
      await onRefresh();
    });
  }

  return (
    <form className="setForm" onSubmit={handleSubmit} noValidate>
      <SetFields fieldErrors={fieldErrors} />
      <button className="primaryAction saveSetAction" type="submit" disabled={isPending}>
        Save set
      </button>
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
            Edit
          </button>
          <button
            className="dangerAction"
            type="button"
            onClick={handleDelete}
            disabled={isPending}
          >
            Delete
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
        Save
      </button>
      <button
        className="smallAction"
        type="button"
        onClick={() => setIsEditing(false)}
        disabled={isPending}
      >
        Cancel
      </button>
      <button className="dangerAction" type="button" onClick={handleDelete} disabled={isPending}>
        Delete
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
