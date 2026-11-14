import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import { sql, type Kysely } from "kysely";
import { createDatabase, type AppDatabase } from "../../db/database.js";
import { createAnalyticsRepository } from "./analytics.repository.js";
import { createAnalyticsService } from "./analytics.service.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const date = new Date("2026-11-10T12:00:00Z");
const range = { startDate: new Date("2026-11-09T00:00:00Z"), endDate: new Date("2026-11-16T00:00:00Z"), muscleGroupIds: undefined };
interface Fixture { owner: string; other: string; workout: string; exercise: string; chest: string; triceps: string }

async function seed(db: Kysely<AppDatabase>): Promise<Fixture> {
  const [owner, other, workout, exercise] = Array.from({ length: 4 }, () => randomUUID()) as [string, string, string, string];
  for (const id of [owner, other]) await sql`insert into users(id,email,username,password_hash) values (${id},${id + "@example.test"},${id},'unused')`.execute(db);
  const muscles = await db.selectFrom("muscle_groups").select(["id", "slug"]).where("slug", "in", ["chest", "triceps"]).execute();
  const chest = muscles.find((item) => item.slug === "chest")!.id;
  const triceps = muscles.find((item) => item.slug === "triceps")!.id;
  await sql`insert into exercises(id,name,primary_muscle_group_id,created_by_user_id) values (${exercise},${"Volume " + exercise},${chest},${owner})`.execute(db);
  await db.insertInto("exercise_muscle_groups").values([{ exercise_id: exercise, muscle_group_id: chest, role: "PRIMARY" }, { exercise_id: exercise, muscle_group_id: triceps, role: "SECONDARY" }]).onConflict((conflict) => conflict.columns(["exercise_id", "muscle_group_id"]).doNothing()).execute();
  await sql`insert into workout_sessions(id,user_id,started_at,ended_at) values (${workout},${owner},${date},${new Date(date.getTime() + 3600000)})`.execute(db);
  const occurrence = randomUUID();
  await sql`insert into session_exercises(id,workout_session_id,exercise_id,position) values (${occurrence},${workout},${exercise},1)`.execute(db);
  for (const [order, type, deleted] of [[1, "working", false], [2, "warmup", false], [3, "working", true]] as const) {
    await sql`insert into sets(id,session_exercise_id,set_order,set_type,weight_kg,reps,rir,deleted_at)
      values (${randomUUID()},${occurrence},${order},${type},0,8,2,${deleted ? date : null})`.execute(db);
  }
  return { owner, other, workout, exercise, chest, triceps };
}

