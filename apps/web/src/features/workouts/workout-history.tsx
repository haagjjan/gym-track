"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { LogoutButton } from "../auth/logout-button";
import { importWorkoutCsv, listWorkouts } from "./workout-api";
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

      <CsvPortabilityPanel onImported={() => loadWorkouts(0)} />

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

function CsvPortabilityPanel({ onImported }: { onImported: () => void }): ReactNode {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("workoutCsv");

    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a CSV file to import.");
      return;
    }

    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await importWorkoutCsv(file).catch(() => null);

      if (!result || !result.ok) {
        setError(formatImportError(result));
        return;
      }

      form.reset();
      const workoutNoun = result.data.importedWorkouts === 1 ? "workout" : "workouts";
      const rowNoun = result.data.importedRows === 1 ? "row" : "rows";
      setMessage(
        `Imported ${result.data.importedWorkouts} ${workoutNoun} from ${result.data.importedRows} ${rowNoun}.`
      );
      onImported();
    });
  }

  return (
    <section className="csvPanel" aria-label="CSV import and export">
      <div>
        <h2>CSV data</h2>
        <p>Export your closed workout sets or import the canonical workout-history CSV format.</p>
      </div>
      <div className="csvActions">
        <a className="secondaryLink" href="/api/workouts/export.csv">
          Export CSV
        </a>
        <form className="csvImportForm" onSubmit={handleSubmit}>
          <label>
            Import CSV
            <input name="workoutCsv" type="file" accept=".csv,text/csv" />
          </label>
          <button className="primaryAction" type="submit" disabled={isPending}>
            {isPending ? "Importing" : "Import"}
          </button>
        </form>
      </div>
      {message ? <p className="inlineSuccess">{message}</p> : null}
      {error ? (
        <p className="formError" role="alert">
          {error}
        </p>
      ) : null}
    </section>
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

function formatImportError(
  result:
    | {
        ok: false;
        message: string;
        fields: Record<string, string[]> | undefined;
      }
    | null
): string {
  if (!result) {
    return "CSV import failed.";
  }

  const rowErrors = Object.entries(result.fields ?? {})
    .flatMap(([row, messages]) => messages.map((message) => `${row}: ${message}`))
    .slice(0, 3);

  return rowErrors.length > 0 ? rowErrors.join(" ") : result.message;
}
