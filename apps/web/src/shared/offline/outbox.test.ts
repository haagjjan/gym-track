import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "../api/client";
import type { Exercise, SetInput, WorkoutDetail } from "../api/types";
import { flushOutbox, OutboxBlockedError, type SendOp } from "./outbox-flush";
import { overlayWorkout, overlayWorkoutList } from "./outbox-overlay";
import { enqueueOp, newLocalId, pruneAcked, readOutbox, retryFailed, waitingOps, type OutboxOp, type OutboxStorage } from "./outbox-store";

const USER = "user-1";
const SET: SetInput = { setType: "working", weightKg: "60", reps: 8, rir: 2, restTimeSeconds: null, note: null };
const EXERCISE = { id: "exercise-1", name: "Bench Press", equipment: null, exerciseType: null } as Exercise;

function memory(): OutboxStorage {
  let value: string | null = null;
  return { read: () => value, write: (next) => { value = next; } };
}

/** A whole workout logged without a connection. */
function logOfflineWorkout(storage: OutboxStorage): { workoutId: string; sessionExerciseId: string; setIds: string[] } {
  const workoutId = newLocalId();
  const sessionExerciseId = newLocalId();
  const setIds = [newLocalId(), newLocalId()];
  enqueueOp({ kind: "startWorkout", userId: USER, workoutId, startedAt: "2026-11-14T10:00:00.000Z" }, storage);
  enqueueOp({ kind: "addExercise", userId: USER, workoutId, sessionExerciseId, exercise: EXERCISE }, storage);
  setIds.forEach((setId) => enqueueOp({ kind: "addSet", userId: USER, workoutId, sessionExerciseId, setId, input: SET }, storage));
  enqueueOp({ kind: "endWorkout", userId: USER, workoutId, endedAt: "2026-11-14T11:00:00.000Z" }, storage);
  return { workoutId, sessionExerciseId, setIds };
}

/** A fake server that hands out IDs and records what it was sent. */
function server(): { send: SendOp; seen: OutboxOp[] } {
  const seen: OutboxOp[] = [];
  let next = 0;
  return {
    seen,
    send: async (op) => {
      seen.push(op);
      return op.kind === "startWorkout" || op.kind === "addExercise" || op.kind === "addSet" ? { serverId: `server-${++next}` } : undefined;
    }
  };
}