describe("weighted muscle volume database contract", { skip: databaseUrl ? false : "INTEGRATION_DATABASE_URL is not set" }, () => {
  const db = createDatabase(databaseUrl ?? "postgresql://unused");
  after(() => db.destroy());
  async function fixture(check: (trx: Kysely<AppDatabase>, data: Fixture) => Promise<void>): Promise<void> {
    const rollback = new Error("fixture rollback");
    try {
      await db.transaction().execute(async (trx) => { await check(trx, await seed(trx)); throw rollback; });
    } catch (error) { if (error !== rollback) throw error; }
  }

  it("credits full/half muscle sets in totals and every breakdown, with ownership/date/muscle filters", async () => fixture(async (trx, data) => {
    const service = createAnalyticsService({ repository: createAnalyticsRepository(trx) });
    const volume = await service.getWeeklyVolume(data.owner, range);
    const week = volume.weeks[0]!;
    assert.deepEqual(week.items.map((item) => [item.muscleGroup.slug, item.workingSets]).sort(), [["chest", 1], ["triceps", 0.5]]);
    const secondary = week.items.find((item) => item.muscleGroup.slug === "triceps")!;
    assert.equal(secondary.exercises[0]!.workingSets, 0.5);
    assert.equal(secondary.recentSessions[0]!.workingSets, 0.5);
    assert.equal(week.regionItems.find((item) => item.muscleRegion.slug === "triceps")!.workingSets, 0.5);
    assert.equal((await service.getWeeklyVolume(data.other, range)).weeks.length, 0);
    assert.equal((await service.getWeeklyVolume(data.owner, { ...range, startDate: new Date("2026-11-11T00:00:00Z") })).weeks.length, 0);
    const filtered = await service.getWeeklyVolume(data.owner, { ...range, muscleGroupIds: [data.triceps] });
    assert.equal(filtered.weeks[0]!.items.length, 1);
    assert.equal(filtered.weeks[0]!.regionItems.length, 1);
    assert.equal(filtered.weeks[0]!.items[0]!.workingSets, 0.5);
    // Soft-deleting the exercise occurrence or workout removes all of its credits.
    await trx.updateTable("session_exercises").set({ deleted_at: date }).where("workout_session_id", "=", data.workout).execute();
    assert.equal((await service.getWeeklyVolume(data.owner, range)).weeks.length, 0);
    await trx.updateTable("session_exercises").set({ deleted_at: null }).where("workout_session_id", "=", data.workout).execute();
    await trx.updateTable("workout_sessions").set({ deleted_at: date }).where("id", "=", data.workout).execute();
    assert.equal((await service.getWeeklyVolume(data.owner, range)).weeks.length, 0);
  }));

  it("uses explicit region roles, falls back per missing group, and never sums regions into group totals", async () => fixture(async (trx, data) => {
    const shoulder = await trx.selectFrom("muscle_groups").select("id").where("slug", "=", "shoulders").executeTakeFirstOrThrow();
    await trx.insertInto("exercise_muscle_groups").values({ exercise_id: data.exercise, muscle_group_id: shoulder.id, role: "PRIMARY" }).execute();
    await sql`insert into exercise_muscle_regions(exercise_id,muscle_region_id,role)
      select ${data.exercise},id,case when slug = 'delts_side' then 'SECONDARY' else 'PRIMARY' end
      from muscle_regions where slug in ('chest','delts_front','delts_side')`.execute(trx);
    const service = createAnalyticsService({ repository: createAnalyticsRepository(trx) });
    const week = (await service.getWeeklyVolume(data.owner, range)).weeks[0]!;
    assert.equal(week.items.find((item) => item.muscleGroup.slug === "shoulders")!.workingSets, 1);
    assert.deepEqual(week.regionItems.map((item) => [item.muscleRegion.slug, item.workingSets]).sort(), [["chest", 1], ["delts_front", 1], ["delts_side", 0.5], ["triceps", 0.5]]);
    // Even a stale primary region on a secondary group must keep the half credit.
    await sql`insert into exercise_muscle_regions(exercise_id,muscle_region_id,role) select ${data.exercise},id,'PRIMARY' from muscle_regions where slug = 'triceps'`.execute(trx);
    assert.equal((await service.getWeeklyVolume(data.owner, range)).weeks[0]!.regionItems.find((item) => item.muscleRegion.slug === "triceps")!.workingSets, 0.5);
  }));

  it("weights timed working sets and their explicit regions, excludes cardio/warmups, and obeys the flag", async () => fixture(async (trx, data) => {
    const timed = randomUUID(); const cardio = randomUUID();
    for (const [id, mode] of [[timed, "time"], [cardio, "cardio"]] as const) {
      await sql`insert into exercises(id,name,primary_muscle_group_id,tracking_mode) values (${id},${"Fixture " + id},${data.chest},${mode})`.execute(trx);
      await trx.insertInto("exercise_muscle_groups").values([{ exercise_id: id, muscle_group_id: data.chest, role: "PRIMARY" }, { exercise_id: id, muscle_group_id: data.triceps, role: "SECONDARY" }]).onConflict((conflict) => conflict.columns(["exercise_id", "muscle_group_id"]).doNothing()).execute();
    }
    await sql`insert into exercise_muscle_regions(exercise_id,muscle_region_id,role) select ${timed},id,'SECONDARY' from muscle_regions where slug = 'triceps'`.execute(trx);
    for (const type of ["working", "warmup"] as const) await sql`insert into timed_sets(id,workout_session_id,exercise_id,set_type,duration_seconds,create_fingerprint) values (${randomUUID()},${data.workout},${timed},${type},60,'fixture')`.execute(trx);
    await sql`insert into cardio_entries(id,workout_session_id,exercise_id,activity,duration_seconds,create_fingerprint) values (${randomUUID()},${data.workout},${cardio},'Fixture cardio',600,'fixture')`.execute(trx);
    const enabled = createAnalyticsService({ repository: createAnalyticsRepository(trx, true) });
    const week = (await enabled.getWeeklyVolume(data.owner, range)).weeks[0]!;
    assert.deepEqual(week.items.map((item) => [item.muscleGroup.slug, item.workingSets]).sort(), [["chest", 2], ["triceps", 1]]);
    const triceps = week.regionItems.find((item) => item.muscleRegion.slug === "triceps")!;
    assert.equal(triceps.workingSets, 1);
    assert.deepEqual(triceps.exercises.map((item) => item.workingSets), [0.5, 0.5]);
    assert.equal(triceps.recentSessions[0]!.workingSets, 1);
    const disabled = createAnalyticsService({ repository: createAnalyticsRepository(trx, false) });
    assert.equal((await disabled.getWeeklyVolume(data.owner, range)).weeks[0]!.items.find((item) => item.muscleGroup.slug === "triceps")!.workingSets, 0.5);
  }));

  it("recalculates historical credit when muscle assignments change", async () => fixture(async (trx, data) => {
    await trx.updateTable("exercises").set({ primary_muscle_group_id: data.triceps }).where("id", "=", data.exercise).execute();
    await trx.deleteFrom("exercise_muscle_groups").where("exercise_id", "=", data.exercise).execute();
    await trx.insertInto("exercise_muscle_groups").values([{ exercise_id: data.exercise, muscle_group_id: data.chest, role: "SECONDARY" }, { exercise_id: data.exercise, muscle_group_id: data.triceps, role: "PRIMARY" }]).execute();
    const service = createAnalyticsService({ repository: createAnalyticsRepository(trx) });
    const week = (await service.getWeeklyVolume(data.owner, range)).weeks[0]!;
    assert.deepEqual(week.items.map((item) => [item.muscleGroup.slug, item.workingSets]).sort(), [["chest", 0.5], ["triceps", 1]]);
    assert.equal(week.regionItems.find((item) => item.muscleRegion.slug === "chest")!.workingSets, 0.5);
  }));
});
