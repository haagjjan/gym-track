import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import { sql } from "kysely";
import { createDatabase } from "../../db/database.js";
import { createExerciseRepository } from "./exercise.repository.js";
import { createExerciseService } from "./exercise.service.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
describe("exercise region filtering", { skip: databaseUrl ? false : "INTEGRATION_DATABASE_URL is not set" }, () => {
  const db = createDatabase(databaseUrl ?? "postgresql://unused");
  after(() => db.destroy());
  it("matches either role, uses group defaults, and keeps pagination and sorting consistent", async () => {
    const rollback = new Error("fixture rollback");
    try {
      await db.transaction().execute(async (trx) => {
        const owner = randomUUID();
        const prefix = randomUUID();
        await sql`insert into users(id,email,username,password_hash) values (${owner},${owner + "@example.test"},${owner},'unused')`.execute(trx);
        const groups = await trx.selectFrom("muscle_groups").select(["id", "slug"]).execute();
        const regions = await trx.selectFrom("muscle_regions").select(["id", "slug"]).execute();
        const groupId = (slug: string) => groups.find((group) => group.slug === slug)!.id;
        const regionId = (slug: string) => regions.find((region) => region.slug === slug)!.id;
        const [custom, explicit] = [randomUUID(), randomUUID()];
        for (const [id, name] of [[custom, "A custom"], [explicit, "Z explicit"]]) {
          await sql`insert into exercises(id,name,primary_muscle_group_id,created_by_user_id)
            values (${id},${prefix + name},${groupId("shoulders")},${owner})`.execute(trx);
          await trx.insertInto("exercise_muscle_groups").values({ exercise_id: id!, muscle_group_id: groupId("triceps"), role: "SECONDARY" }).execute();
        }
        await trx.insertInto("exercise_muscle_regions").values([
          { exercise_id: explicit!, muscle_region_id: regionId("delts_side"), role: "PRIMARY" },
          { exercise_id: explicit!, muscle_region_id: regionId("delts_rear"), role: "SECONDARY" }
        ]).execute();
        const service = createExerciseService({ repository: createExerciseRepository(trx) });
        const list = (slugs: string[], offset = 0) => service.listExercises(owner, {
          search: prefix, muscleRegionIds: slugs.map(regionId), sort: "muscle", limit: 1, offset
        });
        const side = await list(["delts_side"]);
        assert.equal(side.pagination.total, 1);
        assert.equal(side.items[0]!.id, explicit);
        assert.equal((await list(["delts_rear"])).items[0]!.id, explicit);
        assert.equal((await list(["delts_front"])).items[0]!.id, custom);
        assert.equal((await list(["delts_side", "delts_rear"])).pagination.total, 1);
        assert.equal((await list(["delts_side", "delts_front"])).pagination.total, 0);
        assert.equal((await list(["triceps"])).pagination.total, 2);
        assert.equal((await list([], 1)).items[0]!.id, explicit);
        assert.equal(side.items[0]!.muscleRegions!.some((region) => region.slug === "delts_front"), false);
        assert.equal(side.items[0]!.primaryMuscleGroup.slug, "shoulders");
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
  });
});
