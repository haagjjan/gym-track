"use client";

import type { ReactNode } from "react";
import { z, type ZodError } from "zod";
import { setFormSchema } from "./workout-form-schemas";
import type { SetType, WorkoutSet } from "./workout-types";

type SetField = "note" | "reps" | "restTimeSeconds" | "rir" | "setType" | "weightKg";
export type SetFieldErrors = Partial<Record<SetField, string>>;

export type ParseSetResult =
  | { ok: true; value: z.infer<typeof setFormSchema> }
  | { ok: false; errors: SetFieldErrors };

export function SetFields({
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
