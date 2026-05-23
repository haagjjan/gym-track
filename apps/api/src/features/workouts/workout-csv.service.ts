import {
  parseWorkoutCsv,
  unparseWorkoutCsv,
  type WorkoutCsvError,
  type WorkoutCsvWorkout
} from "./workout-csv.js";
import type { WorkoutCsvRepository } from "./workout-csv.repository.js";

export interface WorkoutCsvImportSummary {
  importedRows: number;
  importedWorkouts: number;
}

export type WorkoutCsvImportResult =
  | { ok: true; value: WorkoutCsvImportSummary }
  | { ok: false; errors: WorkoutCsvError[] };

export interface WorkoutCsvService {
  exportCsv(userId: string): Promise<string>;
  importCsv(userId: string, input: string): Promise<WorkoutCsvImportResult>;
}

interface WorkoutCsvServiceOptions {
  repository: WorkoutCsvRepository;
  now?: () => Date;
}

export function createWorkoutCsvService(options: WorkoutCsvServiceOptions): WorkoutCsvService {
  const now = options.now ?? (() => new Date());

  return {
    async exportCsv(userId) {
      const rows = await options.repository.exportRows(userId);

      return unparseWorkoutCsv(rows);
    },
    async importCsv(userId, input) {
      const parsed = parseWorkoutCsv(input);

      if (!parsed.ok) {
        return { ok: false, errors: parsed.errors };
      }

      const muscleGroupErrors = await findMuscleGroupErrors(
        options.repository,
        parsed.workouts
      );

      if (muscleGroupErrors.length > 0) {
        return { ok: false, errors: muscleGroupErrors };
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
