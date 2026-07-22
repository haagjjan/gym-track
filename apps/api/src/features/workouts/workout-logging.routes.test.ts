import assert from "node:assert/strict";
import { describe, it } from "node:test";
import cookie from "@fastify/cookie";
import fastify from "fastify";
import type { AuthService, PublicUser } from "../auth/auth.service.js";
import { registerWorkoutLoggingRoutes } from "./workout-logging.routes.js";
import type {
  AddSessionExerciseRequest,
  AddSetRequest,
  ReorderSessionExercisesRequest,
  UpdateSetRequest
} from "./workout-logging.schemas.js";
import type {
  LoggingResult,
  SessionExerciseShape,
  SetShape,
  WorkoutLoggingService
} from "./workout-logging.service.js";

const workoutId = "11111111-1111-4111-8111-111111111111";
const exerciseId = "22222222-2222-4222-8222-222222222222";
const sessionExerciseId = "33333333-3333-4333-8333-333333333333";
const setId = "44444444-4444-4444-8444-444444444444";
const user: PublicUser = {
  id: "user-1",
  email: "jan@example.com",
  username: "jan",
  emailVerified: false,
  createdAt: "2026-05-20T10:00:00.000Z"
};
const sessionExercise: SessionExerciseShape = {
  id: sessionExerciseId,
  position: 1,
  exercise: {
    id: exerciseId,
    name: "Bench Press",
    primaryMuscleGroup: {
      id: "55555555-5555-4555-8555-555555555555",
      slug: "chest",
      name: "Chest"
    }
  },
  sets: []
};
const set: SetShape = {
  id: setId,
  setOrder: 1,
  setType: "working",
  weightKg: "80.50",
  reps: 8,
  rir: 2,
  restTimeSeconds: 120,
  note: null,
  createdAt: "2026-05-20T10:00:00.000Z",
  updatedAt: "2026-05-20T10:00:00.000Z"
};

type ReorderItem = { sessionExerciseId: string; position: number };
type AddSessionExerciseCall = { userId: string; workoutId: string; input: AddSessionExerciseRequest };
type ReorderCall = { userId: string; workoutId: string; input: ReorderSessionExercisesRequest };
type DeleteSessionExerciseCall = { userId: string; workoutId: string; sessionExerciseId: string };
type AddSetCall = { userId: string; workoutId: string; sessionExerciseId: string; input: AddSetRequest };
type UpdateSetCall = { userId: string; setId: string; input: UpdateSetRequest };

const okSessionExercise: LoggingResult<SessionExerciseShape> = { ok: true, value: sessionExercise };
const okReorder: LoggingResult<ReorderItem[]> = { ok: true, value: [{ sessionExerciseId, position: 1 }] };
const okDeleted: LoggingResult<{ deleted: true }> = { ok: true, value: { deleted: true } };
const okSet: LoggingResult<SetShape> = { ok: true, value: set };
const okUpdatedSet: LoggingResult<SetShape> = { ok: true, value: { ...set, reps: 9 } };

class FakeWorkoutLoggingService implements WorkoutLoggingService {
  public addSessionExerciseCall: AddSessionExerciseCall | null = null;
  public reorderSessionExercisesCall: ReorderCall | null = null;
  public deleteSessionExerciseCall: DeleteSessionExerciseCall | null = null;
  public addSetCall: AddSetCall | null = null;
  public updateSetCall: UpdateSetCall | null = null;
  public deleteSetCall: { userId: string; setId: string } | null = null;

  public constructor(
    private readonly addSessionExerciseResult: LoggingResult<SessionExerciseShape> = okSessionExercise,
    private readonly reorderResult: LoggingResult<ReorderItem[]> = okReorder,
    private readonly deleteSessionExerciseResult: LoggingResult<{ deleted: true }> = okDeleted,
    private readonly addSetResult: LoggingResult<SetShape> = okSet,
    private readonly updateSetResult: LoggingResult<SetShape> = okUpdatedSet,
    private readonly deleteSetResult: LoggingResult<{ deleted: true }> = okDeleted
  ) {}

