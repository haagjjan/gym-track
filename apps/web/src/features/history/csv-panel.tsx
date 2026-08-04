"use client";

import { useRef, useState, type ReactNode } from "react";
import { HudButton, Panel } from "../../shared/ui/ui";
import {
  CSV_EXPORT_URL,
  csvErrorLines,
  importWorkoutCsv,
  previewWorkoutCsv,
  type CsvImportPreview,
  type CsvReviewItem
} from "../../shared/api/csv";
import { CsvFormatDialog } from "./csv-format-dialog";

/**
 * Data portability: CSV export of closed workouts and the canonical-format
 * import with its preview → confirm loop (warnings confirmable, blocked names
 * must be fixed in the file).
 */
export function CsvPanel({ onImported }: { onImported: () => void }): ReactNode {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvImportPreview | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [formatOpen, setFormatOpen] = useState(false);

  function resetFeedback(): void {
    setPreview(null);
    setMessage(null);
    setErrors([]);
  }

  async function handlePreview(): Promise<void> {
    if (!file || file.size === 0) {
      setErrors(["Choose a CSV file first."]);
      return;
    }

    resetFeedback();
    setIsPending(true);

    try {
      const result = await previewWorkoutCsv(file);

      setPreview(result.preview);
      setMessage(previewMessage(result.preview));
    } catch (caught) {
      setErrors(csvErrorLines(caught));
    } finally {
      setIsPending(false);
    }
  }

  async function handleImport(confirmWarnings: boolean): Promise<void> {
    if (!file) {
      return;
    }

    setErrors([]);
    setMessage(null);
    setIsPending(true);

    try {
      const result = await importWorkoutCsv(file, confirmWarnings);
      const workoutNoun = result.importedWorkouts === 1 ? "workout" : "workouts";
      const rowNoun = result.importedRows === 1 ? "row" : "rows";

      setPreview(null);
      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setMessage(
        `Imported ${result.importedWorkouts} ${workoutNoun} from ${result.importedRows} ${rowNoun}.`
      );
      onImported();
    } catch (caught) {
      setErrors(csvErrorLines(caught));
    } finally {
      setIsPending(false);
    }
  }

  const hasWarnings = (preview?.warnings.length ?? 0) > 0;
  const hasBlocked = (preview?.blocked.length ?? 0) > 0;

  return (
    <Panel accent="lavender" eyebrow="DATA_PORTABILITY">
      <p className="text-[11px] leading-relaxed text-fg-muted">
        Export your closed workouts, or import history in the canonical CSV format
        (max 5,000 rows per file).
      </p>
      <button className="mt-2 min-h-11 text-left text-xs font-semibold text-lavender hover:text-fg" onClick={() => setFormatOpen(true)} type="button">View CSV format →</button>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <a
          className="label-caps inline-flex min-h-11 items-center justify-center rounded border border-outline-dim px-4 text-fg-muted transition-colors hover:border-cyan hover:text-cyan"
          download
          href={CSV_EXPORT_URL}
        >
          EXPORT_CSV
        </a>
        <label className="min-w-0 flex-1 cursor-pointer">
          <span className="sr-only">Choose CSV file</span>
          <input
            accept=".csv,text/csv"
            className="block w-full cursor-pointer text-xs text-fg-muted file:mr-3 file:min-h-11 file:cursor-pointer file:rounded file:border file:border-outline-dim file:bg-surface-low file:px-3 file:font-display file:text-[11px] file:font-bold file:uppercase file:tracking-[0.1em] file:text-fg-muted"
            onChange={(event) => {
              setFile(event.currentTarget.files?.[0] ?? null);
              resetFeedback();
            }}
            ref={fileInputRef}
            type="file"
          />
        </label>
        <HudButton
          disabled={isPending || !file}
          onClick={() => void handlePreview()}
          variant="outline"
        >
          {isPending && !preview ? "SCANNING…" : "PREVIEW_IMPORT"}
        </HudButton>
      </div>

      {message ? (
        <p className="mt-3 rounded border border-green/40 bg-green/5 px-3 py-2 text-xs text-green-bright">
          {message}
        </p>
      ) : null}

      {errors.length > 0 ? (
        <ul className="mt-3 space-y-1 rounded border border-red/40 bg-red/5 px-3 py-2" role="alert">
          {errors.map((line) => (
            <li className="text-xs text-red" key={line}>
              {line}
            </li>
          ))}
        </ul>
      ) : null}

      {preview ? (
        <div className="mt-3 space-y-3 rounded border border-outline-dim/60 bg-surface-low/40 p-3">
          <p className="text-xs text-fg">
            {`${preview.importedWorkouts} ${preview.importedWorkouts === 1 ? "workout" : "workouts"} / ${preview.importedRows} ${preview.importedRows === 1 ? "row" : "rows"} ready for review.`}
          </p>

          {hasBlocked ? (
            <ReviewList items={preview.blocked} title="BLOCKED_EXERCISE_NAMES" tone="red" />
          ) : null}
          {hasWarnings ? (
            <ReviewList items={preview.warnings} title="NAMES_TO_REVIEW" tone="lavender" />
          ) : null}

          {!hasBlocked ? (
            <HudButton
              disabled={isPending}
              onClick={() => void handleImport(hasWarnings)}
              size="sm"
            >
              {isPending ? "IMPORTING…" : hasWarnings ? "CONFIRM_IMPORT" : "IMPORT_NOW"}
            </HudButton>
          ) : (
            <p className="text-[11px] text-red">
              Fix the blocked names in the file, then preview again.
            </p>
          )}
        </div>
      ) : null}
      <CsvFormatDialog isOpen={formatOpen} onClose={() => setFormatOpen(false)} />
    </Panel>
  );
}

function ReviewList({
  items,
  title,
  tone
}: {
  items: CsvReviewItem[];
  title: string;
  tone: "red" | "lavender";
}): ReactNode {
  const toneClass = tone === "red" ? "text-red" : "text-lavender";

  return (
    <div>
      <p className={`label-caps ${toneClass}`}>{title}</p>
      <ul className="mt-1 space-y-0.5">
        {items.slice(0, 6).map((item) => (
          <li className="text-[11px] text-fg-muted" key={`${item.row}-${item.originalName}`}>
            Row {item.row}: {item.originalName}
            {item.suggestions.length > 0 ? ` → ${item.suggestions.join(", ")}` : ""}
          </li>
        ))}
        {items.length > 6 ? (
          <li className="text-[11px] text-outline">+{items.length - 6} more…</li>
        ) : null}
      </ul>
    </div>
  );
}

function previewMessage(preview: CsvImportPreview): string {
  if (preview.importability === "ready") {
    return "Preview is clean — ready to import.";
  }

  if (preview.importability === "blocked") {
    return "Preview found blocked exercise names. Fix the CSV before importing.";
  }

  return "Preview found names to review. Confirm only if they are intentional.";
}
