import Papa from "papaparse";
import { z } from "zod";
import { groupWorkoutCsvRows } from "./workout-csv-grouping.js";

export const workoutCsvColumns = [
  "workout_started_at",
  "workout_ended_at",
  "workout_type",
  "workout_title",
  "workout_notes",
  "exercise_name",
  "primary_muscle_group_slug",
  "equipment",
  "exercise_type",
  "exercise_position",
  "set_order",
  "set_type",
  "weight_kg",
  "reps",
  "rir",
  "rest_time_seconds",
  "set_note"
] as const;

type WorkoutCsvColumn = (typeof workoutCsvColumns)[number];
type RawCsvRow = Record<WorkoutCsvColumn, string>;

export interface WorkoutCsvError {
  row: number;
  field: string;
  message: string;
}

export interface ParsedWorkoutCsvRow {
  row: number;
  workoutStartedAt: Date;
  workoutEndedAt: Date;
  workoutType: string | null;
  workoutTitle: string | null;
  workoutNotes: string | null;
  exerciseName: string;
  primaryMuscleGroupSlug: string;
  equipment: string | null;
  exerciseType: string | null;
  exercisePosition: number;
  setOrder: number;
  setType: "warmup" | "working";
  weightKg: string;
  reps: number;
  rir: number;
  restTimeSeconds: number | null;
  setNote: string | null;
}

export interface WorkoutCsvWorkout {
  startedAt: Date;
  endedAt: Date;
  workoutType: string | null;
  title: string | null;
  notes: string | null;
  exercises: WorkoutCsvExercise[];
}

export interface WorkoutCsvExercise {
  name: string;
  primaryMuscleGroupSlug: string;
  equipment: string | null;
  exerciseType: string | null;
  position: number;
  row: number;
  sets: WorkoutCsvSet[];
}

interface WorkoutCsvSet {
  setOrder: number;
  setType: "warmup" | "working";
  weightKg: string;
  reps: number;
  rir: number;
  restTimeSeconds: number | null;
  note: string | null;
}

export type WorkoutCsvParseResult =
  | { ok: true; rows: ParsedWorkoutCsvRow[]; workouts: WorkoutCsvWorkout[] }
  | { ok: false; errors: WorkoutCsvError[] };

const isoInstantSchema = z.string().datetime({ offset: true });
const decimalPattern = /^\d+(?:\.\d{1,2})?$/;

export function parseWorkoutCsv(input: string): WorkoutCsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(input, {
    header: true,
    skipEmptyLines: "greedy",
    transform: (value) => value.trim(),
    transformHeader: (header) => header.trim()
  });
  const errors = [
    ...headerErrors(parsed.meta.fields ?? []),
    ...parsed.errors.map((error) => ({
      row: (error.row ?? 0) + 2,
      field: "csv",
      message: error.message
    }))
  ];

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const rows = parseRows(parsed.data as RawCsvRow[]);

  if (!rows.ok) {
    return rows;
  }

  const grouped = groupWorkoutCsvRows(rows.rows);

  return grouped.ok ? { ok: true, rows: rows.rows, workouts: grouped.workouts } : grouped;
}

export function unparseWorkoutCsv(rows: RawCsvRow[]): string {
  return Papa.unparse({
    fields: [...workoutCsvColumns],
    data: rows
  });
}

function headerErrors(fields: string[]): WorkoutCsvError[] {
  const expected = new Set<string>(workoutCsvColumns);
  const actual = new Set(fields);
  const errors: WorkoutCsvError[] = [];

  for (const column of workoutCsvColumns) {
    if (!actual.has(column)) {
      errors.push({ row: 1, field: column, message: "Column is required." });
    }
  }

  for (const field of fields) {
    if (!expected.has(field)) {
      errors.push({ row: 1, field, message: "Column is not part of the canonical CSV format." });
    }
  }

  return errors;
}

function parseRows(
  rows: RawCsvRow[]
): { ok: true; rows: ParsedWorkoutCsvRow[] } | { ok: false; errors: WorkoutCsvError[] } {
  const parsedRows: ParsedWorkoutCsvRow[] = [];
  const errors: WorkoutCsvError[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const parsed = parseRow(row, rowNumber);

    if (parsed.ok) {
      parsedRows.push(parsed.row);
    } else {
      errors.push(...parsed.errors);
    }
  });

  if (rows.length === 0) {
    errors.push({ row: 2, field: "csv", message: "CSV must include at least one workout row." });
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, rows: parsedRows };
}

