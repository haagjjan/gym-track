import { ApiError } from "./client";

export const CSV_EXPORT_URL = "/api/workouts/export.csv";
export const TRACKING_CSV_EXPORT_URL = "/api/tracking/export.csv";

export interface CsvReviewItem {
  row: number;
  originalName: string;
  suggestions: string[];
}

export interface CsvImportPreview {
  importability: "ready" | "review" | "blocked";
  importedWorkouts: number;
  importedRows: number;
  warnings: CsvReviewItem[];
  blocked: CsvReviewItem[];
}

export interface CsvImportResult {
  importedWorkouts: number;
  importedRows: number;
}

async function postCsv<T>(url: string, file: File): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "text/csv" },
    body: await file.text()
  });
  const payload = (await response.json().catch(() => null)) as {
    data?: T;
    error?: { code?: string; message?: string; fields?: Record<string, string[]>; details?: unknown };
  } | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.message ?? "CSV request failed.",
      payload?.error?.code,
      payload?.error?.fields,
      payload?.error?.details
    );
  }

  return payload?.data as T;
}

export function previewWorkoutCsv(file: File): Promise<{ preview: CsvImportPreview }> {
  return postCsv("/api/workouts/import.csv/preview", file);
}

export function importWorkoutCsv(file: File, confirmNameWarnings: boolean): Promise<CsvImportResult> {
  const url = confirmNameWarnings
    ? "/api/workouts/import.csv?confirmNameWarnings=true"
    : "/api/workouts/import.csv";

  return postCsv(url, file);
}

/** Time and cardio import: no preview, row errors come back in error.details.errors. */
export async function importTrackingCsv(text: string): Promise<number> {
  const response = await fetch("/api/tracking/import.csv", { method: "POST", headers: { "content-type": "text/csv" }, body: text });
  const payload = (await response.json().catch(() => null)) as {
    data?: { importedRows: number };
    error?: { message?: string; details?: { errors?: { row: number; message: string }[] } };
  } | null;
  if (!response.ok) {
    const rows = payload?.error?.details?.errors?.slice(0, 4).map((error) => `Row ${error.row}: ${error.message}`) ?? [];
    throw new Error(rows.join("\n") || payload?.error?.message || "Couldn't import this CSV.");
  }
  return payload?.data?.importedRows ?? 0;
}

/** Flatten the row-keyed field errors the CSV endpoints return into short lines. */
export function csvErrorLines(error: unknown): string[] {
  if (!(error instanceof ApiError)) {
    return error instanceof Error && error.message ? error.message.split("\n") : ["CSV request failed."];
  }

  const rowLines = Object.entries(error.fields ?? {})
    .flatMap(([row, messages]) => messages.map((message) => `${row}: ${message}`))
    .slice(0, 4);

  return rowLines.length > 0 ? rowLines : [error.message];
}
