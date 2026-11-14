"use client";

import "../bootstrap";
import { onlineManager, useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { apiFetch } from "../../../web/src/shared/api/client";
import { apiRequest } from "../../../web/src/shared/api/transport";
import { hasAppSession } from "../../../web/src/shared/api/transport";
import { flushSetOutbox, pendingSets, type QueuedSet } from "../../../web/src/shared/offline/set-outbox";
import { cachedUser } from "../session/user-cache";

let flushing = false;

function sendQueuedSet(item: QueuedSet): Promise<unknown> {
  return apiFetch(`/api/workouts/${item.workoutId}/exercises/${item.sessionExerciseId}/sets`, {
    method: "POST",
    body: { ...item.input, clientMutationId: item.clientMutationId }
  });
}

/**
 * Sends sets that were logged offline as soon as the phone is back online: at
 * start, when the connection returns and when the app comes to the foreground.
 */
export function OutboxSync(): ReactNode {
  const queryClient = useQueryClient();

  useEffect(() => {
    async function flush(): Promise<void> {
      // While the API is marked unreachable nothing else asks it, so ask here.
      // Any answer marks it reachable again and resumes the paused queries.
      if (!onlineManager.isOnline()) {
        await apiRequest("/api/health").catch(() => undefined);

        if (!onlineManager.isOnline()) return;
      }

      const user = cachedUser();

      if (flushing || !user || pendingSets(user.id).length === 0 || !(await hasAppSession())) {
        return;
      }

      flushing = true;

      try {
        const result = await flushSetOutbox(user.id, sendQueuedSet);

        if (result.sent > 0) {
          await queryClient.invalidateQueries();
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

    void flush();
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [queryClient]);

  return null;
}
