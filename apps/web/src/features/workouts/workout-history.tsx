"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  handleCockpitPointerLeave,
  handleCockpitPointerMove
} from "../../shared/ui/cockpit/cockpit-reactive";
import {
  confirmWorkoutCsvImport,
  getWorkout,
  importWorkoutCsv,
  listWorkouts,
  previewWorkoutCsv
} from "./workout-api";
import type {
  CsvImportPreview,
  ListWorkoutsPayload,
  SessionExercise,
  WorkoutDetail,
  WorkoutSet,
  WorkoutSummary
} from "./workout-types";
import { formatStartedAt, sortWorkout } from "./workout-view-model";

const pageSize = 20;

type DetailMap = Record<string, WorkoutDetail | null | undefined>;

export function WorkoutHistory(): ReactNode {
  const [items, setItems] = useState<WorkoutSummary[]>([]);
  const [detailsById, setDetailsById] = useState<DetailMap>({});
  const [pagination, setPagination] = useState<ListWorkoutsPayload["pagination"] | null>(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void loadWorkouts(0, controller.signal);

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const missingItems = items.filter((item) => detailsById[item.id] === undefined);

    if (missingItems.length === 0) {
      return;
    }

    const controller = new AbortController();

    void loadWorkoutDetails(missingItems, controller.signal);

    return () => controller.abort();
  }, [detailsById, items]);

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

  async function loadWorkoutDetails(workouts: WorkoutSummary[], signal: AbortSignal): Promise<void> {
    const detailEntries = await Promise.all(
      workouts.map(async (workout) => {
        const result = await getWorkout(workout.id, signal).catch(() => null);

        if (signal.aborted) {
          return null;
        }

        return [
          workout.id,
          result?.ok ? sortWorkout(result.data.workout) : null
        ] as const;
      })
    );

    if (signal.aborted) {
      return;
    }

    setDetailsById((current) => {
      const next = { ...current };

      for (const entry of detailEntries) {
        if (entry) {
          next[entry[0]] = entry[1];
        }
      }

      return next;
    });
  }

  function handleLoadMore(): void {
    startTransition(async () => {
      await loadWorkouts(items.length);
    });
  }

  function handleImported(): void {
    setDetailsById({});
    setExpandedWorkoutId(null);
    void loadWorkouts(0);
  }

  const filteredItems = useMemo(
    () => filterWorkouts(items, detailsById, search),
    [detailsById, items, search]
  );
  const summary = useMemo(
    () => createHistorySummary(items, detailsById, pagination),
    [detailsById, items, pagination]
  );
  const hasMore = pagination ? items.length < pagination.total : false;
  const isFiltering = search.trim().length > 0;

  return (
    <main className="workoutPage historyPage">
      <header className="historyHero">
        <div>
          <nav className="pageNav" aria-label="Workout history navigation">
            <Link className="backLink" href="/">
              Dashboard
            </Link>
            <Link className="backLink" href="/workout">
              Operation select
            </Link>
          </nav>
          <p className="eyebrow">DATA_REPOSITORY // WORKOUT_LOGS</p>
          <h1>Session history</h1>
          <p className="leadText">Scan previous training blocks, inspect sets, and trace the signal from session to session.</p>
        </div>
        <label className="historySearch">
          <span>FILTER_EXERCISE</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Bench press, pull, legs..."
          />
        </label>
      </header>

      <section className="historyMetricGrid" aria-label="History metrics">
        <HistoryMetric label="TOTAL_SESSIONS" value={summary.totalSessions} tone="cyan" />
        <HistoryMetric label="CUMULATIVE_TONNAGE" value={summary.tonnage} tone="violet" />
        <HistoryMetric label="AVG_DURATION" value={summary.averageDuration} tone="green" />
        <HistoryMetric label="COMPLETION_RATE" value={summary.completionRate} tone="cyan" />
      </section>

      <section className="historyLogDeck" aria-label="Workout history">
        <div className="historyDeckHeader">
          <div>
            <p>SESSION_LOGS</p>
            <h2>{isFiltering ? "Filtered transmission" : "Latest transmissions"}</h2>
          </div>
          <span>{filteredItems.length}_VISIBLE</span>
        </div>

        {error ? (
          <p className="formError historyAlert" role="alert">
            {error}
          </p>
        ) : null}

        {isLoading ? <HistoryLoadingState /> : null}

        {!isLoading && items.length === 0 ? <EmptyHistoryState /> : null}

        {!isLoading && items.length > 0 && filteredItems.length === 0 ? (
          <div className="emptyHistory">
            <p>NO_MATCHING_LOGS</p>
            <span>Try another exercise name, protocol, or date signal.</span>
            <button className="secondaryAction" type="button" onClick={() => setSearch("")}>
              CLEAR_FILTER
            </button>
          </div>
        ) : null}

        {filteredItems.map((workout, index) => {
          const detail = detailsById[workout.id];
          const isExpanded = expandedWorkoutId === workout.id;

          return (
            <WorkoutHistoryCard
              detail={detail}
              index={index}
              isExpanded={isExpanded}
              key={workout.id}
              workout={workout}
              onToggle={() => setExpandedWorkoutId(isExpanded ? null : workout.id)}
            />
          );
        })}

        {hasMore ? (
          <button
            className="secondaryAction loadMoreAction"
            type="button"
            onClick={handleLoadMore}
            disabled={isPending}
          >
            {isPending ? "LOADING_LOGS" : "LOAD_MORE_LOGS"}
          </button>
        ) : null}
      </section>

      <CsvPortabilityPanel onImported={handleImported} />
    </main>
  );
}

