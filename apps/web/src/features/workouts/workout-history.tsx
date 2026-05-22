"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { LogoutButton } from "../auth/logout-button";
import { listWorkouts } from "./workout-api";
import type { ListWorkoutsPayload, WorkoutSummary } from "./workout-types";
import { formatStartedAt } from "./workout-view-model";

const pageSize = 20;

export function WorkoutHistory(): ReactNode {
  const [items, setItems] = useState<WorkoutSummary[]>([]);
  const [pagination, setPagination] = useState<ListWorkoutsPayload["pagination"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void loadWorkouts(0, controller.signal);

    return () => controller.abort();
  }, []);

  async function loadWorkouts(offset: number, signal?: AbortSignal): Promise<void> {
    setError(null);
    const options = signal ? { limit: pageSize, offset, signal } : { limit: pageSize, offset };
    const result = await listWorkouts(options).catch(() => null);

    if (signal?.aborted) {
      return;
    }

    if (!result || !result.ok) {
      setError(result?.message ?? "Workout history could not be loaded.");
      setIsLoading(false);
      return;
    }

    setItems((current) => (offset === 0 ? result.data.items : [...current, ...result.data.items]));
    setPagination(result.data.pagination);
    setIsLoading(false);
  }

  function handleLoadMore(): void {
    startTransition(async () => {
      await loadWorkouts(items.length);
    });
  }

  const hasMore = pagination ? items.length < pagination.total : false;

  return (
    <main className="workoutPage">
      <header className="workoutHeader">
        <div>
          <nav className="pageNav" aria-label="Workout history navigation">
            <Link className="backLink" href="/">
              Home
            </Link>
          </nav>
          <p className="eyebrow">Workout history</p>
          <h1>Past workouts</h1>
          <p className="leadText">Review logged sessions and open a workout to inspect its sets.</p>
        </div>
        <LogoutButton />
      </header>

      <section className="historyList" aria-label="Workout history">
        {error ? (
          <p className="formError" role="alert">
            {error}
          </p>
        ) : null}

        {isLoading ? <p className="mutedText">Loading workout history.</p> : null}

        {!isLoading && items.length === 0 ? (
          <div className="emptyHistory">
            <p>No workouts logged yet.</p>
            <Link className="primaryLink" href="/">
              Start a workout
            </Link>
          </div>
        ) : null}

        {items.map((workout) => (
          <WorkoutHistoryRow key={workout.id} workout={workout} />
        ))}

        {hasMore ? (
          <button
            className="secondaryAction loadMoreAction"
            type="button"
            onClick={handleLoadMore}
            disabled={isPending}
          >
            {isPending ? "Loading" : "Load more"}
          </button>
        ) : null}
      </section>
    </main>
  );
}

function WorkoutHistoryRow({ workout }: { workout: WorkoutSummary }): ReactNode {
  return (
    <Link className="historyRow" href={`/workouts/${workout.id}`}>
      <span className={workout.isOpen ? "statusBadge statusOpen" : "statusBadge statusClosed"}>
        {workout.isOpen ? "Open" : "Closed"}
      </span>
      <div className="historyMain">
        <h2>{workout.title ?? "Workout"}</h2>
        <p>{formatStartedAt(workout.startedAt)}</p>
      </div>
      <dl className="historyMeta">
        <Metric label="Type" value={workout.workoutType ?? "None"} />
        <Metric label="Exercises" value={formatCount(workout.totalExercises, "exercise")} />
        <Metric label="Sets" value={formatCount(workout.totalSets, "set")} />
        <Metric label="Duration" value={formatDuration(workout.startedAt, workout.endedAt)} />
      </dl>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatCount(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) {
    return "In progress";
  }

  const minutes = Math.max(
    1,
    Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000)
  );
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}
