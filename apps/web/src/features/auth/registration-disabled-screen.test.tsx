import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RegistrationDisabledScreen } from "./registration-disabled-screen";

describe("RegistrationDisabledScreen", () => {
  it("shows a private-access message without a registration form", () => {
    const html = renderToStaticMarkup(<RegistrationDisabledScreen />);

    assert.match(html, /New accounts are paused/);
    assert.match(html, /paused new sign-ups/);
    assert.doesNotMatch(html, /<form/);
  });
});
