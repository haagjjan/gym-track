"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { addSessionExercise, deleteSessionExercise, endWorkout, getWorkout, reorderSessionExercises } from "./workout-api";
import { ExercisePicker } from "./exercise-picker";
import { SessionExercisePanel } from "./session-exercise-panel";
import { useSetDrafts } from "./use-set-drafts";
import type { WorkoutDetail } from "./workout-types";
import { chooseActiveExerciseId, findFallbackExerciseId, formatStartedAt, moveSessionExercise, sortWorkout } from "./workout-view-model";

interface WorkoutLoggerProps {
  workoutId: string;
}

export function WorkoutLogger({ workoutId }: WorkoutLoggerProps): ReactNode {
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [activeSessionExerciseId, setActiveSessionExerciseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { clearSetDraft, getSetDraft, handleDraftChange, handleSetSaved } = useSetDrafts(workout);

  const refreshWorkout = useCallback(async (): Promise<WorkoutDetail | null> => {
    const result = await getWorkout(workoutId).catch(() => null);

    if (!result || !result.ok) {
      setError(result?.message ?? "The workout could not be loaded.");
      setIsLoading(false);
      return null;
    }

    const sortedWorkout = sortWorkout(result.data.workout);

    setWorkout(sortedWorkout);
    setActiveSessionExerciseId((current) => chooseActiveExerciseId(sortedWorkout, current));
    setIsLoading(false);
    return sortedWorkout;
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

      const sortedWorkout = sortWorkout(result.data.workout);

      setWorkout(sortedWorkout);
      setActiveSessionExerciseId((current) => chooseActiveExerciseId(sortedWorkout, current));
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

      const sortedWorkout = sortWorkout(result.data.workout);

      setWorkout(sortedWorkout);
      setActiveSessionExerciseId((current) => chooseActiveExerciseId(sortedWorkout, current));
    });
  }

  async function handleAddExercise(exerciseId: string): Promise<boolean> {
    setError(null);
    const result = await addSessionExercise(workoutId, exerciseId);

    if (!result.ok) {
      setError(result.message);
      return false;
    }

    const refreshedWorkout = await refreshWorkout();
    const newestExercise = refreshedWorkout?.exercises.at(-1);

    if (newestExercise) {
      setActiveSessionExerciseId(newestExercise.id);
    }

    return true;
  }

  async function handleDeleteExercise(sessionExerciseId: string): Promise<void> {
    setError(null);
    const fallbackExerciseId = findFallbackExerciseId(workout, sessionExerciseId);
    const result = await deleteSessionExercise(workoutId, sessionExerciseId);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    const refreshedWorkout = await refreshWorkout();
    clearSetDraft(sessionExerciseId);

    if (activeSessionExerciseId === sessionExerciseId) {
      setActiveSessionExerciseId(chooseActiveExerciseId(refreshedWorkout, fallbackExerciseId));
    }
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
          <nav className="pageNav" aria-label="Workout navigation">
            <Link className="backLink" href="/">Home</Link>
            <Link className="backLink" href="/workouts">History</Link>
          </nav>
          <p className="eyebrow">{workout?.isOpen ? "Open workout" : "Closed workout"}</p>
          <h1>{workout?.title ?? "Workout"}</h1>
          <p className="leadText">{workout ? formatStartedAt(workout.startedAt) : "Loading"}</p>
        </div>
        <div className="headerActions">
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
                isActive={item.id === activeSessionExerciseId}
                canMoveDown={index < workout.exercises.length - 1}
                canMoveUp={index > 0}
                draft={getSetDraft(item.id)}
                item={item}
                key={item.id}
                workoutId={workout.id}
                onDeleteExercise={handleDeleteExercise}
                onDraftChange={handleDraftChange}
                onMoveExercise={handleMoveExercise}
                onRefresh={refreshWorkout}
                onSelectExercise={setActiveSessionExerciseId}
                onSetSaved={handleSetSaved}
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
