"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { CockpitButton } from "../../shared/ui/cockpit";
import { createWorkout, listWorkouts } from "./workout-api";
import type { WorkoutSummary } from "./workout-types";

export function WorkoutEntryPoint(): ReactNode {
  return (
    <section className="workoutEntry" aria-label="Workout entry">
      <StartSessionAction label="Start or resume workout" pendingLabel="Opening" />
    </section>
  );
}

export function StartSessionAction({
  label,
  pendingLabel,
  variant = "legacy"
}: {
  label: string;
  pendingLabel: string;
  variant?: "cockpit" | "legacy";
}): ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick(): void {
    setError(null);
    startTransition(async () => {
      const workout = await findOrCreateOpenWorkout();

      if (!workout.ok) {
        setError(workout.message);
        return;
      }

      router.push(`/workouts/${workout.value.id}`);
      router.refresh();
    });
  }

  return (
    <div className={variant === "cockpit" ? "appShellStartAction" : undefined}>
      {variant === "cockpit" ? (
        <CockpitButton type="button" onClick={handleClick} isLoading={isPending} loadingLabel={pendingLabel}>
          {label}
        </CockpitButton>
      ) : (
        <button className="primaryAction" type="button" onClick={handleClick} disabled={isPending}>
          {isPending ? pendingLabel : label}
        </button>
      )}
      {error ? (
        <p className="inlineError" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type OpenWorkoutResult =
  | { ok: true; value: WorkoutSummary }
  | { ok: false; message: string };

async function findOrCreateOpenWorkout(): Promise<OpenWorkoutResult> {
  const existing = await getOpenWorkout();

  if (existing) {
    return { ok: true, value: existing };
  }

  const created = await createWorkout();

  if (created.ok) {
    return { ok: true, value: toSummary(created.data.workout) };
  }

  if (created.code === "OPEN_WORKOUT_EXISTS") {
    const racedWorkout = await getOpenWorkout();

    if (racedWorkout) {
      return { ok: true, value: racedWorkout };
    }
  }

  return {
    ok: false,
    message: created.message
  };
}

async function getOpenWorkout(): Promise<WorkoutSummary | null> {
  const result = await listWorkouts();

  if (!result.ok) {
    return null;
  }

  return result.data.items.find((workout) => workout.isOpen) ?? null;
}

function toSummary(workout: {
  id: string;
  startedAt: string;
  endedAt: string | null;
  isOpen: boolean;
  workoutType: string | null;
  title: string | null;
  notes: string | null;
  exercises: unknown[];
}): WorkoutSummary {
  return {
    id: workout.id,
    startedAt: workout.startedAt,
    endedAt: workout.endedAt,
    isOpen: workout.isOpen,
    workoutType: workout.workoutType,
    title: workout.title,
    notes: workout.notes,
    totalExercises: workout.exercises.length,
    totalSets: 0
  };
}
