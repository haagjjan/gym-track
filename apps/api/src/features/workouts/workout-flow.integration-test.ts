import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
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
    sourceTemplateId: string | null;
    exercises: {
      id: string;
      exercise: {
        name: string;
        muscleGroups: Array<{
          id: string;
          role: "PRIMARY" | "SECONDARY";
        }>;
      };
      sets: {
        reps: number;
        weightKg: string;
      }[];
      previousPerformance: {
        workoutId: string;
        workoutTitle: string | null;
        workoutStartedAt: string;
        bestSet: {
          setId: string;
          setOrder: number;
          weightKg: string;
          reps: number;
          rir: number;
          setType: "working";
        };
      } | null;
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
    position: number;
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
    plottedSetCount: number;
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

  it("does not persist a user when registration is disabled", async () => {
    const server = await buildIntegrationServer(db, false);
    const tag = `${Date.now()}_${process.pid}_disabled`;
    const email = `${userPrefix}${tag}@example.com`;

    try {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/signup",
        payload: {
          email,
          username: `${userPrefix}${tag}`,
          password: "integration-secret-1"
        }
      });
      const persisted = await db
        .selectFrom("users")
        .select("id")
        .where("email", "=", email)
        .executeTakeFirst();

      assert.equal(response.statusCode, 403);
      assert.equal(response.json().error.code, "REGISTRATION_DISABLED");
      assert.equal(persisted, undefined);
    } finally {
      await server.close();
    }
  });

  it("persists auth, workout logging, history, and analytics across the database", async () => {
    const server = await buildIntegrationServer(db);

    try {
      const tag = `${Date.now()}_${process.pid}`;
      const firstUser = await signup(server, tag);
      const workoutId = await createWorkout(server, firstUser.cookie);
      // Names ending in the numeric tag are blocked by the name-quality
      // rules (looks_numeric), so the tag needs a word after it.
      const exerciseId = await createExercise(server, firstUser.cookie, `${tag} Flow`);
      const sessionExerciseId = await addExerciseToWorkout(server, firstUser.cookie, workoutId, exerciseId);
      const setId = await addSet(server, firstUser.cookie, workoutId, sessionExerciseId);

      await updateSet(server, firstUser.cookie, setId);
      await endWorkout(server, firstUser.cookie, workoutId);

      const detail = await getWorkout(server, firstUser.cookie, workoutId);
      assert.equal(detail.exercises[0]?.exercise.name, `${exercisePrefix}${tag} Flow`);
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
      assert.equal(completedExercises.items[0]?.plottedSetCount, 1);
      assert.match(completedExercises.items[0]?.lastDoneAt ?? "", /^\d{4}-\d{2}-\d{2}T/);

      // "CSV" in a name trips the export-noise block; use a neutral word.
      const importedExerciseName = `${exercisePrefix}${tag} Imported`;
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

  it("idempotently replays and serializes ordered workout writes", async () => {
    const server = await buildIntegrationServer(db);

    try {
      const tag = `${Date.now().toString(36)}${process.pid}mut`;
      const user = await signup(server, tag);
      const workoutId = await createWorkout(server, user.cookie);
      const firstExerciseId = await createExercise(server, user.cookie, `${tag} First`);
      const secondExerciseId = await createExercise(server, user.cookie, `${tag} Second`);
      const exerciseMutationId = randomUUID();
      const replayedExercises = await Promise.all([
        addExerciseRequest(server, user.cookie, workoutId, firstExerciseId, exerciseMutationId, 1),
        addExerciseRequest(server, user.cookie, workoutId, firstExerciseId, exerciseMutationId, 1)
      ]);

      assert.deepEqual(
        replayedExercises.map((response) => response.statusCode).sort(),
        [200, 201]
      );
      assert.equal(
        readData<SessionExercisePayload>(replayedExercises[0]!).sessionExercise.id,
        readData<SessionExercisePayload>(replayedExercises[1]!).sessionExercise.id
      );
      assert.deepEqual(
        replayedExercises.map((response) => readData<{ replayed: boolean }>(response).replayed).sort(),
        [false, true]
      );

      const exerciseConflict = await addExerciseRequest(
        server,
        user.cookie,
        workoutId,
        secondExerciseId,
        exerciseMutationId
      );
      assert.equal(exerciseConflict.statusCode, 409);
      assert.equal(exerciseConflict.json().error.code, "IDEMPOTENCY_CONFLICT");

      const distinctExercises = await Promise.all(
        Array.from({ length: 4 }, () =>
          addExerciseRequest(server, user.cookie, workoutId, firstExerciseId, randomUUID())
        )
      );
      assert.ok(distinctExercises.every((response) => response.statusCode === 201));

      const shiftedExercise = await addExerciseRequest(
        server,
        user.cookie,
        workoutId,
        secondExerciseId,
        randomUUID(),
        1
      );
      assert.equal(shiftedExercise.statusCode, 201);
      const replayAfterShift = await addExerciseRequest(
        server,
        user.cookie,
        workoutId,
        firstExerciseId,
        exerciseMutationId,
        1
      );
      assert.equal(replayAfterShift.statusCode, 200);
      assert.equal(readData<SessionExercisePayload>(replayAfterShift).sessionExercise.position, 2);
      await assertCompactExercisePositions(db, workoutId);

      const sessionExerciseId = readData<SessionExercisePayload>(
        replayedExercises[0]!
      ).sessionExercise.id;
      const setMutationId = randomUUID();
      const replayedSets = await Promise.all([
        addSetRequest(server, user.cookie, workoutId, sessionExerciseId, setMutationId),
        addSetRequest(server, user.cookie, workoutId, sessionExerciseId, setMutationId)
      ]);
      assert.deepEqual(
        replayedSets.map((response) => response.statusCode).sort(),
        [200, 201]
      );
      assert.equal(
        readData<SetPayload>(replayedSets[0]!).set.id,
        readData<SetPayload>(replayedSets[1]!).set.id
      );

      const setConflict = await addSetRequest(
        server,
        user.cookie,
        workoutId,
        sessionExerciseId,
        setMutationId,
        { reps: 9 }
      );
      assert.equal(setConflict.statusCode, 409);
      assert.equal(setConflict.json().error.code, "IDEMPOTENCY_CONFLICT");

      const distinctSets = await Promise.all(
        Array.from({ length: 4 }, () =>
          addSetRequest(
            server,
            user.cookie,
            workoutId,
            sessionExerciseId,
            randomUUID()
          )
        )
      );
      assert.ok(distinctSets.every((response) => response.statusCode === 201));
      await assertCompactSetOrder(db, sessionExerciseId);

      const other = await signup(server, `${tag}x`);
      const otherWorkoutId = await createWorkout(server, other.cookie);
      const crossUser = await addExerciseRequest(
        server,
        other.cookie,
        otherWorkoutId,
        firstExerciseId,
        exerciseMutationId
      );
      assert.equal(crossUser.statusCode, 201);

      const exerciseRows = await db
        .selectFrom("session_exercises")
        .select(["id", "position"])
        .where("workout_session_id", "=", workoutId)
        .where("deleted_at", "is", null)
        .orderBy("position", "asc")
        .execute();
      const mixedExerciseWrites = await Promise.all([
        server.inject({
          method: "PATCH",
          url: `/api/v1/workouts/${workoutId}/exercises/reorder`,
          cookies: authCookies(user.cookie),
          payload: {
            items: [...exerciseRows]
              .reverse()
              .map((row, index) => ({ sessionExerciseId: row.id, position: index + 1 }))
          }
        }),
        server.inject({
          method: "DELETE",
          url: `/api/v1/workouts/${workoutId}/exercises/${exerciseRows.at(-1)?.id}`,
          cookies: authCookies(user.cookie)
        }),
        addExerciseRequest(server, user.cookie, workoutId, secondExerciseId, randomUUID())
      ]);
      assert.ok(mixedExerciseWrites.every((response) => response.statusCode < 500));
      await assertCompactExercisePositions(db, workoutId);

      const setId = readData<SetPayload>(replayedSets[0]!).set.id;
      const mixedSetWrites = await Promise.all([
        server.inject({
          method: "DELETE",
          url: `/api/v1/sets/${setId}`,
          cookies: authCookies(user.cookie)
        }),
        addSetRequest(
          server,
          user.cookie,
          workoutId,
          sessionExerciseId,
          randomUUID()
        )
      ]);
      assert.ok(mixedSetWrites.every((response) => response.statusCode < 500));
      await assertCompactSetOrder(db, sessionExerciseId);
    } finally {
      await server.close();
    }
  });

  it("soft deletes owned completed and active workouts without cascading child data", async () => {
    const server = await buildIntegrationServer(db);

    try {
      const tag = `${Date.now().toString(36)}${process.pid}delete`;
      const owner = await signup(server, `${tag}o`);
      const other = await signup(server, `${tag}x`);
      const exerciseId = await createExercise(server, owner.cookie, `${tag} Lift`);
      const completedWorkoutId = await createWorkout(server, owner.cookie);
      const sessionExerciseId = await addExerciseToWorkout(
        server,
        owner.cookie,
        completedWorkoutId,
        exerciseId
      );

      await addSet(server, owner.cookie, completedWorkoutId, sessionExerciseId);
      await endWorkout(server, owner.cookie, completedWorkoutId);

      const forbidden = await server.inject({
        method: "DELETE",
        url: `/api/v1/workouts/${completedWorkoutId}`,
        cookies: authCookies(other.cookie)
      });
      assert.equal(forbidden.statusCode, 404);

      const deleted = await server.inject({
        method: "DELETE",
        url: `/api/v1/workouts/${completedWorkoutId}`,
        cookies: authCookies(owner.cookie)
      });
      assert.equal(deleted.statusCode, 204);
      assert.equal((await server.inject({
        method: "GET",
        url: `/api/v1/workouts/${completedWorkoutId}`,
        cookies: authCookies(owner.cookie)
      })).statusCode, 404);
      assert.ok(!(await listWorkouts(server, owner.cookie)).items.some((item) => item.id === completedWorkoutId));
      assert.equal((await getExerciseSummary(server, owner.cookie, exerciseId)).totalSets, 0);

      const retainedSessionExercise = await db
        .selectFrom("session_exercises")
        .select("id")
        .where("id", "=", sessionExerciseId)
        .executeTakeFirst();
      const retainedSet = await db
        .selectFrom("sets")
        .select("id")
        .where("session_exercise_id", "=", sessionExerciseId)
        .executeTakeFirst();
      assert.equal(retainedSessionExercise?.id, sessionExerciseId);
      assert.ok(retainedSet?.id);

      const templateResponse = await server.inject({
        method: "POST",
        url: "/api/v1/workout-templates",
        cookies: authCookies(owner.cookie),
        payload: { name: "Deletion Source", exerciseIds: [exerciseId] }
      });
      const templateId = readData<{ template: { id: string } }>(templateResponse).template.id;
      const started = await server.inject({
        method: "POST",
        url: `/api/v1/workout-templates/${templateId}/start`,
        cookies: authCookies(owner.cookie),
        payload: {}
      });
      const activeWorkoutId = readData<{ workout: { workoutId: string } }>(started).workout.workoutId;
      assert.equal((await server.inject({
        method: "DELETE",
        url: `/api/v1/workouts/${activeWorkoutId}`,
        cookies: authCookies(owner.cookie)
      })).statusCode, 204);
      assert.equal((await server.inject({
        method: "GET",
        url: `/api/v1/workout-templates/${templateId}`,
        cookies: authCookies(owner.cookie)
      })).statusCode, 200);
      assert.ok(await createWorkout(server, owner.cookie));
    } finally {
      await server.close();
    }
  });

  it("returns the latest owned previous workout's heaviest working set", async () => {
    const server = await buildIntegrationServer(db);

    try {
      const tag = `${Date.now().toString(36)}${process.pid}previous`;
      const owner = await signup(server, `${tag}o`);
      const other = await signup(server, `${tag}x`);
      const exerciseId = await createExercise(server, owner.cookie, `${tag} Lift`);
      const previousWorkoutId = await createWorkout(server, owner.cookie);
      const previousExerciseId = await addExerciseToWorkout(
        server,
        owner.cookie,
        previousWorkoutId,
        exerciseId
      );
      await addSet(server, owner.cookie, previousWorkoutId, previousExerciseId, { weightKg: "90.00", reps: 10 });
      await addSet(server, owner.cookie, previousWorkoutId, previousExerciseId, { weightKg: "100.00", reps: 5 });
      await addSet(server, owner.cookie, previousWorkoutId, previousExerciseId, { weightKg: "100.00", reps: 6, rir: 1 });
      await endWorkout(server, owner.cookie, previousWorkoutId);
      await db.updateTable("workout_sessions").set({ started_at: new Date("2026-08-01T10:00:00.000Z"), ended_at: new Date("2026-08-01T11:00:00.000Z") }).where("id", "=", previousWorkoutId).execute();

      const deletedWorkoutId = await createWorkout(server, owner.cookie);
      const deletedExerciseId = await addExerciseToWorkout(server, owner.cookie, deletedWorkoutId, exerciseId);
      await addSet(server, owner.cookie, deletedWorkoutId, deletedExerciseId, { weightKg: "130.00", reps: 2 });
      await endWorkout(server, owner.cookie, deletedWorkoutId);
      await db.updateTable("workout_sessions").set({ started_at: new Date("2026-08-02T10:00:00.000Z"), ended_at: new Date("2026-08-02T11:00:00.000Z"), deleted_at: new Date("2026-08-03T00:00:00.000Z") }).where("id", "=", deletedWorkoutId).execute();

      const otherWorkoutId = await createWorkout(server, other.cookie);
      const otherExerciseId = await addExerciseToWorkout(server, other.cookie, otherWorkoutId, exerciseId);
      await addSet(server, other.cookie, otherWorkoutId, otherExerciseId, { weightKg: "140.00", reps: 1 });
      await endWorkout(server, other.cookie, otherWorkoutId);
      await db.updateTable("workout_sessions").set({ started_at: new Date("2026-08-03T10:00:00.000Z"), ended_at: new Date("2026-08-03T11:00:00.000Z") }).where("id", "=", otherWorkoutId).execute();

      const currentWorkoutId = await createWorkout(server, owner.cookie);
      await db.updateTable("workout_sessions").set({ started_at: new Date("2026-08-04T10:00:00.000Z") }).where("id", "=", currentWorkoutId).execute();
      await addExerciseToWorkout(server, owner.cookie, currentWorkoutId, exerciseId);
      const current = await getWorkout(server, owner.cookie, currentWorkoutId);
      const previous = current.exercises[0]?.previousPerformance;

      assert.equal(previous?.workoutId, previousWorkoutId);
      assert.equal(previous?.bestSet.weightKg, "100.00");
      assert.equal(previous?.bestSet.reps, 6);
      assert.equal(previous?.bestSet.setOrder, 3);
      assert.equal(previous?.bestSet.setType, "working");
    } finally {
      await server.close();
    }
  });

  it("supports retroactive session edits and exercise merges", async () => {
    const server = await buildIntegrationServer(db);

    try {
      const tag = `${Date.now()}_${process.pid}_batchd`;
      const user = await signup(server, tag);
      const workoutId = await createWorkout(server, user.cookie);
      const duplicateExerciseId = await createExercise(server, user.cookie, `${tag} Dup`);
      const targetExerciseId = await createExercise(server, user.cookie, `${tag} Target`);
      const templateResponse = await server.inject({
        method: "POST",
        url: "/api/v1/workout-templates",
        cookies: authCookies(user.cookie),
        payload: {
          name: "Merge References",
          exerciseIds: [duplicateExerciseId, duplicateExerciseId]
        }
      });
      const templateId = readData<{ template: { id: string } }>(templateResponse).template.id;
      const sessionExerciseId = await addExerciseToWorkout(
        server,
        user.cookie,
        workoutId,
        duplicateExerciseId
      );

      await addSet(server, user.cookie, workoutId, sessionExerciseId);
      await endWorkout(server, user.cookie, workoutId);

      const patched = await server.inject({
        method: "PATCH",
        url: `/api/v1/workouts/${workoutId}`,
        cookies: authCookies(user.cookie),
        payload: {
          title: "Integration Renamed",
          startedAt: "2026-05-19T08:00:00.000Z",
          endedAt: "2026-05-19T09:15:00.000Z"
        }
      });

      assert.equal(patched.statusCode, 200);

      const patchedWorkout = readData<{
        workout: { title: string | null; startedAt: string; endedAt: string | null };
      }>(patched).workout;

      assert.equal(patchedWorkout.title, "Integration Renamed");
      assert.equal(patchedWorkout.startedAt, "2026-05-19T08:00:00.000Z");
      assert.equal(patchedWorkout.endedAt, "2026-05-19T09:15:00.000Z");

      const invalidPatch = await server.inject({
        method: "PATCH",
        url: `/api/v1/workouts/${workoutId}`,
        cookies: authCookies(user.cookie),
        payload: {
          startedAt: "2026-05-19T10:00:00.000Z"
        }
      });

      assert.equal(invalidPatch.statusCode, 422);

      const merged = await server.inject({
        method: "POST",
        url: `/api/v1/exercises/${duplicateExerciseId}/merge`,
        cookies: authCookies(user.cookie),
        payload: {
          targetExerciseId
        }
      });

      assert.equal(merged.statusCode, 200);

      const mergeSummary = readData<{
        merge: {
          affectedSets: number;
          affectedTemplates: number;
          affectedWorkouts: number;
          reassignedTemplateExercises: number;
          source: { retired: boolean };
          target: { id: string };
        };
      }>(merged).merge;

      assert.equal(mergeSummary.affectedSets, 1);
      assert.equal(mergeSummary.affectedWorkouts, 1);
      assert.equal(mergeSummary.reassignedTemplateExercises, 2);
      assert.equal(mergeSummary.affectedTemplates, 1);
      assert.equal(mergeSummary.source.retired, true);
      assert.equal(mergeSummary.target.id, targetExerciseId);

      const detail = await getWorkout(server, user.cookie, workoutId);

      assert.equal(detail.exercises[0]?.exercise.name, `${exercisePrefix}${tag} Target`);
      const templateAfterMerge = await server.inject({
        method: "GET",
        url: `/api/v1/workout-templates/${templateId}`,
        cookies: authCookies(user.cookie)
      });
      assert.deepEqual(
        readData<{ template: { exercises: Array<{ exercise: { id: string } }> } }>(
          templateAfterMerge
        ).template.exercises.map((entry) => entry.exercise.id),
        [targetExerciseId, targetExerciseId]
      );
    } finally {
      await server.close();
    }
  });

  it("copies duplicate-preserving templates into independent workout sessions", async () => {
    const server = await buildIntegrationServer(db);

    try {
      const tag = `${Date.now().toString(36)}${process.pid}`;
      const owner = await signup(server, `${tag}_owner`);
      const other = await signup(server, `${tag}_other`);
      const pressId = await createExercise(server, owner.cookie, `${tag} Press`);
      const flyId = await createExercise(server, owner.cookie, `${tag} Fly`);
      const created = await server.inject({
        method: "POST",
        url: "/api/v1/workout-templates",
        cookies: authCookies(owner.cookie),
        payload: { name: "Push A", exerciseIds: [pressId, flyId, pressId] }
      });

      assert.equal(created.statusCode, 201);
      const template = readData<{ template: { id: string; exercises: Array<{ exercise: { id: string } }> } }>(created).template;
      assert.deepEqual(template.exercises.map((entry) => entry.exercise.id), [pressId, flyId, pressId]);

      const ownerList = await server.inject({ method: "GET", url: "/api/v1/workout-templates", cookies: authCookies(owner.cookie) });
      const otherList = await server.inject({ method: "GET", url: "/api/v1/workout-templates", cookies: authCookies(other.cookie) });
      assert.equal(readData<{ items: unknown[] }>(ownerList).items.length, 1);
      assert.equal(readData<{ items: unknown[] }>(otherList).items.length, 0);

      const foreignRead = await server.inject({ method: "GET", url: `/api/v1/workout-templates/${template.id}`, cookies: authCookies(other.cookie) });
      assert.equal(foreignRead.statusCode, 404);
      for (const request of [
        { method: "PATCH" as const, payload: { name: "Stolen" }, url: `/api/v1/workout-templates/${template.id}` },
        { method: "POST" as const, payload: {}, url: `/api/v1/workout-templates/${template.id}/duplicate` },
        { method: "POST" as const, payload: {}, url: `/api/v1/workout-templates/${template.id}/start` },
        { method: "DELETE" as const, url: `/api/v1/workout-templates/${template.id}` }
      ]) {
        const response = await server.inject({ ...request, cookies: authCookies(other.cookie) });
        assert.equal(response.statusCode, 404);
      }

      const renamed = await server.inject({ method: "PATCH", url: `/api/v1/workout-templates/${template.id}`, cookies: authCookies(owner.cookie), payload: { name: "Push Renamed" } });
      assert.equal(readData<{ template: { name: string } }>(renamed).template.name, "Push Renamed");

      for (const exerciseIds of [
        [pressId, flyId, pressId, flyId],
        [pressId, pressId, flyId],
        [pressId, flyId, flyId],
        [flyId, pressId, flyId],
        [pressId, flyId, pressId]
      ]) {
        const changed = await server.inject({ method: "PATCH", url: `/api/v1/workout-templates/${template.id}`, cookies: authCookies(owner.cookie), payload: { exerciseIds } });
        assert.deepEqual(readData<{ template: { exercises: Array<{ exercise: { id: string } }> } }>(changed).template.exercises.map((entry) => entry.exercise.id), exerciseIds);
      }

      const duplicated = await server.inject({ method: "POST", url: `/api/v1/workout-templates/${template.id}/duplicate`, cookies: authCookies(owner.cookie), payload: {} });
      assert.equal(duplicated.statusCode, 201);
      const duplicatedTemplate = readData<{ template: { id: string; exercises: Array<{ exercise: { id: string } }> } }>(duplicated).template;
      assert.deepEqual(duplicatedTemplate.exercises.map((entry) => entry.exercise.id), [pressId, flyId, pressId]);
      assert.equal((await server.inject({ method: "DELETE", url: `/api/v1/workout-templates/${duplicatedTemplate.id}`, cookies: authCookies(owner.cookie) })).statusCode, 200);

      const started = await server.inject({ method: "POST", url: `/api/v1/workout-templates/${template.id}/start`, cookies: authCookies(owner.cookie), payload: {} });
      assert.equal(started.statusCode, 201);
      const workoutId = readData<{ workout: { workoutId: string } }>(started).workout.workoutId;
      const workout = await getWorkout(server, owner.cookie, workoutId);
      assert.equal(workout.sourceTemplateId, template.id);
      assert.deepEqual(workout.exercises.map((entry) => entry.exercise.name), [
        `${exercisePrefix}${tag} Press`,
        `${exercisePrefix}${tag} Fly`,
        `${exercisePrefix}${tag} Press`
      ]);
      assert.ok(workout.exercises.every((entry) => entry.sets.length === 0));

      const changedTemplate = await server.inject({ method: "PATCH", url: `/api/v1/workout-templates/${template.id}`, cookies: authCookies(owner.cookie), payload: { exerciseIds: [flyId] } });
      assert.equal(changedTemplate.statusCode, 200);
      assert.equal((await getWorkout(server, owner.cookie, workoutId)).exercises.length, 3);

      await addExerciseToWorkout(server, owner.cookie, workoutId, flyId);
      await endWorkout(server, owner.cookie, workoutId);
      const unchangedSource = await server.inject({ method: "GET", url: `/api/v1/workout-templates/${template.id}`, cookies: authCookies(owner.cookie) });
      assert.deepEqual(readData<{ template: { exercises: Array<{ exercise: { id: string } }> } }>(unchangedSource).template.exercises.map((entry) => entry.exercise.id), [flyId]);

      const savedCopy = await server.inject({ method: "POST", url: `/api/v1/workouts/${workoutId}/templates`, cookies: authCookies(owner.cookie), payload: { name: "Push A Result" } });
      assert.equal(savedCopy.statusCode, 201);
      assert.equal(readData<{ template: { exercises: unknown[] } }>(savedCopy).template.exercises.length, 4);
      const sourceAfterCopy = await server.inject({ method: "GET", url: `/api/v1/workout-templates/${template.id}`, cookies: authCookies(owner.cookie) });
      assert.equal(readData<{ template: { exercises: unknown[] } }>(sourceAfterCopy).template.exercises.length, 1);

      const updatedTemplate = await server.inject({ method: "POST", url: `/api/v1/workout-templates/${template.id}/from-workout`, cookies: authCookies(owner.cookie), payload: { workoutId } });
      assert.equal(updatedTemplate.statusCode, 200);
      assert.equal(readData<{ template: { exercises: unknown[] } }>(updatedTemplate).template.exercises.length, 4);
      const exactMatchList = await server.inject({
        method: "GET",
        url: `/api/v1/workout-templates?search=${encodeURIComponent("Push Renamed")}`,
        cookies: authCookies(owner.cookie)
      });
      assert.match(
        readData<{ items: Array<{ id: string; lastUsedAt: string | null }> }>(exactMatchList)
          .items.find((item) => item.id === template.id)?.lastUsedAt ?? "",
        /^\d{4}-\d{2}-\d{2}T/
      );

      const noLongerExact = await server.inject({
        method: "PATCH",
        url: `/api/v1/workout-templates/${template.id}`,
        cookies: authCookies(owner.cookie),
        payload: { exerciseIds: [pressId, flyId, pressId] }
      });
      assert.equal(noLongerExact.statusCode, 200);
      const mismatchList = await server.inject({
        method: "GET",
        url: `/api/v1/workout-templates?search=${encodeURIComponent("Push Renamed")}`,
        cookies: authCookies(owner.cookie)
      });
      assert.equal(
        readData<{ items: Array<{ id: string; lastUsedAt: string | null }> }>(mismatchList)
          .items.find((item) => item.id === template.id)?.lastUsedAt,
        null
      );

      const deleted = await server.inject({ method: "DELETE", url: `/api/v1/workout-templates/${template.id}`, cookies: authCookies(owner.cookie) });
      assert.equal(deleted.statusCode, 200);
      const retainedWorkout = await getWorkout(server, owner.cookie, workoutId);
      assert.equal(retainedWorkout.exercises.length, 4);
      assert.equal(retainedWorkout.sourceTemplateId, null);
    } finally {
      await server.close();
    }
  });

  it("stores, searches, filters, and authorizes multi-muscle exercises", async () => {
    const server = await buildIntegrationServer(db);

    try {
      const tag = `${Date.now().toString(36)}${process.pid}m`;
      const owner = await signup(server, `${tag}o`);
      const other = await signup(server, `${tag}x`);
      const groupsResponse = await server.inject({ method: "GET", url: "/api/v1/muscle-groups", cookies: authCookies(owner.cookie) });
      const groups = readData<{ items: Array<{ id: string; slug: string }> }>(groupsResponse).items;
      const chestId = groups.find((group) => group.slug === "chest")?.id;
      const tricepsId = groups.find((group) => group.slug === "triceps")?.id;
      const shouldersId = groups.find((group) => group.slug === "shoulders")?.id;
      assert.ok(chestId && tricepsId && shouldersId);

      const created = await server.inject({
        method: "POST",
        url: "/api/v1/exercises",
        cookies: authCookies(owner.cookie),
        payload: {
          name: `${exercisePrefix}${tag} Multi Press`,
          equipment: "machine",
          exerciseType: "compound",
          primaryMuscleGroupIds: [chestId, tricepsId],
          secondaryMuscleGroupIds: [shouldersId],
          confirmNameWarning: true
        }
      });
      assert.equal(created.statusCode, 201);
      const exercise = readData<{ exercise: { id: string; muscleGroups: Array<{ id: string; role: string }> } }>(created).exercise;
      assert.deepEqual(exercise.muscleGroups.map((muscle) => muscle.role), ["PRIMARY", "PRIMARY", "SECONDARY"]);

      const search = await server.inject({ method: "GET", url: "/api/v1/exercises?search=triceps&limit=100", cookies: authCookies(owner.cookie) });
      const muscleSearch = readData<{ items: Array<{ id: string }>; pagination: { total: number } }>(search);
      assert.ok(muscleSearch.items.length > 0);
      assert.ok(muscleSearch.pagination.total >= muscleSearch.items.length);
      const filter = await server.inject({ method: "GET", url: `/api/v1/exercises?muscleGroupId=${shouldersId}&ownership=editable`, cookies: authCookies(owner.cookie) });
      assert.ok(readData<{ items: Array<{ id: string }> }>(filter).items.some((item) => item.id === exercise.id));
      const andFilter = await server.inject({
        method: "GET",
        url: `/api/v1/exercises?muscleGroupIds=${chestId},${tricepsId}&equipment=machine&exerciseType=compound&ownership=editable`,
        cookies: authCookies(owner.cookie)
      });
      assert.deepEqual(
        readData<{ items: Array<{ id: string }> }>(andFilter).items.map((item) => item.id),
        [exercise.id]
      );

      const ownershipFilters = `search=${encodeURIComponent(`${exercisePrefix}${tag} Multi Press`)}`
        + `&muscleGroupIds=${chestId},${tricepsId}&equipment=machine&exerciseType=compound`;
      const editable = await server.inject({
        method: "GET",
        url: `/api/v1/exercises?${ownershipFilters}&ownership=editable`,
        cookies: authCookies(owner.cookie)
      });
      const readOnly = await server.inject({
        method: "GET",
        url: `/api/v1/exercises?${ownershipFilters}&ownership=readOnly`,
        cookies: authCookies(other.cookie)
      });
      const otherEditable = await server.inject({
        method: "GET",
        url: `/api/v1/exercises?${ownershipFilters}&ownership=editable`,
        cookies: authCookies(other.cookie)
      });
      const editablePayload = readData<{ items: Array<{ id: string }>; pagination: { total: number } }>(editable);
      const readOnlyPayload = readData<{ items: Array<{ id: string }>; pagination: { total: number } }>(readOnly);
      assert.deepEqual(editablePayload.items.map((item) => item.id), [exercise.id]);
      assert.equal(editablePayload.pagination.total, 1);
      assert.deepEqual(readOnlyPayload.items.map((item) => item.id), [exercise.id]);
      assert.equal(readOnlyPayload.pagination.total, 1);
      assert.equal(
        readData<{ items: unknown[]; pagination: { total: number } }>(otherEditable).pagination.total,
        0
      );

      const workoutId = await createWorkout(server, owner.cookie);
      await addExerciseToWorkout(server, owner.cookie, workoutId, exercise.id);
      const historicalBeforeUpdate = await getWorkout(server, owner.cookie, workoutId);
      assert.deepEqual(
        historicalBeforeUpdate.exercises[0]?.exercise.muscleGroups.map((muscle) => muscle.role),
        ["PRIMARY", "PRIMARY", "SECONDARY"]
      );

      const forbidden = await server.inject({ method: "PATCH", url: `/api/v1/exercises/${exercise.id}`, cookies: authCookies(other.cookie), payload: { name: `${exercisePrefix}${tag} Changed`, primaryMuscleGroupIds: [chestId], secondaryMuscleGroupIds: [] } });
      assert.equal(forbidden.statusCode, 403);
      const updated = await server.inject({ method: "PATCH", url: `/api/v1/exercises/${exercise.id}`, cookies: authCookies(owner.cookie), payload: { name: `${exercisePrefix}${tag} Changed`, primaryMuscleGroupIds: [tricepsId], secondaryMuscleGroupIds: [chestId], confirmNameWarning: true } });
      assert.equal(updated.statusCode, 200);
      const historicalAfterUpdate = await getWorkout(server, owner.cookie, workoutId);
      assert.deepEqual(
        historicalAfterUpdate.exercises[0]?.exercise.muscleGroups.map((muscle) => ({
          id: muscle.id,
          role: muscle.role
        })),
        [{ id: tricepsId, role: "PRIMARY" }, { id: chestId, role: "SECONDARY" }]
      );
    } finally {
      await server.close();
    }
  });

  it("ranks aliases and typos while preserving facets and pagination", async () => {
    const server = await buildIntegrationServer(db);

    try {
      const user = await signup(server, `${Date.now().toString(36)}${process.pid}catalog`);
      const firstPageResponse = await server.inject({
        method: "GET",
        url: "/api/v1/exercises?limit=25&offset=0",
        cookies: authCookies(user.cookie)
      });
      const secondPageResponse = await server.inject({
        method: "GET",
        url: "/api/v1/exercises?limit=25&offset=25",
        cookies: authCookies(user.cookie)
      });
      const firstPage = readData<{ items: Array<{ id: string; name: string }>; pagination: { total: number } }>(firstPageResponse);
      const secondPage = readData<{ items: Array<{ id: string; name: string }>; pagination: { total: number } }>(secondPageResponse);

      assert.ok(firstPage.pagination.total >= 820);
      assert.equal(firstPage.items.length, 25);
      assert.equal(secondPage.items.length, 25);
      assert.equal(firstPage.items.some((item) => secondPage.items.some((other) => other.id === item.id)), false);

      const aliasResponse = await server.inject({
        method: "GET",
        url: "/api/v1/exercises?search=rdl&limit=10&offset=0",
        cookies: authCookies(user.cookie)
      });
      const aliasNames = readData<{ items: Array<{ name: string }> }>(aliasResponse).items.map((item) => item.name);
      assert.ok(aliasNames.includes("Romanian Deadlift"));

      const typoResponse = await server.inject({
        method: "GET",
        url: `/api/v1/exercises?search=${encodeURIComponent("inclne dumbell pres")}&equipment=dumbbell&limit=10&offset=0`,
        cookies: authCookies(user.cookie)
      });
      const typoNames = readData<{ items: Array<{ name: string }> }>(typoResponse).items.map((item) => item.name);
      assert.ok(typoNames.includes("Incline Dumbbell Press"));

      const noMatchResponse = await server.inject({
        method: "GET",
        url: "/api/v1/exercises?search=xyqzpl&limit=10&offset=0",
        cookies: authCookies(user.cookie)
      });
      assert.equal(readData<{ items: unknown[] }>(noMatchResponse).items.length, 0);
    } finally {
      await server.close();
    }
  });

  it("searches beyond page one and keeps all-time history statistics unfiltered", async () => {
    const server = await buildIntegrationServer(db);

    try {
      const tag = `${Date.now().toString(36)}${process.pid}history`;
      const user = await signup(server, tag);
      const exerciseId = await createExercise(server, user.cookie, `${tag} Search Lift`);
      const chestId = await getChestMuscleGroupId(server, user.cookie);
      let needleWorkoutId = "";

      for (let index = 0; index < 21; index += 1) {
        const created = await server.inject({
          method: "POST",
          url: "/api/v1/workouts",
          cookies: authCookies(user.cookie),
          payload: {
            title: index === 0 ? `Needle ${tag}` : `Routine ${tag} ${index}`,
            workoutType: "upper"
          }
        });
        assert.equal(created.statusCode, 201);
        const workoutId = readData<WorkoutPayload>(created).workout.id;

        if (index === 0) {
          needleWorkoutId = workoutId;
          const sessionExerciseId = await addExerciseToWorkout(
            server,
            user.cookie,
            workoutId,
            exerciseId
          );
          await addSet(server, user.cookie, workoutId, sessionExerciseId);
        }

        await endWorkout(server, user.cookie, workoutId);
      }

      const unfiltered = await server.inject({
        method: "GET",
        url: "/api/v1/workouts",
        cookies: authCookies(user.cookie)
      });
      const unfilteredData = readData<{
        items: Array<{ id: string }>;
        pagination: { total: number };
        allTimeSummary: {
          totalSessions: number;
          completedSessions: number;
          cumulativeTonnageKg: string;
          completionRate: number;
        };
      }>(unfiltered);
      assert.equal(unfilteredData.items.length, 20);
      assert.equal(unfilteredData.pagination.total, 21);
      assert.equal(unfilteredData.allTimeSummary.totalSessions, 21);
      assert.equal(unfilteredData.allTimeSummary.completedSessions, 21);
      assert.equal(unfilteredData.allTimeSummary.cumulativeTonnageKg, "450.00");
      assert.equal(unfilteredData.allTimeSummary.completionRate, 1);

      const searched = await server.inject({
        method: "GET",
        url: `/api/v1/workouts?search=${encodeURIComponent(`Needle ${tag}`)}`,
        cookies: authCookies(user.cookie)
      });
      const searchedData = readData<{
        items: Array<{ id: string }>;
        pagination: { total: number };
        allTimeSummary: { totalSessions: number };
      }>(searched);
      assert.deepEqual(searchedData.items.map((item) => item.id), [needleWorkoutId]);
      assert.equal(searchedData.pagination.total, 1);
      assert.equal(searchedData.allTimeSummary.totalSessions, 21);

      const facets = await server.inject({
        method: "GET",
        url: `/api/v1/workouts?muscleGroupIds=${chestId}&equipment=barbell&exerciseType=compound`,
        cookies: authCookies(user.cookie)
      });
      assert.deepEqual(
        readData<{ items: Array<{ id: string }> }>(facets).items.map((item) => item.id),
        [needleWorkoutId]
      );

      const localDate = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Zurich"
      }).format(new Date());
      const dateSearch = await server.inject({
        method: "GET",
        url: `/api/v1/workouts?search=${localDate}&timeZone=Europe%2FZurich`,
        cookies: authCookies(user.cookie)
      });
      assert.equal(
        readData<{ pagination: { total: number } }>(dateSearch).pagination.total,
        21
      );

      const updatedPreferences = await server.inject({
        method: "PATCH",
        url: "/api/v1/users/me/preferences",
        cookies: authCookies(user.cookie),
        payload: { volumeHeatCeiling: 37 }
      });
      assert.equal(
        readData<{ preferences: { volumeHeatCeiling: number } }>(updatedPreferences)
          .preferences.volumeHeatCeiling,
        37
      );
      const persistedPreferences = await server.inject({
        method: "GET",
        url: "/api/v1/users/me/preferences",
        cookies: authCookies(user.cookie)
      });
      assert.equal(
        readData<{ preferences: { volumeHeatCeiling: number } }>(persistedPreferences)
          .preferences.volumeHeatCeiling,
        37
      );
    } finally {
      await server.close();
    }
  });
});

