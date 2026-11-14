import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextThemePreference, resolveTheme } from "./theme";

describe("theme preference cycling", () => {
  it("cycles from system to light to dark and back to system", () => {
    assert.equal(nextThemePreference("system"), "light");
    assert.equal(nextThemePreference("light"), "dark");
    assert.equal(nextThemePreference("dark"), "system");
  });

  it("resolves system preference from prefers-color-scheme", () => {
    assert.equal(resolveTheme("system", true), "light");
    assert.equal(resolveTheme("system", false), "dark");
    assert.equal(resolveTheme("light", false), "light");
    assert.equal(resolveTheme("dark", true), "dark");
  });
});
