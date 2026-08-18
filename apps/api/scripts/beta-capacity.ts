import { createHmac, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import {
  printSummary,
  reportFailures,
  type CapacitySample
} from "./capacity-metrics.js";

const exerciseId = "00000000-0000-4000-8000-000000000101";
const requestTimeoutMs = 15_000;
const safetyConfirmation = "synthetic-isolated-data";

interface Config {
  apiUrl: URL;
  clientIpSecret: string;
  users: number;
  setupConcurrency: number;
  settleMs: number;
}

interface CapacityUser {
  cookie: string;
  index: number;
  ip: string;
}

interface ApiResult<T> {
  body: T;
  setCookie: string | null;
}

interface DataEnvelope<T> {
  data: T;
}

interface WorkoutData {
  workout: {
    id: string;
    exercises: Array<{ id: string; sets: Array<{ id: string }> }>;
  };
}

interface SessionExerciseData {
  sessionExercise: { id: string };
}

const samples: CapacitySample[] = [];
const config = readConfig();
const runId = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;

await main();

async function main(): Promise<void> {
  console.log(`Preparing ${config.users} synthetic users against ${config.apiUrl.origin}.`);
  const users = await prepareUsers();
  await delay(config.settleMs);
  console.log(`Running ${config.users} concurrent active-logger flows.`);
  const startedAt = performance.now();
  const results = await Promise.allSettled(users.map(runWorkout));
  const durationMs = performance.now() - startedAt;
  printSummary("setup", samples.filter((sample) => sample.phase === "setup"), config.users);
  printSummary(
    "workload",
    samples.filter((sample) => sample.phase === "workload"),
    config.users,
    durationMs
  );
  reportFailures(results);
}

async function prepareUsers(): Promise<CapacityUser[]> {
  const users: CapacityUser[] = [];
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < config.users) {
      const index = cursor++;
      users[index] = await signup(index);
    }
  }

  const count = Math.min(config.setupConcurrency, config.users);
  await Promise.all(Array.from({ length: count }, worker));
  return users;
}

async function signup(index: number): Promise<CapacityUser> {
  const ip = syntheticIp(index);
  const tag = `${runId}-${index}`;
  const result = await requestJson<DataEnvelope<unknown>>(ip, null, "setup", "signup", "/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      email: `capacity-${tag}@example.com`,
      username: `capacity_${tag}`,
      password: "capacity-only-passphrase"
    })
  }, 201);
  const cookie = result.setCookie?.split(";", 1)[0];
  if (!cookie) throw new Error(`User ${index}: signup did not set a session cookie.`);
  return { cookie, index, ip };
}

async function runWorkout(user: CapacityUser): Promise<void> {
  const workoutId = await createWorkout(user);
  const sessionExerciseId = await addExercise(user, workoutId);
  await addSets(user, workoutId, sessionExerciseId);
  await endWorkout(user, workoutId);
  await verifyWorkout(user, workoutId, sessionExerciseId);
}

async function createWorkout(user: CapacityUser): Promise<string> {
  const result = await requestJson<DataEnvelope<WorkoutData>>(
    user.ip, user.cookie, "workload", "create_workout", "/workouts",
    { method: "POST", body: JSON.stringify({ title: `Capacity ${runId} ${user.index}` }) }, 201
  );
  return result.body.data.workout.id;
}

async function addExercise(user: CapacityUser, workoutId: string): Promise<string> {
  const path = `/workouts/${workoutId}/exercises`;
  const result = await requestJson<DataEnvelope<SessionExerciseData>>(
    user.ip, user.cookie, "workload", "add_exercise", path,
    { method: "POST", body: JSON.stringify({ clientMutationId: randomUUID(), exerciseId }) }, 201
  );
  return result.body.data.sessionExercise.id;
}

async function addSets(
  user: CapacityUser,
  workoutId: string,
  sessionExerciseId: string
): Promise<void> {
  const path = `/workouts/${workoutId}/exercises/${sessionExerciseId}/sets`;
  for (const reps of [10, 8, 6]) {
    await requestJson<DataEnvelope<unknown>>(
      user.ip, user.cookie, "workload", "add_set", path,
      { method: "POST", body: JSON.stringify(setPayload(reps)) }, 201
    );
  }
}

