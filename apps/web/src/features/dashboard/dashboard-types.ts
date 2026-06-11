import type {
  CompletedExercise,
  ExerciseSummaryPayload,
  WeeklyVolumePayload
} from "../analytics/analytics-types";
import type { WorkoutSummary } from "../workouts/workout-types";

export interface DashboardData {
  completedExercises: CompletedExercise[];
  exerciseSummaries: ExerciseSummaryPayload[];
  weeklyVolume: WeeklyVolumePayload | null;
  workouts: WorkoutSummary[];
}

export interface PerformanceSignal {
  detail: string;
  id: string;
  name: string;
  value: string;
}

export interface HomeStat {
  detail?: string;
  id: string;
  label: string;
  value: string;
}

export interface VolumeBar {
  name: string;
  slug: string;
  workingSets: number;
}

export const emptyDashboardData: DashboardData = {
  completedExercises: [],
  exerciseSummaries: [],
  weeklyVolume: null,
  workouts: []
};
