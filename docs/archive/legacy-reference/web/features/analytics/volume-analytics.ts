import type { MuscleGroup, WeeklyVolumePayload } from "./analytics-types";
import { findMuscleMapRegion, muscleMapRegions } from "./weekly-body-map-regions";

export type VolumeBand = "active" | "high" | "maintenance" | "none";

export interface VolumeMuscleTotal {
  muscleGroup: MuscleGroup;
  workingSets: number;
  weeklyAverageSets: number;
  latestWeekSets: number;
  exercises: WeeklyVolumePayload["weeks"][number]["items"][number]["exercises"];
  recentSessions: WeeklyVolumePayload["weeks"][number]["items"][number]["recentSessions"];
}

interface VolumeAccumulator {
  muscleGroup: MuscleGroup;
  workingSets: number;
  latestWeekSets: number;
  exercises: Map<string, { id: string; name: string; workingSets: number }>;
  recentSessions: Map<string, { workoutId: string; sessionDate: string; workingSets: number }>;
}

export function aggregateVolume(
  volume: WeeklyVolumePayload | null,
  windowWeeks: number
): Map<string, VolumeMuscleTotal> {
  const totals = new Map<string, VolumeAccumulator>();
  const latestWeekStart = volume?.weeks.at(-1)?.weekStart ?? "";

  for (const week of volume?.weeks ?? []) {
    for (const item of week.items) {
      const current = totals.get(item.muscleGroup.slug) ?? emptyAccumulator(item.muscleGroup);

      current.workingSets += item.workingSets;
      if (week.weekStart === latestWeekStart) {
        current.latestWeekSets += item.workingSets;
      }
      mergeExercises(current, item.exercises);
      mergeSessions(current, item.recentSessions);
      totals.set(item.muscleGroup.slug, current);
    }
  }

  return new Map([...totals.entries()].map(([slug, item]) => [slug, toVolumeTotal(item, windowWeeks)]));
}

export function selectedVolumeMuscle(
  totals: Map<string, VolumeMuscleTotal>,
  selectedSlug: string
): VolumeMuscleTotal | null {
  const selected = totals.get(selectedSlug);

  if (selected) {
    return selected;
  }

  const region = findMuscleMapRegion(selectedSlug);

  if (region) {
    return {
      muscleGroup: { id: region.slug, slug: region.slug, name: region.label },
      workingSets: 0,
      weeklyAverageSets: 0,
      latestWeekSets: 0,
      exercises: [],
      recentSessions: []
    };
  }

  return [...totals.values()].sort(compareVolumeTotals)[0] ?? null;
}

export function firstVolumeSlug(totals: Map<string, VolumeMuscleTotal>): string {
  return [...totals.values()].sort(compareVolumeTotals)[0]?.muscleGroup.slug
    ?? muscleMapRegions[0]?.slug
    ?? "chest";
}

export function volumeWindowWeeks(days: number): number {
  return Math.max(1, Math.ceil(days / 7));
}

export function totalWorkingSets(totals: Map<string, VolumeMuscleTotal>): number {
  return [...totals.values()].reduce((total, item) => total + item.workingSets, 0);
}

export function latestWeekWorkingSets(totals: Map<string, VolumeMuscleTotal>): number {
  return [...totals.values()].reduce((total, item) => total + item.latestWeekSets, 0);
}

export function volumeBand(weeklyAverageSets: number): VolumeBand {
  if (weeklyAverageSets >= 12) {
    return "high";
  }

  if (weeklyAverageSets >= 6) {
    return "active";
  }

  if (weeklyAverageSets > 0) {
    return "maintenance";
  }

  return "none";
}

export function volumeBandLabel(band: VolumeBand): string {
  if (band === "high") {
    return "High logged load";
  }

  if (band === "active") {
    return "Active stimulus";
  }

  if (band === "maintenance") {
    return "Maintenance signal";
  }

  return "No signal";
}

export function recoveryStatus(item: VolumeMuscleTotal | null): { label: string; detail: string } {
  if (!item || item.workingSets === 0) {
    return {
      label: "No recovery pressure",
      detail: "No working sets are logged for this muscle in the selected window."
    };
  }

  if (item.latestWeekSets === 0) {
    return {
      label: "Current week clear",
      detail: "This muscle was trained in the window, but not in the latest logged week."
    };
  }

  if (item.weeklyAverageSets >= 12) {
    return {
      label: "Watch recovery",
      detail: "High weekly set average. Plan the next exposure with fatigue in mind."
    };
  }

  return {
    label: "Ready signal",
    detail: "Recent work is logged without a high weekly set average."
  };
}

export function compareVolumeTotals(left: VolumeMuscleTotal, right: VolumeMuscleTotal): number {
  return right.workingSets - left.workingSets || left.muscleGroup.name.localeCompare(right.muscleGroup.name);
}

function emptyAccumulator(muscleGroup: MuscleGroup): VolumeAccumulator {
  return {
    muscleGroup,
    workingSets: 0,
    latestWeekSets: 0,
    exercises: new Map(),
    recentSessions: new Map()
  };
}

function mergeExercises(
  current: VolumeAccumulator,
  exercises: VolumeMuscleTotal["exercises"]
): void {
  for (const exercise of exercises) {
    const existing = current.exercises.get(exercise.id);

    current.exercises.set(exercise.id, {
      id: exercise.id,
      name: exercise.name,
      workingSets: (existing?.workingSets ?? 0) + exercise.workingSets
    });
  }
}

function mergeSessions(
  current: VolumeAccumulator,
  sessions: VolumeMuscleTotal["recentSessions"]
): void {
  for (const session of sessions) {
    const existing = current.recentSessions.get(session.workoutId);

    current.recentSessions.set(session.workoutId, {
      workoutId: session.workoutId,
      sessionDate: session.sessionDate,
      workingSets: (existing?.workingSets ?? 0) + session.workingSets
    });
  }
}

function toVolumeTotal(item: VolumeAccumulator, windowWeeks: number): VolumeMuscleTotal {
  return {
    muscleGroup: item.muscleGroup,
    workingSets: item.workingSets,
    weeklyAverageSets: Math.round((item.workingSets / windowWeeks) * 10) / 10,
    latestWeekSets: item.latestWeekSets,
    exercises: [...item.exercises.values()].sort((left, right) =>
      right.workingSets - left.workingSets || left.name.localeCompare(right.name)
    ),
    recentSessions: [...item.recentSessions.values()]
      .sort((left, right) => right.sessionDate.localeCompare(left.sessionDate))
      .slice(0, 5)
  };
}
