import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { sql } from "kysely";
import { createDatabase } from "../../db/database.js";
import { createUserAccountRepository } from "./user-account.repository.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
test("onboarding migration excludes existing accounts and delta writes preserve unrelated flags", { skip: !databaseUrl }, async () => {
  const db = createDatabase(databaseUrl!);
  try {
    await db.connection().execute(async (connection) => {
      // A connection-local table shadows users; no application accounts are changed.
      await sql`create temporary table users (id text primary key, onboarding_version integer not null default 1, onboarding_steps jsonb not null default '{}', updated_at timestamptz default now())`.execute(connection);
      await sql`insert into users (id, onboarding_steps) values ('existing', '{"tour":true,"finishWorkout":true}')`.execute(connection);
      const migration = await readFile(new URL("../../../db/migrations/20260929120000000_onboarding_demo_invitation.sql", import.meta.url), "utf8");
      await sql.raw(migration.split("-- Down Migration")[0]!).execute(connection);
      await sql`insert into users (id) values ('new'), ('other')`.execute(connection);
      const repository = createUserAccountRepository(connection);
      assert.deepEqual(await repository.getOnboarding("existing"), { version: 2, steps: { tour: true, finishWorkout: true, demoInvitationHandled: true } });
      assert.deepEqual(await repository.getOnboarding("new"), { version: 2, steps: {} });
      await Promise.all([
        repository.updateOnboarding("new", { version: 2, steps: { demo_log_completed: true } }, new Date()),
        repository.updateOnboarding("new", { version: 2, steps: { demo_volume_skipped: true } }, new Date())
      ]);
      assert.deepEqual((await repository.getOnboarding("new"))?.steps, { demo_log_completed: true, demo_volume_skipped: true });
      assert.deepEqual((await repository.getOnboarding("other"))?.steps, {});
      await sql`drop table pg_temp.users`.execute(connection);
    });
  } finally { await db.destroy(); }
});
