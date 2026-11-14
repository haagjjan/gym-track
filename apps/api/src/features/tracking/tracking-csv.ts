import Papa from "papaparse";
import { z } from "zod";
import { cardioValuesSchema, timedValuesSchema } from "./tracking.schemas.js";

const encodedColumns = ["workout_key", "workout_title", "workout_type", "workout_notes", "exercise_name", "activity", "note"] as const;
export const trackingCsvColumns = ["format_version", "workout_key", "workout_started_at", "workout_ended_at", "workout_title", "workout_type", "workout_notes", "entry_kind", "entry_recorded_at", "exercise_name", "activity", "set_type", "duration_seconds", "added_weight_kg", "distance_metres", "average_heart_rate", "calories", "note"] as const;
export type TrackingCsvRow = Record<(typeof trackingCsvColumns)[number], string>;
export interface ParsedTrackingRow { row: number; key: string; startedAt: Date; endedAt: Date; recordedAt: Date; title: string | null; workoutType: string | null; workoutNotes: string | null; exerciseName: string; kind: "time" | "cardio"; values: z.infer<typeof timedValuesSchema> | z.infer<typeof cardioValuesSchema> }
export type TrackingCsvResult = { ok: true; rows: ParsedTrackingRow[] } | { ok: false; errors: { row: number; message: string }[] };

export function parseTrackingCsv(text: string): TrackingCsvResult {
  const parsed = Papa.parse<TrackingCsvRow>(text, { header: true, skipEmptyLines: "greedy" });
  if (parsed.errors.length) return { ok: false, errors: parsed.errors.map((error) => ({ row: (error.row ?? 0) + 2, message: error.message })) };
  if (!trackingCsvColumns.every((column) => parsed.meta.fields?.includes(column))) return { ok: false, errors: [{ row: 1, message: "The time/cardio CSV header is incomplete." }] };
  if (!parsed.data.length || parsed.data.length > 10000) return { ok: false, errors: [{ row: 1, message: "Use a CSV with 1–10,000 entries." }] };
  const rows: ParsedTrackingRow[] = [];
  const errors: { row: number; message: string }[] = [];
  const workouts = new Map<string, string>();
  parsed.data.forEach((raw, index) => {
    const row = index + 2;
    if (raw.format_version !== "gymtrack-tracking-v1") { errors.push({ row, message: "Unsupported time/cardio CSV format." }); return; }
    // Every exported text cell has one protective apostrophe. Remove exactly
    // that prefix; a user-authored leading apostrophe remains intact.
    for (const column of encodedColumns) if (raw[column]?.startsWith("'")) raw[column] = raw[column].slice(1);
    const start = z.string().datetime({ offset: true }).safeParse(raw.workout_started_at);
    const end = z.string().datetime({ offset: true }).safeParse(raw.workout_ended_at);
    const recorded = z.string().datetime({ offset: true }).safeParse(raw.entry_recorded_at);
    if (!start.success || !end.success || !recorded.success || new Date(recorded.data).getTime() > Date.now() + 60000 || new Date(start.data) >= new Date(end.data) || new Date(end.data).getTime() > Date.now() + 60000 || !raw.workout_key?.trim() || raw.workout_title.length > 120 || raw.workout_type.length > 50 || raw.workout_notes.length > 2000) {
      errors.push({ row, message: "Use a workout key, valid completed workout dates and title/type/notes within their length limits." }); return;
    }
    const metadata = JSON.stringify([start.data, end.data, raw.workout_title, raw.workout_type, raw.workout_notes]);
    if (workouts.has(raw.workout_key) && workouts.get(raw.workout_key) !== metadata) { errors.push({ row, message: "Rows for one workout key must have the same dates, title, type and notes." }); return; }
    workouts.set(raw.workout_key, metadata);
    const common = { durationSeconds: Number(raw.duration_seconds), note: raw.note || null };
    const values = raw.entry_kind === "time" ? timedValuesSchema.safeParse({ ...common,
      exerciseId: "00000000-0000-4000-8000-000000000000", setType: raw.set_type, addedWeightKg: raw.added_weight_kg || null })
      : raw.entry_kind === "cardio" ? cardioValuesSchema.safeParse({ ...common, exerciseId: "00000000-0000-4000-8000-000000000000",
        distanceMetres: raw.distance_metres || null, averageHeartRate: raw.average_heart_rate ? Number(raw.average_heart_rate) : null,
        calories: raw.calories ? Number(raw.calories) : null }) : null;
    const name = (raw.entry_kind === "time" ? raw.exercise_name : raw.activity).trim();
    if (!values?.success || !name || name.length > 100) { errors.push({ row, message: "Check the entry kind, exercise, duration and metric values." }); return; }
    rows.push({ row, key: raw.workout_key, startedAt: new Date(start.data), endedAt: new Date(end.data), recordedAt: new Date(recorded.data), title: raw.workout_title || null, workoutType: raw.workout_type || null, workoutNotes: raw.workout_notes || null,
      exerciseName: name, kind: raw.entry_kind === "time" ? "time" : "cardio", values: values.data });
  });
  return errors.length ? { ok: false, errors } : { ok: true, rows };
}
export function unparseTrackingCsv(rows: TrackingCsvRow[]): string {
  const data = rows.map((row) => {
    const encoded = { ...row, format_version: "gymtrack-tracking-v1" };
    for (const column of encodedColumns) encoded[column] = "'" + row[column];
    return encoded;
  });
  return Papa.unparse({ fields: [...trackingCsvColumns], data });
}
