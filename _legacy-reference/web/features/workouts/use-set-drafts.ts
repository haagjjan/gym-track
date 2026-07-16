"use client";

import { useState } from "react";
import type { SetDraft, SetDraftField } from "./workout-set-drafts";
import {
  createDefaultDraft,
  createDraftFromExercise,
  createDraftFromSet,
  updateDraftField
} from "./workout-set-drafts";
import type { WorkoutDetail, WorkoutSet } from "./workout-types";

export function useSetDrafts(workout: WorkoutDetail | null): {
  clearSetDraft: (sessionExerciseId: string) => void;
  getSetDraft: (sessionExerciseId: string) => SetDraft;
  handleDraftChange: (sessionExerciseId: string, field: SetDraftField, value: string) => void;
  handleSetSaved: (sessionExerciseId: string, set: WorkoutSet) => void;
} {
  const [setDrafts, setSetDrafts] = useState<Record<string, SetDraft>>({});

  function createInitialDraft(sessionExerciseId: string): SetDraft {
    const item = workout?.exercises.find((exercise) => exercise.id === sessionExerciseId);

    return item ? createDraftFromExercise(item) : createDefaultDraft();
  }

  function getSetDraft(sessionExerciseId: string): SetDraft {
    return setDrafts[sessionExerciseId] ?? createInitialDraft(sessionExerciseId);
  }

  function handleDraftChange(
    sessionExerciseId: string,
    field: SetDraftField,
    value: string
  ): void {
    setSetDrafts((current) => {
      const draft = current[sessionExerciseId] ?? createInitialDraft(sessionExerciseId);

      return {
        ...current,
        [sessionExerciseId]: updateDraftField(draft, field, value)
      };
    });
  }

  function handleSetSaved(sessionExerciseId: string, set: WorkoutSet): void {
    setSetDrafts((current) => ({
      ...current,
      [sessionExerciseId]: createDraftFromSet(set)
    }));
  }

  function clearSetDraft(sessionExerciseId: string): void {
    setSetDrafts((current) => {
      const remaining = { ...current };

      delete remaining[sessionExerciseId];

      return remaining;
    });
  }

  return {
    clearSetDraft,
    getSetDraft,
    handleDraftChange,
    handleSetSaved
  };
}
