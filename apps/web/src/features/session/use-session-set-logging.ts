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
import { validateSetDraft } from "./validate-set-draft";
import { readRestSeconds } from "./use-rest-preferences";

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
    const parsed = validateSetDraft(draft);
    if (parsed.error) { options.onError(parsed.error); return false; }
    if (!parsed.input) return false;

    writeSetDraft(options.userId, options.workoutId, exercise.id, activeDraft);
    const now = Date.now();
    const elapsed = lastSaveAt.current === null ? null : (now - lastSaveAt.current) / 1000;
    try {
      const saved = await options.mutations.addSet.mutateAsync({
        clientMutationId: activeDraft.clientMutationId,
        sessionExerciseId: exercise.id,
        input: {
          ...parsed.input,
          restTimeSeconds: elapsed !== null && elapsed < 1_200 ? Math.round(elapsed) : null
        }
      });
      lastSaveAt.current = now;
      clearSetDraft(options.userId, options.workoutId, exercise.id);
      setDrafts((current) => omitKey(current, exercise.id));
      setNewSetOpen(false);
      // Read at save time rather than on mount, so a rest length changed in
      // Settings applies to the very next set. Zero means the countdown is off.
      const restSeconds = readRestSeconds(options.userId);
      setRestTimer(restSeconds > 0 ? { seconds: restSeconds, startedAt: now } : null);
      options.onError(null);
      options.onStatus(`Set ${saved.setOrder} logged.`);
      return true;
    } catch (caught) {
      options.onError(errorMessage(caught, "Couldn't save this set. Check your connection and try again."));
      return false;
    }
  }

  return { cancelNewSet, closeEditors, currentDraft, editingSetId, newSetOpen, openNewSet, restTimer, saveSet, setEditingSetId, setRestTimer, updateDraft };
}

function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([entryKey]) => entryKey !== key)) as Record<string, T>;
}
