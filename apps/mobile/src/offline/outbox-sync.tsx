"use client";

import "../bootstrap";
import { onlineManager, useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { ApiError, apiFetch } from "../../../web/src/shared/api/client";
import { apiRequest, hasAppSession } from "../../../web/src/shared/api/transport";
import type { ListWorkoutsPayload, SessionExercise, WorkoutDetail, WorkoutSet } from "../../../web/src/shared/api/types";
import { refreshCatalog } from "../../../web/src/shared/offline/exercise-catalog";
import { flushOutbox, OutboxBlockedError } from "../../../web/src/shared/offline/outbox-flush";
import { pruneAcked, retryFailed, waitingOps, type OutboxOp } from "../../../web/src/shared/offline/outbox-store";
import { setOutboxFlushTrigger, useOutbox } from "../../../web/src/shared/offline/use-outbox";
import { Button } from "../../../web/src/shared/ui/button";
import { cachedUser } from "../session/user-cache";

let flushing = false;

/** A workout started offline while another one is still open on the account. */
async function startWorkout(op: OutboxOp & { kind: "startWorkout" }): Promise<{ serverId: string }> {
  try {
    const payload = await apiFetch<{ workout: WorkoutDetail }>("/api/workouts", { method: "POST", body: { startedAt: op.startedAt } });
    return { serverId: payload.workout.id };
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 409) throw error;
    const list = await apiFetch<ListWorkoutsPayload>("/api/workouts?limit=10&offset=0");
    const open = list.items.find((workout) => workout.isOpen);
    // The same start time means our own earlier request got through and only its answer was lost.
    if (open && new Date(open.startedAt).getTime() === new Date(op.startedAt).getTime()) return { serverId: open.id };
    throw new OutboxBlockedError("Another workout is still open on your account. Finish it, and the one saved on this phone is sent.");
  }
}

/** Sends one queued change through the normal endpoints (IDs are server IDs here). */
async function sendOp(op: OutboxOp): Promise<{ serverId?: string } | void> {
  const workout = `/api/workouts/${op.workoutId}`;

  switch (op.kind) {
    case "startWorkout":
      return startWorkout(op);
    case "updateWorkout":
      return void await apiFetch(workout, { method: "PATCH", body: op.input });
    case "endWorkout":
      return void await apiFetch(`${workout}/end`, { method: "POST", body: { endedAt: op.endedAt } });
    case "deleteWorkout":
      return void await apiFetch(workout, { method: "DELETE" });
    case "addExercise": {
      const payload = await apiFetch<{ sessionExercise: SessionExercise }>(`${workout}/exercises`, { method: "POST", body: { clientMutationId: op.opId, exerciseId: op.exercise.id } });
      return { serverId: payload.sessionExercise.id };
    }
    case "removeExercise":
      return void await apiFetch(`${workout}/exercises/${op.sessionExerciseId}`, { method: "DELETE" });
    case "reorderExercises":
      return void await apiFetch(`${workout}/exercises/reorder`, { method: "PATCH", body: { items: op.order.map((sessionExerciseId, index) => ({ sessionExerciseId, position: index + 1 })) } });
    case "addSet": {
      const payload = await apiFetch<{ set: WorkoutSet }>(`${workout}/exercises/${op.sessionExerciseId}/sets`, { method: "POST", body: { ...op.input, clientMutationId: op.opId } });
      return { serverId: payload.set.id };
    }
    case "updateSet":
      return void await apiFetch(`/api/sets/${op.setId}`, { method: "PATCH", body: op.input });
    case "deleteSet":
      return void await apiFetch(`/api/sets/${op.setId}`, { method: "DELETE" });
  }
}

/**
 * Sends what was logged offline as soon as the API answers again: at start, when
 * the connection returns, when the app comes to the foreground and right after a
 * change was queued. Shows a notice only when something needs the user.
 */
export function OutboxSync(): ReactNode {
  const queryClient = useQueryClient();
  const outbox = useOutbox();

  useEffect(() => {
    async function flush(): Promise<void> {
      // While the API is marked unreachable nothing else asks it, so ask here.
      // Any answer marks it reachable again and resumes the paused queries.
      if (!onlineManager.isOnline()) {
        await apiRequest("/api/health").catch(() => undefined);

        if (!onlineManager.isOnline()) return;
      }

      const user = cachedUser();

      // Keep the phone's copy of the exercise list fresh for offline use.
      if (user && await hasAppSession()) void refreshCatalog().catch(() => undefined);

      if (flushing || !user || waitingOps(user.id).every((op) => op.failedReason) || !(await hasAppSession())) {
        return;
      }

      flushing = true;

      try {
        const result = await flushOutbox(user.id, sendOp);

        if (result.sent > 0) {
          // Reload the server copies, then drop the confirmed changes shown on top of them.
          await queryClient.invalidateQueries();
          pruneAcked(user.id);
        }
      } finally {
        flushing = false;
      }
    }

    const onVisible = (): void => {
      if (document.visibilityState === "visible") void flush();
    };
    const onOnline = (): void => void flush();
    const timer = window.setInterval(() => void flush(), 15_000);

    setOutboxFlushTrigger(() => void flush());
    void flush();
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      setOutboxFlushTrigger(null);
      window.clearInterval(timer);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [queryClient]);

  if (!outbox) return null;

  const waiting = outbox.state.ops.filter((op) => op.userId === outbox.userId && !op.acked);
  const failed = waiting.filter((op) => op.failedReason);
  const blocked = waiting.find((op) => op.blockedReason)?.blockedReason;

  if (failed.length === 0 && !blocked) return null;

  return (
    <div className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.5rem)] z-50 rounded-xl border border-border bg-surface p-3 text-footnote text-text shadow-lg" role="status">
      <p>{blocked ?? `${failed.length === 1 ? "One change" : `${failed.length} changes`} couldn't be sent. Your data is still on this phone.`}</p>
      {failed[0]?.failedReason ? <p className="mt-1 text-text-secondary">{failed[0].failedReason}</p> : null}
      <Button
        className="mt-2"
        onClick={() => {
          retryFailed(outbox.userId);
          setTimeout(() => window.dispatchEvent(new Event("online")), 0);
        }}
        variant="secondary"
      >
        Try again
      </Button>
    </div>
  );
}
