import type {
  AnalyticsRepository,
  AnalyticsSetRecord,
  WeeklyVolumeSetRecord
} from "./analytics.repository.js";
import type {
  ExerciseProgressQuery,
  ExerciseSummaryQuery,
  WeeklyVolumeQuery
} from "./analytics.schemas.js";

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

export interface WeeklyVolume {
  weeks: WeeklyVolumeWeek[];
}

export interface WeeklyVolumeWeek {
  weekStart: string;
  weekEnd: string;
  items: WeeklyVolumeItem[];
}

export interface WeeklyVolumeItem {
  muscleGroup: {
    id: string;
    slug: string;
    name: string;
  };
  workingSets: number;
}

export interface AnalyticsService {
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

function toWeeklyVolume(rows: WeeklyVolumeSetRecord[]): WeeklyVolume {
  const weeks = new Map<string, Map<string, WeeklyVolumeItem & { sortOrder: number }>>();

  for (const row of rows) {
    const weekStart = utcWeekStart(row.sessionDate);
    const week = weeks.get(weekStart) ?? new Map<string, WeeklyVolumeItem & { sortOrder: number }>();
    const current = week.get(row.muscleGroup.id);

    week.set(row.muscleGroup.id, {
      muscleGroup: {
        id: row.muscleGroup.id,
        slug: row.muscleGroup.slug,
        name: row.muscleGroup.name
      },
      workingSets: (current?.workingSets ?? 0) + 1,
      sortOrder: row.muscleGroup.sortOrder
    });
    weeks.set(weekStart, week);
  }

  return {
    weeks: [...weeks.entries()].map(([weekStart, items]) => ({
      weekStart,
      weekEnd: addUtcDays(weekStart, 6),
      items: [...items.values()]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(toWeeklyVolumeItem)
    }))
  };
}

export function estimatedOneRepMaxKg(weightKg: string, reps: number): string {
  return (Number(weightKg) * (1 + reps / 30)).toFixed(2);
}

function utcWeekStart(date: Date): string {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const daysSinceMonday = (utcDate.getUTCDay() + 6) % 7;

  utcDate.setUTCDate(utcDate.getUTCDate() - daysSinceMonday);

  return utcDate.toISOString().slice(0, 10);
}

function addUtcDays(dateOnly: string, days: number): string {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function toWeeklyVolumeItem(
  item: WeeklyVolumeItem & { sortOrder: number }
): WeeklyVolumeItem {
  return {
    muscleGroup: item.muscleGroup,
    workingSets: item.workingSets
  };
}
