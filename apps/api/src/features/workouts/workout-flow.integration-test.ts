import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { createDatabase, type AppDatabase } from "../../db/database.js";
import { buildServer } from "../../server.js";
import type { Kysely } from "kysely";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const cookieName = "gym_progress_session";
const userPrefix = "integration_user_";
const exercisePrefix = "Integration Bench ";

interface ApiData<T> {
  data: T;
}

interface SignupPayload {
  user: {
    id: string;
  };
}

interface WorkoutPayload {
  workout: {
    id: string;
    exercises: {
      id: string;
      exercise: {
        name: string;
      };
      sets: {
        reps: number;
        weightKg: string;
      }[];
    }[];
  };
}

interface ExercisePayload {
  exercise: {
    id: string;
  };
}

interface SessionExercisePayload {
  sessionExercise: {
    id: string;
  };
}

interface SetPayload {
  set: {
    id: string;
  };
}

interface WorkoutListPayload {
  items: {
    id: string;
    totalExercises: number;
    totalSets: number;
  }[];
}

interface ExerciseSummaryPayload {
  totalSets: number;
  totalReps: number;
  totalVolumeKg: string;
  bestTopSet: {
    estimatedOneRepMaxKg: string;
  } | null;
}

interface CompletedExercisesPayload {
  items: {
    id: string;
    lastDoneAt: string;
    totalSets: number;
  }[];
}

interface CsvImportPayload {
  importedRows: number;
  importedWorkouts: number;
}

describe("workout API database flow", { skip: databaseUrl ? false : "INTEGRATION_DATABASE_URL is not set" }, () => {
  const db = createDatabase(databaseUrl ?? "postgresql://unused");

  before(async () => {
    await cleanupIntegrationData(db);
  });

  after(async () => {
    await cleanupIntegrationData(db);
    await db.destroy();
  });

  it("persists auth, workout logging, history, and analytics across the database", async () => {
    const server = await buildIntegrationServer(db);

    try {
      const tag = `${Date.now()}_${process.pid}`;
      const firstUser = await signup(server, tag);
      const workoutId = await createWorkout(server, firstUser.cookie);
      const exerciseId = await createExercise(server, firstUser.cookie, tag);
      const sessionExerciseId = await addExerciseToWorkout(server, firstUser.cookie, workoutId, exerciseId);
      const setId = await addSet(server, firstUser.cookie, workoutId, sessionExerciseId);

      await updateSet(server, firstUser.cookie, setId);
      await endWorkout(server, firstUser.cookie, workoutId);

      const detail = await getWorkout(server, firstUser.cookie, workoutId);
      assert.equal(detail.exercises[0]?.exercise.name, `${exercisePrefix}${tag}`);
      assert.equal(detail.exercises[0]?.sets[0]?.reps, 6);
      assert.equal(detail.exercises[0]?.sets[0]?.weightKg, "90.00");

      const history = await listWorkouts(server, firstUser.cookie);
      assert.equal(history.items[0]?.id, workoutId);
      assert.equal(history.items[0]?.totalExercises, 1);
      assert.equal(history.items[0]?.totalSets, 1);

      const summary = await getExerciseSummary(server, firstUser.cookie, exerciseId);
      assert.equal(summary.totalSets, 1);
      assert.equal(summary.totalReps, 6);
      assert.equal(summary.totalVolumeKg, "540.00");
      assert.equal(summary.bestTopSet?.estimatedOneRepMaxKg, "108.00");

      const completedExercises = await listCompletedExercises(server, firstUser.cookie);
      assert.equal(completedExercises.items[0]?.id, exerciseId);
      assert.equal(completedExercises.items[0]?.totalSets, 1);
      assert.match(completedExercises.items[0]?.lastDoneAt ?? "", /^\d{4}-\d{2}-\d{2}T/);

      const importedExerciseName = `${exercisePrefix}${tag} CSV`;
      const importSummary = await importWorkoutCsv(server, firstUser.cookie, importedExerciseName);

      assert.equal(importSummary.importedRows, 1);
      assert.equal(importSummary.importedWorkouts, 1);

      const csv = await exportWorkoutCsv(server, firstUser.cookie);

      assert.match(csv, /workout_started_at,workout_ended_at/);
      assert.match(csv, new RegExp(importedExerciseName));
      assert.match(csv, /primary_muscle_group_slug/);

      const secondUser = await signup(server, `${tag}_other`);
      const hidden = await server.inject({
        method: "GET",
        url: `/api/v1/workouts/${workoutId}`,
        cookies: authCookies(secondUser.cookie)
      });

      assert.equal(hidden.statusCode, 404);
    } finally {
      await server.close();
    }
  });
});

