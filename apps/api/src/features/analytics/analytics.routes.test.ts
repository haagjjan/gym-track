import assert from "node:assert/strict";
import { describe, it } from "node:test";
import cookie from "@fastify/cookie";
import fastify from "fastify";
import type { AuthService, PublicUser } from "../auth/auth.service.js";
import { registerAnalyticsRoutes } from "./analytics.routes.js";
import type {
  AnalyticsService,
  CompletedExerciseList,
  ExerciseProgress,
  ExerciseSummary,
  WeeklyVolume
} from "./analytics.service.js";
import type {
  ExerciseProgressQuery,
  ExerciseSummaryQuery,
  WeeklyVolumeQuery
} from "./analytics.schemas.js";

const exerciseId = "11111111-1111-4111-8111-111111111111";
const muscleGroupId = "22222222-2222-4222-8222-222222222222";
const user: PublicUser = {
  id: "user-1",
  email: "jan@example.com",
  username: "jan",
  createdAt: "2026-05-20T10:00:00.000Z"
};

class FakeAnalyticsService implements AnalyticsService {
  public listCall: { userId: string } | null = null;
  public progressCall:
    | { userId: string; exerciseId: string; input: ExerciseProgressQuery }
    | null = null;
  public summaryCall:
    | { userId: string; exerciseId: string; input: ExerciseSummaryQuery }
    | null = null;
  public weeklyCall: { userId: string; input: WeeklyVolumeQuery } | null = null;

  public async listCompletedExercises(userId: string): Promise<CompletedExerciseList> {
    this.listCall = { userId };

    return { items: [] };
  }

  public async getExerciseProgress(
    userId: string,
    progressExerciseId: string,
    input: ExerciseProgressQuery
  ): Promise<ExerciseProgress> {
    this.progressCall = { userId, exerciseId: progressExerciseId, input };

    return { exerciseId: progressExerciseId, items: [] };
  }

  public async getExerciseSummary(
    userId: string,
    summaryExerciseId: string,
    input: ExerciseSummaryQuery
  ): Promise<ExerciseSummary> {
    this.summaryCall = { userId, exerciseId: summaryExerciseId, input };

    return {
      exerciseId: summaryExerciseId,
      totalSets: 0,
      totalReps: 0,
      totalVolumeKg: "0.00",
      averageRir: null,
      bestTopSet: null
    };
  }

  public async getWeeklyVolume(userId: string, input: WeeklyVolumeQuery): Promise<WeeklyVolume> {
    this.weeklyCall = { userId, input };

    return { weeks: [] };
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
    }
  };
}

async function buildAnalyticsServer(
  analyticsService: AnalyticsService,
  authenticated = true
) {
  const server = fastify();

  await server.register(cookie);
  await registerAnalyticsRoutes(server, {
    authService: authService(authenticated),
    cookieName: "gym_progress_session",
    analyticsService
  });

  return server;
}

describe("analytics routes", () => {
  it("requires authentication", async () => {
    const service = new FakeAnalyticsService();
    const server = await buildAnalyticsServer(service, false);
    const response = await server.inject(`/api/v1/analytics/exercises/${exerciseId}/progress`);

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, "UNAUTHORIZED");
    assert.equal(service.progressCall, null);
  });

  it("lists completed exercises for progress navigation", async () => {
    const service = new FakeAnalyticsService();
    const server = await buildAnalyticsServer(service);
    const response = await server.inject("/api/v1/analytics/exercises");

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { data: { items: [] } });
    assert.equal(service.listCall?.userId, "user-1");
  });

  it("parses exercise progress query parameters", async () => {
    const service = new FakeAnalyticsService();
    const server = await buildAnalyticsServer(service);
    const response = await server.inject(
      `/api/v1/analytics/exercises/${exerciseId}/progress?startDate=2026-05-18&endDate=2026-05-24&includeWarmups=true`
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.exerciseId, exerciseId);
    assert.equal(service.progressCall?.userId, "user-1");
    assert.equal(service.progressCall?.input.includeWarmups, true);
    assert.equal(service.progressCall?.input.startDate?.toISOString(), "2026-05-18T00:00:00.000Z");
    assert.equal(service.progressCall?.input.endDate?.toISOString(), "2026-05-24T23:59:59.999Z");
  });

  it("parses exercise summary query parameters", async () => {
    const service = new FakeAnalyticsService();
    const server = await buildAnalyticsServer(service);
    const response = await server.inject(
      `/api/v1/analytics/exercises/${exerciseId}/summary?startDate=2026-05-18`
    );

    assert.equal(response.statusCode, 200);
    assert.equal(service.summaryCall?.exerciseId, exerciseId);
    assert.equal(service.summaryCall?.input.startDate?.toISOString(), "2026-05-18T00:00:00.000Z");
  });

  it("parses weekly volume muscle filters", async () => {
    const service = new FakeAnalyticsService();
    const server = await buildAnalyticsServer(service);
    const response = await server.inject(
      `/api/v1/analytics/weekly-volume?muscleGroupIds=${muscleGroupId}`
    );

    assert.equal(response.statusCode, 200);
    assert.equal(service.weeklyCall?.userId, "user-1");
    assert.deepEqual(service.weeklyCall?.input.muscleGroupIds, [muscleGroupId]);
  });

  it("validates exercise ids and query values", async () => {
    const server = await buildAnalyticsServer(new FakeAnalyticsService());
    const response = await server.inject(
      "/api/v1/analytics/exercises/not-a-uuid/progress?includeWarmups=maybe"
    );

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "VALIDATION_ERROR");
  });
});
