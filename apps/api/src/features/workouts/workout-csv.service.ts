import {
  parseWorkoutCsv,
  unparseWorkoutCsv,
  type WorkoutCsvError,
  type WorkoutCsvWorkout
} from "./workout-csv.js";
import type { WorkoutCsvRepository } from "./workout-csv.repository.js";
import {
  evaluateExerciseName,
  type ExerciseNameEvaluation,
  type ExerciseNameQualityIssue
} from "../exercises/exercise-name-quality.js";

export interface WorkoutCsvImportSummary {
  importedRows: number;
  importedWorkouts: number;
}

export interface WorkoutCsvNameReview {
  row: number;
  originalName: string;
  normalizedName: string;
  reasons: ExerciseNameQualityIssue[];
  suggestions: string[];
}

export interface WorkoutCsvPreview {
  importedRows: number;
  importedWorkouts: number;
  importability: "ready" | "ready_with_warnings" | "blocked";
  warnings: WorkoutCsvNameReview[];
  blocked: WorkoutCsvNameReview[];
}

export type WorkoutCsvImportResult =
  | { ok: true; value: WorkoutCsvImportSummary }
  | { ok: false; errors: WorkoutCsvError[]; preview?: WorkoutCsvPreview };

export type WorkoutCsvPreviewResult =
  | { ok: true; value: WorkoutCsvPreview }
  | { ok: false; errors: WorkoutCsvError[] };

export interface WorkoutCsvService {
  exportCsv(userId: string): Promise<string>;
  previewImport(userId: string, input: string): Promise<WorkoutCsvPreviewResult>;
  importCsv(
    userId: string,
    input: string,
    confirmNameWarnings?: boolean
  ): Promise<WorkoutCsvImportResult>;
}

interface WorkoutCsvServiceOptions {
  repository: WorkoutCsvRepository;
  now?: () => Date;
}

export function createWorkoutCsvService(options: WorkoutCsvServiceOptions): WorkoutCsvService {
  const now = options.now ?? (() => new Date());
  const previewImport = async (input: string): Promise<WorkoutCsvPreviewResult> => {
    const parsed = parseWorkoutCsv(input);

    if (!parsed.ok) {
      return { ok: false, errors: parsed.errors };
    }

    const muscleGroupErrors = await findMuscleGroupErrors(options.repository, parsed.workouts);

    if (muscleGroupErrors.length > 0) {
      return { ok: false, errors: muscleGroupErrors };
    }

    return {
      ok: true,
      value: toPreview(parsed.workouts, parsed.rows.length)
    };
  };

  return {
    async exportCsv(userId) {
      const rows = await options.repository.exportRows(userId);

      return unparseWorkoutCsv(rows);
    },
    async previewImport(_userId, input) {
      return previewImport(input);
    },
    async importCsv(userId, input, confirmNameWarnings = false) {
      const preview = await previewImport(input);

      if (!preview.ok) {
        return { ok: false, errors: preview.errors };
      }

      if (preview.value.blocked.length > 0) {
        return {
          ok: false,
          errors: toPreviewErrors(preview.value.blocked),
          preview: preview.value
        };
      }

      if (preview.value.warnings.length > 0 && !confirmNameWarnings) {
        return {
          ok: false,
          errors: toPreviewErrors(preview.value.warnings),
          preview: preview.value
        };
      }

      const parsed = parseWorkoutCsv(input);

      if (!parsed.ok) {
        return { ok: false, errors: parsed.errors };
      }

      await options.repository.importWorkouts(userId, parsed.workouts, now());

      return {
        ok: true,
        value: {
          importedRows: parsed.rows.length,
          importedWorkouts: parsed.workouts.length
        }
      };
    }
  };
}

function toPreview(workouts: WorkoutCsvWorkout[], importedRows: number): WorkoutCsvPreview {
  const warnings: WorkoutCsvNameReview[] = [];
  const blocked: WorkoutCsvNameReview[] = [];

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      const evaluation = evaluateExerciseName(exercise.name);

      if (evaluation.status === "accepted") {
        continue;
      }

      const review = toNameReview(exercise.row, exercise.name, evaluation);

      if (evaluation.status === "blocked") {
        blocked.push(review);
      } else {
        warnings.push(review);
      }
    }
  }

  return {
    importedRows,
    importedWorkouts: workouts.length,
    importability: blocked.length > 0 ? "blocked" : warnings.length > 0 ? "ready_with_warnings" : "ready",
    warnings,
    blocked
  };
}

function toNameReview(
  row: number,
  originalName: string,
  evaluation: ExerciseNameEvaluation
): WorkoutCsvNameReview {
  return {
    row,
    originalName,
    normalizedName: evaluation.normalizedName,
    reasons: evaluation.reasons,
    suggestions: evaluation.suggestions
  };
}

function toPreviewErrors(issues: WorkoutCsvNameReview[]): WorkoutCsvError[] {
  return issues.flatMap((issue) =>
    issue.reasons.map((reason) => ({
      row: issue.row,
      field: "exercise_name",
      message: reason.message
    }))
  );
}

async function findMuscleGroupErrors(
  repository: WorkoutCsvRepository,
  workouts: WorkoutCsvWorkout[]
): Promise<WorkoutCsvError[]> {
  const knownSlugs = new Set(await repository.listMuscleGroupSlugs());
  const errors: WorkoutCsvError[] = [];

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      if (!knownSlugs.has(exercise.primaryMuscleGroupSlug)) {
        errors.push({
          row: exercise.row,
          field: "primary_muscle_group_slug",
          message: "Muscle group slug is not recognized."
        });
      }
    }
  }

  return errors;
}