describe("workout outbox", () => {
  it("shows a workout that only exists on the phone", () => {
    const storage = memory();
    const { workoutId, setIds } = logOfflineWorkout(storage);
    const shown = overlayWorkout(null, readOutbox(storage), USER, workoutId);

    assert.equal(shown?.isOpen, false);
    assert.equal(shown?.exercises[0]?.exercise.name, "Bench Press");
    assert.deepEqual(shown?.exercises[0]?.sets.map((set) => [set.id, set.setOrder]), [[setIds[0], 1], [setIds[1], 2]]);
    assert.equal(overlayWorkoutList({ items: [], pagination: { total: 0, limit: 10, offset: 0 }, allTimeSummary: { totalSessions: 0, completedSessions: 0, cumulativeTonnageKg: "0", averageCompletedDurationSeconds: null, completionRate: 0 } }, readOutbox(storage), USER).items[0]?.totalSets, 2);
  });

  it("folds edits and deletes into creates that have not been sent", () => {
    const storage = memory();
    const { workoutId, setIds } = logOfflineWorkout(storage);
    enqueueOp({ kind: "updateSet", userId: USER, workoutId, setId: setIds[0]!, input: { reps: 10 } }, storage);
    enqueueOp({ kind: "deleteSet", userId: USER, workoutId, setId: setIds[1]! }, storage);
    const ops = readOutbox(storage).ops;

    assert.deepEqual(ops.map((op) => op.kind), ["startWorkout", "addExercise", "addSet", "endWorkout"]);
    assert.equal(ops[2]?.kind === "addSet" && ops[2].input.reps, 10);
  });

  it("drops a workout that was started and discarded offline", () => {
    const storage = memory();
    const { workoutId } = logOfflineWorkout(storage);
    enqueueOp({ kind: "deleteWorkout", userId: USER, workoutId }, storage);

    assert.equal(readOutbox(storage).ops.length, 0);
  });

  it("sends in order with server IDs and keeps the view stable until pruned", async () => {
    const storage = memory();
    const { workoutId } = logOfflineWorkout(storage);
    const { send, seen } = server();
    const result = await flushOutbox(USER, send, storage);

    assert.deepEqual(result, { sent: 5, failed: 0, remaining: 0, blocked: null });
    assert.deepEqual(seen.map((op) => [op.kind, op.workoutId]), [["startWorkout", workoutId], ["addExercise", "server-1"], ["addSet", "server-1"], ["addSet", "server-1"], ["endWorkout", "server-1"]]);
    assert.equal(seen[2]?.kind === "addSet" && seen[2].sessionExerciseId, "server-2");
    // The server copy has not been reloaded yet: the queue still fills the screen.
    assert.equal(overlayWorkout(null, readOutbox(storage), USER, workoutId)?.exercises[0]?.sets.length, 2);
    // Once it has, applying the confirmed changes again changes nothing.
    const fromServer: WorkoutDetail = { id: "server-1", title: null, workoutType: null, startedAt: "2026-11-14T10:00:00.000Z", endedAt: "2026-11-14T11:00:00.000Z", isOpen: false, sourceTemplateId: null, exercises: [{ id: "server-2", position: 1, exercise: EXERCISE, previousPerformance: null, sets: [{ id: "server-3", setOrder: 1, ...SET, createdAt: "", updatedAt: "" }, { id: "server-4", setOrder: 2, ...SET, createdAt: "", updatedAt: "" }] }] };
    assert.equal(overlayWorkout(fromServer, readOutbox(storage), USER, workoutId)?.exercises[0]?.sets.length, 2);
    pruneAcked(USER, storage);
    assert.equal(readOutbox(storage).ops.length, 0);
    assert.equal(readOutbox(storage).idMap[workoutId], "server-1");
  });

  it("stops without losing anything when the connection drops, and resumes with the same mutation IDs", async () => {
    const storage = memory();
    logOfflineWorkout(storage);
    const { send, seen } = server();
    let calls = 0;
    const flaky: SendOp = async (op) => {
      calls += 1;
      if (calls === 3) throw new ApiError(0, "offline");
      return send(op);
    };

    assert.equal((await flushOutbox(USER, flaky, storage)).remaining, 3);
    const firstTry = readOutbox(storage).ops.find((op) => !op.acked)?.opId;
    await flushOutbox(USER, send, storage);

    assert.equal(seen[2]?.opId, firstTry);
    assert.equal(waitingOps(USER, storage).length, 0);
  });

  it("keeps a refused change and what depends on it, and sends the rest", async () => {
    const storage = memory();
    const { workoutId } = logOfflineWorkout(storage);
    enqueueOp({ kind: "updateSet", userId: USER, workoutId: "server-other", setId: "server-set", input: { reps: 5 } }, storage);
    const { send, seen } = server();
    const refuse: SendOp = async (op) => {
      if (op.kind === "addExercise") throw new ApiError(404, "This exercise no longer exists.");
      return send(op);
    };
    const result = await flushOutbox(USER, refuse, storage);

    assert.equal(result.failed, 3);
    assert.deepEqual(seen.map((op) => op.kind), ["startWorkout", "endWorkout", "updateSet"]);
    assert.equal(overlayWorkout(null, readOutbox(storage), USER, workoutId)?.exercises[0]?.sets.length, 2);
    retryFailed(USER, storage);
    assert.equal(waitingOps(USER, storage).filter((op) => op.failedReason).length, 0);
  });

  it("waits when another workout is open and treats a missing delete target as done", async () => {
    const storage = memory();
    enqueueOp({ kind: "deleteSet", userId: USER, workoutId: "server-w", setId: "server-s" }, storage);
    logOfflineWorkout(storage);
    const result = await flushOutbox(USER, async (op) => {
      if (op.kind === "deleteSet") throw new ApiError(404, "gone");
      throw new OutboxBlockedError("Another workout is still open.");
    }, storage);

    assert.equal(result.sent, 1);
    assert.equal(result.blocked, "Another workout is still open.");
    assert.equal(result.remaining, 5);
  });

  it("keeps users apart", () => {
    const storage = memory();
    logOfflineWorkout(storage);

    assert.equal(waitingOps("someone-else", storage).length, 0);
  });
});
