"use client";

import { useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, buttonClass } from "../../shared/ui/button";
import { fetchFile, saveFile } from "../../shared/save-file";
import { Segmented } from "../progress/progress-segmented";
import {
  CSV_EXPORT_URL,
  csvErrorLines,
  importTrackingCsv,
  importWorkoutCsv,
  previewWorkoutCsv,
  TRACKING_CSV_EXPORT_URL,
  type CsvImportPreview,
  type CsvReviewItem
} from "../../shared/api/csv";
import { CsvFormatDialog } from "./csv-format-dialog";

/**
 * Data portability in one card: export or import strength workouts (preview and
 * confirm loop; warnings confirmable, blocked names must be fixed in the file) or,
 * with extended tracking, the separate time and cardio CSV.
 */
export function CsvPanel({ extendedTracking = false, onImported }: { extendedTracking?: boolean; onImported: () => void }): ReactNode {
  const client = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<CsvKind>("strength");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvImportPreview | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [formatOpen, setFormatOpen] = useState(false);
  const [readyExport, setReadyExport] = useState<File | null>(null);

  function clearFile(): void {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetFeedback(): void {
    setPreview(null);
    setMessage(null);
    setErrors([]);
    setReadyExport(null);
  }

  async function run(task: () => Promise<void>): Promise<void> {
    setIsPending(true);
    try {
      await task();
    } catch (caught) {
      setErrors(csvErrorLines(caught));
    } finally {
      setIsPending(false);
    }
  }

  async function handleSave(exported: File): Promise<void> {
    const result = await saveFile(exported);
    setReadyExport(result === "needs-tap" ? exported : null);
    if (result === "saved") setMessage("Your file is ready.");
  }

  function handleExport(): void {
    resetFeedback();
    clearFile();
    void run(async () => {
      const exported = kind === "strength"
        ? await fetchFile(CSV_EXPORT_URL, "gym-workouts.csv")
        : await fetchFile(TRACKING_CSV_EXPORT_URL, "gym-time-cardio.csv");
      await handleSave(exported);
    });
  }

  function handleFileChosen(next: File | null): void {
    resetFeedback();
    setFile(next);
    if (!next) return;
    if (next.size === 0) {
      setErrors(["This file is empty."]);
      return;
    }
    // Strength files are checked right away; the preview holds the import button.
    if (kind === "strength") {
      void run(async () => {
        const result = await previewWorkoutCsv(next);
        setPreview(result.preview);
        setMessage(previewMessage(result.preview));
      });
    }
  }

  function handleStrengthImport(confirmWarnings: boolean): void {
    if (!file) return;
    setErrors([]);
    setMessage(null);
    void run(async () => {
      const result = await importWorkoutCsv(file, confirmWarnings);
      clearFile();
      setMessage(`Imported ${plural(result.importedWorkouts, "workout")} from ${plural(result.importedRows, "row")}.`);
      onImported();
    });
  }

  function handleTrackingImport(): void {
    if (!file) return;
    setErrors([]);
    setMessage(null);
    void run(async () => {
      const importedRows = await importTrackingCsv(await file.text());
      clearFile();
      setMessage(`Imported ${plural(importedRows, "entry", "entries")}.`);
      await Promise.all(["tracking", "tracking-progress", "workouts", "workouts-infinite", "weekly-volume"]
        .map((key) => client.invalidateQueries({ queryKey: [key] })));
      onImported();
    });
  }

  const hasWarnings = (preview?.warnings.length ?? 0) > 0;
  const hasBlocked = (preview?.blocked.length ?? 0) > 0;

  return (
    <section aria-labelledby="csv-title" className="space-y-3 rounded-[var(--radius-card)] bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title-3 text-text" id="csv-title">Import and export</h2>
        {kind === "strength" ? (
          <Button className="-mr-4 shrink-0" onClick={() => setFormatOpen(true)} size="compact" variant="plain">CSV format</Button>
        ) : null}
      </div>

      {extendedTracking ? (
        <Segmented
          label="CSV type"
          onChange={(next: CsvKind) => { setKind(next); resetFeedback(); clearFile(); }}
          options={[{ label: "Strength", value: "strength" }, { label: "Time and cardio", value: "tracking" }]}
          tone="card"
          value={kind}
        />
      ) : null}

      <p className="text-subhead text-text-secondary">
        {kind === "strength"
          ? "Finished workouts as a CSV file, up to 5,000 rows."
          : "Finished time and cardio entries. Imports add new workouts; create named time exercises first."}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Button disabled={isPending} onClick={handleExport} variant="secondary">Export</Button>
        <label aria-disabled={isPending || undefined} className={`${buttonClass("secondary")} cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${isPending ? "pointer-events-none opacity-50" : ""}`}>
          <span>Import</span>
          <input
            accept=".csv,text/csv"
            aria-label={kind === "strength" ? "Import a workout CSV file" : "Import a time and cardio CSV file"}
            className="sr-only"
            disabled={isPending}
            onChange={(event) => handleFileChosen(event.currentTarget.files?.[0] ?? null)}
            ref={fileInputRef}
            type="file"
          />
        </label>
      </div>

      {isPending ? <p className="text-subhead text-text-secondary" role="status">Working…</p> : null}

      {readyExport ? (
        <Button className="w-full" onClick={() => void handleSave(readyExport)} variant="primary">Save {readyExport.name}</Button>
      ) : null}

      {message ? <p className="break-words text-subhead text-success" role="status">{message}</p> : null}

      {errors.length > 0 ? (
        <ul className="space-y-1" role="alert">
          {errors.map((line) => <li className="break-words text-subhead text-danger" key={line}>{line}</li>)}
        </ul>
      ) : null}

      {file && kind === "tracking" && errors.length === 0 ? (
        <div className="space-y-3 border-t border-line pt-3">
          <p className="truncate text-body text-text">{file.name}</p>
          <Button className="w-full" disabled={isPending} onClick={handleTrackingImport} variant="primary">Import file</Button>
        </div>
      ) : null}

      {preview ? (
        <div className="space-y-3 border-t border-line pt-3">
          <p className="text-body text-text">
            {`${plural(preview.importedWorkouts, "workout")} in ${plural(preview.importedRows, "row")} ready to review.`}
          </p>

          {hasBlocked ? <ReviewList items={preview.blocked} title="Blocked exercise names" tone="danger" /> : null}
          {hasWarnings ? <ReviewList items={preview.warnings} title="Names to review" tone="warning" /> : null}

          {!hasBlocked ? (
            <Button className="w-full" disabled={isPending} onClick={() => handleStrengthImport(hasWarnings)} variant="primary">
              {hasWarnings ? "Confirm import" : "Import now"}
            </Button>
          ) : (
            <p className="text-subhead text-danger">Fix the blocked names in the file, then import it again.</p>
          )}
        </div>
      ) : null}
      <CsvFormatDialog isOpen={formatOpen} onClose={() => setFormatOpen(false)} />
    </section>
  );
}

type CsvKind = "strength" | "tracking";

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
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
