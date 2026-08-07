import assert from "node:assert/strict";
import { describe, it } from "node:test";
import cookie from "@fastify/cookie";
import fastify from "fastify";
import type { AuthService, PublicUser } from "../auth/auth.service.js";
import { registerExerciseRoutes } from "./exercise.routes.js";
import type {
  CreateExerciseRequest,
  ListExercisesQuery,
  MergeExerciseRequest,
  UpdateExerciseRequest
} from "./exercise.schemas.js";
import type {
  ExerciseList,
  ExerciseMergeSummary,
  ExerciseResult,
  ExerciseService,
  ExerciseShape,
  MuscleGroupList
} from "./exercise.service.js";
import type { ExerciseNameEvaluation } from "./exercise-name-quality.js";

const chestId = "11111111-1111-4111-8111-111111111111";
const tricepsId = "22222222-2222-4222-8222-222222222222";
const user: PublicUser = {
  id: "user-1",
  email: "jan@example.com",
  username: "jan",
  emailVerified: false,
  createdAt: "2026-05-20T10:00:00.000Z"
};
const exercise: ExerciseShape = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Bench Press",
  equipment: "barbell",
  exerciseType: "compound",
  primaryMuscleGroup: {
    id: chestId,
    slug: "chest",
    name: "Chest"
  },
  primaryMuscleGroups: [{ id: chestId, slug: "chest", name: "Chest" }],
  secondaryMuscleGroups: [],
  muscleGroups: [{ id: chestId, slug: "chest", name: "Chest", role: "PRIMARY" }],
  createdByUserId: null,
  createdAt: "2026-05-20T10:00:00.000Z",
  updatedAt: "2026-05-20T10:00:00.000Z"
};

const mergeSummary: ExerciseMergeSummary = {
  source: { id: "44444444-4444-4444-8444-444444444444", name: "Bench Pres", retired: true },
  target: { id: exercise.id, name: exercise.name },
  reassignedSessionExercises: 3,
  reassignedTemplateExercises: 2,
  affectedWorkouts: 2,
  affectedTemplates: 1,
  affectedSets: 9
};

class FakeExerciseService implements ExerciseService {
  public listMuscleGroupsCalled = false;
  public listCall: { userId: string; input: ListExercisesQuery } | null = null;
  public createCall: { userId: string; input: CreateExerciseRequest } | null = null;
  public updateCall: {
    userId: string;
    exerciseId: string;
    input: UpdateExerciseRequest;
  } | null = null;
  public mergeCall: {
    userId: string;
    sourceExerciseId: string;
    input: MergeExerciseRequest;
  } | null = null;

  public constructor(
    private readonly createResult: ExerciseResult<ExerciseShape> = {
      ok: true,
      value: { ...exercise, createdByUserId: "user-1" }
    },
    private readonly mergeResult: ExerciseResult<ExerciseMergeSummary> = {
      ok: true,
      value: mergeSummary
    }
  ) {}

  public async listExercises(userId: string, input: ListExercisesQuery): Promise<ExerciseList> {
    this.listCall = { userId, input };

    return {
      items: [exercise],
      pagination: {
        limit: input.limit,
        offset: input.offset,
        total: 1
      }
    };
  }

  public async listMuscleGroups(): Promise<MuscleGroupList> {
    this.listMuscleGroupsCalled = true;

    return {
      items: [
        {
          id: chestId,
          slug: "chest",
          name: "Chest"
        },
        {
          id: tricepsId,
          slug: "triceps",
          name: "Triceps"
        }
      ]
    };
  }

  public async listOptions(): Promise<{ equipment: readonly string[]; exerciseTypes: readonly string[] }> {
    return { equipment: ["barbell"], exerciseTypes: ["compound"] };
  }

  public async findNameSuggestions(): Promise<ExerciseShape[]> {
    return [exercise];
  }

  public async createExercise(
    userId: string,
    input: CreateExerciseRequest
  ): Promise<ExerciseResult<ExerciseShape>> {
    this.createCall = { userId, input };

    return this.createResult;
  }

  public async updateExercise(
    userId: string,
    exerciseId: string,
    input: UpdateExerciseRequest
  ): Promise<ExerciseResult<ExerciseShape>> {
    this.updateCall = { userId, exerciseId, input };

    return this.createResult;
  }