async function buildIntegrationServer(db: Kysely<AppDatabase>): Promise<FastifyInstance> {
  return buildServer(db, {
    cookieName,
    cookieSecure: false,
    sessionTtlDays: 30
  });
}

async function signup(server: FastifyInstance, tag: string): Promise<{ cookie: string; userId: string }> {
  const response = await server.inject({
    method: "POST",
    url: "/api/v1/auth/signup",
    payload: {
      email: `${userPrefix}${tag}@example.com`,
      username: `${userPrefix}${tag}`,
      password: "secret"
    }
  });

  assert.equal(response.statusCode, 201);

  return {
    cookie: readSessionCookie(response.headers["set-cookie"]),
    userId: readData<SignupPayload>(response).user.id
  };
}

async function createWorkout(server: FastifyInstance, cookie: string): Promise<string> {
  const response = await server.inject({
    method: "POST",
    url: "/api/v1/workouts",
    cookies: authCookies(cookie),
    payload: {
      workoutType: "upper",
      title: "Integration Upper",
      notes: null
    }
  });

  assert.equal(response.statusCode, 201);

  return readData<WorkoutPayload>(response).workout.id;
}

async function createExercise(server: FastifyInstance, cookie: string, tag: string): Promise<string> {
  const muscleGroupId = await getChestMuscleGroupId(server, cookie);
  const response = await server.inject({
    method: "POST",
    url: "/api/v1/exercises",
    cookies: authCookies(cookie),
    payload: {
      name: `${exercisePrefix}${tag}`,
      equipment: "barbell",
      exerciseType: "compound",
      primaryMuscleGroupId: muscleGroupId,
      secondaryMuscleGroupIds: [],
      confirmNameWarning: true
    }
  });

  assert.equal(response.statusCode, 201);

  return readData<ExercisePayload>(response).exercise.id;
}

async function getChestMuscleGroupId(server: FastifyInstance, cookie: string): Promise<string> {
  const response = await server.inject({
    method: "GET",
    url: "/api/v1/muscle-groups",
    cookies: authCookies(cookie)
  });
  const data = readData<{
    items: {
      id: string;
      slug: string;
    }[];
  }>(response);

  assert.equal(response.statusCode, 200);

  return data.items.find((item) => item.slug === "chest")?.id ?? "";
}

async function addExerciseToWorkout(
  server: FastifyInstance,
  cookie: string,
  workoutId: string,
  exerciseId: string
): Promise<string> {
  const response = await server.inject({
    method: "POST",
    url: `/api/v1/workouts/${workoutId}/exercises`,
    cookies: authCookies(cookie),
    payload: { exerciseId }
  });

  assert.equal(response.statusCode, 201);

  return readData<SessionExercisePayload>(response).sessionExercise.id;
}

async function addSet(
  server: FastifyInstance,
  cookie: string,
  workoutId: string,
  sessionExerciseId: string
): Promise<string> {
  const response = await server.inject({
    method: "POST",
    url: `/api/v1/workouts/${workoutId}/exercises/${sessionExerciseId}/sets`,
    cookies: authCookies(cookie),
    payload: {
      setType: "working",
      weightKg: "90.00",
      reps: 5,
      rir: 2,
      restTimeSeconds: 120
    }
  });

  assert.equal(response.statusCode, 201);

  return readData<SetPayload>(response).set.id;
}

async function updateSet(server: FastifyInstance, cookie: string, setId: string): Promise<void> {
  const response = await server.inject({
    method: "PATCH",
    url: `/api/v1/sets/${setId}`,
    cookies: authCookies(cookie),
    payload: {
      reps: 6,
      rir: 1
    }
  });

  assert.equal(response.statusCode, 200);
}

async function endWorkout(server: FastifyInstance, cookie: string, workoutId: string): Promise<void> {
  const response = await server.inject({
    method: "POST",
    url: `/api/v1/workouts/${workoutId}/end`,
    cookies: authCookies(cookie),
    payload: {}
  });

  assert.equal(response.statusCode, 200);
}

async function getWorkout(
  server: FastifyInstance,
  cookie: string,
  workoutId: string
): Promise<WorkoutPayload["workout"]> {
  const response = await server.inject({
    method: "GET",
    url: `/api/v1/workouts/${workoutId}`,
    cookies: authCookies(cookie)
  });

  assert.equal(response.statusCode, 200);

  return readData<WorkoutPayload>(response).workout;
}

async function listWorkouts(server: FastifyInstance, cookie: string): Promise<WorkoutListPayload> {
  const response = await server.inject({
    method: "GET",
    url: "/api/v1/workouts",
    cookies: authCookies(cookie)
  });

  assert.equal(response.statusCode, 200);

  return readData<WorkoutListPayload>(response);
}

