"use client";

import { useCallback, useRef, useState } from "react";
import { errorMessage } from "../../shared/api/client";
import { useSessionMutations } from "../../shared/api/hooks";
import type { SessionExercise } from "../../shared/api/types";
import {
  clearSetDraft,
  readSetDraft,
  suggestedDraft,
  writeSetDraft,
  type ActiveSetDraft,
  type SetDraft
} from "./set-draft-storage";

const DEFAULT_REST_SECONDS = 120;

interface SessionSetLoggingOptions {
  activeExercise: SessionExercise | null;
  mutations: ReturnType<typeof useSessionMutations>;
  onError: (message: string | null) => void;
  onStatus: (message: string) => void;
  userId: string;
  workoutId: string;
}

export function useSessionSetLogging(options: SessionSetLoggingOptions) {
  const [drafts, setDrafts] = useState<Record<string, ActiveSetDraft>>({});
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [newSetOpen, setNewSetOpen] = useState(false);
  const [restTimer, setRestTimer] = useState<{ seconds: number; startedAt: number } | null>(null);
  const lastSaveAt = useRef<number | null>(null);

  const closeEditors = useCallback((): void => {
    setEditingSetId(null);
    setNewSetOpen(false);
  }, []);

  function currentDraft(): SetDraft {
    const exercise = options.activeExercise;
    return exercise ? drafts[exercise.id]?.draft ?? suggestedDraft(exercise) : suggestedDraft(null);
  }

  function openNewSet(): void {
    const exercise = options.activeExercise;
    if (!exercise) return;
    const restored = readSetDraft(options.userId, options.workoutId, exercise);
    writeSetDraft(options.userId, options.workoutId, exercise.id, restored);
    setDrafts((current) => ({ ...current, [exercise.id]: restored }));
    setEditingSetId(null);
    setNewSetOpen(true);
  }

  function updateDraft(patch: Partial<SetDraft>): void {
    const exercise = options.activeExercise;
    if (!exercise) return;
    const current = drafts[exercise.id] ?? readSetDraft(
      options.userId,
      options.workoutId,
      exercise
    );
    const next = {
      ...current,
      draft: { ...current.draft, ...patch },
      savedAt: Date.now()
    };
    setDrafts((allDrafts) => ({ ...allDrafts, [exercise.id]: next }));
    writeSetDraft(options.userId, options.workoutId, exercise.id, next);
  }

  function cancelNewSet(): void {
    const exercise = options.activeExercise;
    if (exercise) {
      clearSetDraft(options.userId, options.workoutId, exercise.id);
      setDrafts((current) => omitKey(current, exercise.id));
    }
    setNewSetOpen(false);
  }

  async function saveSet(): Promise<boolean> {
    const exercise = options.activeExercise;
    if (!exercise) return false;
    const activeDraft = drafts[exercise.id] ?? readSetDraft(
      options.userId,
      options.workoutId,
      exercise
    );
    const draft = activeDraft.draft;
    const weight = Number(draft.weightKg);
    const reps = Number(draft.reps);
    const rir = Number(draft.rir);
    if (!Number.isFinite(weight) || weight <= 0 || !Number.isInteger(reps) || reps < 1) {
      options.onError("Weight must be positive and reps must be a whole number of at least one.");
      return false;
    }

    writeSetDraft(options.userId, options.workoutId, exercise.id, activeDraft);
    const now = Date.now();
    const elapsed = lastSaveAt.current === null ? null : (now - lastSaveAt.current) / 1000;
    try {
      const saved = await options.mutations.addSet.mutateAsync({
        clientMutationId: activeDraft.clientMutationId,
        sessionExerciseId: exercise.id,
        input: {
          setType: draft.setType,
          weightKg: draft.weightKg,
          reps,
          rir: Number.isFinite(rir) ? rir : 2,
          restTimeSeconds: elapsed !== null && elapsed < 1_200 ? Math.round(elapsed) : null,
          note: draft.note.trim() || null
        }
      });
      lastSaveAt.current = now;
      clearSetDraft(options.userId, options.workoutId, exercise.id);
      setDrafts((current) => omitKey(current, exercise.id));
      setNewSetOpen(false);
      setRestTimer({ seconds: DEFAULT_REST_SECONDS, startedAt: now });
      options.onError(null);
      options.onStatus(`Set ${saved.setOrder} logged.`);
      return true;
    } catch (caught) {
      options.onError(errorMessage(caught, "The set could not be saved."));
      return false;
    }
  }

  return { cancelNewSet, closeEditors, currentDraft, editingSetId, newSetOpen, openNewSet, restTimer, saveSet, setEditingSetId, setRestTimer, updateDraft };
}

function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([entryKey]) => entryKey !== key)) as Record<string, T>;
}
