"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { addSessionExercise, deleteSessionExercise, endWorkout, getWorkout, reorderSessionExercises } from "./workout-api";
import { ExercisePicker } from "./exercise-picker";
import { SessionExercisePanel } from "./session-exercise-panel";
import { useSetDrafts } from "./use-set-drafts";
import type { SessionExercise, WorkoutDetail, WorkoutSet } from "./workout-types";
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
  const activeExercise = useMemo(
    () => workout?.exercises.find((exercise) => exercise.id === activeSessionExerciseId) ?? null,
    [activeSessionExerciseId, workout]
  );
  const sessionVolume = useMemo(
    () => workout?.exercises.reduce((total, exercise) => {
      return total + exercise.sets.reduce((setTotal, set) => setTotal + setVolume(set), 0);
    }, 0) ?? 0,
    [workout]
  );
  const workingSets = useMemo(
    () => workout?.exercises.reduce((total, exercise) => {
      return total + exercise.sets.filter((set) => set.setType === "working").length;
    }, 0) ?? 0,
    [workout]
  );

  function handleEndWorkout(): void {
    if (!workout) {
      return;
    }

    const confirmed = window.confirm("Complete this workout session?");

    if (!confirmed) {
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
    const exerciseName =
      workout?.exercises.find((exercise) => exercise.id === sessionExerciseId)?.exercise.name ??
      "this exercise";
    const confirmed = window.confirm(`Remove ${exerciseName} from this session?`);

    if (!confirmed) {
      return;
    }

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
    <main className="workoutPage workoutLogger">
      <header className="workoutCommandHeader">
        <div>
          <nav className="pageNav" aria-label="Workout navigation">
            <Link className="backLink" href="/">Dashboard</Link>
            <Link className="backLink" href="/workout">Operation select</Link>
            <Link className="backLink" href="/workouts">History</Link>
          </nav>
          <p className="eyebrow">{workout?.isOpen ? "ACTIVE_MISSION" : "SESSION_ARCHIVE"}</p>
          <h1>{activeExercise ? activeExercise.exercise.name : workout?.title ?? "Workout"}</h1>
          <p className="leadText">
            {activeExercise
              ? `${activeExercise.exercise.primaryMuscleGroup.name} / ${formatStartedAt(workout?.startedAt ?? new Date().toISOString())}`
              : workout
                ? formatStartedAt(workout.startedAt)
                : "Loading session data"}
          </p>
        </div>
        <div className="workoutCommandHeader__actions">
          <div className="workoutLiveBadge" data-status={workout?.isOpen ? "open" : "closed"}>
            <span aria-hidden="true" />
            {workout?.isOpen ? "LIVE" : "CLOSED"}
          </div>
          <button
            className="dangerAction workoutCompleteAction"
            type="button"
            onClick={handleEndWorkout}
            disabled={!workout?.isOpen || isPending}
          >
            COMPLETE_SESSION
          </button>
        </div>
      </header>

      {error ? (
        <p className="formError workoutAlert" role="alert">
          {error}
        </p>
      ) : null}

      {isLoading ? <p className="mutedText workoutAlert">Loading workout.</p> : null}

      {workout ? (
        <div className="workoutLoggerLayout">
          <section className="workoutMissionDeck" aria-label="Active workout logging">
            <ActiveExerciseFocus activeExercise={activeExercise} />

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
                <div className="workoutEmptyExerciseState">
                  <p>NO_EXERCISES_INSERTED</p>
                  <span>Movement queue standing by.</span>
                </div>
              ) : null}
            </section>
          </section>

          <aside className="workoutTelemetryPanel" aria-label="Session metrics">
            <section className="workoutTimerPanel">
              <span>SESSION_TIMER</span>
              <strong>{workout.endedAt ? "COMPLETE" : <SessionTimer startedAt={workout.startedAt} />}</strong>
              <small>{formatStartedAt(workout.startedAt)}</small>
            </section>
            <section className="workoutStats" aria-label="Workout totals">
              <Metric label="Exercises" value={workout.exercises.length} />
              <Metric label="Sets" value={totalSets} />
              <Metric label="Working" value={workingSets} />
              <Metric label="Volume" value={`${formatNumber(sessionVolume)} kg`} />
            </section>
            <ExerciseNavigator
              activeSessionExerciseId={activeSessionExerciseId}
              exercises={workout.exercises}
              onSelectExercise={setActiveSessionExerciseId}
            />
          </aside>
        </div>
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

function ActiveExerciseFocus({
  activeExercise
}: {
  activeExercise: SessionExercise | null;
}): ReactNode {
  if (!activeExercise) {
    return (
      <section className="activeExerciseFocus activeExerciseFocus--empty">
        <p>ACTIVE_EXERCISE</p>
        <h2>Insert an exercise to begin</h2>
        <span>Set console idle.</span>
      </section>
    );
  }

  const lastSet = activeExercise.sets.at(-1);

  return (
    <section className="activeExerciseFocus">
      <p>ACTIVE_EXERCISE</p>
      <h2>{activeExercise.exercise.name}</h2>
      <div className="activeExerciseFocus__meta">
        <span>{activeExercise.exercise.primaryMuscleGroup.name}</span>
        <span>{formatSetCount(activeExercise.sets.length)}</span>
        <span>{lastSet ? formatSetHeadline(lastSet) : "NO_SETS_SAVED"}</span>
      </div>
    </section>
  );
}

function ExerciseNavigator({
  activeSessionExerciseId,
  exercises,
  onSelectExercise
}: {
  activeSessionExerciseId: string | null;
  exercises: SessionExercise[];
  onSelectExercise: (sessionExerciseId: string) => void;
}): ReactNode {
  return (
    <section className="exerciseNavigator" aria-label="Exercise switcher">
      <div className="exerciseNavigator__header">
        <span>EXERCISE_QUEUE</span>
        <strong>{exercises.length}</strong>
      </div>
      {exercises.length > 0 ? (
        <div className="exerciseNavigator__list">
          {exercises.map((exercise) => (
            <button
              aria-current={exercise.id === activeSessionExerciseId ? "true" : undefined}
              className="exerciseNavigator__item"
              key={exercise.id}
              type="button"
              onClick={() => onSelectExercise(exercise.id)}
            >
              <span>{exercise.position}</span>
              <strong>{exercise.exercise.name}</strong>
              <small>{formatSetCount(exercise.sets.length)}</small>
            </button>
          ))}
        </div>
      ) : (
        <p className="mutedText">Mission queue empty.</p>
      )}
    </section>
  );
}

function SessionTimer({ startedAt }: { startedAt: string }): ReactNode {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(interval);
  }, []);

  return formatElapsed(new Date(startedAt).getTime(), now);
}

function setVolume(set: WorkoutSet): number {
  return Number(set.weightKg) * set.reps;
}

function formatSetCount(count: number): string {
  return count === 1 ? "1_SET" : `${count}_SETS`;
}

function formatSetHeadline(set: WorkoutSet): string {
  return `${set.weightKg}kg x ${set.reps}`;
}

function formatElapsed(start: number, end: number): string {
  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [minutes, seconds].map((value) => String(value).padStart(2, "0"));

  return hours > 0 ? `${hours}:${parts.join(":")}` : parts.join(":");
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1
  }).format(value);
}