async function getExerciseSummary(
  server: FastifyInstance,
  cookie: string,
  exerciseId: string
): Promise<ExerciseSummaryPayload> {
  const response = await server.inject({
    method: "GET",
    url: `/api/v1/analytics/exercises/${exerciseId}/summary`,
    cookies: authCookies(cookie)
  });

  assert.equal(response.statusCode, 200);

  return readData<ExerciseSummaryPayload>(response);
}

async function listCompletedExercises(
  server: FastifyInstance,
  cookie: string
): Promise<CompletedExercisesPayload> {
  const response = await server.inject({
    method: "GET",
    url: "/api/v1/analytics/exercises",
    cookies: authCookies(cookie)
  });

  assert.equal(response.statusCode, 200);

  return readData<CompletedExercisesPayload>(response);
}

async function importWorkoutCsv(
  server: FastifyInstance,
  cookie: string,
  exerciseName: string
): Promise<CsvImportPayload> {
  const response = await server.inject({
    method: "POST",
    url: "/api/v1/workouts/import.csv?confirmNameWarnings=true",
    cookies: authCookies(cookie),
    headers: {
      "content-type": "text/csv"
    },
    payload: [
      "workout_started_at,workout_ended_at,workout_type,workout_title,workout_notes,exercise_name,primary_muscle_group_slug,equipment,exercise_type,exercise_position,set_order,set_type,weight_kg,reps,rir,rest_time_seconds,set_note",
      `2026-05-20T08:00:00.000Z,2026-05-20T09:00:00.000Z,upper,CSV Upper,,${exerciseName},chest,barbell,compound,1,1,working,75.00,8,2,90,Imported set`
    ].join("\n")
  });

  assert.equal(response.statusCode, 201);

  return readData<CsvImportPayload>(response);
}

async function exportWorkoutCsv(server: FastifyInstance, cookie: string): Promise<string> {
  const response = await server.inject({
    method: "GET",
    url: "/api/v1/workouts/export.csv",
    cookies: authCookies(cookie)
  });

  assert.equal(response.statusCode, 200);
  assert.match(response.headers["content-type"] as string, /^text\/csv/);

  return response.body;
}

function authCookies(cookie: string): Record<string, string> {
  return { [cookieName]: cookie };
}

function readData<T>(response: { json(): unknown }): T {
  return (response.json() as ApiData<T>).data;
}

function readSessionCookie(header: string | number | string[] | undefined): string {
  const value = Array.isArray(header) ? String(header[0] ?? "") : String(header ?? "");
  const match = new RegExp(`${cookieName}=([^;]+)`).exec(value);

  assert.ok(match?.[1], "Expected auth cookie to be set");

  return match[1];
}

async function cleanupIntegrationData(db: Kysely<AppDatabase>): Promise<void> {
  const users = await db
    .selectFrom("users")
    .select("id")
    .where("username", "like", `${userPrefix}%`)
    .execute();
  const userIds = users.map((user) => user.id);
  const exercises = await db
    .selectFrom("exercises")
    .select("id")
    .where("name", "like", `${exercisePrefix}%`)
    .execute();
  const exerciseIds = exercises.map((exercise) => exercise.id);

  if (userIds.length > 0) {
    await cleanupUserData(db, userIds);
  }

  if (exerciseIds.length > 0) {
    await db
      .deleteFrom("exercise_secondary_muscles")
      .where("exercise_id", "in", exerciseIds)
      .execute();
    await db.deleteFrom("exercises").where("id", "in", exerciseIds).execute();
  }
}

async function cleanupUserData(db: Kysely<AppDatabase>, userIds: string[]): Promise<void> {
  const workouts = await db
    .selectFrom("workout_sessions")
    .select("id")
    .where("user_id", "in", userIds)
    .execute();
  const workoutIds = workouts.map((workout) => workout.id);
  const sessionExercises = workoutIds.length > 0
    ? await db
        .selectFrom("session_exercises")
        .select("id")
        .where("workout_session_id", "in", workoutIds)
        .execute()
    : [];
  const sessionExerciseIds = sessionExercises.map((item) => item.id);

  if (sessionExerciseIds.length > 0) {
    await db.deleteFrom("sets").where("session_exercise_id", "in", sessionExerciseIds).execute();
    await db.deleteFrom("session_exercises").where("id", "in", sessionExerciseIds).execute();
  }

  if (workoutIds.length > 0) {
    await db.deleteFrom("workout_sessions").where("id", "in", workoutIds).execute();
  }

  await db
    .updateTable("exercises")
    .set({ created_by_user_id: null })
    .where("created_by_user_id", "in", userIds)
    .where("name", "like", `${exercisePrefix}%`)
    .execute();
  await db.deleteFrom("user_sessions").where("user_id", "in", userIds).execute();
  await db.deleteFrom("users").where("id", "in", userIds).execute();
}
