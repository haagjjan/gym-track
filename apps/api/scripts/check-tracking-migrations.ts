import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createDatabase } from "../src/db/database.js";
import { createAnalyticsRepository } from "../src/features/analytics/analytics.repository.js";
import { addTimedRegionVolume } from "../src/features/tracking/tracking-region-volume.js";
import { Client } from "pg";

// This check creates and removes only its own disposable loopback database.
const source = new URL(process.env.DATABASE_URL ?? "");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(source.hostname), "Use a loopback PostgreSQL instance");
const name = `gym_tracking_fixture_${Date.now()}`;
const admin = new Client({ connectionString: source.toString() });
await admin.connect();
await admin.query(`CREATE DATABASE ${name}`);
const fixtureUrl = new URL(source); fixtureUrl.pathname = `/${name}`;
const fixture = new Client({ connectionString: fixtureUrl.toString() });
await fixture.connect();
const cwd = fileURLToPath(new URL("../", import.meta.url));
function migrate(args: string[], error?: string): void {
  const result = spawnSync("pnpm", ["migrate", ...args], { cwd, env: { ...process.env, DATABASE_URL: fixtureUrl.toString() }, encoding: "utf8" });
  const output = (result.stdout ?? "") + (result.stderr ?? "");
  if (error) { assert.notEqual(result.status, 0); assert.ok(output.includes(error), output); }
  else assert.equal(result.status, 0, output);
}
try {
  migrate(["up", "10"]);
  const collision = randomUUID();
  const forearms = (await fixture.query<{ id: string }>("select id from muscle_groups where slug='forearms'")).rows[0]!.id;
  await fixture.query("BEGIN");
  await fixture.query("insert into exercises(id,name,primary_muscle_group_id) values ($1,'Dead hang',$2)", [collision, forearms]);
  await fixture.query("insert into exercise_muscle_groups(exercise_id,muscle_group_id,role) values ($1,$2,'PRIMARY') on conflict do nothing", [collision, forearms]);
  await fixture.query("COMMIT");
  migrate(["up"], "seed identity conflicts");
  assert.equal((await fixture.query("select 1 from information_schema.columns where table_name='exercises' and column_name='tracking_mode'")).rowCount, 0, "Failed up must roll back its schema additions");
  assert.equal((await fixture.query("select name from exercises where id=$1", [collision])).rows[0].name, "Dead hang");
  await fixture.query("BEGIN");
  await fixture.query("delete from exercise_muscle_groups where exercise_id=$1", [collision]);
  await fixture.query("delete from exercises where id=$1", [collision]);
  await fixture.query("COMMIT");
  migrate(["up"]);
  const seed = "d3fc6d63-e425-47cb-bfc0-458367a9dc3c";
  await fixture.query("update exercises set name='Modified dead hang' where id=$1", [seed]);
  migrate(["down", "2"], "seed was changed");
  assert.equal((await fixture.query("select name from exercises where id=$1", [seed])).rows[0].name, "Modified dead hang");
  await fixture.query("update exercises set name='Dead hang' where id=$1", [seed]);
  migrate(["up"]);
  const user = randomUUID(); const workout = randomUUID(); const entry = randomUUID();
  await fixture.query("insert into users(id,email,username,password_hash) values ($1,'fixture@example.test','tracking_fixture','unused')", [user]);
  await fixture.query("insert into workout_sessions(id,user_id,started_at,ended_at) values ($1,$2,'2026-01-01','2026-01-02')", [workout, user]);
  const reps = (await fixture.query("select id from exercises where tracking_mode='reps' limit 1")).rows[0].id;
  await assert.rejects(fixture.query("insert into timed_sets(id,workout_session_id,exercise_id,set_type,duration_seconds,create_fingerprint) values ($1,$2,$3,'working',30,'fixture')", [entry, workout, reps]), { code: "23503" });
  await fixture.query("insert into timed_sets(id,workout_session_id,exercise_id,set_type,duration_seconds,create_fingerprint) values ($1,$2,$3,'working',30,'fixture')", [entry, workout, seed]);
  migrate(["down", "2"], "Timed sets exist");
  assert.equal((await fixture.query("select duration_seconds from timed_sets where id=$1", [entry])).rows[0].duration_seconds, 30);
  console.log("Passed: seed collision rollback, modified-seed preservation, time-exercise FK and logged-data rollback refusal.");
  if (process.argv[2]) {
    const migration = resolve(process.argv[2]);
    const up = (await readFile(migration, "utf8")).split("-- Down Migration")[0]!;
    await fixture.query("BEGIN");
    try { await fixture.query(up); await fixture.query("COMMIT"); }
    catch (error) { await fixture.query("ROLLBACK"); throw error; }
    const back = (await fixture.query("select id from muscle_groups where slug='back'")).rows[0].id;
    const shoulders = (await fixture.query("select id from muscle_groups where slug='shoulders'")).rows[0].id;
    const timeExercise = randomUUID();
    await fixture.query("BEGIN");
    await fixture.query("insert into exercises(id,name,primary_muscle_group_id,tracking_mode) values ($1,'Fixture timed back hold',$2,'time')", [timeExercise, back]);
    await fixture.query("insert into exercise_muscle_groups(exercise_id,muscle_group_id,role) values ($1,$2,'PRIMARY') on conflict do nothing", [timeExercise, shoulders]);
    await fixture.query("insert into timed_sets(id,workout_session_id,exercise_id,set_type,duration_seconds,create_fingerprint) values ($1,$2,$3,'working',20,'fixture')", [randomUUID(), workout, timeExercise]);
    await fixture.query("COMMIT");
    const db = createDatabase(fixtureUrl.toString());
    try {
      const repository = createAnalyticsRepository(db, true);
      const filters = { userId: user, startDate: undefined, endDate: undefined, muscleGroupIds: undefined };
      const rows = await repository.findWeeklyVolumeSets(filters);
      const regions = await repository.findTimedVolumeRegions!(filters);
      const bodyRoot = resolve(dirname(migration), "../../../..");
      const { toWeeklyVolume } = await import(pathToFileURL(resolve(bodyRoot, "apps/api/src/features/analytics/analytics-weekly-volume.ts")).href);
      const combined = addTimedRegionVolume(toWeeklyVolume(rows, []), regions);
      assert.equal(combined.weeks[0].items.reduce((sum: number, item: { workingSets: number }) => sum + item.workingSets, 0), 3);
      assert.equal(combined.weeks[0].regionItems.reduce((sum: number, item: { workingSets: number }) => sum + item.workingSets, 0), 3);
      assert.deepEqual(combined.weeks[0].regionItems.map((item: { muscleRegion: { slug: string } }) => item.muscleRegion.slug).sort(), ["delts_front", "forearms", "upper_back"]);
      console.log("Passed: body-region schema and timed multi-primary working sets report matching group/region totals.");
    } finally { await db.destroy(); }
  }
} finally {
  await fixture.end();
  await admin.query(`DROP DATABASE ${name}`);
  await admin.end();
}
