import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { backTarget, isTabRoot, parentOf, recordVisit, tabFor, titleFor } from "./navigation";

describe("route table", () => {
  it("assigns tab ownership by the table, not the URL prefix", () => {
    assert.equal(tabFor("/"), "home");
    assert.equal(tabFor("/workouts"), "history");
    assert.equal(tabFor("/workouts/abc-123"), "history");
    assert.equal(tabFor("/workouts/templates"), "workout");
    assert.equal(tabFor("/workouts/templates?templateId=1"), "workout");
    assert.equal(tabFor("/workouts/exercises"), "workout");
    assert.equal(tabFor("/workout"), "workout");
    assert.equal(tabFor("/analytics"), "progress");
    assert.equal(tabFor("/weekly-volume"), "volume");
    assert.equal(tabFor("/settings"), "home");
    assert.equal(tabFor("/privacy"), "home");
    assert.equal(tabFor("/login"), null);
  });

  it("knows the tab roots", () => {
    for (const root of ["/", "/workouts", "/workout", "/progress", "/weekly-volume"]) assert.ok(isTabRoot(root), root);
    for (const pushed of ["/settings", "/workouts/templates", "/workouts/x", "/help"]) assert.ok(!isTabRoot(pushed), pushed);
  });

  it("returns the parent from the table", () => {
    assert.equal(parentOf("/"), null);
    assert.equal(parentOf("/workouts/x"), "/workouts");
    assert.equal(parentOf("/workouts/templates"), "/workout");
    assert.equal(parentOf("/workouts/exercises/"), "/workout");
    assert.equal(parentOf("/settings"), "/");
    assert.equal(parentOf("/messages"), "/");
    assert.equal(parentOf("/help"), "/settings");
    assert.equal(parentOf("/support"), "/settings");
    assert.equal(parentOf("/terms"), "/settings");
    assert.equal(parentOf("/terms", false), "/signup");
  });

  it("names screens in sentence case", () => {
    assert.equal(titleFor("/"), "Home");
    assert.equal(titleFor("/workouts/templates"), "Templates");
    assert.equal(titleFor("/workouts/abc"), "Workout");
  });
});

describe("in-app history", () => {
  it("appends new routes and ignores repeats", () => {
    let history: string[] = [];
    history = recordVisit(history, "/");
    history = recordVisit(history, "/?x=1");
    history = recordVisit(history, "/settings");
    assert.deepEqual(history, ["/", "/settings"]);
  });

  it("pops when the previous entry comes back", () => {
    const history = recordVisit(["/", "/settings", "/help"], "/settings");
    assert.deepEqual(history, ["/", "/settings"]);
  });

  it("caps its length", () => {
    let history: string[] = [];
    for (let i = 0; i < 80; i += 1) history = recordVisit(history, `/workouts/${i}`);
    assert.equal(history.length, 50);
    assert.equal(history.at(-1), "/workouts/79");
  });
});

describe("back contract", () => {
  it("goes to the previous in-app entry first", () => {
    assert.deepEqual(backTarget(["/progress", "/settings"], "/settings"), { kind: "history", path: "/progress" });
  });

  it("falls back to the parent after a deep link or reload", () => {
    assert.deepEqual(backTarget(["/help"], "/help"), { kind: "parent", path: "/settings" });
    assert.deepEqual(backTarget([], "/workouts/templates"), { kind: "parent", path: "/workout" });
  });

  it("has nowhere to go from a tab root with no history", () => {
    assert.deepEqual(backTarget([], "/"), { kind: "none" });
  });
});
