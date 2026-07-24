import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { NextRequest } from "next/server";
import { POST } from "./route";

const originalRegistrationMode = process.env.REGISTRATION_MODE;

afterEach(() => {
  if (originalRegistrationMode === undefined) {
    delete process.env.REGISTRATION_MODE;
  } else {
    process.env.REGISTRATION_MODE = originalRegistrationMode;
  }
});

describe("signup BFF route", () => {
  it("rejects account creation before reading the request body when disabled", async () => {
    process.env.REGISTRATION_MODE = "DISABLED";
    const request = new NextRequest("http://localhost:3000/api/auth/signup", {
      body: "{not-json",
      headers: { "content-type": "application/json" },
      method: "POST"
    });
    const response = await POST(request);

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      error: {
        code: "REGISTRATION_DISABLED",
        message: "Registration is currently disabled."
      }
    });
  });
});
