import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appLinkRoute } from "./app-links";

describe("appLinkRoute", () => {
  it("maps each email page to its static route and preserves the query", () => {
    for (const path of ["verify-email", "reset-password", "cancel-deletion"]) {
      for (const slash of ["", "/"]) {
        assert.equal(
          appLinkRoute(`https://app.gymtrack.ch/${path}${slash}?token=a%2Bb%2F%3D&extra=1#fragment`),
          `/${path}/?token=a%2Bb%2F%3D&extra=1`
        );
      }
    }
    assert.equal(appLinkRoute("https://app.gymtrack.ch/verify-email"), "/verify-email/");
  });

  it("ignores malformed URLs, other origins and unrelated paths", () => {
    for (const url of [
      "not a URL", "/verify-email?token=test", "https://gymtrack.ch/verify-email",
      "http://app.gymtrack.ch/verify-email", "https://app.gymtrack.ch.evil.test/verify-email",
      "https://app.gymtrack.ch:444/verify-email", "https://user@app.gymtrack.ch/verify-email",
      "https://app.gymtrack.ch/login", "https://app.gymtrack.ch/verify-email-extra",
      "https://app.gymtrack.ch/verify-email/nested", "https://app.gymtrack.ch/verify-email//"
    ]) {
      assert.equal(appLinkRoute(url), null, url);
    }
  });
});
