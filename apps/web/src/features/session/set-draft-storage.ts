import type { SessionExercise, SetType } from "../../shared/api/types";
import { formatKgValue } from "../../shared/format";

export interface SetDraft {
  setType: SetType;
  weightKg: string;
  reps: string;
  rir: string;
  note: string;
}

export interface ActiveSetDraft {
  clientMutationId: string;
  draft: SetDraft;
  savedAt: number;
}

interface SetDraftEnvelope extends ActiveSetDraft {
  version: 1;
}

export const SET_DRAFT_TTL_MS = 24 * 60 * 60 * 1_000;
const STORAGE_PREFIX = "gym-progress:set-draft:";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    return {
      ...fallbackDraft,
      weightKg: exercise?.previousPerformance?.bestSet.weightKg
        ? formatKgValue(exercise.previousPerformance.bestSet.weightKg)
        : fallbackDraft.weightKg
    };
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
  exercise: SessionExercise,
  now = Date.now(),
  createId: () => string = createMutationId
): ActiveSetDraft {
  const fallback = (): ActiveSetDraft => ({
    clientMutationId: createId(),
    draft: suggestedDraft(exercise),
    savedAt: now
  });
  if (typeof window === "undefined") return fallback();

  const key = storageKey(userId, workoutId, exercise.id);
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback();

    const parsed = JSON.parse(raw) as unknown;
    if (isValidEnvelope(parsed, now)) {
      return {
        clientMutationId: parsed.clientMutationId,
        draft: parsed.draft,
        savedAt: parsed.savedAt
      };
    }

    window.localStorage.removeItem(key);
    return fallback();
  } catch {
    removeBestEffort(key);
    return fallback();
  }
}

export function writeSetDraft(
  userId: string,
  workoutId: string,
  exerciseId: string,
  activeDraft: ActiveSetDraft
): void {
  if (typeof window === "undefined") return;

  const envelope: SetDraftEnvelope = {
    version: 1,
    savedAt: activeDraft.savedAt,
    clientMutationId: activeDraft.clientMutationId,
    draft: activeDraft.draft
  };

  try {
    window.localStorage.setItem(
      storageKey(userId, workoutId, exerciseId),
      JSON.stringify(envelope)
    );
  } catch {
    // Logging remains usable when storage is unavailable or full.
  }
}

export function clearSetDraft(userId: string, workoutId: string, exerciseId: string): void {
  if (typeof window === "undefined") return;
  removeBestEffort(storageKey(userId, workoutId, exerciseId));
}

export function clearWorkoutSetDrafts(userId: string, workoutId: string): void {
  removeMatchingKeys(storageKeyPrefix(userId, workoutId));
}

export function clearUserSetDrafts(userId: string): void {
  removeMatchingKeys(`${STORAGE_PREFIX}${userId}:`);
}

export function purgeExpiredSetDrafts(now = Date.now()): void {
  if (typeof window === "undefined") return;

  try {
    storageKeys()
      .filter((key) => key.startsWith(STORAGE_PREFIX))
      .forEach((key) => {
        const raw = window.localStorage.getItem(key);
        let parsed: unknown = null;
        try {
          parsed = raw === null ? null : (JSON.parse(raw) as unknown);
        } catch {
          // Invalid values are removed below.
        }
        if (!isValidEnvelope(parsed, now)) window.localStorage.removeItem(key);
      });
  } catch {
    // Storage cleanup is best-effort.
  }
}

function removeMatchingKeys(prefix: string): void {
  if (typeof window === "undefined") return;
  try {
    storageKeys()
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage cleanup is best-effort.
  }
}

function storageKeys(): string[] {
  return Array.from({ length: window.localStorage.length }, (_, index) =>
    window.localStorage.key(index)
  ).filter((key): key is string => key !== null);
}

function removeBestEffort(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage cleanup is best-effort.
  }
}

function storageKey(userId: string, workoutId: string, exerciseId: string): string {
  return `${storageKeyPrefix(userId, workoutId)}${exerciseId}`;
}

function storageKeyPrefix(userId: string, workoutId: string): string {
  return `${STORAGE_PREFIX}${userId}:${workoutId}:`;
}

function isValidEnvelope(value: unknown, now: number): value is SetDraftEnvelope {
  if (!value || typeof value !== "object") return false;
  const envelope = value as Record<string, unknown>;
  return (
    envelope.version === 1 &&
    typeof envelope.savedAt === "number" &&
    Number.isFinite(envelope.savedAt) &&
    envelope.savedAt <= now &&
    now - envelope.savedAt < SET_DRAFT_TTL_MS &&
    typeof envelope.clientMutationId === "string" &&
    uuidPattern.test(envelope.clientMutationId) &&
    isSetDraft(envelope.draft)
  );
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

function createMutationId(): string {
  return globalThis.crypto.randomUUID();
}
