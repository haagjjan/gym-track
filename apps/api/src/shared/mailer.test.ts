import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLogMailer, createMailerFromEnv, type AppLoggerLike } from "./mailer.js";

describe("mailer logging", () => {
  it("keeps local-development message retrieval available", async () => {
    const captured = createCaptureLogger();
    const mailer = createLogMailer(captured.logger);

    await mailer.send(testMessage);

    assert.match(captured.output(), /private@example\.test/);
    assert.match(captured.output(), /private-action-token/);
  });

  it("does not log recipients or action content in production", async () => {
    const captured = createCaptureLogger();
    const mailer = createMailerFromEnv(
      {
        RESEND_API_KEY: undefined,
        EMAIL_FROM: "Gym Tracker <no-reply@example.test>",
        NODE_ENV: "production"
      },
      captured.logger
    );

    await mailer.send(testMessage);

    assert.match(captured.output(), /no provider is configured|not delivered/);
    assert.doesNotMatch(captured.output(), /private@example\.test|private-action-token/);
  });
});

const testMessage = {
  to: "private@example.test",
  subject: "Private action",
  text: "Open https://example.test/action?token=private-action-token"
};

function createCaptureLogger(): { logger: AppLoggerLike; output: () => string } {
  const entries: unknown[] = [];
  const capture = (payload: unknown, message?: string) => entries.push({ payload, message });

  return {
    logger: { info: capture, warn: capture, error: capture },
    output: () => JSON.stringify(entries)
  };
}
