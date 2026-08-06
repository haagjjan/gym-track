import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearFilterState,
  filterStorageKey,
  readFilterState,
  writeFilterState
} from "./filter-persistence";

const options = {
  allowedSorts: ["name", "muscle"] as const,
  defaultSort: "name" as const,
  surface: "exercises" as const,
  userId: "user/a"
};

describe("filter persistence", () => {
  it("uses versioned keys scoped by user and surface", () => {
    assert.equal(
      filterStorageKey("user/a", "exercises"),
      "gym-progress-tracker:filters:v1:user%2Fa:exercises"
    );
    assert.notEqual(filterStorageKey("user/a", "history"), filterStorageKey("user/a", "templates"));
    assert.notEqual(filterStorageKey("user/a", "history"), filterStorageKey("user/b", "history"));
  });

  it("round-trips valid facets and sort without a search field", () => {
    const storage = memoryStorage();
    const state = {
      filters: {
        muscleGroupIds: [
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222"
        ],
        equipment: "barbell",
        exerciseType: "compound",
        ownership: "editable" as const
      },
      sort: "muscle" as const
    };

    writeFilterState(storage, options.userId, options.surface, state);

    assert.deepEqual(readFilterState(storage, options), state);
    assert.equal(storage.getItem(filterStorageKey(options.userId, options.surface))?.includes("search"), false);
  });

  it("ignores malformed, unsupported, and stale stored values", () => {
    const invalidValues = [
      "not-json",
      JSON.stringify({ filters: {}, sort: "name" }),
      JSON.stringify({ filters: validFilters(), sort: "newest" }),
      JSON.stringify({ filters: { ...validFilters(), ownership: "mine" }, sort: "name" }),
      JSON.stringify({ filters: { ...validFilters(), equipment: "sled" }, sort: "name" }),
      JSON.stringify({ filters: { ...validFilters(), muscleGroupIds: ["not-a-uuid"] }, sort: "name" })
    ];

    for (const value of invalidValues) {
      const storage = memoryStorage();
      storage.setItem(filterStorageKey(options.userId, options.surface), value);
      assert.equal(readFilterState(storage, options), null);
    }
  });

  it("removes only the selected user's selected surface", () => {
    const storage = memoryStorage();
    storage.setItem(filterStorageKey("user/a", "history"), "history");
    storage.setItem(filterStorageKey("user/a", "templates"), "templates");

    clearFilterState(storage, "user/a", "history");

    assert.equal(storage.getItem(filterStorageKey("user/a", "history")), null);
    assert.equal(storage.getItem(filterStorageKey("user/a", "templates")), "templates");
  });
});

function validFilters(): Record<string, unknown> {
  return { muscleGroupIds: [], equipment: "", exerciseType: "", ownership: "" };
}

function memoryStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); }
  };
}
