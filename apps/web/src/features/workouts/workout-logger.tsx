"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { LogoutButton } from "../auth/logout-button";
import {
  addSessionExercise,
  deleteSessionExercise,
  endWorkout,
  getWorkout,
  reorderSessionExercises
} from "./workout-api";
import { ExercisePicker } from "./exercise-picker";
import { SessionExercisePanel } from "./session-exercise-panel";
import type { WorkoutDetail } from "./workout-types";
import { formatStartedAt, moveSessionExercise, sortWorkout } from "./workout-view-model";

interface WorkoutLoggerProps {
  workoutId: string;
}

export function WorkoutLogger({ workoutId }: WorkoutLoggerProps): ReactNode {
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const refreshWorkout = useCallback(async () => {
    const result = await getWorkout(workoutId).catch(() => null);

    if (!result || !result.ok) {
      setError(result?.message ?? "The workout could not be loaded.");
      setIsLoading(false);
      return;
    }

    setWorkout(sortWorkout(result.data.workout));
    setIsLoading(false);
  }, [workoutId]);

  useEffect(() => {
    const controller = new AbortController();

    void getWorkout(workoutId, controller.signal).then((result) => {
      if (controller.signal.aborted) {
        return;
      }

      if (!result.ok) {
        setError(result.message);
        setIsLoading(false);
        return;
      }

      setWorkout(sortWorkout(result.data.workout));
      setIsLoading(false);
    }).catch(() => {
      if (!controller.signal.aborted) {
        setError("The workout could not be loaded.");
        setIsLoading(false);
      }
    });

    return () => controller.abort();
  }, [workoutId]);

  const totalSets = useMemo(
    () => workout?.exercises.reduce((total, exercise) => total + exercise.sets.length, 0) ?? 0,
    [workout]
  );

  function handleEndWorkout(): void {
    if (!workout) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await endWorkout(workout.id);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setWorkout(sortWorkout(result.data.workout));
    });
  }

  async function handleAddExercise(exerciseId: string): Promise<boolean> {
    setError(null);
    const result = await addSessionExercise(workoutId, exerciseId);

    if (!result.ok) {
      setError(result.message);
      return false;
    }

    await refreshWorkout();
    return true;
  }

  async function handleDeleteExercise(sessionExerciseId: string): Promise<void> {
    setError(null);
    const result = await deleteSessionExercise(workoutId, sessionExerciseId);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    await refreshWorkout();
  }

  async function handleMoveExercise(
    sessionExerciseId: string,
    direction: "down" | "up"
  ): Promise<void> {
    if (!workout) {
      return;
    }

    const reordered = moveSessionExercise(workout.exercises, sessionExerciseId, direction);

    if (!reordered) {
      return;
    }

    const result = await reorderSessionExercises(
      workout.id,
      reordered.map((item, index) => ({
        sessionExerciseId: item.id,
        position: index + 1
      }))
    );

    if (!result.ok) {
      setError(result.message);
      return;
    }

    await refreshWorkout();
  }

  return (
    <main className="workoutPage">
      <header className="workoutHeader">
        <div>
          <Link className="backLink" href="/">
            Home
          </Link>
          <p className="eyebrow">{workout?.isOpen ? "Open workout" : "Closed workout"}</p>
          <h1>{workout?.title ?? "Workout"}</h1>
          <p className="leadText">{workout ? formatStartedAt(workout.startedAt) : "Loading"}</p>
        </div>
        <div className="headerActions">
          <LogoutButton />
          <button
            className="primaryAction"
            type="button"
            onClick={handleEndWorkout}
            disabled={!workout?.isOpen || isPending}
          >
            End workout
          </button>
        </div>
      </header>

      {error ? (
        <p className="formError" role="alert">
          {error}
        </p>
      ) : null}

      {isLoading ? <p className="mutedText">Loading workout.</p> : null}

      {workout ? (
        <>
          <section className="workoutStats" aria-label="Workout totals">
            <Metric label="Exercises" value={workout.exercises.length} />
            <Metric label="Sets" value={totalSets} />
            <Metric label="Status" value={workout.isOpen ? "Open" : "Closed"} />
          </section>

          <ExercisePicker onAddExercise={handleAddExercise} />

          <section className="sessionExerciseList" aria-label="Logged exercises">
            {workout.exercises.map((item, index) => (
              <SessionExercisePanel
                canMoveDown={index < workout.exercises.length - 1}
                canMoveUp={index > 0}
                item={item}
                key={item.id}
                workoutId={workout.id}
                onDeleteExercise={handleDeleteExercise}
                onMoveExercise={handleMoveExercise}
                onRefresh={refreshWorkout}
                onShowError={setError}
              />
            ))}
            {workout.exercises.length === 0 ? (
              <p className="mutedText">No exercises logged.</p>
            ) : null}
          </section>
        </>
      ) : null}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }): ReactNode {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
