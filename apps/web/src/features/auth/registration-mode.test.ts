import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isRegistrationEnabled, readRegistrationMode } from "./registration-mode";

describe("registration mode", () => {
  it("defaults closed in production", () => {
    assert.equal(readRegistrationMode({ NODE_ENV: "production" }), "DISABLED");
    assert.equal(isRegistrationEnabled({ NODE_ENV: "production" }), false);
  });

  it("defaults open for local development and tests", () => {
    assert.equal(readRegistrationMode({ NODE_ENV: "development" }), "ENABLED");
    assert.equal(readRegistrationMode({ NODE_ENV: "test" }), "ENABLED");
  });

  it("honors an explicit supported mode", () => {
    assert.equal(readRegistrationMode({ REGISTRATION_MODE: "DISABLED" }), "DISABLED");
    assert.equal(readRegistrationMode({ REGISTRATION_MODE: "ENABLED" }), "ENABLED");
    assert.equal(readRegistrationMode({ REGISTRATION_MODE: "INVITE_ONLY" }), "INVITE_ONLY");
    assert.equal(isRegistrationEnabled({ REGISTRATION_MODE: "INVITE_ONLY" }), true);
  });

  it("rejects unknown modes instead of opening registration", () => {
    assert.throws(
      () => readRegistrationMode({ REGISTRATION_MODE: "OPEN" }),
      /must be ENABLED, INVITE_ONLY, or DISABLED/
    );
  });
});
