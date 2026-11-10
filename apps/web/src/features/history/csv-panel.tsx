"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button, buttonClass } from "../../shared/ui/button";
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
 * import with its preview and confirm loop (warnings confirmable, blocked names
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
    <section aria-labelledby="csv-title" className="space-y-3 rounded-[var(--radius-card)] bg-surface p-4">
      <h2 className="text-title-3 text-text" id="csv-title">Import and export</h2>
      <p className="text-subhead text-text-secondary">
        Export your finished workouts, or import history from a CSV file (up to 5,000 rows).
      </p>
      <Button className="-ml-5" onClick={() => setFormatOpen(true)} size="compact" variant="plain">View CSV format</Button>

      <div className="space-y-3">
        <a className={`${buttonClass("secondary")} w-full`} download href={CSV_EXPORT_URL}>Export CSV</a>
        <div className="flex items-center gap-3">
          <label className={`${buttonClass("secondary")} shrink-0 cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent`}>
          <span>Choose CSV file</span>
          <input
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => {
              setFile(event.currentTarget.files?.[0] ?? null);
              resetFeedback();
            }}
            ref={fileInputRef}
            type="file"
          />
          </label>
          <p className="min-w-0 truncate text-subhead text-text-secondary">{file ? file.name : "No file chosen"}</p>
        </div>
        <Button className="w-full" disabled={isPending || !file} onClick={() => void handlePreview()} variant="secondary">
          {isPending && !preview ? "Checking…" : "Preview import"}
        </Button>
      </div>

      {message ? <p className="text-subhead text-success">{message}</p> : null}

      {errors.length > 0 ? (
        <ul className="space-y-1" role="alert">
          {errors.map((line) => <li className="text-subhead text-danger" key={line}>{line}</li>)}
        </ul>
      ) : null}

      {preview ? (
        <div className="space-y-3 border-t border-line pt-3">
          <p className="text-body text-text">
            {`${preview.importedWorkouts} ${preview.importedWorkouts === 1 ? "workout" : "workouts"} in ${preview.importedRows} ${preview.importedRows === 1 ? "row" : "rows"} ready to review.`}
          </p>

          {hasBlocked ? <ReviewList items={preview.blocked} title="Blocked exercise names" tone="danger" /> : null}
          {hasWarnings ? <ReviewList items={preview.warnings} title="Names to review" tone="warning" /> : null}

          {!hasBlocked ? (
            <Button className="w-full" disabled={isPending} onClick={() => void handleImport(hasWarnings)} variant="primary">
              {isPending ? "Importing…" : hasWarnings ? "Confirm import" : "Import now"}
            </Button>
          ) : (
            <p className="text-subhead text-danger">Fix the blocked names in the file, then preview again.</p>
          )}
        </div>
      ) : null}
      <CsvFormatDialog isOpen={formatOpen} onClose={() => setFormatOpen(false)} />
    </section>
  );
}

function ReviewList({
  items,
  title,
  tone
}: {
  items: CsvReviewItem[];
  title: string;
  tone: "danger" | "warning";
}): ReactNode {
  return (
    <div>
      <p className={`text-headline ${tone === "danger" ? "text-danger" : "text-warning"}`}>{title}</p>
      <ul className="mt-1 space-y-0.5">
        {items.slice(0, 6).map((item) => (
          <li className="text-subhead text-text-secondary" key={`${item.row}-${item.originalName}`}>
            Row {item.row}: {item.originalName}
            {item.suggestions.length > 0 ? `, try ${item.suggestions.join(", ")}` : ""}
          </li>
        ))}
        {items.length > 6 ? <li className="text-subhead text-text-muted">and {items.length - 6} more</li> : null}
      </ul>
    </div>
  );
}

function previewMessage(preview: CsvImportPreview): string {
  if (preview.importability === "ready") {
    return "The preview looks clean and is ready to import.";
  }

  if (preview.importability === "blocked") {
    return "Preview found blocked exercise names. Fix the CSV before importing.";
  }

  return "Preview found names to review. Confirm only if they are intentional.";
}
