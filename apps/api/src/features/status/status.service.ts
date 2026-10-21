import { statusWindow } from "./status-window.js";
import type { WeeklyWorkoutCount, StatusRepository } from "./status.repository.js";

export const ACTIVE_ACCOUNT_PUBLIC_THRESHOLD = 5;

export type ThresholdedCount =
  | { kind: "below_threshold"; threshold: typeof ACTIVE_ACCOUNT_PUBLIC_THRESHOLD }
  | { kind: "exact"; value: number };

export interface PublicStatusMetrics {
  generatedAt: string;
  activeBetaAccounts: ThresholdedCount;
  activeAccounts: ThresholdedCount;
  completedWorkoutsLast30Days: number;
  completedWorkoutsByWeek: WeeklyWorkoutCount[];
  workoutRecordsProcessed: number;
}

export interface StatusService {
  getPublicMetrics(): Promise<PublicStatusMetrics>;
}

interface StatusServiceOptions {
  repository: StatusRepository;
  now?: () => Date;
}

export function createStatusService(options: StatusServiceOptions): StatusService {
  const now = options.now ?? (() => new Date());

  return {
    async getPublicMetrics() {
      const at = now();
      const counts = await options.repository.getMetricCounts(at);
      const weeks = new Map(counts.completedWorkoutsByWeek.map((week) => [week.weekStart, week.count]));

      return {
        generatedAt: at.toISOString(),
        activeAccounts: thresholdCount(counts.activeAccounts),
        completedWorkoutsLast30Days: counts.completedWorkoutsLast30Days,
        completedWorkoutsByWeek: statusWindow(at).weekStarts.map((weekStart) => ({ weekStart, count: weeks.get(weekStart) ?? 0 })),
        activeBetaAccounts: thresholdCount(counts.activeBetaAccounts),
        workoutRecordsProcessed: counts.workoutRecordsProcessed
      };
    }
  };
}

function thresholdCount(value: number): ThresholdedCount {
  return value < ACTIVE_ACCOUNT_PUBLIC_THRESHOLD
    ? { kind: "below_threshold", threshold: ACTIVE_ACCOUNT_PUBLIC_THRESHOLD }
    : { kind: "exact", value };
}
