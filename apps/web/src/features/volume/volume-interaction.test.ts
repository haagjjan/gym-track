import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { volumeOrbitPolicy } from "./volume-interaction";

describe("volume body-map pointer policy", () => {
  it("allows vertical page scrolling and disables touch zoom for coarse pointers", () => {
    assert.deepEqual(volumeOrbitPolicy(true), {
      enableZoom: false,
      hint: "Swipe sideways to rotate the figure.",
      touchRotate: true,
      touchAction: "none"
    });
  });

  it("keeps full orbit and zoom behavior for a fine pointer", () => {
    assert.deepEqual(volumeOrbitPolicy(false), {
      enableZoom: true,
      hint: "Drag to rotate the figure. Scroll to zoom.",
      touchRotate: false,
      touchAction: "none"
    });
  });
});
