"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import type { ZodError } from "zod";
import {
  createExercise,
  getExerciseNameReviewDetails,
  listExercises,
  listMuscleGroups
} from "./workout-api";
import { createExerciseFormSchema } from "./workout-form-schemas";
import type { Exercise, ExerciseNameReviewDetails, MuscleGroup } from "./workout-types";

interface ExercisePickerProps {
  autoFocus?: boolean;
  onAddExercise: (exerciseId: string) => Promise<boolean>;
  onInserted?: () => void;
}

type ExerciseCreateField = "equipment" | "exerciseType" | "name" | "primaryMuscleGroupId";
type CreateExerciseValues = {
  equipment: string;
  exerciseType: string;
  name: string;
  primaryMuscleGroupId: string;
};

const initialCreateValues: CreateExerciseValues = {
  equipment: "",
  exerciseType: "",
  name: "",
  primaryMuscleGroupId: ""
};

export function ExercisePicker({
  autoFocus = false,
  onAddExercise,
  onInserted
}: ExercisePickerProps): ReactNode {
  const [search, setSearch] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ExerciseCreateField, string>>>({});
  const [createValues, setCreateValues] = useState<CreateExerciseValues>(initialCreateValues);
  const [nameReview, setNameReview] = useState<{
    details: ExerciseNameReviewDetails;
    isBlocked: boolean;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocus) {
      searchInputRef.current?.focus();
    }
  }, [autoFocus]);

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
      const added = await onAddExercise(exerciseId);

      if (added) {
        onInserted?.();
      }
    });
  }

  function handleCreate(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setNameReview(null);

    const parsed = createExerciseFormSchema.safeParse(createValues);

    if (!parsed.success) {
      setFieldErrors(toCreateFieldErrors(parsed.error));
      return;
    }

    submitCreate(parsed.data);
  }

  function submitCreate(
    values: {
      name: string;
      equipment: string | null;
      exerciseType: string | null;
      primaryMuscleGroupId: string;
    },
    confirmNameWarning = false
  ): void {
    startTransition(async () => {
      const created = await createExercise({
        ...values,
        secondaryMuscleGroupIds: [],
        confirmNameWarning
      });

      if (!created.ok) {
        const reviewDetails = getExerciseNameReviewDetails(created);

        if (
          (created.code === "EXERCISE_NAME_REVIEW_REQUIRED" ||
            created.code === "EXERCISE_NAME_BLOCKED") &&
          reviewDetails
        ) {
          setNameReview({
            details: reviewDetails,
            isBlocked: created.code === "EXERCISE_NAME_BLOCKED"
          });
          setCreateValues((current) => ({
            ...current,
            name: reviewDetails.normalizedName || current.name
          }));
          return;
        }

        setError(created.message);
        return;
      }

      const added = await onAddExercise(created.data.exercise.id);

      if (!added) {
        return;
      }

      setCreateValues(initialCreateValues);
      setNameReview(null);
      setSearch(created.data.exercise.name);
      onInserted?.();
    });
  }

  function handleCreateValueChange(field: ExerciseCreateField, value: string): void {
    setCreateValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));

    if (field === "name") {
      setNameReview(null);
    }
  }

  return (
    <section className="exercisePicker" aria-label="Exercise picker">
      <div className="toolbarLine">
        <label className="compactField">
          <span>Exercise</span>
          <input
            ref={searchInputRef}
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

      {nameReview ? (
        <div className="reviewPanel" role="status">
          <p className={nameReview.isBlocked ? "inlineError" : "mutedText"}>
            {nameReview.isBlocked
              ? "This name is blocked. Choose a cleaner exercise name."
              : "This name is not in the approved catalog yet. Review it before adding."}
          </p>
          <ul className="reviewList">
            {nameReview.details.reasons.map((reason) => (
              <li key={reason.code}>{reason.message}</li>
            ))}
          </ul>
          {nameReview.details.suggestions.length > 0 ? (
            <div className="suggestionGroup">
              {nameReview.details.suggestions.map((suggestion) => (
                <button
                  className="secondaryAction"
                  key={suggestion}
                  type="button"
                  onClick={() => handleCreateValueChange("name", suggestion)}
                  disabled={isPending}
                >
                  USE {suggestion}
                </button>
              ))}
            </div>
          ) : null}
          {!nameReview.isBlocked ? (
            <button
              className="secondaryAction"
              type="button"
              onClick={() => {
                const parsed = createExerciseFormSchema.safeParse(createValues);

                if (!parsed.success) {
                  setFieldErrors(toCreateFieldErrors(parsed.error));
                  return;
                }

                submitCreate(parsed.data, true);
              }}
              disabled={isPending}
            >
              CREATE_ANYWAY
            </button>
          ) : null}
        </div>
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
        {!isLoading && exercises.length === 0 ? <p className="mutedText">NO_EXERCISES_FOUND</p> : null}
      </div>

      <form className="createExerciseForm" onSubmit={handleCreate} noValidate>
        <label className="compactField">
          <span>Name</span>
          <input
            name="name"
            type="text"
            placeholder="Incline dumbbell press"
            value={createValues.name}
            onChange={(event) => handleCreateValueChange("name", event.target.value)}
          />
          <FieldError message={fieldErrors.name} />
        </label>
        <label className="compactField">
          <span>Primary muscle</span>
          <select
            name="primaryMuscleGroupId"
            value={createValues.primaryMuscleGroupId}
            onChange={(event) =>
              handleCreateValueChange("primaryMuscleGroupId", event.target.value)
            }
          >
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
          <input
            name="equipment"
            type="text"
            placeholder="barbell"
            value={createValues.equipment}
            onChange={(event) => handleCreateValueChange("equipment", event.target.value)}
          />
          <FieldError message={fieldErrors.equipment} />
        </label>
        <label className="compactField">
          <span>Type</span>
          <select
            name="exerciseType"
            value={createValues.exerciseType}
            onChange={(event) => handleCreateValueChange("exerciseType", event.target.value)}
          >
            <option value="">Unset</option>
            <option value="compound">Compound</option>
            <option value="isolation">Isolation</option>
          </select>
          <FieldError message={fieldErrors.exerciseType} />
        </label>
        <button className="secondaryAction" type="submit" disabled={isPending}>
          CREATE_ADD
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
