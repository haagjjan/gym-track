"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import type { ZodError } from "zod";
import {
  createExercise,
  listExercises,
  listMuscleGroups
} from "./workout-api";
import { createExerciseFormSchema } from "./workout-form-schemas";
import type { Exercise, MuscleGroup } from "./workout-types";

interface ExercisePickerProps {
  onAddExercise: (exerciseId: string) => Promise<boolean>;
}

type ExerciseCreateField = "equipment" | "exerciseType" | "name" | "primaryMuscleGroupId";

export function ExercisePicker({ onAddExercise }: ExercisePickerProps): ReactNode {
  const [search, setSearch] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ExerciseCreateField, string>>>({});

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void loadExerciseOptions(search, controller.signal, setExercises, setIsLoading, setError);
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();

    void loadMuscleGroups(controller.signal, setMuscleGroups);

    return () => controller.abort();
  }, []);

  function handleAdd(exerciseId: string): void {
    setError(null);
    startTransition(async () => {
      await onAddExercise(exerciseId);
    });
  }

  function handleCreate(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsed = createExerciseFormSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      equipment: String(formData.get("equipment") ?? ""),
      exerciseType: String(formData.get("exerciseType") ?? ""),
      primaryMuscleGroupId: String(formData.get("primaryMuscleGroupId") ?? "")
    });

    if (!parsed.success) {
      setFieldErrors(toCreateFieldErrors(parsed.error));
      return;
    }

    startTransition(async () => {
      const created = await createExercise({
        ...parsed.data,
        secondaryMuscleGroupIds: []
      });

      if (!created.ok) {
        setError(created.message);
        return;
      }

      const added = await onAddExercise(created.data.exercise.id);

      if (!added) {
        return;
      }

      form.reset();
      setSearch(created.data.exercise.name);
    });
  }

  return (
    <section className="exercisePicker" aria-label="Exercise picker">
      <div className="toolbarLine">
        <label className="compactField">
          <span>Exercise</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Bench press"
          />
        </label>
      </div>

      {error ? (
        <p className="inlineError" role="alert">
          {error}
        </p>
      ) : null}

      <div className="exerciseResults">
        {exercises.map((exercise) => (
          <button
            className="exerciseOption"
            key={exercise.id}
            type="button"
            onClick={() => handleAdd(exercise.id)}
            disabled={isPending}
          >
            <span>{exercise.name}</span>
            <small>{exercise.primaryMuscleGroup.name}</small>
          </button>
        ))}
        {!isLoading && exercises.length === 0 ? <p className="mutedText">No exercises found.</p> : null}
      </div>

      <form className="createExerciseForm" onSubmit={handleCreate} noValidate>
        <label className="compactField">
          <span>Name</span>
          <input name="name" type="text" placeholder="Incline dumbbell press" />
          <FieldError message={fieldErrors.name} />
        </label>
        <label className="compactField">
          <span>Primary muscle</span>
          <select name="primaryMuscleGroupId" defaultValue="">
            <option value="" disabled>
              Select
            </option>
            {muscleGroups.map((muscleGroup) => (
              <option key={muscleGroup.id} value={muscleGroup.id}>
                {muscleGroup.name}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.primaryMuscleGroupId} />
        </label>
        <label className="compactField">
          <span>Equipment</span>
          <input name="equipment" type="text" placeholder="barbell" />
          <FieldError message={fieldErrors.equipment} />
        </label>
        <label className="compactField">
          <span>Type</span>
          <select name="exerciseType" defaultValue="">
            <option value="">Unset</option>
            <option value="compound">Compound</option>
            <option value="isolation">Isolation</option>
          </select>
          <FieldError message={fieldErrors.exerciseType} />
        </label>
        <button className="secondaryAction" type="submit" disabled={isPending}>
          Create and add
        </button>
      </form>
    </section>
  );
}

async function loadExerciseOptions(
  search: string,
  signal: AbortSignal,
  setExercises: (items: Exercise[]) => void,
  setIsLoading: (value: boolean) => void,
  setError: (message: string | null) => void
): Promise<void> {
  setIsLoading(true);
  const result = await listExercises(search, signal).catch(() => null);

  if (signal.aborted || !result) {
    return;
  }

  setIsLoading(false);

  if (!result.ok) {
    setError(result.message);
    return;
  }

  setExercises(result.data.items);
}

async function loadMuscleGroups(
  signal: AbortSignal,
  setMuscleGroups: (items: MuscleGroup[]) => void
): Promise<void> {
  const result = await listMuscleGroups(signal).catch(() => null);

  if (signal.aborted || !result || !result.ok) {
    return;
  }

  setMuscleGroups(result.data.items);
}

function FieldError({ message }: { message: string | undefined }): ReactNode {
  return message ? <span className="fieldError">{message}</span> : null;
}

function toCreateFieldErrors(error: ZodError): Partial<Record<ExerciseCreateField, string>> {
  const errors: Partial<Record<ExerciseCreateField, string>> = {};

  for (const issue of error.issues) {
    const fieldName = issue.path[0];

    if (isCreateField(fieldName) && !errors[fieldName]) {
      errors[fieldName] = issue.message;
    }
  }

  return errors;
}

function isCreateField(value: unknown): value is ExerciseCreateField {
  return (
    value === "equipment" ||
    value === "exerciseType" ||
    value === "name" ||
    value === "primaryMuscleGroupId"
  );
}