  public async addSessionExercise(
    userId: string,
    currentWorkoutId: string,
    input: AddSessionExerciseRequest
  ): Promise<LoggingResult<SessionExerciseShape>> {
    this.addSessionExerciseCall = {
      userId,
      workoutId: currentWorkoutId,
      input
    };

    return this.addSessionExerciseResult;
  }

  public async reorderSessionExercises(
    userId: string,
    currentWorkoutId: string,
    input: ReorderSessionExercisesRequest
  ): Promise<LoggingResult<ReorderItem[]>> {
    this.reorderSessionExercisesCall = {
      userId,
      workoutId: currentWorkoutId,
      input
    };

    return this.reorderResult;
  }

  public async deleteSessionExercise(
    userId: string,
    currentWorkoutId: string,
    currentSessionExerciseId: string
  ): Promise<LoggingResult<{ deleted: true }>> {
    this.deleteSessionExerciseCall = {
      userId,
      workoutId: currentWorkoutId,
      sessionExerciseId: currentSessionExerciseId
    };

    return this.deleteSessionExerciseResult;
  }

  public async addSet(
    userId: string,
    currentWorkoutId: string,
    currentSessionExerciseId: string,
    input: AddSetRequest
  ): Promise<LoggingResult<SetShape>> {
    this.addSetCall = {
      userId,
      workoutId: currentWorkoutId,
      sessionExerciseId: currentSessionExerciseId,
      input
    };

    return this.addSetResult;
  }

  public async updateSet(
    userId: string,
    currentSetId: string,
    input: UpdateSetRequest
  ): Promise<LoggingResult<SetShape>> {
    this.updateSetCall = { userId, setId: currentSetId, input };

    return this.updateSetResult;
  }

  public async deleteSet(
    userId: string,
    currentSetId: string
  ): Promise<LoggingResult<{ deleted: true }>> {
    this.deleteSetCall = { userId, setId: currentSetId };

    return this.deleteSetResult;
  }
}

function authService(authenticated = true): AuthService {
  return {
    async signup() {
      throw new Error("not used");
    },
    async login() {
      throw new Error("not used");
    },
    async logout() {
      return { loggedOut: true };
    },
    async currentUser() {
      return authenticated ? { ok: true, value: user } : { ok: false, reason: "unauthorized" };
    },
    async requestEmailVerification() {
      return { sent: true };
    },
    async verifyEmail() {
      return { ok: true, value: { verified: true } };
    },
    async requestPasswordReset() {
      return { requested: true };
    },
    async resetPassword() {
      return { ok: true, value: { reset: true } };
    },
    async cleanupExpiredAuthRecords() {}
  };
}

async function buildWorkoutLoggingServer(loggingService: WorkoutLoggingService, authenticated = true) {
  const server = fastify();

  await server.register(cookie);
  await registerWorkoutLoggingRoutes(server, {
    authService: authService(authenticated),
    cookieName: "gym_progress_session",
    loggingService
  });

  return server;
}

