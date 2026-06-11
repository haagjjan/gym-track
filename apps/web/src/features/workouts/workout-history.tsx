"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import {
  confirmWorkoutCsvImport,
  importWorkoutCsv,
  listWorkouts,
  previewWorkoutCsv
} from "./workout-api";
import type { CsvImportPreview, ListWorkoutsPayload, WorkoutSummary } from "./workout-types";
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
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CsvImportPreview | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!file || file.size === 0) {
      setError("Choose a CSV file to import.");
      return;
    }

    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await previewWorkoutCsv(file).catch(() => null);

      if (!result || !result.ok) {
        setPreview(null);
        setError(formatImportError(result, false));
        return;
      }

      setPreview(result.data.preview);
      setMessage(previewMessage(result.data.preview));
    });
  }

  function handleImport(confirmWarnings: boolean): void {
    if (!file) {
      setError("Choose a CSV file to import.");
      return;
    }

    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await (confirmWarnings
        ? confirmWorkoutCsvImport(file)
        : importWorkoutCsv(file)
      ).catch(() => null);

      if (!result || !result.ok) {
        setError(formatImportError(result, true));
        return;
      }

      setPreview(null);
      setFile(null);
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
            Choose CSV
            <input
              name="workoutCsv"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setFile(nextFile);
                setPreview(null);
                setMessage(null);
                setError(null);
              }}
            />
          </label>
          <button className="primaryAction" type="submit" disabled={isPending}>
            {isPending ? "Checking" : "Preview import"}
          </button>
        </form>
      </div>
      {message ? <p className="inlineSuccess">{message}</p> : null}
      {error ? (
        <p className="formError" role="alert">
          {error}
        </p>
      ) : null}
      {preview ? <CsvImportPreviewPanel preview={preview} onImport={handleImport} isPending={isPending} /> : null}
    </section>
  );
}

function CsvImportPreviewPanel({
  preview,
  onImport,
  isPending
}: {
  preview: CsvImportPreview;
  onImport: (confirmWarnings: boolean) => void;
  isPending: boolean;
}): ReactNode {
  const hasWarnings = preview.warnings.length > 0;
  const hasBlocked = preview.blocked.length > 0;

  return (
    <div className="csvPreviewPanel">
      <p>
        {preview.importedWorkouts} workout{preview.importedWorkouts === 1 ? "" : "s"} and{" "}
        {preview.importedRows} row{preview.importedRows === 1 ? "" : "s"} are ready for review.
      </p>
      {hasBlocked ? (
        <ReviewList title="Blocked exercise names" items={preview.blocked} />
      ) : null}
      {hasWarnings ? (
        <ReviewList title="Names to review" items={preview.warnings} />
      ) : null}
      <div className="csvActions">
        {!hasBlocked ? (
          <button
            className="primaryAction"
            type="button"
            onClick={() => onImport(hasWarnings)}
            disabled={isPending}
          >
            {isPending ? "Importing" : hasWarnings ? "Confirm import" : "Import now"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ReviewList({
  title,
  items
}: {
  title: string;
  items: CsvImportPreview["warnings"];
}): ReactNode {
  return (
    <div className="csvReviewGroup">
      <h3>{title}</h3>
      <ul className="csvReviewList">
        {items.slice(0, 6).map((item) => (
          <li key={`${item.row}-${item.originalName}`}>
            <strong>Row {item.row}:</strong> {item.originalName}
            {item.suggestions.length > 0 ? ` -> ${item.suggestions.join(", ")}` : ""}
          </li>
        ))}
      </ul>
    </div>
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
        details: unknown;
      }
    | null,
  importing: boolean
): string {
  if (!result) {
    return importing ? "CSV import failed." : "CSV preview failed.";
  }

  const rowErrors = Object.entries(result.fields ?? {})
    .flatMap(([row, messages]) => messages.map((message) => `${row}: ${message}`))
    .slice(0, 3);

  return rowErrors.length > 0 ? rowErrors.join(" ") : result.message;
}

function previewMessage(preview: CsvImportPreview): string {
  if (preview.importability === "ready") {
    return "Preview looks clean. You can import this file now.";
  }

  if (preview.importability === "blocked") {
    return "Preview found blocked exercise names. Fix the CSV before importing.";
  }

  return "Preview found exercise names to review. Confirm import only if those names are intentional.";
}