function parseRow(
  row: RawCsvRow,
  rowNumber: number
): { ok: true; row: ParsedWorkoutCsvRow } | { ok: false; errors: WorkoutCsvError[] } {
  const errors: WorkoutCsvError[] = [];
  const startedAt = parseInstant(row.workout_started_at, rowNumber, "workout_started_at", errors);
  const endedAt = parseInstant(row.workout_ended_at, rowNumber, "workout_ended_at", errors);
  const exerciseName = requiredText(row.exercise_name, rowNumber, "exercise_name", 120, errors);
  const muscleSlug = requiredText(
    row.primary_muscle_group_slug,
    rowNumber,
    "primary_muscle_group_slug",
    80,
    errors
  );
  const position = positiveInteger(row.exercise_position, rowNumber, "exercise_position", errors);
  const setOrder = positiveInteger(row.set_order, rowNumber, "set_order", errors);
  const setType = parseSetType(row.set_type, rowNumber, errors);
  const weightKg = parseWeight(row.weight_kg, rowNumber, errors);
  const reps = positiveInteger(row.reps, rowNumber, "reps", errors);
  const rir = boundedInteger(row.rir, rowNumber, "rir", 0, 10, errors);
  const rest = optionalNonNegativeInteger(row.rest_time_seconds, rowNumber, errors);
  const workoutType = optionalText(row.workout_type, rowNumber, "workout_type", 50, errors);
  const workoutTitle = optionalText(row.workout_title, rowNumber, "workout_title", 120, errors);
  const workoutNotes = optionalText(row.workout_notes, rowNumber, "workout_notes", 2_000, errors);
  const equipment = optionalText(row.equipment, rowNumber, "equipment", 120, errors);
  const exerciseType = optionalText(row.exercise_type, rowNumber, "exercise_type", 50, errors);
  const setNote = optionalText(row.set_note, rowNumber, "set_note", 2_000, errors);

  if (startedAt && endedAt && endedAt < startedAt) {
    errors.push({
      row: rowNumber,
      field: "workout_ended_at",
      message: "workout_ended_at must be after workout_started_at."
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    row: {
      row: rowNumber,
      workoutStartedAt: startedAt as Date,
      workoutEndedAt: endedAt as Date,
      workoutType,
      workoutTitle,
      workoutNotes,
      exerciseName: exerciseName as string,
      primaryMuscleGroupSlug: (muscleSlug as string).toLowerCase(),
      equipment,
      exerciseType,
      exercisePosition: position as number,
      setOrder: setOrder as number,
      setType: setType as "warmup" | "working",
      weightKg: weightKg as string,
      reps: reps as number,
      rir: rir as number,
      restTimeSeconds: rest,
      setNote
    }
  };
}

function parseInstant(value: string, row: number, field: string, errors: WorkoutCsvError[]): Date | null {
  if (!value || !isoInstantSchema.safeParse(value).success) {
    errors.push({ row, field, message: "Expected an ISO 8601 timestamp with offset." });
    return null;
  }

  return new Date(value);
}

function requiredText(
  value: string,
  row: number,
  field: string,
  maxLength: number,
  errors: WorkoutCsvError[]
): string | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    errors.push({ row, field, message: "Value is required." });
    return null;
  }

  if (trimmed.length > maxLength) {
    errors.push({ row, field, message: `Must be ${maxLength} characters or fewer.` });
    return null;
  }

  return trimmed;
}

function optionalText(
  value: string,
  row: number,
  field: string,
  maxLength: number,
  errors: WorkoutCsvError[]
): string | null {
  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    errors.push({ row, field, message: `Must be ${maxLength} characters or fewer.` });
    return null;
  }

  return trimmed.length > 0 ? trimmed : null;
}

function positiveInteger(
  value: string,
  row: number,
  field: string,
  errors: WorkoutCsvError[]
): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    errors.push({ row, field, message: "Expected a positive integer." });
    return null;
  }

  return parsed;
}

function boundedInteger(
  value: string,
  row: number,
  field: string,
  min: number,
  max: number,
  errors: WorkoutCsvError[]
): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    errors.push({ row, field, message: `Expected an integer from ${min} to ${max}.` });
    return null;
  }

  return parsed;
}

function optionalNonNegativeInteger(
  value: string,
  row: number,
  errors: WorkoutCsvError[]
): number | null {
  if (value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    errors.push({ row, field: "rest_time_seconds", message: "Expected a non-negative integer." });
    return null;
  }

  return parsed;
}

function parseSetType(
  value: string,
  row: number,
  errors: WorkoutCsvError[]
): "warmup" | "working" | null {
  if (value === "warmup" || value === "working") {
    return value;
  }

  errors.push({ row, field: "set_type", message: "Expected warmup or working." });
  return null;
}

function parseWeight(value: string, row: number, errors: WorkoutCsvError[]): string | null {
  if (!decimalPattern.test(value)) {
    errors.push({ row, field: "weight_kg", message: "Expected a positive kg value with up to 2 decimals." });
    return null;
  }

  const parsed = Number(value);

  if (parsed <= 0 || parsed > 9999.99) {
    errors.push({ row, field: "weight_kg", message: "Expected a kg value from 0.01 to 9999.99." });
    return null;
  }

  return parsed.toFixed(2);
}
