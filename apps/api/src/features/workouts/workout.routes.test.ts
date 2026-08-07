import assert from "node:assert/strict";
import { describe, it } from "node:test";
import cookie from "@fastify/cookie";
import fastify from "fastify";
import type { AuthService, PublicUser } from "../auth/auth.service.js";
import { registerWorkoutRoutes } from "./workout.routes.js";
import type {
  DeletedWorkout,
  WorkoutDetail,
  WorkoutList,
  WorkoutResult,
  WorkoutService
} from "./workout.service.js";
import type {
  CreateWorkoutRequest,
  ListWorkoutsQuery,
  UpdateWorkoutRequest
} from "./workout.schemas.js";

const workoutId = "11111111-1111-4111-8111-111111111111";
const user: PublicUser = {
  id: "user-1",
  email: "jan@example.com",
  username: "jan",
  emailVerified: false,
  createdAt: "2026-05-20T10:00:00.000Z"
};
const workout: WorkoutDetail = {
  id: workoutId,
  startedAt: "2026-05-20T10:00:00.000Z",
  endedAt: null,
  isOpen: true,
  workoutType: "upper",
  title: "Upper A",
  notes: null,
  sourceTemplateId: null,
  exercises: []
};

class FakeWorkoutService implements WorkoutService {
  public createCall: { userId: string; input: CreateWorkoutRequest } | null = null;
  public listCall: { userId: string; input: ListWorkoutsQuery } | null = null;
  public updateCall: {
    userId: string;
    workoutId: string;
    input: UpdateWorkoutRequest;
  } | null = null;
  public deleteCall: { userId: string; workoutId: string } | null = null;

  public constructor(
    private readonly createResult: WorkoutResult<WorkoutDetail> = {
      ok: true,
      value: workout
    },
    private readonly getResult: WorkoutResult<WorkoutDetail> = {
      ok: true,
      value: workout
    },
    private readonly endResult: WorkoutResult<WorkoutDetail> = {
      ok: true,
      value: { ...workout, endedAt: "2026-05-20T11:00:00.000Z", isOpen: false }
    },
    private readonly updateResult: WorkoutResult<WorkoutDetail> = {
      ok: true,
      value: workout
    },
    private readonly deleteResult: WorkoutResult<DeletedWorkout> = {
      ok: true,
      value: { workoutId, wasOpen: true }
    }
  ) {}

  public async createWorkout(
    userId: string,
    input: CreateWorkoutRequest
  ): Promise<WorkoutResult<WorkoutDetail>> {
    this.createCall = { userId, input };

    return this.createResult;
  }

  public async listWorkouts(userId: string, input: ListWorkoutsQuery): Promise<WorkoutList> {
    this.listCall = { userId, input };

    return {
      items: [{ ...workout, totalExercises: 0, totalSets: 0, tonnageKg: "0", exercisePreview: [] }],
      allTimeSummary: {
        totalSessions: 1,
        completedSessions: 0,
        cumulativeTonnageKg: "0",
        averageCompletedDurationSeconds: null,
        completionRate: 0
      },
      pagination: {
        limit: input.limit,
        offset: input.offset,
        total: 1
      }
    };
  }

  public async getWorkout(): Promise<WorkoutResult<WorkoutDetail>> {
    return this.getResult;
  }

  public async endWorkout(): Promise<WorkoutResult<WorkoutDetail>> {
    return this.endResult;
  }

  public async updateWorkout(
    userId: string,
    workoutId: string,
    input: UpdateWorkoutRequest
  ): Promise<WorkoutResult<WorkoutDetail>> {
    this.updateCall = { userId, workoutId, input };

    return this.updateResult;
  }

  public async deleteWorkout(
    userId: string,
    deletedWorkoutId: string
  ): Promise<WorkoutResult<DeletedWorkout>> {
    this.deleteCall = { userId, workoutId: deletedWorkoutId };

    return this.deleteResult;
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
      return { status: "SENT" as const };
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

async function buildWorkoutServer(
  workoutService: WorkoutService,
  authenticated = true
) {
  const server = fastify();

  await server.register(cookie);
  await registerWorkoutRoutes(server, {
    authService: authService(authenticated),
    cookieName: "gym_progress_session",
    workoutService
  });

  return server;
}

describe("workout routes", () => {
  it("requires authentication", async () => {
    const service = new FakeWorkoutService();
    const server = await buildWorkoutServer(service, false);
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/workouts"
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, "UNAUTHORIZED");
    assert.equal(service.createCall, null);
  });

  it("creates a workout for the authenticated user", async () => {
    const service = new FakeWorkoutService();
    const server = await buildWorkoutServer(service);
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/workouts",
      cookies: {
        gym_progress_session: "raw-session-token"
      }
    });

    assert.equal(response.statusCode, 201);
    assert.deepEqual(response.json(), { data: { workout } });
    assert.equal(service.createCall?.userId, "user-1");
    assert.deepEqual(service.createCall?.input, {});
  });

