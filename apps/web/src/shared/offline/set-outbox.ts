import { ApiError } from "../api/client";
import type { SetInput, WorkoutSet } from "../api/types";

/**
 * Outbox for sets logged without a connection (ADR 0025, rollout stage 1).
 *
 * Only set creates are queued. They replay through the normal endpoint with the
 * client mutation ID of ADR 0014, so a lost acknowledgement cannot create a
 * duplicate. Edits, deletes and reorders still need a connection.
 */
export interface QueuedSet {
  clientMutationId: string;
  userId: string;
  workoutId: string;
  sessionExerciseId: string;
  input: SetInput;
  queuedAt: string;
  /** Set when the server refused the set for good; it is kept, not retried. */
  failedReason?: string;
}

export interface OutboxStorage {
  read(): string | null;
  write(value: string): void;
}

const STORAGE_KEY = "gymtrack.set-outbox.v1";
const PENDING_PREFIX = "pending:";

export const browserOutboxStorage: OutboxStorage = {
  read() {
    try {
      return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  },
  write(value) {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, value);
    } catch {
      // Storage full or blocked: the caller reports the set as not saved.
      throw new Error("Couldn't save this set on the phone.");
    }
  }
};

function isQueuedSet(value: unknown): value is QueuedSet {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.clientMutationId === "string"
    && typeof item.userId === "string"
    && typeof item.workoutId === "string"
    && typeof item.sessionExerciseId === "string"
    && typeof item.queuedAt === "string"
    && typeof item.input === "object" && item.input !== null;
}

export function readOutbox(storage: OutboxStorage = browserOutboxStorage): QueuedSet[] {
  try {
    const parsed: unknown = JSON.parse(storage.read() ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isQueuedSet) : [];
  } catch {
    return [];
  }
}

function writeOutbox(items: readonly QueuedSet[], storage: OutboxStorage): void {
  storage.write(JSON.stringify(items));
}

/** Adds a set to the queue. Queuing the same mutation ID twice keeps one entry. */
export function enqueueSet(item: QueuedSet, storage: OutboxStorage = browserOutboxStorage): void {
  const items = readOutbox(storage);
  if (items.some((queued) => queued.clientMutationId === item.clientMutationId)) return;
  writeOutbox([...items, item], storage);
}

export function pendingSets(userId: string, workoutId?: string, storage: OutboxStorage = browserOutboxStorage): QueuedSet[] {
  return readOutbox(storage).filter((item) => item.userId === userId && (workoutId === undefined || item.workoutId === workoutId));
}

/** The set as the logger shows it until the server has confirmed it. */
export function optimisticSet(item: QueuedSet, setOrder: number): WorkoutSet {
  return {
    id: `${PENDING_PREFIX}${item.clientMutationId}`,
    setOrder,
    ...item.input,
    createdAt: item.queuedAt,
    updatedAt: item.queuedAt
  };
}

export function isPendingSetId(setId: string): boolean {
  return setId.startsWith(PENDING_PREFIX);
}

/** True when a save failed only because the phone could not reach the API. */
export function isConnectionError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

export interface FlushResult {
  sent: number;
  failed: number;
  remaining: number;
}

/**
 * Sends the user's queued sets in the order they were logged.
 * - Sent, or already known to the server: removed.
 * - No connection, server error, rate limit or lost session: stop and keep everything.
 * - Refused for good (the workout was finished or deleted elsewhere): kept and
 *   marked, never dropped silently and never retried in a loop.
 */
export async function flushSetOutbox(
  userId: string,
  send: (item: QueuedSet) => Promise<unknown>,
  storage: OutboxStorage = browserOutboxStorage
): Promise<FlushResult> {
  let sent = 0;
  let failed = 0;

  for (const item of pendingSets(userId, undefined, storage)) {
    if (item.failedReason) continue;

    try {
      await send(item);
      sent += 1;
      writeOutbox(readOutbox(storage).filter((queued) => queued.clientMutationId !== item.clientMutationId), storage);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;

      if (status === 0 || status === 401 || status === 426 || status === 429 || status >= 500) {
        break;
      }

      failed += 1;
      const reason = error instanceof Error ? error.message : "The server refused this set.";
      writeOutbox(
        readOutbox(storage).map((queued) => queued.clientMutationId === item.clientMutationId ? { ...queued, failedReason: reason } : queued),
        storage
      );
    }
  }

  return { sent, failed, remaining: pendingSets(userId, undefined, storage).length };
}

/** Removes every queued set of a user, for sign-out with explicit consent or account deletion. */
export function clearOutbox(userId: string, storage: OutboxStorage = browserOutboxStorage): void {
  writeOutbox(readOutbox(storage).filter((item) => item.userId !== userId), storage);
}
