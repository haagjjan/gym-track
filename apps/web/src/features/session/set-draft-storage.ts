import type { SessionExercise, SetType } from "../../shared/api/types";
import { formatKgValue } from "../../shared/format";

export interface SetDraft {
  setType: SetType;
  weightKg: string;
  reps: string;
  rir: string;
  note: string;
}

const fallbackDraft: SetDraft = {
  setType: "working",
  weightKg: "20",
  reps: "8",
  rir: "2",
  note: ""
};

export function suggestedDraft(exercise: SessionExercise | null): SetDraft {
  const previous = exercise?.sets.at(-1);

  if (!previous) {
    return { ...fallbackDraft };
  }

  return {
    setType: previous.setType,
    weightKg: formatKgValue(previous.weightKg),
    reps: String(previous.reps),
    rir: String(previous.rir),
    note: ""
  };
}

export function readSetDraft(
  userId: string,
  workoutId: string,
  exercise: SessionExercise
): SetDraft {
  if (typeof window === "undefined") {
    return suggestedDraft(exercise);
  }

  try {
    const value = window.localStorage.getItem(storageKey(userId, workoutId, exercise.id));
    const parsed = value ? (JSON.parse(value) as unknown) : null;

    return isSetDraft(parsed) ? parsed : suggestedDraft(exercise);
  } catch {
    return suggestedDraft(exercise);
  }
}

export function writeSetDraft(
  userId: string,
  workoutId: string,
  exerciseId: string,
  draft: SetDraft
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey(userId, workoutId, exerciseId), JSON.stringify(draft));
  } catch {
    // Logging remains usable when storage is unavailable or full.
  }
}

export function clearSetDraft(userId: string, workoutId: string, exerciseId: string): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(storageKey(userId, workoutId, exerciseId));
  } catch {
    // Storage cleanup is best-effort.
  }
}

export function clearWorkoutSetDrafts(userId: string, workoutId: string): void {
  if (typeof window === "undefined") return;

  const prefix = storageKeyPrefix(userId, workoutId);

  try {
    const keys = Array.from({ length: window.localStorage.length }, (_, index) =>
      window.localStorage.key(index)
    ).filter((key): key is string => Boolean(key?.startsWith(prefix)));

    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage cleanup is best-effort.
  }
}

function storageKey(userId: string, workoutId: string, exerciseId: string): string {
  return `${storageKeyPrefix(userId, workoutId)}${exerciseId}`;
}

function storageKeyPrefix(userId: string, workoutId: string): string {
  return `gym-progress:set-draft:${userId}:${workoutId}:`;
}

function isSetDraft(value: unknown): value is SetDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;

  return (
    (draft.setType === "working" || draft.setType === "warmup") &&
    typeof draft.weightKg === "string" &&
    typeof draft.reps === "string" &&
    typeof draft.rir === "string" &&
    typeof draft.note === "string"
  );
}