  it("returns validation errors for invalid create payloads", async () => {
    const server = await buildWorkoutServer(new FakeWorkoutService());
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/workouts",
      payload: {
        startedAt: "not-a-date"
      }
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "VALIDATION_ERROR");
  });

  it("returns conflict when an open workout already exists", async () => {
    const server = await buildWorkoutServer(
      new FakeWorkoutService({ ok: false, reason: "open_workout_exists" })
    );
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/workouts"
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error.code, "OPEN_WORKOUT_EXISTS");
  });

  it("lists workouts with parsed date bounds and pagination", async () => {
    const service = new FakeWorkoutService();
    const server = await buildWorkoutServer(service);
    const response = await server.inject(
      "/api/v1/workouts?startDate=2026-05-20&endDate=2026-05-21&limit=10&offset=5"
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.pagination.total, 1);
    assert.equal(service.listCall?.userId, "user-1");
    assert.equal(service.listCall?.input.startDate?.toISOString(), "2026-05-20T00:00:00.000Z");
    assert.equal(service.listCall?.input.endDate?.toISOString(), "2026-05-21T23:59:59.999Z");
    assert.equal(service.listCall?.input.limit, 10);
    assert.equal(service.listCall?.input.offset, 5);
  });

  it("validates workout id route params", async () => {
    const server = await buildWorkoutServer(new FakeWorkoutService());
    const response = await server.inject("/api/v1/workouts/not-a-uuid");

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "VALIDATION_ERROR");
  });

  it("returns not found for invisible workout details", async () => {
    const server = await buildWorkoutServer(
      new FakeWorkoutService(undefined, { ok: false, reason: "not_found" })
    );
    const response = await server.inject(`/api/v1/workouts/${workoutId}`);

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error.code, "WORKOUT_NOT_FOUND");
  });

  it("returns conflict when ending an already closed workout", async () => {
    const server = await buildWorkoutServer(
      new FakeWorkoutService(undefined, undefined, { ok: false, reason: "already_closed" })
    );
    const response = await server.inject({
      method: "POST",
      url: `/api/v1/workouts/${workoutId}/end`
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error.code, "WORKOUT_ALREADY_CLOSED");
  });

  it("returns validation errors for end times before the workout start", async () => {
    const server = await buildWorkoutServer(
      new FakeWorkoutService(undefined, undefined, { ok: false, reason: "ended_before_started" })
    );
    const response = await server.inject({
      method: "POST",
      url: `/api/v1/workouts/${workoutId}/end`
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.fields.endedAt[0], "endedAt must be after startedAt.");
  });

  it("updates a workout title and times", async () => {
    const service = new FakeWorkoutService();
    const server = await buildWorkoutServer(service);
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/workouts/${workoutId}`,
      payload: {
        title: "Upper B",
        startedAt: "2026-05-20T09:30:00.000Z"
      }
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { data: { workout } });
    assert.equal(service.updateCall?.userId, "user-1");
    assert.equal(service.updateCall?.workoutId, workoutId);
    assert.equal(service.updateCall?.input.title, "Upper B");
    assert.equal(
      service.updateCall?.input.startedAt?.toISOString(),
      "2026-05-20T09:30:00.000Z"
    );
  });

  it("rejects a workout update without any fields", async () => {
    const service = new FakeWorkoutService();
    const server = await buildWorkoutServer(service);
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/workouts/${workoutId}`,
      payload: {}
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "VALIDATION_ERROR");
    assert.equal(service.updateCall, null);
  });

  it("returns conflict when editing the end time of an open workout", async () => {
    const server = await buildWorkoutServer(
      new FakeWorkoutService(undefined, undefined, undefined, {
        ok: false,
        reason: "workout_still_open"
      })
    );
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/workouts/${workoutId}`,
      payload: {
        endedAt: "2026-05-20T11:00:00.000Z"
      }
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error.code, "WORKOUT_STILL_OPEN");
  });

  it("deletes an owned workout without returning a response body", async () => {
    const service = new FakeWorkoutService();
    const server = await buildWorkoutServer(service);
    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/workouts/${workoutId}`
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.body, "");
    assert.deepEqual(service.deleteCall, { userId: user.id, workoutId });
  });

  it("returns not found when deleting an invisible workout", async () => {
    const server = await buildWorkoutServer(
      new FakeWorkoutService(undefined, undefined, undefined, undefined, {
        ok: false,
        reason: "not_found"
      })
    );
    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/workouts/${workoutId}`
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error.code, "WORKOUT_NOT_FOUND");
  });
});
