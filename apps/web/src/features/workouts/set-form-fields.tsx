"use client";

import type { ReactNode } from "react";
import { z, type ZodError } from "zod";
import { setFormSchema } from "./workout-form-schemas";
import type { SetDraftField, SetDraftValues } from "./workout-set-drafts";
import type { SetType, WorkoutSet } from "./workout-types";

export type SetFieldErrors = Partial<Record<SetDraftField, string>>;

export type ParseSetResult =
  | { ok: true; value: z.infer<typeof setFormSchema> }
  | { ok: false; errors: SetFieldErrors };

export function SetFields({
  draftValues,
  fieldErrors,
  onDraftChange,
  set
}: {
  draftValues?: SetDraftValues;
  fieldErrors: SetFieldErrors;
  onDraftChange?: (field: SetDraftField, value: string) => void;
  set?: WorkoutSet;
}): ReactNode {
  return (
    <>
      <SetTypeField
        defaultValue={set?.setType ?? "working"}
        error={fieldErrors.setType}
        onDraftChange={onDraftChange}
        value={draftValues?.setType}
      />
      <TextField
        label="Kg"
        name="weightKg"
        error={fieldErrors.weightKg}
        onDraftChange={onDraftChange}
        value={draftValues?.weightKg ?? set?.weightKg}
      />
      <TextField
        label="Reps"
        name="reps"
        error={fieldErrors.reps}
        onDraftChange={onDraftChange}
        value={draftValues?.reps ?? set?.reps}
      />
      <TextField
        label="RIR"
        name="rir"
        error={fieldErrors.rir}
        onDraftChange={onDraftChange}
        value={draftValues?.rir ?? set?.rir ?? 2}
      />
      <TextField
        label="Rest"
        name="restTimeSeconds"
        error={fieldErrors.restTimeSeconds}
        onDraftChange={onDraftChange}
        value={draftValues?.restTimeSeconds ?? set?.restTimeSeconds}
      />
      <TextField
        label="Note"
        name="note"
        error={fieldErrors.note}
        onDraftChange={onDraftChange}
        value={draftValues?.note ?? set?.note}
        wide
      />
    </>
  );
}

export function parseSetForm(formData: FormData): ParseSetResult {
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

function SetTypeField({
  defaultValue,
  error,
  onDraftChange,
  value
}: {
  defaultValue: SetType;
  error: string | undefined;
  onDraftChange: ((field: SetDraftField, value: string) => void) | undefined;
  value: SetType | undefined;
}): ReactNode {
  return (
    <label className="compactField">
      <span>Type</span>
      <select
        name="setType"
        defaultValue={value ? undefined : defaultValue}
        onChange={(event) => onDraftChange?.("setType", event.currentTarget.value)}
        value={value}
      >
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
  onDraftChange,
  value,
  wide = false
}: {
  error: string | undefined;
  label: string;
  name: SetDraftField;
  onDraftChange: ((field: SetDraftField, value: string) => void) | undefined;
  value: number | string | null | undefined;
  wide?: boolean;
}): ReactNode {
  const fieldValue = value ?? "";

  return (
    <label className={wide ? "compactField wideField" : "compactField"}>
      <span>{label}</span>
      <input
        name={name}
        type="text"
        defaultValue={onDraftChange ? undefined : fieldValue}
        onChange={(event) => onDraftChange?.(name, event.currentTarget.value)}
        value={onDraftChange ? fieldValue : undefined}
      />
      <FieldError message={error} />
    </label>
  );
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

function isSetField(value: unknown): value is SetDraftField {
  return (
    value === "note" ||
    value === "reps" ||
    value === "restTimeSeconds" ||
    value === "rir" ||
    value === "setType" ||
    value === "weightKg"
  );
}
