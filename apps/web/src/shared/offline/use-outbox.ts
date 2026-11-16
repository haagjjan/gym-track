"use client";

import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { isAppRuntime } from "../platform/runtime";
import { isConnectionError } from "./outbox-flush";
import { isLocalId, outboxUser, outboxVersion, readOutbox, subscribeOutbox, waitingOps, type OutboxState } from "./outbox-store";

let flushTrigger: (() => void) | null = null;

/** The app registers how a flush is started; the website never does. */
export function setOutboxFlushTrigger(trigger: (() => void) | null): void {
  flushTrigger = trigger;
}

export function requestOutboxFlush(): void {
  flushTrigger?.();
}

/** Re-renders the caller whenever the queue changes. Null on the website. */
export function useOutbox(): { state: OutboxState; userId: string } | null {
  useSyncExternalStore(subscribeOutbox, outboxVersion, () => 0);
  const userId = outboxUser();

  return isAppRuntime() && userId ? { state: readOutbox(), userId } : null;
}

/**
 * Runs a change against the API, or puts it in the queue when the phone app has
 * to: the API is unreachable, earlier changes are still waiting (order matters),
 * or the change is about something that only exists on the phone so far.
 */
export async function runOrQueue<T>(ids: readonly string[], direct: () => Promise<T>, queue: (userId: string) => T): Promise<T> {
  const userId = outboxUser();

  if (!isAppRuntime() || !userId) return direct();

  const { idMap } = readOutbox();
  const mustQueue = !onlineManager.isOnline()
    || ids.some((id) => isLocalId(id) && !idMap[id])
    || waitingOps(userId).some((op) => !op.failedReason);

  if (!mustQueue) {
    try {
      return await direct();
    } catch (error) {
      if (!isConnectionError(error)) throw error;
    }
  }

  const result = queue(userId);
  requestOutboxFlush();
  return result;
}