describe("workout logging routes", () => {
  it("requires authentication", async () => {
    const service = new FakeWorkoutLoggingService();
    const server = await buildWorkoutLoggingServer(service, false);
    const response = await server.inject({
      method: "POST",
      url: `/api/v1/workouts/${workoutId}/exercises`,
      payload: { exerciseId }
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, "UNAUTHORIZED");
    assert.equal(service.addSessionExerciseCall, null);
  });

  it("adds an exercise for the authenticated user", async () => {
    const service = new FakeWorkoutLoggingService();
    const server = await buildWorkoutLoggingServer(service);
    const response = await server.inject({
      method: "POST",
      url: `/api/v1/workouts/${workoutId}/exercises`,
      payload: { exerciseId, position: 1 }
    });

    assert.equal(response.statusCode, 201);
    assert.deepEqual(response.json(), { data: { sessionExercise } });
    assert.deepEqual(service.addSessionExerciseCall, {
      userId: "user-1",
      workoutId,
      input: { exerciseId, position: 1 }
    });
  });

  it("returns validation errors for malformed exercise payloads", async () => {
    const service = new FakeWorkoutLoggingService();
    const server = await buildWorkoutLoggingServer(service);
    const response = await server.inject({
      method: "POST",
      url: `/api/v1/workouts/${workoutId}/exercises`,
      payload: { exerciseId: "not-a-uuid" }
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "VALIDATION_ERROR");
    assert.equal(service.addSessionExerciseCall, null);
  });

  it("returns not found for unavailable workout logging resources", async () => {
    const service = new FakeWorkoutLoggingService({ ok: false, reason: "not_found" });
    const server = await buildWorkoutLoggingServer(service);
    const response = await server.inject({
      method: "POST",
      url: `/api/v1/workouts/${workoutId}/exercises`,
      payload: { exerciseId }
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error.code, "WORKOUT_LOGGING_RESOURCE_NOT_FOUND");
  });

  it("reorders exercise blocks", async () => {
    const service = new FakeWorkoutLoggingService();
    const server = await buildWorkoutLoggingServer(service);
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/workouts/${workoutId}/exercises/reorder`,
      payload: {
        items: [{ sessionExerciseId, position: 1 }]
      }
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().data.items, [{ sessionExerciseId, position: 1 }]);
    assert.deepEqual(service.reorderSessionExercisesCall, {
      userId: "user-1",
      workoutId,
      input: { items: [{ sessionExerciseId, position: 1 }] }
    });
  });

  it("maps invalid reorders to conflicts", async () => {
    const service = new FakeWorkoutLoggingService(undefined, {
      ok: false,
      reason: "invalid_order"
    });
    const server = await buildWorkoutLoggingServer(service);
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/workouts/${workoutId}/exercises/reorder`,
      payload: {
        items: [{ sessionExerciseId, position: 2 }]
      }
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error.code, "INVALID_WORKOUT_ORDER");
  });

  it("soft-deletes exercise blocks", async () => {
    const service = new FakeWorkoutLoggingService();
    const server = await buildWorkoutLoggingServer(service);
    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/workouts/${workoutId}/exercises/${sessionExerciseId}`
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { data: { deleted: true } });
    assert.deepEqual(service.deleteSessionExerciseCall, {
      userId: "user-1",
      workoutId,
      sessionExerciseId
    });
  });

  it("adds sets with decimal weight normalization", async () => {
    const service = new FakeWorkoutLoggingService();
    const server = await buildWorkoutLoggingServer(service);
    const response = await server.inject({
      method: "POST",
      url: `/api/v1/workouts/${workoutId}/exercises/${sessionExerciseId}/sets`,
      payload: {
        setType: "working",
        weightKg: 80.5,
        reps: 8,
        rir: 2,
        restTimeSeconds: 120,
        note: "Good speed"
      }
    });

    assert.equal(response.statusCode, 201);
    assert.deepEqual(response.json(), { data: { set } });
    assert.equal(service.addSetCall?.userId, "user-1");
    assert.equal(service.addSetCall?.input.weightKg, "80.5");
  });

  it("returns validation errors for invalid set payloads", async () => {
    const service = new FakeWorkoutLoggingService();
    const server = await buildWorkoutLoggingServer(service);
    const response = await server.inject({
      method: "POST",
      url: `/api/v1/workouts/${workoutId}/exercises/${sessionExerciseId}/sets`,
      payload: {
        setType: "working",
        weightKg: "80.00",
        reps: 0,
        rir: 2
      }
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "VALIDATION_ERROR");
    assert.equal(service.addSetCall, null);
  });

  it("updates sets with partial payloads", async () => {
    const service = new FakeWorkoutLoggingService();
    const server = await buildWorkoutLoggingServer(service);
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/sets/${setId}`,
      payload: { reps: 9, note: "" }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.set.reps, 9);
    assert.deepEqual(service.updateSetCall, {
      userId: "user-1",
      setId,
      input: { reps: 9, note: null }
    });
  });

  it("rejects empty set update payloads", async () => {
    const service = new FakeWorkoutLoggingService();
    const server = await buildWorkoutLoggingServer(service);
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/sets/${setId}`,
      payload: {}
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "VALIDATION_ERROR");
    assert.equal(service.updateSetCall, null);
  });

  it("soft-deletes sets", async () => {
    const service = new FakeWorkoutLoggingService();
    const server = await buildWorkoutLoggingServer(service);
    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/sets/${setId}`
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { data: { deleted: true } });
    assert.deepEqual(service.deleteSetCall, {
      userId: "user-1",
      setId
    });
  });
});
