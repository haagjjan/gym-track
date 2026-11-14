import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { androidBackAction, type AndroidBackState } from "./android-back";

const base: AndroidBackState = { keyboardOpen: false, modalOpen: false, history: [], path: "/", signedIn: true };

describe("androidBackAction", () => {
  it("closes the keyboard before anything else", () => {
    assert.deepEqual(androidBackAction({ ...base, keyboardOpen: true, modalOpen: true, history: ["/", "/settings"], path: "/settings" }), { kind: "close-keyboard" });
  });

  it("closes the top sheet before navigating", () => {
    assert.deepEqual(androidBackAction({ ...base, modalOpen: true, history: ["/", "/settings"], path: "/settings" }), { kind: "close-modal" });
  });

  it("goes back in the in-app history", () => {
    assert.deepEqual(androidBackAction({ ...base, history: ["/", "/settings"], path: "/settings" }), { kind: "history-back" });
  });

  it("goes to the parent when a pushed screen has no history", () => {
    assert.deepEqual(androidBackAction({ ...base, history: ["/settings"], path: "/settings" }), { kind: "go", path: "/" });
    assert.deepEqual(androidBackAction({ ...base, history: [], path: "/workouts/session" }), { kind: "go", path: "/workouts" });
  });

  it("goes Home from another tab root", () => {
    assert.deepEqual(androidBackAction({ ...base, history: ["/progress"], path: "/progress" }), { kind: "go", path: "/" });
  });

  it("exits on Home", () => {
    assert.deepEqual(androidBackAction({ ...base, history: ["/"], path: "/" }), { kind: "exit" });
  });

  it("exits from a signed-out screen with nothing behind it", () => {
    assert.deepEqual(androidBackAction({ ...base, signedIn: false, history: ["/login"], path: "/login" }), { kind: "exit" });
    assert.deepEqual(androidBackAction({ ...base, signedIn: false, history: ["/login", "/signup"], path: "/signup" }), { kind: "history-back" });
  });
});
