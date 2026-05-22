"use client";

import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import { z, type ZodError } from "zod";
import { addSet, deleteSet, updateSet } from "./workout-api";
import { setFormSchema } from "./workout-form-schemas";
import type { SetType, WorkoutSet } from "./workout-types";

type SetField = "note" | "reps" | "restTimeSeconds" | "rir" | "setType" | "weightKg";
type SetFieldErrors = Partial<Record<SetField, string>>;

interface SetEditorProps {
  onRefresh: () => Promise<void>;
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
      <button className="secondaryAction" type="submit" disabled={isPending}>
        Add set
      </button>
    </form>
  );
}

export function EditableSetRow({
  set,
  onRefresh,
  onShowError
}: SetEditorProps & { set: WorkoutSet }): ReactNode {
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

  return (
    <form className="setRow" onSubmit={handleSubmit} noValidate>
      <span className="setOrder">{set.setOrder}</span>
      <SetFields fieldErrors={fieldErrors} set={set} />
      <button className="smallAction" type="submit" disabled={isPending}>
        Save
      </button>
      <button className="dangerAction" type="button" onClick={handleDelete} disabled={isPending}>
        Delete
      </button>
    </form>
  );
}

function SetFields({
  fieldErrors,
  set
}: {
  fieldErrors: SetFieldErrors;
  set?: WorkoutSet;
}): ReactNode {
  return (
    <>
      <SetTypeField defaultValue={set?.setType ?? "working"} error={fieldErrors.setType} />
      <TextField label="Kg" name="weightKg" error={fieldErrors.weightKg} value={set?.weightKg} />
      <TextField label="Reps" name="reps" error={fieldErrors.reps} value={set?.reps} />
      <TextField label="RIR" name="rir" error={fieldErrors.rir} value={set?.rir ?? 2} />
      <TextField
        label="Rest"
        name="restTimeSeconds"
        error={fieldErrors.restTimeSeconds}
        value={set?.restTimeSeconds}
      />
      <TextField label="Note" name="note" error={fieldErrors.note} value={set?.note} wide />
    </>
  );
}

function SetTypeField({
  defaultValue,
  error
}: {
  defaultValue: SetType;
  error: string | undefined;
}): ReactNode {
  return (
    <label className="compactField">
      <span>Type</span>
      <select name="setType" defaultValue={defaultValue}>
        <option value="working">Working</option>
        <option value="warmup">Warmup</option>
      </select>
      <FieldError message={error} />
    </label>
  );
}

function TextField({
  error,
  label,
  name,
  value,
  wide = false
}: {
  error: string | undefined;
  label: string;
  name: SetField;
  value: number | string | null | undefined;
  wide?: boolean;
}): ReactNode {
  return (
    <label className={wide ? "compactField wideField" : "compactField"}>
      <span>{label}</span>
      <input name={name} type="text" defaultValue={value ?? ""} />
      <FieldError message={error} />
    </label>
  );
}

type ParseSetResult =
  | { ok: true; value: z.infer<typeof setFormSchema> }
  | { ok: false; errors: SetFieldErrors };

function parseSetForm(formData: FormData): ParseSetResult {
  const parsed = setFormSchema.safeParse({
    setType: String(formData.get("setType") ?? "working") as SetType,
    weightKg: String(formData.get("weightKg") ?? ""),
    reps: String(formData.get("reps") ?? ""),
    rir: String(formData.get("rir") ?? ""),
    restTimeSeconds: String(formData.get("restTimeSeconds") ?? ""),
    note: String(formData.get("note") ?? "")
  });

  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, errors: toSetFieldErrors(parsed.error) };
}

function FieldError({ message }: { message: string | undefined }): ReactNode {
  return message ? <span className="fieldError">{message}</span> : null;
}

function toSetFieldErrors(error: ZodError): SetFieldErrors {
  const errors: SetFieldErrors = {};

  for (const issue of error.issues) {
    const fieldName = issue.path[0];

    if (isSetField(fieldName) && !errors[fieldName]) {
      errors[fieldName] = issue.message;
    }
  }

  return errors;
}

function isSetField(value: unknown): value is SetField {
  return (
    value === "note" ||
    value === "reps" ||
    value === "restTimeSeconds" ||
    value === "rir" ||
    value === "setType" ||
    value === "weightKg"
  );
}