  public async mergeExercises(
    userId: string,
    sourceExerciseId: string,
    input: MergeExerciseRequest
  ): Promise<ExerciseResult<ExerciseMergeSummary>> {
    this.mergeCall = { userId, sourceExerciseId, input };

    return this.mergeResult;
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

async function buildExerciseServer(
  exerciseService: ExerciseService,
  authenticated = true
) {
  const server = fastify();

  await server.register(cookie);
  await registerExerciseRoutes(server, {
    authService: authService(authenticated),
    cookieName: "gym_progress_session",
    exerciseService
  });

  return server;
}

describe("exercise routes", () => {
  it("requires authentication", async () => {
    const service = new FakeExerciseService();
    const server = await buildExerciseServer(service, false);
    const response = await server.inject("/api/v1/exercises");
    const muscleGroupsResponse = await server.inject("/api/v1/muscle-groups");

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, "UNAUTHORIZED");
    assert.equal(muscleGroupsResponse.statusCode, 401);
    assert.equal(muscleGroupsResponse.json().error.code, "UNAUTHORIZED");
    assert.equal(service.listCall, null);
    assert.equal(service.listMuscleGroupsCalled, false);
  });

  it("lists exercises with parsed filters and pagination", async () => {
    const service = new FakeExerciseService();
    const server = await buildExerciseServer(service);
    const response = await server.inject(
      `/api/v1/exercises?search=bench&primaryMuscleGroupId=${chestId}&ownership=readOnly&limit=10&offset=5`
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      data: {
        items: [exercise],
        pagination: {
          limit: 10,
          offset: 5,
          total: 1
        }
      }
    });
    assert.equal(service.listCall?.userId, user.id);
    assert.equal(service.listCall?.input.search, "bench");
    assert.equal(service.listCall?.input.primaryMuscleGroupId, chestId);
    assert.equal(service.listCall?.input.ownership, "readOnly");
  });

  it("lists seeded muscle groups", async () => {
    const service = new FakeExerciseService();
    const server = await buildExerciseServer(service);
    const response = await server.inject("/api/v1/muscle-groups");

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      data: {
        items: [
          {
            id: chestId,
            slug: "chest",
            name: "Chest"
          },
          {
            id: tricepsId,
            slug: "triceps",
            name: "Triceps"
          }
        ]
      }
    });
    assert.equal(service.listMuscleGroupsCalled, true);
  });

  it("lists canonical options and existing-name suggestions", async () => {
    const service = new FakeExerciseService();
    const server = await buildExerciseServer(service);
    const options = await server.inject("/api/v1/exercises/options");
    const suggestions = await server.inject("/api/v1/exercises/name-suggestions?name=bench");

    assert.equal(options.statusCode, 200);
    assert.deepEqual(options.json().data, {
      equipment: ["barbell"],
      exerciseTypes: ["compound"]
    });
    assert.equal(suggestions.statusCode, 200);
    assert.deepEqual(suggestions.json().data.items, [exercise]);
  });

  it("returns validation errors for invalid list queries", async () => {
    const server = await buildExerciseServer(new FakeExerciseService());
    const responses = await Promise.all([
      server.inject("/api/v1/exercises?limit=101"),
      server.inject("/api/v1/exercises?ownership=mine")
    ]);

    for (const response of responses) {
      assert.equal(response.statusCode, 422);
      assert.equal(response.json().error.code, "VALIDATION_ERROR");
    }
  });

  it("creates an exercise for the authenticated user", async () => {
    const service = new FakeExerciseService();
    const server = await buildExerciseServer(service);
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/exercises",
      payload: {
        name: " Incline Dumbbell Press ",
        equipment: " dumbbell ",
        exerciseType: "compound",
        primaryMuscleGroupId: chestId,
        secondaryMuscleGroupIds: [tricepsId]
      }
    });

    assert.equal(response.statusCode, 201);
    assert.equal(response.json().data.exercise.createdByUserId, "user-1");
    assert.equal(service.createCall?.userId, "user-1");
    assert.equal(service.createCall?.input.name, "Incline Dumbbell Press");
    assert.equal(service.createCall?.input.equipment, "dumbbell");
  });

  it("accepts multiple primary muscles and secondary muscles", async () => {
    const service = new FakeExerciseService();
    const server = await buildExerciseServer(service);
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/exercises",
      payload: {
        name: "Machine Chest Press",
        primaryMuscleGroupIds: [chestId, tricepsId],
        secondaryMuscleGroupIds: []
      }
    });

    assert.equal(response.statusCode, 201);
    assert.deepEqual(service.createCall?.input.primaryMuscleGroupIds, [chestId, tricepsId]);
  });

  it("rejects missing, duplicate, and overlapping muscle assignments", async () => {
    const server = await buildExerciseServer(new FakeExerciseService());
    const payloads = [
      { name: "No Primary", primaryMuscleGroupIds: [], secondaryMuscleGroupIds: [] },
      { name: "Duplicate", primaryMuscleGroupIds: [chestId, chestId], secondaryMuscleGroupIds: [] },
      { name: "Overlap", primaryMuscleGroupIds: [chestId], secondaryMuscleGroupIds: [chestId] }
    ];

    for (const payload of payloads) {
      const response = await server.inject({ method: "POST", url: "/api/v1/exercises", payload });
      assert.equal(response.statusCode, 422);
      assert.equal(response.json().error.code, "VALIDATION_ERROR");
    }
  });

  it("returns conflict when an active exercise name exists", async () => {
    const server = await buildExerciseServer(
      new FakeExerciseService({ ok: false, reason: "name_conflict" })
    );
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/exercises",
      payload: createPayload()
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error.code, "EXERCISE_NAME_CONFLICT");
  });

  it("returns not found for invalid muscle group references", async () => {
    const server = await buildExerciseServer(
      new FakeExerciseService({ ok: false, reason: "muscle_group_not_found" })
    );
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/exercises",
      payload: createPayload()
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error.code, "MUSCLE_GROUP_NOT_FOUND");
  });

  it("returns review details for warned exercise names", async () => {
    const server = await buildExerciseServer(
      new FakeExerciseService({
        ok: false,
        reason: "name_review_required",
        evaluation: nameEvaluation("warn")
      })
    );
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/exercises",
      payload: createPayload()
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "EXERCISE_NAME_REVIEW_REQUIRED");
    assert.equal(response.json().error.details.suggestions[0], "Incline Dumbbell Press");
  });

  it("returns blocked details for rejected exercise names", async () => {
    const server = await buildExerciseServer(
      new FakeExerciseService({
        ok: false,
        reason: "name_blocked",
        evaluation: nameEvaluation("blocked")
      })
    );
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/exercises",
      payload: createPayload()
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "EXERCISE_NAME_BLOCKED");
  });

  it("returns validation errors for duplicate secondary muscle IDs", async () => {
    const server = await buildExerciseServer(new FakeExerciseService());
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/exercises",
      payload: {
        ...createPayload(),
        secondaryMuscleGroupIds: [tricepsId, tricepsId]
      }
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "VALIDATION_ERROR");
  });

  it("merges an exercise and returns the merge summary", async () => {
    const service = new FakeExerciseService();
    const server = await buildExerciseServer(service);
    const sourceId = mergeSummary.source.id;
    const response = await server.inject({
      method: "POST",
      url: `/api/v1/exercises/${sourceId}/merge`,
      payload: {
        targetExerciseId: exercise.id
      }
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { data: { merge: mergeSummary } });
    assert.equal(service.mergeCall?.userId, "user-1");
    assert.equal(service.mergeCall?.sourceExerciseId, sourceId);
    assert.equal(service.mergeCall?.input.targetExerciseId, exercise.id);
  });

  it("returns not found when a merge exercise is missing", async () => {
    const server = await buildExerciseServer(
      new FakeExerciseService(undefined, { ok: false, reason: "exercise_not_found" })
    );
    const response = await server.inject({
      method: "POST",
      url: `/api/v1/exercises/${mergeSummary.source.id}/merge`,
      payload: {
        targetExerciseId: exercise.id
      }
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error.code, "EXERCISE_NOT_FOUND");
  });

  it("returns a validation error for a self merge", async () => {
    const server = await buildExerciseServer(
      new FakeExerciseService(undefined, { ok: false, reason: "merge_same_exercise" })
    );
    const response = await server.inject({
      method: "POST",
      url: `/api/v1/exercises/${exercise.id}/merge`,
      payload: {
        targetExerciseId: exercise.id
      }
    });

    assert.equal(response.statusCode, 422);
    assert.equal(
      response.json().error.fields.targetExerciseId[0],
      "An exercise cannot be merged into itself."
    );
  });
});

function createPayload() {
  return {
    name: "Incline Dumbbell Press",
    equipment: "dumbbell",
    exerciseType: "compound",
    primaryMuscleGroupId: chestId,
    secondaryMuscleGroupIds: [tricepsId]
  };
}

function nameEvaluation(status: "blocked" | "warn"): ExerciseNameEvaluation {
  return {
    status,
    normalizedName: "Incline Dumbbell Press",
    reasons: [
      {
        code: status === "blocked" ? "contains_date" : "not_in_catalog",
        message: status === "blocked" ? "Exercise names must not include dates or timestamps." : "This name is not in the approved exercise catalog yet."
      }
    ],
    suggestions: ["Incline Dumbbell Press"]
  };
}
