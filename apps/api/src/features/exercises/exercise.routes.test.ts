import assert from "node:assert/strict";
import { describe, it } from "node:test";
import cookie from "@fastify/cookie";
import fastify from "fastify";
import type { AuthService, PublicUser } from "../auth/auth.service.js";
import { registerExerciseRoutes } from "./exercise.routes.js";
import type {
  CreateExerciseRequest,
  ListExercisesQuery
} from "./exercise.schemas.js";
import type {
  ExerciseList,
  ExerciseResult,
  ExerciseService,
  ExerciseShape,
  MuscleGroupList
} from "./exercise.service.js";

const chestId = "11111111-1111-4111-8111-111111111111";
const tricepsId = "22222222-2222-4222-8222-222222222222";
const user: PublicUser = {
  id: "user-1",
  email: "jan@example.com",
  username: "jan",
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
  secondaryMuscleGroups: [],
  createdByUserId: null,
  createdAt: "2026-05-20T10:00:00.000Z",
  updatedAt: "2026-05-20T10:00:00.000Z"
};

class FakeExerciseService implements ExerciseService {
  public listMuscleGroupsCalled = false;
  public listCall: ListExercisesQuery | null = null;
  public createCall: { userId: string; input: CreateExerciseRequest } | null = null;

  public constructor(
    private readonly createResult: ExerciseResult<ExerciseShape> = {
      ok: true,
      value: { ...exercise, createdByUserId: "user-1" }
    }
  ) {}

  public async listExercises(input: ListExercisesQuery): Promise<ExerciseList> {
    this.listCall = input;

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

  public async createExercise(
    userId: string,
    input: CreateExerciseRequest
  ): Promise<ExerciseResult<ExerciseShape>> {
    this.createCall = { userId, input };

    return this.createResult;
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
      `/api/v1/exercises?search=bench&primaryMuscleGroupId=${chestId}&limit=10&offset=5`
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
    assert.equal(service.listCall?.search, "bench");
    assert.equal(service.listCall?.primaryMuscleGroupId, chestId);
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

  it("returns validation errors for invalid list queries", async () => {
    const server = await buildExerciseServer(new FakeExerciseService());
    const response = await server.inject("/api/v1/exercises?limit=101");

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, "VALIDATION_ERROR");
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
