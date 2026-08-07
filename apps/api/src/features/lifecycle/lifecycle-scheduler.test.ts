import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fastify from "fastify";
import type { AppLoggerLike } from "../../shared/mailer.js";
import type { LifecyclePhase, OperationalMetrics } from "../../shared/metrics.js";
import {
  createLifecycleRunner,
  registerLifecycleScheduler
} from "./lifecycle-scheduler.js";

const logger: AppLoggerLike = {
  info() {},
  warn() {},
  error() {}
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function metricsRecorder() {
  const failures: LifecyclePhase[] = [];
  const finishes: Array<{
    due: number;
    finalized: number;
    succeeded: boolean;
  }> = [];
  const metrics: OperationalMetrics = {
    lifecycleStarted() {},
    lifecyclePhaseFailed(phase) { failures.push(phase); },
    lifecycleFinished(_duration, due, finalized, succeeded) {
      finishes.push({ due, finalized, succeeded });
    },
    record() {}
  };
  return { failures, finishes, metrics };
}

describe("lifecycle scheduler", () => {
  it("runs cleanup during API startup", async () => {
    const server = fastify();
    const metrics = metricsRecorder();
    let startupRuns = 0;
    registerLifecycleScheduler(server, {
      logger,
      metrics: metrics.metrics,
      intervalMs: 60_000,
      tasks: {
        async cleanupAuth() { startupRuns += 1; },
        async cleanupBeta() {},
        async cleanupDeletions() {
          return { due: 0, finalized: 0, deletionFailures: 0, notificationFailures: 0 };
        },
        async cleanupRetention() {}
      }
    });

    try {
      await server.ready();
      assert.equal(startupRuns, 1);
    } finally {
      await server.close();
    }
  });

  it("runs again on the configured hourly interval path", async () => {
    const server = fastify();
    const metrics = metricsRecorder();
    let runs = 0;
    let resolveSecondRun!: () => void;
    const secondRun = new Promise<void>((resolve) => { resolveSecondRun = resolve; });
    registerLifecycleScheduler(server, {
      logger,
      metrics: metrics.metrics,
      intervalMs: 5,
      tasks: {
        async cleanupAuth() {
          runs += 1;
          if (runs === 2) resolveSecondRun();
        },
        async cleanupBeta() {},
        async cleanupDeletions() {
          return { due: 0, finalized: 0, deletionFailures: 0, notificationFailures: 0 };
        },
        async cleanupRetention() {}
      }
    });

    try {
      await server.ready();
      await withTimeout(secondRun, 1_000);
      assert.ok(runs >= 2);
    } finally {
      await server.close();
    }
  });

  it("coalesces overlapping calls into one single-flight run", async () => {
    const gate = deferred<void>();
    let authRuns = 0;
    const metrics = metricsRecorder();
    const runner = createLifecycleRunner({
      logger,
      metrics: metrics.metrics,
      tasks: {
        async cleanupAuth() {
          authRuns += 1;
          await gate.promise;
        },
        async cleanupBeta() {},
        async cleanupDeletions() {
          return { due: 0, finalized: 0, deletionFailures: 0, notificationFailures: 0 };
        },
        async cleanupRetention() {}
      }
    });

    const first = runner.run();
    const overlapping = runner.run();
    assert.strictEqual(first, overlapping);
    gate.resolve();
    await first;
    assert.equal(authRuns, 1);

    await runner.run();
    assert.equal(authRuns, 2);
  });

  it("isolates phases and reports deletion backlog and failures", async () => {
    const calls: string[] = [];
    const metrics = metricsRecorder();
    const runner = createLifecycleRunner({
      logger,
      metrics: metrics.metrics,
      now: () => new Date("2026-08-06T12:00:00.000Z"),
      tasks: {
        async cleanupAuth() {
          calls.push("auth");
          throw new Error("auth unavailable");
        },
        async cleanupBeta() { calls.push("beta"); },
        async cleanupDeletions() {
          calls.push("deletion");
          return { due: 4, finalized: 2, deletionFailures: 1, notificationFailures: 1 };
        },
        async cleanupRetention() {
          calls.push("retention");
          throw new Error("retention unavailable");
        }
      }
    });

    const result = await runner.run();

    assert.deepEqual(calls, ["auth", "beta", "deletion", "retention"]);
    assert.deepEqual(result, {
      deletionBacklog: 2,
      failedPhases: ["auth", "deletion", "notification", "retention"],
      finalizedDeletions: 2
    });
    assert.deepEqual(metrics.failures, result.failedPhases);
    assert.deepEqual(metrics.finishes, [{ due: 2, finalized: 2, succeeded: false }]);
  });
});

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Timed out waiting for lifecycle interval.")), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
