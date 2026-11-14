import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { listExercisesQuerySchema } from "./exercise.schemas.js";
import { listWorkoutsQuerySchema } from "../workouts/workout.schemas.js";
import { listTemplatesQuerySchema } from "../templates/template.schemas.js";

const side = "00000000-0000-4000-8000-000000000103";
const rear = "00000000-0000-4000-8000-000000000104";
const group = "00000000-0000-4000-8000-000000000003";

describe("region filter contracts", () => {
  it("accepts repeated and comma-separated regions alongside legacy groups", () => {
    for (const schema of [listExercisesQuerySchema, listWorkoutsQuerySchema, listTemplatesQuerySchema]) {
      const input = schema.parse({ muscleRegionIds: `${side},${rear}`, muscleGroupIds: group });
      assert.deepEqual(input.muscleRegionIds, [side, rear]);
      assert.deepEqual(input.muscleGroupIds, [group]);
      assert.deepEqual(schema.parse({ muscleRegionIds: [side, rear] }).muscleRegionIds, [side, rear]);
      assert.equal(schema.safeParse({ muscleRegionIds: "shoulders" }).success, false);
    }
  });
});

describe("catalog region repair", () => {
  const migration = readFileSync(new URL("../../../db/migrations/20261114120000000_repair_catalog_regions.sql", import.meta.url), "utf8");
  const parse = (part: string) => JSON.parse(part.match(/jsonb_to_recordset\('(.+)'::jsonb\)/)![1]!.replaceAll("''", "'")) as Array<{ name: string; primary: string[]; secondary: string[] }>;
  const [up, down] = migration.split("-- Down Migration");
  const assignments = parse(up!);
  const original = parse(down!);
  it("covers every imported catalog name and all later corrections", () => {
    assert.equal(assignments.length, 840);
    assert.equal(new Set(assignments.map((row) => row.name)).size, 840);
    for (const row of assignments) {
      assert.ok(row.primary.length > 0, row.name);
      assert.equal(row.secondary.some((slug) => row.primary.includes(slug)), false, row.name);
    }
  });
  it("repairs legacy-name matches and preserves anatomical classifications", () => {
    for (const [name, region] of [["Cable Lateral Raise", "delts_side"], ["Dumbbell Lateral Raise", "delts_side"], ["Face Pull", "delts_rear"], ["Reverse Flyes", "delts_rear"], ["Lat Pulldown", "lats"], ["Pull-Up", "lats"], ["Smith Machine Upright Row", "delts_side"]]) {
      assert.ok(assignments.find((row) => row.name === name)?.primary.includes(region!), name);
    }
    assert.equal(original.find((row) => row.name === "Smith Machine Upright Row")?.primary.includes("delts_side"), false);
    assert.equal(original.length, assignments.length);
  });
});
