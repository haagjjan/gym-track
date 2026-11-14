import type { Exercise, SetInput, UpdateWorkoutInput } from "../api/types";

/**
 * Outbox for workouts logged in the phone app (ADR 0025, rollout stage 2a).
 *
 * Every change the logger makes is written here first and sent in order when the
 * API answers. Entities created on the phone carry a local ID until the server
 * has given them one; `idMap` remembers the pairing. An operation stays in the
 * list after the server confirmed it (`acked`) until the screens have reloaded
 * the server copy, so nothing flickers away in between.
 */
interface OpBase {
  /** Also the client mutation ID of ADR 0014 for creates. */
  opId: string;
  userId: string;
  workoutId: string;
  queuedAt: string;
  acked?: boolean;
  /** The server refused it for good. Kept and shown, never retried in a loop. */
  failedReason?: string;
  /** It cannot be sent right now, but may work later (another workout is open). */
  blockedReason?: string;
}

export type OutboxOp = OpBase & (
  | { kind: "startWorkout"; startedAt: string }
  | { kind: "updateWorkout"; input: UpdateWorkoutInput }
  | { kind: "endWorkout"; endedAt: string }
  | { kind: "deleteWorkout" }
  | { kind: "addExercise"; sessionExerciseId: string; exercise: Exercise }
  | { kind: "removeExercise"; sessionExerciseId: string }
  | { kind: "reorderExercises"; order: string[] }
  | { kind: "addSet"; sessionExerciseId: string; setId: string; input: SetInput }
  | { kind: "updateSet"; setId: string; input: Partial<SetInput> }
  | { kind: "deleteSet"; setId: string }
);

export type OutboxOpInput = OutboxOp extends infer Op ? Op extends OutboxOp ? Omit<Op, "opId" | "queuedAt" | "acked" | "failedReason" | "blockedReason"> : never : never;

export interface OutboxState {
  ops: OutboxOp[];
  idMap: Record<string, string>;
}

export interface OutboxStorage {
  read(): string | null;
  write(value: string): void;
}

const STORAGE_KEY = "gymtrack.workout-outbox.v2";
const LOCAL_PREFIX = "local:";

export const browserOutboxStorage: OutboxStorage = {
  read() {
    try {
      return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  },
  write(value) {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, value);
    } catch {
      throw new Error("Couldn't save this on the phone.");
    }
  }
};

let defaultStorage: OutboxStorage = browserOutboxStorage;
let currentUserId: string | null = null;
let parsed: { raw: string | null; state: OutboxState } | null = null;
let version = 0;
const listeners = new Set<() => void>();
/** Operations a flush is sending right now. They must not be merged or dropped. */
export const inFlight = new Set<string>();

/** Swaps the store the app writes to (SQLite on phones). */
export function setOutboxStorage(storage: OutboxStorage): void {
  defaultStorage = storage;
  notify();
}

/** The signed-in user whose queue the hooks read and write. Null on the website. */
export function setOutboxUser(userId: string | null): void {
  if (currentUserId === userId) return;
  currentUserId = userId;
  notify();
}

export function outboxUser(): string | null {
  return currentUserId;
}

