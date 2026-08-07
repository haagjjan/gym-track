import type { FastifyInstance } from "fastify";
import type { AppLoggerLike } from "../../shared/mailer.js";
import type { LifecyclePhase, OperationalMetrics } from "../../shared/metrics.js";

export interface DeletionCleanupSummary {
  deletionFailures: number;
  due: number;
  finalized: number;
  notificationFailures: number;
}

export interface LifecycleTasks {
  cleanupAuth(): Promise<void>;
  cleanupBeta(): Promise<void>;
  cleanupDeletions(): Promise<DeletionCleanupSummary>;
  cleanupRetention(): Promise<void>;
}

interface LifecycleRunnerOptions {
  logger: AppLoggerLike;
  metrics: OperationalMetrics;
  now?: () => Date;
  tasks: LifecycleTasks;
}

export interface LifecycleRunSummary {
  deletionBacklog: number;
  failedPhases: LifecyclePhase[];
  finalizedDeletions: number;
}

const DEFAULT_INTERVAL_MS = 60 * 60 * 1_000;

export function createLifecycleRunner(options: LifecycleRunnerOptions) {
  let activeRun: Promise<LifecycleRunSummary> | null = null;

  return {
    run(): Promise<LifecycleRunSummary> {
      if (activeRun) return activeRun;
      activeRun = executeLifecycle(options).finally(() => { activeRun = null; });
      return activeRun;
    }
  };
}

export function registerLifecycleScheduler(
  server: FastifyInstance,
  options: LifecycleRunnerOptions & { intervalMs?: number }
): void {
  const runner = createLifecycleRunner(options);
  let timer: NodeJS.Timeout | null = null;

  server.addHook("onReady", async () => {
    await runner.run();
    timer = setInterval(() => {
      void runner.run();
    }, options.intervalMs ?? DEFAULT_INTERVAL_MS);
    timer.unref();
  });
  server.addHook("onClose", async () => {
    if (timer) clearInterval(timer);
  });
}

async function executeLifecycle(options: LifecycleRunnerOptions): Promise<LifecycleRunSummary> {
  const startedAt = options.now?.() ?? new Date();
  const startedMonotonic = performance.now();
  const failedPhases: LifecyclePhase[] = [];
  let deletionBacklog = 0;
  let finalizedDeletions = 0;
  options.metrics.lifecycleStarted(startedAt);

  await runPhase("auth", options.tasks.cleanupAuth, options, failedPhases);
  await runPhase("beta", options.tasks.cleanupBeta, options, failedPhases);
  try {
    const result = await options.tasks.cleanupDeletions();
    finalizedDeletions = result.finalized;
    deletionBacklog = Math.max(result.due - result.finalized, 0);
    if (result.deletionFailures > 0) recordFailure("deletion", options, failedPhases);
    if (result.notificationFailures > 0) recordFailure("notification", options, failedPhases);
  } catch (error) {
    recordFailure("deletion", options, failedPhases, error);
  }
  await runPhase("retention", options.tasks.cleanupRetention, options, failedPhases);

  const durationSeconds = Math.max(performance.now() - startedMonotonic, 0) / 1_000;
  options.metrics.lifecycleFinished(
    durationSeconds,
    deletionBacklog,
    finalizedDeletions,
    failedPhases.length === 0
  );
  options.logger.info(
    { deletionBacklog, durationSeconds, failedPhases, finalizedDeletions },
    "lifecycle cleanup completed"
  );
  return { deletionBacklog, failedPhases, finalizedDeletions };
}

async function runPhase(
  phase: LifecyclePhase,
  task: () => Promise<void>,
  options: LifecycleRunnerOptions,
  failedPhases: LifecyclePhase[]
): Promise<void> {
  try {
    await task();
  } catch (error) {
    recordFailure(phase, options, failedPhases, error);
  }
}

function recordFailure(
  phase: LifecyclePhase,
  options: LifecycleRunnerOptions,
  failedPhases: LifecyclePhase[],
  error?: unknown
): void {
  if (!failedPhases.includes(phase)) failedPhases.push(phase);
  options.metrics.lifecyclePhaseFailed(phase);
  options.logger.error({ error, phase }, "lifecycle cleanup phase failed");
}
