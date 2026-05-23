import type {
  AnalyticsMuscleGroupRecord,
  WeeklyVolumeSetRecord
} from "./analytics.repository.js";

export interface WeeklyVolume {
  weeks: WeeklyVolumeWeek[];
}

export interface WeeklyVolumeWeek {
  weekStart: string;
  weekEnd: string;
  items: WeeklyVolumeItem[];
}

export interface WeeklyVolumeItem {
  muscleGroup: MuscleGroupShape;
  workingSets: number;
  exercises: WeeklyVolumeExercise[];
  recentSessions: WeeklyVolumeSession[];
}

export interface MuscleGroupShape {
  id: string;
  slug: string;
  name: string;
}

export interface WeeklyVolumeExercise {
  id: string;
  name: string;
  workingSets: number;
}

export interface WeeklyVolumeSession {
  workoutId: string;
  sessionDate: string;
  workingSets: number;
}

interface WeeklyVolumeAccumulator {
  muscleGroup: MuscleGroupShape;
  workingSets: number;
  exercises: Map<string, WeeklyVolumeExercise>;
  recentSessions: Map<string, WeeklyVolumeSession>;
  sortOrder: number;
}

export function toWeeklyVolume(rows: WeeklyVolumeSetRecord[]): WeeklyVolume {
  const weeks = new Map<string, Map<string, WeeklyVolumeAccumulator>>();

  for (const row of rows) {
    const weekStart = utcWeekStart(row.sessionDate);
    const week = weeks.get(weekStart) ?? new Map<string, WeeklyVolumeAccumulator>();
    const current = getAccumulator(week, row);

    addSetToAccumulator(current, row);
    week.set(row.muscleGroup.id, current);
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

export function toMuscleGroupShape(record: AnalyticsMuscleGroupRecord): MuscleGroupShape {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name
  };
}

function getAccumulator(
  week: Map<string, WeeklyVolumeAccumulator>,
  row: WeeklyVolumeSetRecord
): WeeklyVolumeAccumulator {
  return week.get(row.muscleGroup.id) ?? {
    muscleGroup: toMuscleGroupShape(row.muscleGroup),
    workingSets: 0,
    exercises: new Map<string, WeeklyVolumeExercise>(),
    recentSessions: new Map<string, WeeklyVolumeSession>(),
    sortOrder: row.muscleGroup.sortOrder
  };
}

function addSetToAccumulator(
  current: WeeklyVolumeAccumulator,
  row: WeeklyVolumeSetRecord
): void {
  const exercise = current.exercises.get(row.exercise.id);
  const session = current.recentSessions.get(row.workoutId);

  current.workingSets += 1;
  current.exercises.set(row.exercise.id, {
    id: row.exercise.id,
    name: row.exercise.name,
    workingSets: (exercise?.workingSets ?? 0) + 1
  });
  current.recentSessions.set(row.workoutId, {
    workoutId: row.workoutId,
    sessionDate: row.sessionDate.toISOString(),
    workingSets: (session?.workingSets ?? 0) + 1
  });
}

function toWeeklyVolumeItem(item: WeeklyVolumeAccumulator): WeeklyVolumeItem {
  return {
    muscleGroup: item.muscleGroup,
    workingSets: item.workingSets,
    exercises: [...item.exercises.values()].sort((left, right) =>
      right.workingSets - left.workingSets || left.name.localeCompare(right.name)
    ),
    recentSessions: [...item.recentSessions.values()]
      .sort((left, right) => right.sessionDate.localeCompare(left.sessionDate))
      .slice(0, 5)
  };
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
