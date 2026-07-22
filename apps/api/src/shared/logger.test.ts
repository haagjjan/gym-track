import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fastify from "fastify";
import { createApiLogger, type ApiLogger, sensitiveLogPaths } from "./logger.js";

describe("createApiLogger", () => {
  it("disables logging in test", () => {
    assert.equal(createApiLogger({ level: "info", nodeEnv: "test" }), false);
  });

  it("uses pino-pretty only in local development", () => {
    const logger = createApiLogger({ level: "debug", nodeEnv: "development" });

    assertLoggerObject(logger);
    const options = logger as LoggerOptionsForTest;
    assert.equal(options.level, "debug");
    assert.deepEqual(options.redact?.paths, [...sensitiveLogPaths]);
    assert.equal(options.transport?.target, "pino-pretty");
  });

  it("keeps production logs structured as JSON", () => {
    const logger = createApiLogger({
      level: "warn",
      nodeEnv: "production",
      environment: "home-production",
      version: "release-123"
    });

    assertLoggerObject(logger);
    const options = logger as LoggerOptionsForTest;
    assert.equal(options.level, "warn");
    assert.equal(options.transport, undefined);
    assert.deepEqual(options.base, {
      service: "api",
      environment: "home-production",
      version: "release-123"
    });
    assert.equal(typeof options.timestamp, "function");
  });

  it("redacts request-scoped sensitive values", async () => {
    const output: string[] = [];
    const server = fastify({
      logger: createApiLogger({
        level: "info",
        nodeEnv: "production",
        stream: {
          write(message: string) {
            output.push(message);
          }
        }
      })
    });

    server.get("/redaction-check", async (request) => {
      request.log.info(
        {
          headers: {
            authorization: request.headers.authorization,
            cookie: request.headers.cookie
          },
          sessionToken: "raw-session-token",
          nested: {
            password: "raw-password",
            email: "private@example.test"
          }
        },
        "redaction check"
      );

      return { ok: true };
    });

    await server.inject({
      method: "GET",
      url: "/redaction-check",
      headers: {
        authorization: "Bearer raw-auth-token",
        cookie: "gym_progress_session=raw-cookie"
      }
    });
    await server.close();

    const logs = output.join("");
    assert.match(logs, /redaction check/);
    assert.doesNotMatch(logs, /raw-auth-token/);
    assert.doesNotMatch(logs, /raw-cookie/);
    assert.doesNotMatch(logs, /raw-session-token/);
    assert.doesNotMatch(logs, /raw-password|private@example\.test/);
    assert.match(logs, /\[Redacted\]/);
  });
});

function assertLoggerObject(logger: ApiLogger): asserts logger is Exclude<ApiLogger, boolean> {
  if (typeof logger !== "object") {
    assert.fail("Expected logger options object.");
  }
}

interface LoggerOptionsForTest {
  level?: string;
  base?: Record<string, string>;
  timestamp?: () => string;
  redact?: {
    paths?: string[];
  };
  transport?: {
    target?: string;
  };
}
