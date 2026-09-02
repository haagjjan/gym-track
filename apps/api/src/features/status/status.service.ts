import type { StatusRepository } from "./status.repository.js";

export const ACTIVE_ACCOUNT_PUBLIC_THRESHOLD = 5;

export type ThresholdedCount =
  | { kind: "below_threshold"; threshold: typeof ACTIVE_ACCOUNT_PUBLIC_THRESHOLD }
  | { kind: "exact"; value: number };

export interface PublicStatusMetrics {
  generatedAt: string;
  activeBetaAccounts: ThresholdedCount;
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
      const counts = await options.repository.getMetricCounts();

      return {
        generatedAt: now().toISOString(),
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