export function subscribeOutbox(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function outboxVersion(): number {
  return version;
}

function notify(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function newLocalId(): string {
  return `${LOCAL_PREFIX}${crypto.randomUUID()}`;
}

export function isLocalId(id: string): boolean {
  return id.startsWith(LOCAL_PREFIX);
}

export function resolveId(id: string, idMap: Record<string, string>): string {
  return idMap[id] ?? id;
}

export function readOutbox(storage: OutboxStorage = defaultStorage): OutboxState {
  const raw = storage.read();

  // Screens read this on every render; parse only when the stored text changed.
  if (storage === defaultStorage && parsed?.raw === raw) return parsed.state;

  const state = parseState(raw);

  if (storage === defaultStorage) parsed = { raw, state };

  return state;
}

function parseState(raw: string | null): OutboxState {
  try {
    const value = JSON.parse(raw ?? "null") as Partial<OutboxState> | null;

    return {
      ops: Array.isArray(value?.ops) ? value.ops.filter(isOp) : [],
      idMap: value?.idMap && typeof value.idMap === "object" ? value.idMap : {}
    };
  } catch {
    return { ops: [], idMap: {} };
  }
}

/** True while something created on the phone has no server ID yet. */
export function isWaitingId(id: string, storage: OutboxStorage = defaultStorage): boolean {
  return isLocalId(id) && !readOutbox(storage).idMap[id];
}

export function writeOutbox(state: OutboxState, storage: OutboxStorage = defaultStorage): void {
  storage.write(JSON.stringify(state));
  notify();
}

function isOp(value: unknown): value is OutboxOp {
  if (!value || typeof value !== "object") return false;
  const op = value as Record<string, unknown>;

  return typeof op.opId === "string" && typeof op.userId === "string" && typeof op.workoutId === "string"
    && typeof op.kind === "string" && typeof op.queuedAt === "string";
}

/** True while the creating operation of a local ID is still waiting and may be changed in place. */
function editableCreate(state: OutboxState, match: (op: OutboxOp) => boolean): OutboxOp | undefined {
  return state.ops.find((op) => match(op) && !op.acked && !inFlight.has(op.opId));
}

function touches(op: OutboxOp, key: "sessionExerciseId" | "setId", id: string): boolean {
  return (op as unknown as Record<string, unknown>)[key] === id;
}

/**
 * Adds an operation. A change to something that has not left the phone yet is
 * folded into its create, so the server never sees the intermediate steps.
 */
export function enqueueOp(input: OutboxOpInput, storage: OutboxStorage = defaultStorage): OutboxOp {
  const state = readOutbox(storage);
  const op = { ...input, opId: crypto.randomUUID(), queuedAt: new Date().toISOString() } as OutboxOp;
  const mine = (other: OutboxOp): boolean => other.userId === op.userId;
  let ops = state.ops;

  if (op.kind === "updateSet") {
    const create = editableCreate(state, (other) => mine(other) && other.kind === "addSet" && other.setId === op.setId);

    if (create?.kind === "addSet") {
      ops = ops.map((other) => other === create ? { ...create, input: { ...create.input, ...op.input } } : other);
      writeOutbox({ ...state, ops }, storage);
      return op;
    }
  }

  if (op.kind === "deleteSet" && editableCreate(state, (other) => mine(other) && other.kind === "addSet" && other.setId === op.setId)) {
    writeOutbox({ ...state, ops: ops.filter((other) => !(mine(other) && touches(other, "setId", op.setId) && !inFlight.has(other.opId))) }, storage);
    return op;
  }

  if (op.kind === "removeExercise" && editableCreate(state, (other) => mine(other) && other.kind === "addExercise" && other.sessionExerciseId === op.sessionExerciseId)) {
    writeOutbox({ ...state, ops: ops.filter((other) => !(mine(other) && touches(other, "sessionExerciseId", op.sessionExerciseId) && !inFlight.has(other.opId))) }, storage);
    return op;
  }

  if (op.kind === "deleteWorkout" && editableCreate(state, (other) => mine(other) && other.kind === "startWorkout" && other.workoutId === op.workoutId)) {
    writeOutbox({ ...state, ops: ops.filter((other) => !(mine(other) && other.workoutId === op.workoutId && !inFlight.has(other.opId))) }, storage);
    return op;
  }

  if (op.kind === "reorderExercises") {
    // Only the latest order matters while none of them has been sent.
    ops = ops.filter((other) => !(mine(other) && other.kind === "reorderExercises" && other.workoutId === op.workoutId && !other.acked && !inFlight.has(other.opId)));
  }

  writeOutbox({ ...state, ops: [...ops, op] }, storage);
  return op;
}

export function userOps(userId: string, storage: OutboxStorage = defaultStorage): OutboxOp[] {
  return readOutbox(storage).ops.filter((op) => op.userId === userId);
}

/** Operations the server has not confirmed yet. */
export function waitingOps(userId: string, storage: OutboxStorage = defaultStorage): OutboxOp[] {
  return userOps(userId, storage).filter((op) => !op.acked);
}

/** Drops confirmed operations once the screens show the server copy again. */
export function pruneAcked(userId: string, storage: OutboxStorage = defaultStorage): void {
  const state = readOutbox(storage);
  const ops = state.ops.filter((op) => !(op.userId === userId && op.acked));

  if (ops.length !== state.ops.length) writeOutbox({ ...state, ops }, storage);
}

/** Lets refused operations be sent again after the user asked for it. */
export function retryFailed(userId: string, storage: OutboxStorage = defaultStorage): void {
  const state = readOutbox(storage);

  writeOutbox({
    ...state,
    ops: state.ops.map((op) => {
      if (op.userId !== userId || !op.failedReason) return op;
      const rest = { ...op };
      delete rest.failedReason;
      return rest;
    })
  }, storage);
}

/** Removes everything a user has queued, for sign-out with explicit consent or account deletion. */
export function clearOutbox(userId: string, storage: OutboxStorage = defaultStorage): void {
  const state = readOutbox(storage);

  writeOutbox({ ...state, ops: state.ops.filter((op) => op.userId !== userId) }, storage);
}
