import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

const keys = ["APP_BASE_URL", "APP_ALLOWED_HOSTS", "APP_REDIRECT_HOSTS", "HSTS_ENABLED"] as const;
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

describe("public app association requests", () => {
  for (const path of ["/.well-known/apple-app-site-association", "/.well-known/assetlinks.json"]) {
    it(`passes ${path} through without a session, redirect or rewrite`, () => {
      process.env.APP_BASE_URL = "https://app.gymtrack.ch";
      process.env.APP_ALLOWED_HOSTS = "";
      process.env.APP_REDIRECT_HOSTS = "gymtrack.ch,www.gymtrack.ch";
      process.env.HSTS_ENABLED = "true";
      const response = middleware(new NextRequest(`https://app.gymtrack.ch${path}`, {
        headers: { host: "app.gymtrack.ch", "sec-fetch-site": "cross-site" }
      }));

      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-middleware-next"), "1");
      assert.equal(response.headers.get("location"), null);
      assert.equal(response.headers.get("x-middleware-rewrite"), null);
    });
  }
});
