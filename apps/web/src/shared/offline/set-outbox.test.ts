import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "../api/client";
import { enqueueSet, flushSetOutbox, optimisticSet, pendingSets, readOutbox, type OutboxStorage, type QueuedSet } from "./set-outbox";

function memory(): OutboxStorage {
  let value: string | null = null;
  return { read: () => value, write: (next) => { value = next; } };
}

function queued(id: string, overrides: Partial<QueuedSet> = {}): QueuedSet {
  return {
    clientMutationId: id,
    userId: "user-1",
    workoutId: "workout-1",
    sessionExerciseId: "exercise-1",
    input: { setType: "working", weightKg: "20", reps: 8, rir: 2, restTimeSeconds: null, note: null },
    queuedAt: "2026-11-14T12:00:00.000Z",
    ...overrides
  };
}

describe("set outbox", () => {
  it("keeps one entry per client mutation ID", () => {
    const storage = memory();
    enqueueSet(queued("a"), storage);
    enqueueSet(queued("a"), storage);
    enqueueSet(queued("b"), storage);

    assert.deepEqual(readOutbox(storage).map((item) => item.clientMutationId), ["a", "b"]);
  });

  it("keeps users and workouts apart", () => {
    const storage = memory();
    enqueueSet(queued("a"), storage);
    enqueueSet(queued("b", { userId: "user-2" }), storage);
    enqueueSet(queued("c", { workoutId: "workout-2" }), storage);

    assert.deepEqual(pendingSets("user-1", undefined, storage).map((item) => item.clientMutationId), ["a", "c"]);
    assert.deepEqual(pendingSets("user-1", "workout-1", storage).map((item) => item.clientMutationId), ["a"]);
  });

  it("sends in order and removes what the server accepted", async () => {
    const storage = memory();
    const order: string[] = [];
    enqueueSet(queued("a"), storage);
    enqueueSet(queued("b"), storage);
    enqueueSet(queued("other", { userId: "user-2" }), storage);

    const result = await flushSetOutbox("user-1", async (item) => { order.push(item.clientMutationId); }, storage);

    assert.deepEqual(order, ["a", "b"]);
    assert.deepEqual(result, { sent: 2, failed: 0, remaining: 0 });
    assert.deepEqual(readOutbox(storage).map((item) => item.clientMutationId), ["other"]);
  });

  it("stops at a connection error and keeps the rest for later", async () => {
    const storage = memory();
    const attempts: string[] = [];
    enqueueSet(queued("a"), storage);
    enqueueSet(queued("b"), storage);
    enqueueSet(queued("c"), storage);

    const result = await flushSetOutbox("user-1", async (item) => {
      attempts.push(item.clientMutationId);
      if (item.clientMutationId === "b") throw new ApiError(0, "offline");
    }, storage);

    assert.deepEqual(attempts, ["a", "b"]);
    assert.deepEqual(result, { sent: 1, failed: 0, remaining: 2 });
  });

  it("keeps everything when the session is lost or the server is down", async () => {
    for (const status of [401, 426, 429, 503]) {
      const storage = memory();
      enqueueSet(queued("a"), storage);

      const result = await flushSetOutbox("user-1", async () => { throw new ApiError(status, "no"); }, storage);

      assert.deepEqual(result, { sent: 0, failed: 0, remaining: 1 });
      assert.equal(readOutbox(storage)[0]?.failedReason, undefined);
    }
  });

  it("marks a refused set, keeps it, and goes on with the next", async () => {
    const storage = memory();
    enqueueSet(queued("a"), storage);
    enqueueSet(queued("b"), storage);

    const first = await flushSetOutbox("user-1", async (item) => {
      if (item.clientMutationId === "a") throw new ApiError(409, "This workout is finished.");
    }, storage);
    const second = await flushSetOutbox("user-1", async () => { throw new Error("must not retry a refused set"); }, storage);

    assert.deepEqual(first, { sent: 1, failed: 1, remaining: 1 });
    assert.equal(readOutbox(storage)[0]?.failedReason, "This workout is finished.");
    assert.deepEqual(second, { sent: 0, failed: 0, remaining: 1 });
  });

  it("shows a queued set like a saved one", () => {
    const set = optimisticSet(queued("a"), 3);

    assert.equal(set.id, "pending:a");
    assert.equal(set.setOrder, 3);
    assert.equal(set.weightKg, "20");
  });
});
