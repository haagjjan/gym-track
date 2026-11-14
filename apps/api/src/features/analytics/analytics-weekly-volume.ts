import { volumeContribution, type VolumeMuscleRole } from "./analytics-volume-attribution.js";
import type {
  AnalyticsMuscleGroupRecord,
  AnalyticsMuscleRegionRecord,
  WeeklyVolumeRegionSetRecord,
  WeeklyVolumeSetRecord
} from "./analytics.repository.js";

export interface WeeklyVolume {
  weeks: WeeklyVolumeWeek[];
}

interface WeeklyVolumeWeek {
  weekStart: string;
  weekEnd: string;
  items: WeeklyVolumeItem[];
  /** The same sets by finer muscle region; each region belongs to one muscle group. */
  regionItems: WeeklyVolumeRegionItem[];
}

interface WeeklyVolumeTotals {
  workingSets: number;
  exercises: WeeklyVolumeExercise[];
  recentSessions: WeeklyVolumeSession[];
}

interface WeeklyVolumeItem extends WeeklyVolumeTotals {
  muscleGroup: MuscleGroupShape;
}

interface WeeklyVolumeRegionItem extends WeeklyVolumeTotals {
  muscleRegion: MuscleRegionShape;
}

export interface MuscleGroupShape {
  id: string;
  slug: string;
  name: string;
}

export interface MuscleRegionShape extends MuscleGroupShape {
  muscleGroupSlug: string;
}

interface WeeklyVolumeExercise {
  id: string;
  name: string;
  workingSets: number;
}

interface WeeklyVolumeSession {
  workoutId: string;
  sessionDate: string;
  workingSets: number;
}

interface VolumeSetRow {
  muscleRole: VolumeMuscleRole;
  workoutId: string;
  sessionDate: Date;
  exercise: { id: string; name: string };
}

interface Accumulator<Muscle> {
  muscle: Muscle;
  workingSets: number;
  exercises: Map<string, WeeklyVolumeExercise>;
  recentSessions: Map<string, WeeklyVolumeSession>;
  sortOrder: number;
}

export function toWeeklyVolume(
  rows: WeeklyVolumeSetRecord[],
  regionRows: WeeklyVolumeRegionSetRecord[] = []
): WeeklyVolume {
  const groups = accumulate(rows, (row) => row.muscleGroup);
  const regions = accumulate(regionRows, (row) => row.muscleRegion);
  const weekStarts = [...new Set([...groups.keys(), ...regions.keys()])].sort();

  return {
    weeks: weekStarts.map((weekStart) => ({
      weekStart,
      weekEnd: addUtcDays(weekStart, 6),
      items: sorted(groups.get(weekStart)).map((item) => ({
        muscleGroup: toMuscleGroupShape(item.muscle),
        ...toTotals(item)
      })),
      regionItems: sorted(regions.get(weekStart)).map((item) => ({
        muscleRegion: { ...toMuscleGroupShape(item.muscle), muscleGroupSlug: item.muscle.muscleGroupSlug },
        ...toTotals(item)
      }))
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

/** Working sets per week and muscle, with the exercises and sessions behind them. */
function accumulate<Row extends VolumeSetRow, Muscle extends AnalyticsMuscleGroupRecord | AnalyticsMuscleRegionRecord>(
  rows: Row[],
  muscleOf: (row: Row) => Muscle
): Map<string, Map<string, Accumulator<Muscle>>> {
  const weeks = new Map<string, Map<string, Accumulator<Muscle>>>();

  for (const row of rows) {
    const weekStart = utcWeekStart(row.sessionDate);
    const week = weeks.get(weekStart) ?? new Map<string, Accumulator<Muscle>>();
    const muscle = muscleOf(row);
    const current = week.get(muscle.id) ?? {
      muscle,
      workingSets: 0,
      exercises: new Map<string, WeeklyVolumeExercise>(),
      recentSessions: new Map<string, WeeklyVolumeSession>(),
      sortOrder: muscle.sortOrder
    };
    const exercise = current.exercises.get(row.exercise.id);
    const session = current.recentSessions.get(row.workoutId);

    const credit = volumeContribution(row.muscleRole);
    current.workingSets += credit;
    current.exercises.set(row.exercise.id, {
      id: row.exercise.id,
      name: row.exercise.name,
      workingSets: (exercise?.workingSets ?? 0) + credit
    });
    current.recentSessions.set(row.workoutId, {
      workoutId: row.workoutId,
      sessionDate: row.sessionDate.toISOString(),
      workingSets: (session?.workingSets ?? 0) + credit
    });
    week.set(muscle.id, current);
    weeks.set(weekStart, week);
  }

  return weeks;
}

function sorted<Muscle>(week: Map<string, Accumulator<Muscle>> | undefined): Accumulator<Muscle>[] {
  return [...(week?.values() ?? [])].sort((left, right) => left.sortOrder - right.sortOrder);
}

function toTotals<Muscle>(item: Accumulator<Muscle>): WeeklyVolumeTotals {
  return {
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
