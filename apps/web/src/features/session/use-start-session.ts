"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, apiFetch } from "../../shared/api/client";
import type { ListWorkoutsPayload } from "../../shared/api/types";
import { overlayWorkoutList } from "../../shared/offline/outbox-overlay";
import { outboxUser, readOutbox } from "../../shared/offline/outbox-store";
import { workoutHref } from "../../shared/platform/routes";

const EMPTY_LIST: ListWorkoutsPayload = {
  items: [],
  pagination: { total: 0, limit: 10, offset: 0 },
  allTimeSummary: { totalSessions: 0, completedSessions: 0, cumulativeTonnageKg: "0", averageCompletedDurationSeconds: null, completionRate: 0 }
};

interface StartSession {
  start: () => Promise<void>;
  isPending: boolean;
  error: string | null;
}

/**
 * One-tap entry into the workout flow: resume an open workout or show launch.
 * Navigation controls use this hook so they never create a workout directly.
 */
export function useStartSession(): StartSession {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(): Promise<void> {
    setIsPending(true);
    setError(null);

    try {
      const openWorkout = await findOpenWorkout();

      router.push(openWorkout ? workoutHref(openWorkout) : "/workout");
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Couldn't start the workout. Try again."
      );
    } finally {
      setIsPending(false);
    }
  }

  return { start, isPending, error };
}

async function findOpenWorkout(): Promise<string | null> {
  // A workout that only exists on the phone so far is found in the queue.
  const userId = outboxUser();
  const queued = userId
    ? overlayWorkoutList(EMPTY_LIST, readOutbox(), userId).items.find((workout) => workout.isOpen)
    : undefined;

  if (queued) return queued.id;

  try {
    const payload = await apiFetch<ListWorkoutsPayload>("/api/workouts?limit=10&offset=0");

    return payload.items.find((workout) => workout.isOpen)?.id ?? null;
  } catch {
    return null;
  }
}
