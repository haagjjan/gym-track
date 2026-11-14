import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { createDatabase } from "../../db/database.js";
import { buildServer } from "../../server.js";
import { createUserAccountRepository } from "../users/user-account.repository.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
interface Entry { id: string; revision: number; durationSeconds: number; addedWeightKg?: string | null; deletedAt: string | null }

describe("extended tracking database contract", { skip: databaseUrl ? false : "INTEGRATION_DATABASE_URL is not set" }, () => {
  const db = createDatabase(databaseUrl ?? "postgresql://unused");
  let server: FastifyInstance;
  const customIds: string[] = [];
  const users: { id: string; cookie: string }[] = [];
  before(async () => {
    server = await buildServer(db, { cookieName: "gym_progress_session", cookieSecure: false, sessionTtlDays: 30 }, false,
      { extendedTracking: true, events: "off" });
    for (let index = 0; index < 2; index += 1) {
      const tag = `tracking_${randomUUID().slice(0, 12)}`;
      const response = await server.inject({ method: "POST", url: "/api/v1/auth/signup", payload: {
        email: `${tag}@example.test`, username: tag, password: "tracking-check-password", termsVersion: "test", privacyVersion: "test", adultAttested: true
      } });
      assert.equal(response.statusCode, 201, response.body);
      const cookie = response.headers["set-cookie"];
      users.push({ id: response.json<{ data: { user: { id: string } } }>().data.user.id,
        cookie: (Array.isArray(cookie) ? cookie[0]! : cookie!).split(";")[0]! });
    }
  });
  after(async () => {
    await server?.close();
    const accounts = createUserAccountRepository(db);
    for (const user of users) {
      if (!(await db.selectFrom("users").select("id").where("id", "=", user.id).executeTakeFirst())) continue;
      await db.updateTable("users").set({ account_status: "DELETION_PENDING", deletion_requested_at: new Date(0), deletion_due_at: new Date(0) }).where("id", "=", user.id).execute();
      assert.equal(await accounts.finalizeDeletion(user.id, new Date()), true);
    }
    await db.transaction().execute(async (trx) => {
      for (const id of customIds) {
        await trx.deleteFrom("exercise_secondary_muscles").where("exercise_id", "=", id).execute();
        await trx.deleteFrom("exercise_muscle_groups").where("exercise_id", "=", id).execute();
        await trx.deleteFrom("exercises").where("id", "=", id).execute();
      }
    });
    await db.destroy();
  });
  it("enforces replay, revisions, ownership, timed volume, cardio exclusion and CSV round trips", async () => {
    const owner = users[0]!; const other = users[1]!;
    const workoutResponse = await server.inject({ method: "POST", url: "/api/v1/workouts", headers: { cookie: owner.cookie }, payload: {} });
    assert.equal(workoutResponse.statusCode, 201, workoutResponse.body);
    const workoutId = workoutResponse.json<{ data: { workout: { id: string } } }>().data.workout.id;
    const catalog = await server.inject({ method: "GET", url: "/api/v1/tracking/catalog", headers: { cookie: owner.cookie } });
    const tracked = catalog.json<{ data: { items: { id: string; name: string; trackingMode: string }[] } }>().data.items;
    const exerciseId = tracked.find((item) => item.name === "Dead hang")!.id;
    const cardioExerciseId = tracked.find((item) => item.trackingMode === "cardio")!.id;
    const prefix = `/api/v1/tracking/workouts/${workoutId}`;
    const initial = { id: randomUUID(), exerciseId, setType: "working", durationSeconds: 60, addedWeightKg: "5.00" };
    const create = () => server.inject({ method: "POST", url: `${prefix}/timed-sets`, headers: { cookie: owner.cookie }, payload: initial });
    const concurrent = await Promise.all([create(), create()]);
    assert.deepEqual(concurrent.map((response) => response.statusCode).sort(), [200, 201]);
    assert.equal(concurrent[0]!.json<{ data: { entry: Entry } }>().data.entry.id, initial.id);
    const equivalent = await server.inject({ method: "POST", url: `/api/v1/tracking/workouts/${workoutId.toUpperCase()}/timed-sets`, headers: { cookie: owner.cookie }, payload: { ...initial, id: initial.id.toUpperCase(), exerciseId: exerciseId.toUpperCase(), addedWeightKg: 5 } });
    assert.equal(equivalent.statusCode, 200, equivalent.body);
    const conflict = await server.inject({ method: "POST", url: `${prefix}/timed-sets`, headers: { cookie: owner.cookie }, payload: { ...initial, durationSeconds: 61 } });
    assert.equal(conflict.statusCode, 409);
    const foreign = await server.inject({ method: "GET", url: prefix, headers: { cookie: other.cookie } });
    assert.equal(foreign.statusCode, 404);
    const update = await server.inject({ method: "PATCH", url: `${prefix}/timed-sets/${initial.id}`, headers: { cookie: owner.cookie }, payload: { exerciseId, setType: "working", durationSeconds: 90, addedWeightKg: "10", revision: 1 } });
    assert.equal(update.statusCode, 200, update.body);
    assert.equal(update.json<{ data: { entry: Entry } }>().data.entry.revision, 2);
    const replay = await create();
    assert.equal(replay.statusCode, 200);
    assert.equal(replay.json<{ data: { entry: Entry } }>().data.entry.durationSeconds, 90);
    const edits = await Promise.all([95, 100].map((durationSeconds) => server.inject({ method: "PATCH", url: `${prefix}/timed-sets/${initial.id}`, headers: { cookie: owner.cookie }, payload: { exerciseId, setType: "working", durationSeconds, revision: 2 } })));
    assert.deepEqual(edits.map((response) => response.statusCode).sort(), [200, 409]);
    const removed = await server.inject({ method: "DELETE", url: `${prefix}/timed-sets/${initial.id}?revision=3`, headers: { cookie: owner.cookie } });
    assert.equal(removed.statusCode, 200, removed.body);
    const tombstoneReplay = await create();
    assert.equal(tombstoneReplay.statusCode, 200);
    assert.ok(tombstoneReplay.json<{ data: { entry: Entry } }>().data.entry.deletedAt);
    for (const setType of ["working", "warmup"]) {
      const added = await server.inject({ method: "POST", url: `${prefix}/timed-sets`, headers: { cookie: owner.cookie }, payload: { id: randomUUID(), exerciseId, setType, durationSeconds: 30 } });
      assert.equal(added.statusCode, 201, added.body);
      assert.equal(added.json<{ data: { entry: Entry } }>().data.entry.addedWeightKg, null);
    }
    const cardio = await server.inject({ method: "POST", url: `${prefix}/cardio`, headers: { cookie: owner.cookie }, payload: { id: randomUUID(), exerciseId: cardioExerciseId, durationSeconds: 1800, distanceMetres: "5000", averageHeartRate: 140, calories: 320 } });
    assert.equal(cardio.statusCode, 201, cardio.body);
    assert.equal(cardio.json<{ data: { entry: { calories: number; activity: string } } }>().data.entry.calories, 320);
    // A time set cannot sit on a cardio exercise, and both exercises now show in the workout like any other.
    const wrongMode = await server.inject({ method: "POST", url: `${prefix}/timed-sets`, headers: { cookie: owner.cookie }, payload: { id: randomUUID(), exerciseId: cardioExerciseId, durationSeconds: 30 } });
    assert.equal(wrongMode.statusCode, 404, wrongMode.body);
    const detail = await server.inject({ method: "GET", url: `/api/v1/workouts/${workoutId}`, headers: { cookie: owner.cookie } });
    const sessionExercises = detail.json<{ data: { workout: { exercises: { id: string; exercise: { id: string; trackingMode?: string } }[] } } }>().data.workout.exercises;
    assert.deepEqual(sessionExercises.map((item) => item.exercise.trackingMode), ["time", "cardio"]);
    const again = await server.inject({ method: "POST", url: `/api/v1/workouts/${workoutId}/exercises`, headers: { cookie: owner.cookie }, payload: { exerciseId, clientMutationId: randomUUID() } });
    assert.equal(again.json<{ data: { sessionExercise: { id: string } } }>().data.sessionExercise.id, sessionExercises[0]!.id, again.body);
    const repSet = await server.inject({ method: "POST", url: `/api/v1/workouts/${workoutId}/exercises/${sessionExercises[0]!.id}/sets`, headers: { cookie: owner.cookie }, payload: { clientMutationId: randomUUID(), setType: "working", weightKg: "0", reps: 5, rir: 2 } });
    assert.equal(repSet.statusCode, 404, repSet.body);
    const listed = await server.inject({ method: "GET", url: "/api/v1/exercises?search=Dead%20hang", headers: { cookie: owner.cookie } });
    assert.equal(listed.json<{ data: { items: { trackingMode?: string }[] } }>().data.items[0]?.trackingMode, "time", listed.body);
    const list = await server.inject({ method: "GET", url: "/api/v1/workouts", headers: { cookie: owner.cookie } });
    const summary = list.json<{ data: { items: { totalSets: number; cardioEntries: number }[] } }>().data.items[0]!;
    assert.equal(summary.totalSets, 2); assert.equal(summary.cardioEntries, 1);
    const volume = await server.inject({ method: "GET", url: "/api/v1/analytics/weekly-volume", headers: { cookie: owner.cookie } });
    assert.equal(volume.statusCode, 200, volume.body);
    assert.equal(volume.json<{ data: { weeks: { items: { workingSets: number }[] }[] } }>().data.weeks.flatMap((week) => week.items).reduce((sum, item) => sum + item.workingSets, 0), 1.5);
    const oldCsv = "workout_started_at,workout_ended_at,workout_type,workout_title,workout_notes,exercise_name,primary_muscle_group_slug,equipment,exercise_type,exercise_position,set_order,set_type,weight_kg,reps,rir,rest_time_seconds,set_note\n2026-01-01T10:00:00Z,2026-01-01T11:00:00Z,,,,Dead hang,forearms,,,1,1,working,20,5,2,,";
    const blocked = await server.inject({ method: "POST", url: "/api/v1/workouts/import.csv", headers: { cookie: owner.cookie, "content-type": "text/csv" }, payload: oldCsv });
    assert.equal(blocked.statusCode, 422, blocked.body);
    assert.match(blocked.body, /records time/);
    const ended = await server.inject({ method: "POST", url: `/api/v1/workouts/${workoutId}/end`, headers: { cookie: owner.cookie }, payload: {} });
    assert.equal(ended.statusCode, 200, ended.body);
    const progress = await server.inject({ method: "GET", url: "/api/v1/tracking/progress", headers: { cookie: owner.cookie } });
    assert.equal(progress.json<{ data: { timedSets: unknown[] } }>().data.timedSets.length, 1);
    const exported = await server.inject({ method: "GET", url: "/api/v1/tracking/export.csv", headers: { cookie: owner.cookie } });
    assert.equal(exported.statusCode, 200);
    const imported = await server.inject({ method: "POST", url: "/api/v1/tracking/import.csv", headers: { cookie: other.cookie, "content-type": "text/csv" }, payload: exported.body });
    assert.equal(imported.statusCode, 201, imported.body);
    assert.equal(imported.json<{ data: { importedRows: number } }>().data.importedRows, 3);
    const otherProgress = await server.inject({ method: "GET", url: "/api/v1/tracking/progress", headers: { cookie: other.cookie } });
    assert.equal(otherProgress.json<{ data: { cardioEntries: unknown[] } }>().data.cardioEntries.length, 1);
    const account = await createUserAccountRepository(db).exportAccount(owner.id);
    assert.equal((account.timedSets as unknown[]).length, 3); assert.equal((account.cardioEntries as unknown[]).length, 1);
  });
  it("keeps routes and time-exercise creation unavailable with the default flag", async () => {
    const disabled = await buildServer(db, { cookieName: "gym_progress_session", cookieSecure: false, sessionTtlDays: 30 }, false, { events: "off" });
    try {
      assert.equal((await disabled.inject({ method: "GET", url: "/api/v1/tracking/catalog", headers: { cookie: users[0]!.cookie } })).statusCode, 404);
      const muscle = await db.selectFrom("muscle_groups").select("id").where("slug", "=", "forearms").executeTakeFirstOrThrow();
      const response = await disabled.inject({ method: "POST", url: "/api/v1/exercises", headers: { cookie: users[0]!.cookie }, payload: { name: "Paused hold", primaryMuscleGroupIds: [muscle.id], trackingMode: "time" } });
      assert.equal(response.statusCode, 404, response.body);
    } finally { await disabled.close(); }
  });
  it("erases a time-exercise creator while preserving another member's logged history", async () => {
    const tag = `tracking_creator_${randomUUID().slice(0, 8)}`;
    const signup = await server.inject({ method: "POST", url: "/api/v1/auth/signup", payload: { email: `${tag}@example.test`, username: tag, password: "tracking-check-password", termsVersion: "test", privacyVersion: "test", adultAttested: true } });
    assert.equal(signup.statusCode, 201, signup.body);
    const cookieHeader = signup.headers["set-cookie"];
    const cookie = (Array.isArray(cookieHeader) ? cookieHeader[0]! : cookieHeader!).split(";")[0]!;
    const id = signup.json<{ data: { user: { id: string } } }>().data.user.id;
    users.push({ id, cookie });
    const muscle = await db.selectFrom("muscle_groups").select("id").where("slug", "=", "forearms").executeTakeFirstOrThrow();
    const created = await server.inject({ method: "POST", url: "/api/v1/exercises", headers: { cookie }, payload: { name: `Isometric Forearm Hold ${randomUUID().replace(/[^a-z]/g, "").slice(0, 6)}`, primaryMuscleGroupIds: [muscle.id], trackingMode: "time", confirmNameWarning: true } });
    assert.equal(created.statusCode, 201, created.body);
    const exerciseId = created.json<{ data: { exercise: { id: string } } }>().data.exercise.id;
    customIds.push(exerciseId);
    const workout = await db.selectFrom("workout_sessions").select("id").where("user_id", "=", users[0]!.id).executeTakeFirstOrThrow();
    const entry = await server.inject({ method: "POST", url: `/api/v1/tracking/workouts/${workout.id}/timed-sets`, headers: { cookie: users[0]!.cookie }, payload: { id: randomUUID(), exerciseId, durationSeconds: 20 } });
    assert.equal(entry.statusCode, 201, entry.body);
    await db.updateTable("users").set({ account_status: "DELETION_PENDING", deletion_requested_at: new Date(0), deletion_due_at: new Date(0) }).where("id", "=", id).execute();
    assert.equal(await createUserAccountRepository(db).finalizeDeletion(id, new Date()), true);
    const preserved = await db.selectFrom("exercises").select("created_by_user_id").where("id", "=", exerciseId).executeTakeFirstOrThrow();
    assert.equal(preserved.created_by_user_id, null);
    assert.ok(await db.selectFrom("timed_sets").select("id").where("exercise_id", "=", exerciseId).executeTakeFirst());
  });

});