function HistoryMetric({
  label,
  tone,
  value
}: {
  label: string;
  tone: "cyan" | "green" | "violet";
  value: string;
}): ReactNode {
  return (
    <div
      className="historyMetricCard"
      data-tone={tone}
      onPointerLeave={handleCockpitPointerLeave}
      onPointerMove={handleCockpitPointerMove}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WorkoutHistoryCard({
  detail,
  index,
  isExpanded,
  onToggle,
  workout
}: {
  detail: WorkoutDetail | null | undefined;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  workout: WorkoutSummary;
}): ReactNode {
  const tonnage = detail ? workoutTonnage(detail) : null;
  const exerciseNames = detail?.exercises.map((item) => item.exercise.name).slice(0, 4) ?? [];

  return (
    <article
      className="historyCard"
      data-expanded={isExpanded ? "true" : "false"}
      onPointerLeave={handleCockpitPointerLeave}
      onPointerMove={handleCockpitPointerMove}
    >
      <div className="historyCardMain">
        <div className="historyGlyph" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="historySessionTitle">
          <span>{shortDate(workout.startedAt)}</span>
          <h2>{workout.title ?? sessionTitle(workout)}</h2>
          <p>{exerciseNames.length > 0 ? exerciseNames.join(" / ") : "Exercise detail sync pending."}</p>
        </div>
        <dl className="historyCardMetrics">
          <Metric label="Duration" value={formatDuration(workout.startedAt, workout.endedAt)} />
          <Metric label="Tonnage" value={tonnage === null ? "SYNCING" : `${formatNumber(tonnage)} kg`} />
          <Metric label="Sets" value={String(workout.totalSets)} />
        </dl>
        <button
          aria-expanded={isExpanded}
          className="historyExpandButton"
          type="button"
          onClick={onToggle}
        >
          {isExpanded ? "COLLAPSE" : "EXPAND"}
        </button>
      </div>

      {isExpanded ? (
        <div className="historyDetailPanel">
          {detail === undefined ? (
            <p className="mutedText">SYNCING_SESSION_DETAIL</p>
          ) : detail === null ? (
            <p className="formError" role="alert">
              Session detail could not be loaded.
            </p>
          ) : (
            <>
              <div className="historyDetailHeader">
                <span>{detail.isOpen ? "ACTIVE_SESSION" : "ARCHIVED_SESSION"}</span>
                <Link className="secondaryLink" href={`/workouts/${detail.id}`}>
                  OPEN_FULL_LOG
                </Link>
              </div>
              <div className="historyExerciseGrid">
                {detail.exercises.map((exercise) => (
                  <HistoryExerciseDetail key={exercise.id} exercise={exercise} />
                ))}
                {detail.exercises.length === 0 ? (
                  <p className="mutedText">NO_EXERCISES_RECORDED</p>
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}
    </article>
  );
}

function HistoryExerciseDetail({ exercise }: { exercise: SessionExercise }): ReactNode {
  return (
    <section className="historyExerciseDetail">
      <header>
        <span>{exercise.position}</span>
        <div>
          <h3>{exercise.exercise.name}</h3>
          <p>{exercise.exercise.primaryMuscleGroup.name}</p>
        </div>
        <strong>{exercise.sets.length}_SETS</strong>
      </header>
      <div className="historySetGrid">
        {exercise.sets.map((set) => (
          <SetPill key={set.id} set={set} />
        ))}
        {exercise.sets.length === 0 ? <span className="historySetPill">NO_SETS</span> : null}
      </div>
    </section>
  );
}

function SetPill({ set }: { set: WorkoutSet }): ReactNode {
  return (
    <span className="historySetPill" data-type={set.setType}>
      {set.setOrder}. {set.weightKg} kg x {set.reps}
    </span>
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
    <details className="csvPanel">
      <summary>
        <span>DATA_PORTABILITY</span>
        <strong>CSV import/export</strong>
      </summary>
      <div className="csvPanelBody">
        <p>Export closed workout sets or import the canonical workout-history CSV format.</p>
        <div className="csvActions">
          <a className="secondaryLink" href="/api/workouts/export.csv">
            EXPORT_CSV
          </a>
          <form className="csvImportForm" onSubmit={handleSubmit}>
            <label>
              CHOOSE_CSV
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
              {isPending ? "CHECKING" : "PREVIEW_IMPORT"}
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
      </div>
    </details>
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
        <ReviewList title="BLOCKED_EXERCISE_NAMES" items={preview.blocked} />
      ) : null}
      {hasWarnings ? (
        <ReviewList title="NAMES_TO_REVIEW" items={preview.warnings} />
      ) : null}
      <div className="csvActions">
        {!hasBlocked ? (
          <button
            className="primaryAction"
            type="button"
            onClick={() => onImport(hasWarnings)}
            disabled={isPending}
          >
            {isPending ? "IMPORTING" : hasWarnings ? "CONFIRM_IMPORT" : "IMPORT_NOW"}
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

function EmptyHistoryState(): ReactNode {
  return (
    <div className="emptyHistory">
      <p>NO_SESSION_HISTORY</p>
      <span>Completed workouts will appear here after the first session is logged.</span>
      <Link className="primaryLink" href="/workout">
        START_SESSION
      </Link>
    </div>
  );
}

function HistoryLoadingState(): ReactNode {
  return (
    <div className="historyLoadingState">
      <span>SYNCING_LOG_ARCHIVE</span>
      <strong>Loading session history.</strong>
    </div>
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

function createHistorySummary(
  items: WorkoutSummary[],
  detailsById: DetailMap,
  pagination: ListWorkoutsPayload["pagination"] | null
): {
  averageDuration: string;
  completionRate: string;
  tonnage: string;
  totalSessions: string;
} {
  const completedItems = items.filter((item) => !item.isOpen);
  const completedDurations = completedItems
    .map((item) => workoutDurationMinutes(item.startedAt, item.endedAt))
    .filter((value): value is number => value !== null);
  const averageDuration =
    completedDurations.length > 0
      ? formatDurationMinutes(average(completedDurations))
      : "NO_DATA";
  const completionRate =
    items.length > 0 ? `${Math.round((completedItems.length / items.length) * 100)}%` : "NO_DATA";
  const tonnage = items.reduce((total, item) => total + workoutTonnage(detailsById[item.id]), 0);

  return {
    averageDuration,
    completionRate,
    tonnage: tonnage > 0 ? `${formatNumber(tonnage)} kg` : "NO_DATA",
    totalSessions: String(pagination?.total ?? items.length)
  };
}

function filterWorkouts(
  items: WorkoutSummary[],
  detailsById: DetailMap,
  search: string
): WorkoutSummary[] {
  const query = search.trim().toLowerCase();

  if (!query) {
    return items;
  }

  return items.filter((item) => {
    const detail = detailsById[item.id];
    const searchable = [
      item.title,
      item.workoutType,
      formatStartedAt(item.startedAt),
      detail?.exercises.map((exercise) => exercise.exercise.name).join(" "),
      detail?.exercises.map((exercise) => exercise.exercise.primaryMuscleGroup.name).join(" ")
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });
}

function sessionTitle(workout: WorkoutSummary): string {
  if (workout.workoutType) {
    return workout.workoutType.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  }

  return workout.isOpen ? "ACTIVE_SESSION" : `SESSION_${shortDate(workout.startedAt)}`;
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })
    .format(new Date(value))
    .toUpperCase();
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  const minutes = workoutDurationMinutes(startedAt, endedAt);

  return minutes === null ? "IN_PROGRESS" : formatDurationMinutes(minutes);
}

function workoutDurationMinutes(startedAt: string, endedAt: string | null): number | null {
  if (!endedAt) {
    return null;
  }

  return Math.max(
    1,
    Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000)
  );
}

function formatDurationMinutes(minutes: number): string {
  const roundedMinutes = Math.max(1, Math.round(minutes));
  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;

  if (hours === 0) {
    return `${roundedMinutes} min`;
  }

  return remainingMinutes === 0 ? `${hours} hr` : `${hours} hr ${remainingMinutes} min`;
}

function workoutTonnage(workout: WorkoutDetail | null | undefined): number {
  return workout?.exercises.reduce((exerciseTotal, exercise) => {
    return exerciseTotal + exercise.sets.reduce((setTotal, set) => setTotal + setVolume(set), 0);
  }, 0) ?? 0;
}

function setVolume(set: WorkoutSet): number {
  return Number(set.weightKg) * set.reps;
}

function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1
  }).format(value);
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
