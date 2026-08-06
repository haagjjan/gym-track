"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, apiFetch } from "../../shared/api/client";
import type { ListWorkoutsPayload } from "../../shared/api/types";

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

      router.push(openWorkout ? `/workouts/${openWorkout}` : "/workout");
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "The session could not be started."
      );
    } finally {
      setIsPending(false);
    }
  }

  return { start, isPending, error };
}

async function findOpenWorkout(): Promise<string | null> {
  try {
    const payload = await apiFetch<ListWorkoutsPayload>("/api/workouts?limit=10&offset=0");

    return payload.items.find((workout) => workout.isOpen)?.id ?? null;
  } catch {
    return null;
  }
}
