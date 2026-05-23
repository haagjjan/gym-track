import type {
  AnalyticsRepository,
  AnalyticsSetRecord,
  CompletedExerciseRecord
} from "./analytics.repository.js";
import type {
  ExerciseProgressQuery,
  ExerciseSummaryQuery,
  WeeklyVolumeQuery
} from "./analytics.schemas.js";
import {
  toMuscleGroupShape,
  toWeeklyVolume,
  type MuscleGroupShape,
  type WeeklyVolume
} from "./analytics-weekly-volume.js";

export type { WeeklyVolume } from "./analytics-weekly-volume.js";

export interface ExerciseProgressItem {
  workoutId: string;
  sessionExerciseId: string;
  setId: string;
  sessionDate: string;
  setOrder: number;
  setType: string;
  weightKg: string;
  reps: number;
  rir: number;
  estimatedOneRepMaxKg: string;
}

export interface ExerciseProgress {
  exerciseId: string;
  items: ExerciseProgressItem[];
}

export interface ExerciseSummary {
  exerciseId: string;
  totalSets: number;
  totalReps: number;
  totalVolumeKg: string;
  averageRir: number | null;
  bestTopSet: BestTopSet | null;
}

export interface BestTopSet {
  workoutId: string;
  setId: string;
  sessionDate: string;
  weightKg: string;
  reps: number;
  rir: number;
  estimatedOneRepMaxKg: string;
}

export interface CompletedExerciseList {
  items: CompletedExercise[];
}

export interface CompletedExercise {
  id: string;
  name: string;
  primaryMuscleGroup: MuscleGroupShape;
  secondaryMuscleGroups: MuscleGroupShape[];
  lastDoneAt: string;
  totalSets: number;
}

export interface AnalyticsService {
  listCompletedExercises(userId: string): Promise<CompletedExerciseList>;
  getExerciseProgress(
    userId: string,
    exerciseId: string,
    input: ExerciseProgressQuery
  ): Promise<ExerciseProgress>;
  getExerciseSummary(
    userId: string,
    exerciseId: string,
    input: ExerciseSummaryQuery
  ): Promise<ExerciseSummary>;
  getWeeklyVolume(userId: string, input: WeeklyVolumeQuery): Promise<WeeklyVolume>;
}

interface AnalyticsServiceOptions {
  repository: AnalyticsRepository;
}

export function createAnalyticsService(options: AnalyticsServiceOptions): AnalyticsService {
  return {
    async listCompletedExercises(userId) {
      const rows = await options.repository.findCompletedExercises(userId);

      return {
        items: rows.map(toCompletedExercise)
      };
    },
    async getExerciseProgress(userId, exerciseId, input) {
      const rows = await options.repository.findExerciseSets({
        userId,
        exerciseId,
        startDate: input.startDate,
        endDate: input.endDate,
        includeWarmups: input.includeWarmups
      });

      return {
        exerciseId,
        items: rows.map(toProgressItem)
      };
    },
    async getExerciseSummary(userId, exerciseId, input) {
      const rows = await options.repository.findExerciseSets({
        userId,
        exerciseId,
        startDate: input.startDate,
        endDate: input.endDate,
        includeWarmups: true
      });

      return toExerciseSummary(exerciseId, rows);
    },
    async getWeeklyVolume(userId, input) {
      const rows = await options.repository.findWeeklyVolumeSets({
        userId,
        startDate: input.startDate,
        endDate: input.endDate,
        muscleGroupIds: input.muscleGroupIds
      });

      return toWeeklyVolume(rows);
    }
  };
}

function toProgressItem(row: AnalyticsSetRecord): ExerciseProgressItem {
  return {
    workoutId: row.workoutId,
    sessionExerciseId: row.sessionExerciseId,
    setId: row.setId,
    sessionDate: row.sessionDate.toISOString(),
    setOrder: row.setOrder,
    setType: row.setType,
    weightKg: row.weightKg,
    reps: row.reps,
    rir: row.rir,
    estimatedOneRepMaxKg: estimatedOneRepMaxKg(row.weightKg, row.reps)
  };
}

function toCompletedExercise(record: CompletedExerciseRecord): CompletedExercise {
  return {
    id: record.exercise.id,
    name: record.exercise.name,
    primaryMuscleGroup: toMuscleGroupShape(record.exercise.primaryMuscleGroup),
    secondaryMuscleGroups: record.exercise.secondaryMuscleGroups.map(toMuscleGroupShape),
    lastDoneAt: record.lastDoneAt.toISOString(),
    totalSets: record.totalSets
  };
}

function toExerciseSummary(exerciseId: string, rows: AnalyticsSetRecord[]): ExerciseSummary {
  const totalVolume = rows.reduce((total, row) => total + Number(row.weightKg) * row.reps, 0);
  const totalRir = rows.reduce((total, row) => total + row.rir, 0);

  return {
    exerciseId,
    totalSets: rows.length,
    totalReps: rows.reduce((total, row) => total + row.reps, 0),
    totalVolumeKg: totalVolume.toFixed(2),
    averageRir: rows.length > 0 ? Math.round((totalRir / rows.length) * 10) / 10 : null,
    bestTopSet: findBestTopSet(rows)
  };
}

function findBestTopSet(rows: AnalyticsSetRecord[]): BestTopSet | null {
  const best = [...rows].sort(compareTopSets)[0];

  if (!best) {
    return null;
  }

  return {
    workoutId: best.workoutId,
    setId: best.setId,
    sessionDate: best.sessionDate.toISOString(),
    weightKg: best.weightKg,
    reps: best.reps,
    rir: best.rir,
    estimatedOneRepMaxKg: estimatedOneRepMaxKg(best.weightKg, best.reps)
  };
}

function compareTopSets(left: AnalyticsSetRecord, right: AnalyticsSetRecord): number {
  const estimatedDifference = Number(estimatedOneRepMaxKg(right.weightKg, right.reps)) -
    Number(estimatedOneRepMaxKg(left.weightKg, left.reps));

  if (estimatedDifference !== 0) {
    return estimatedDifference;
  }

  return Number(right.weightKg) - Number(left.weightKg);
}

export function estimatedOneRepMaxKg(weightKg: string, reps: number): string {
  return (Number(weightKg) * (1 + reps / 30)).toFixed(2);
}