async function buildIntegrationServer(
  db: Kysely<AppDatabase>,
  registrationEnabled = true
): Promise<FastifyInstance> {
  return buildServer(db, {
    cookieName,
    cookieSecure: false,
    registrationEnabled,
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
      password: "integration-secret-1"
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
  const response = await addExerciseRequest(
    server,
    cookie,
    workoutId,
    exerciseId,
    randomUUID()
  );

  assert.equal(response.statusCode, 201);

  return readData<SessionExercisePayload>(response).sessionExercise.id;
}

function addExerciseRequest(
  server: FastifyInstance,
  cookie: string,
  workoutId: string,
  exerciseId: string,
  clientMutationId: string,
  position?: number
) {
  return server.inject({
    method: "POST",
    url: `/api/v1/workouts/${workoutId}/exercises`,
    cookies: authCookies(cookie),
    payload: { clientMutationId, exerciseId, ...(position === undefined ? {} : { position }) }
  });
}

async function addSet(
  server: FastifyInstance,
  cookie: string,
  workoutId: string,
  sessionExerciseId: string,
  overrides: Partial<{
    setType: "working" | "warmup";
    weightKg: string;
    reps: number;
    rir: number;
    restTimeSeconds: number | null;
  }> = {}
): Promise<string> {
  const response = await addSetRequest(
    server,
    cookie,
    workoutId,
    sessionExerciseId,
    randomUUID(),
    overrides
  );

  assert.equal(response.statusCode, 201);

  return readData<SetPayload>(response).set.id;
}

function addSetRequest(
  server: FastifyInstance,
  cookie: string,
  workoutId: string,
  sessionExerciseId: string,
  clientMutationId: string,
  overrides: Partial<{
    setType: "working" | "warmup";
    weightKg: string;
    reps: number;
    rir: number;
    restTimeSeconds: number | null;
  }> = {}
) {
  return server.inject({
    method: "POST",
    url: `/api/v1/workouts/${workoutId}/exercises/${sessionExerciseId}/sets`,
    cookies: authCookies(cookie),
    payload: {
      clientMutationId,
      setType: "working",
      weightKg: "90.00",
      reps: 5,
      rir: 2,
      restTimeSeconds: 120,
      ...overrides
    }
  });
}

async function assertCompactExercisePositions(
  db: Kysely<AppDatabase>,
  workoutId: string
): Promise<void> {
  const rows = await db
    .selectFrom("session_exercises")
    .select("position")
    .where("workout_session_id", "=", workoutId)
    .where("deleted_at", "is", null)
    .orderBy("position", "asc")
    .execute();

  assert.deepEqual(
    rows.map((row) => row.position),
    rows.map((_, index) => index + 1)
  );
}

async function assertCompactSetOrder(
  db: Kysely<AppDatabase>,
  sessionExerciseId: string
): Promise<void> {
  const rows = await db
    .selectFrom("sets")
    .select("set_order as setOrder")
    .where("session_exercise_id", "=", sessionExerciseId)
    .where("deleted_at", "is", null)
    .orderBy("set_order", "asc")
    .execute();

  assert.deepEqual(
    rows.map((row) => row.setOrder),
    rows.map((_, index) => index + 1)
  );
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
    await db.transaction().execute(async (trx) => {
      await trx.deleteFrom("exercise_muscle_groups").where("exercise_id", "in", exerciseIds).execute();
      await trx.deleteFrom("exercise_secondary_muscles").where("exercise_id", "in", exerciseIds).execute();
      await trx.deleteFrom("exercises").where("id", "in", exerciseIds).execute();
    });
  }
}

async function cleanupUserData(db: Kysely<AppDatabase>, userIds: string[]): Promise<void> {
  await db.deleteFrom("workout_templates").where("user_id", "in", userIds).execute();
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
  await db.deleteFrom("auth_action_tokens").where("user_id", "in", userIds).execute();
  await db.deleteFrom("app_events").where("user_id", "in", userIds).execute();
  await db.deleteFrom("users").where("id", "in", userIds).execute();
}
