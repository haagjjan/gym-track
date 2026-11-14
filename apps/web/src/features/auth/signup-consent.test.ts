import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readSignupConsent, signupConsentError } from "./signup-consent";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    data.set(name, value);
  }
  return data;
}

describe("signup consent", () => {
  it("reads unticked checkboxes as no consent", () => {
    assert.deepEqual(readSignupConsent(form({ username: "someone" })), { adult: false, policies: false });
  });

  it("reads ticked checkboxes as consent", () => {
    assert.deepEqual(readSignupConsent(form({ adult: "on", policies: "on" })), { adult: true, policies: true });
  });

  it("blocks signup unless both boxes are ticked", () => {
    assert.match(signupConsentError({ adult: false, policies: false }) ?? "", /at least 18.*Terms/);
    assert.match(signupConsentError({ adult: true, policies: false }) ?? "", /Terms and Privacy Notice/);
    assert.match(signupConsentError({ adult: false, policies: true }) ?? "", /at least 18/);
    assert.equal(signupConsentError({ adult: true, policies: true }), null);
  });
});
