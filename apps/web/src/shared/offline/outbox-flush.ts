import { ApiError } from "../api/client";
import { inFlight, isLocalId, readOutbox, resolveId, writeOutbox, type OutboxOp, type OutboxStorage } from "./outbox-store";

/** The server cannot take this operation yet, but may later. Sending stops here. */
export class OutboxBlockedError extends Error {}

export interface FlushResult {
  sent: number;
  failed: number;
  remaining: number;
  blocked: string | null;
}

/** Sends one operation whose IDs are already server IDs. Returns the server ID of a created entity. */
export type SendOp = (op: OutboxOp) => Promise<{ serverId?: string } | void>;

const DEPENDENCY_FAILED = "An earlier change couldn't be sent, so this one is waiting.";

/** True when a request failed only because the phone could not reach the API. */
export function isConnectionError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

function localIds(op: OutboxOp): string[] {
  const ids = [op.workoutId];

  if ("sessionExerciseId" in op) ids.push(op.sessionExerciseId);
  if ("setId" in op) ids.push(op.setId);
  if (op.kind === "reorderExercises") ids.push(...op.order);

  return ids.filter(isLocalId);
}

/** The ID this operation creates, if any. */
function createdId(op: OutboxOp): string | null {
  if (op.kind === "startWorkout") return op.workoutId;
  if (op.kind === "addExercise") return op.sessionExerciseId;
  if (op.kind === "addSet") return op.setId;
  return null;
}

function withServerIds(op: OutboxOp, idMap: Record<string, string>): OutboxOp {
  const resolved = { ...op, workoutId: resolveId(op.workoutId, idMap) } as OutboxOp & Record<string, unknown>;

  if ("sessionExerciseId" in op) resolved.sessionExerciseId = resolveId(op.sessionExerciseId, idMap);
  if ("setId" in op) resolved.setId = resolveId(op.setId, idMap);
  if (op.kind === "reorderExercises") resolved.order = op.order.map((id) => resolveId(id, idMap));

  return resolved;
}

function patchOp(storage: OutboxStorage | undefined, opId: string, change: (op: OutboxOp) => OutboxOp, serverId?: { local: string; server: string }): void {
  const state = readOutbox(storage);

  writeOutbox({
    ops: state.ops.map((op) => op.opId === opId ? change(op) : op),
    idMap: serverId ? { ...state.idMap, [serverId.local]: serverId.server } : state.idMap
  }, storage);
}

/**
 * Sends the user's queued operations in the order they were made.
 * - Confirmed, or already gone on the server for a delete: marked done.
 * - No connection, server error, rate limit or lost session: stop, keep everything.
 * - Refused for good: kept and marked. Later operations on the same new entity wait
 *   with it; unrelated ones carry on.
 */
export async function flushOutbox(userId: string, send: SendOp, storage?: OutboxStorage): Promise<FlushResult> {
  let sent = 0;
  let failed = 0;
  let blocked: string | null = null;

  for (;;) {
    const state = readOutbox(storage);
    const op = state.ops.find((item) => item.userId === userId && !item.acked && !item.failedReason);

    if (!op) break;

    const created = createdId(op);
    const unresolved = localIds(op).filter((id) => id !== created && !state.idMap[id]);

    if (unresolved.length > 0) {
      failed += 1;
      patchOp(storage, op.opId, (item) => ({ ...item, failedReason: DEPENDENCY_FAILED }));
      continue;
    }

    inFlight.add(op.opId);

    try {
      const result = await send(withServerIds(op, state.idMap));
      const serverId = created && result?.serverId ? { local: created, server: result.serverId } : undefined;

      sent += 1;
      patchOp(storage, op.opId, (item) => {
        const done = { ...item, acked: true };
        delete done.blockedReason;
        return done;
      }, serverId);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;

      if (error instanceof OutboxBlockedError) {
        blocked = error.message;
        patchOp(storage, op.opId, (item) => ({ ...item, blockedReason: error.message }));
        break;
      }

      // Already gone on the server: the outcome the user asked for.
      if ((op.kind === "deleteSet" || op.kind === "removeExercise" || op.kind === "deleteWorkout") && status === 404) {
        sent += 1;
        patchOp(storage, op.opId, (item) => ({ ...item, acked: true }));
        continue;
      }

      if (!(error instanceof ApiError) || status === 0 || status === 401 || status === 426 || status === 429 || status >= 500) break;

      failed += 1;
      patchOp(storage, op.opId, (item) => ({ ...item, failedReason: error.message || "The server refused this change." }));
    } finally {
      inFlight.delete(op.opId);
    }
  }

  const remaining = readOutbox(storage).ops.filter((item) => item.userId === userId && !item.acked).length;

  return { sent, failed, remaining, blocked };
}
