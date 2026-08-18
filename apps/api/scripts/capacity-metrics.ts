export interface CapacitySample {
  durationMs: number;
  phase: "setup" | "workload";
  status: number;
  step: string;
}

export function printSummary(
  phase: CapacitySample["phase"],
  values: CapacitySample[],
  users: number,
  wallMs?: number
): void {
  const durations = values.map(({ durationMs }) => durationMs).sort((a, b) => a - b);
  const failures = values.filter(({ status }) => status >= 400).length;
  const wall = wallMs ?? durations.reduce((sum, value) => sum + value, 0);
  console.log(JSON.stringify({
    phase,
    users,
    requests: values.length,
    failures,
    wallMs: rounded(wall),
    requestsPerSecond: rounded(values.length / (wall / 1_000)),
    latencyMs: {
      p50: percentile(durations, 0.5),
      p95: percentile(durations, 0.95),
      p99: percentile(durations, 0.99),
      max: rounded(durations.at(-1) ?? 0)
    }
  }));
}

export function reportFailures(results: PromiseSettledResult<void>[]): void {
  const failures = results.flatMap((result, index) =>
    result.status === "rejected" ? [`User ${index}: ${String(result.reason)}`] : []
  );
  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
    return;
  }
  const noun = results.length === 1 ? "user" : "users";
  console.log(`PASS: ${results.length} ${noun} completed with all persisted sets verified.`);
}

function percentile(values: number[], ratio: number): number {
  return rounded(values[Math.max(0, Math.ceil(values.length * ratio) - 1)] ?? 0);
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}