function setPayload(reps: number): Record<string, unknown> {
  return {
    clientMutationId: randomUUID(),
    setType: "working",
    weightKg: "80.00",
    reps,
    rir: 2,
    restTimeSeconds: 120
  };
}

async function endWorkout(user: CapacityUser, workoutId: string): Promise<void> {
  await requestJson<DataEnvelope<unknown>>(
    user.ip, user.cookie, "workload", "end_workout", `/workouts/${workoutId}/end`,
    { method: "POST", body: "{}" }, 200
  );
}

async function verifyWorkout(
  user: CapacityUser,
  workoutId: string,
  sessionExerciseId: string
): Promise<void> {
  const result = await requestJson<DataEnvelope<WorkoutData>>(
    user.ip, user.cookie, "workload", "verify_workout", `/workouts/${workoutId}`,
    { method: "GET" }, 200
  );
  const exercise = result.body.data.workout.exercises.find(({ id }) => id === sessionExerciseId);
  if (!exercise || exercise.sets.length !== 3) {
    throw new Error(`User ${user.index}: persisted workout did not contain all three sets.`);
  }
}

async function requestJson<T>(
  ip: string,
  cookie: string | null,
  phase: CapacitySample["phase"],
  step: string,
  path: string,
  init: RequestInit,
  expectedStatus: number
): Promise<ApiResult<T>> {
  const startedAt = performance.now();
  const response = await fetch(new URL(`${config.apiUrl.pathname}${path}`, config.apiUrl), {
    ...init,
    headers: requestHeaders(ip, cookie),
    signal: AbortSignal.timeout(requestTimeoutMs)
  });
  samples.push({ durationMs: performance.now() - startedAt, phase, status: response.status, step });
  if (response.status !== expectedStatus) {
    const body = (await response.text()).slice(0, 500);
    throw new Error(`${step}: expected ${expectedStatus}, received ${response.status}: ${body}`);
  }
  return { body: await response.json() as T, setCookie: response.headers.get("set-cookie") };
}

function requestHeaders(ip: string, cookie: string | null): Record<string, string> {
  const signature = createHmac("sha256", config.clientIpSecret).update(ip).digest("base64url");
  return {
    "content-type": "application/json",
    "x-gym-client-ip": ip,
    "x-gym-client-signature": signature,
    ...(cookie ? { cookie } : {})
  };
}

function readConfig(): Config {
  if (process.env.CAPACITY_CONFIRM !== safetyConfirmation) {
    throw new Error(`Set CAPACITY_CONFIRM=${safetyConfirmation} after confirming isolated synthetic data.`);
  }
  const apiUrl = new URL(process.env.CAPACITY_API_URL ?? "http://127.0.0.1:4000/api/v1");
  assertApprovedTarget(apiUrl);
  const clientIpSecret = process.env.CAPACITY_BFF_SECRET ?? "";
  if (clientIpSecret.length < 32) throw new Error("CAPACITY_BFF_SECRET must contain at least 32 characters.");
  return {
    apiUrl,
    clientIpSecret,
    users: readInteger("CAPACITY_USERS", 20, 1, 200),
    setupConcurrency: readInteger("CAPACITY_SETUP_CONCURRENCY", 4, 1, 20),
    settleMs: readInteger("CAPACITY_SETTLE_MS", 3_000, 0, 60_000)
  };
}

function assertApprovedTarget(url: URL): void {
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const approvedHost = process.env.CAPACITY_APPROVED_HOST;
  if (!loopback && approvedHost !== url.host) {
    throw new Error(`Set CAPACITY_APPROVED_HOST=${url.host} to confirm this non-loopback target.`);
  }
  if (!url.pathname.endsWith("/api/v1")) throw new Error("CAPACITY_API_URL must end with /api/v1.");
}

function readInteger(name: string, fallback: number, min: number, max: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer from ${min} through ${max}.`);
  }
  return value;
}

function syntheticIp(index: number): string {
  const third = Math.floor(index / 254);
  return `198.51.${100 + third}.${(index % 254) + 1}`;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
