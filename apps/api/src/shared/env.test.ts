import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readEnv } from "./env.js";

const databaseUrl = "postgresql://user:password@localhost:5432/app";

describe("readEnv", () => {
  it("uses defaults for optional API settings", () => {
    assert.deepEqual(readEnv({ DATABASE_URL: databaseUrl }), {
      API_HOST: "0.0.0.0",
      API_PORT: 4000,
      DATABASE_URL: databaseUrl
    });
  });

  it("coerces API_PORT from an environment string", () => {
    const env = readEnv({
      API_PORT: "4100",
      DATABASE_URL: databaseUrl
    });

    assert.equal(env.API_PORT, 4100);
  });

  it("rejects missing DATABASE_URL", () => {
    assert.throws(() => readEnv({}));
  });
});
