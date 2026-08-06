import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLogMailer, createMailerFromEnv, createResendMailer, type AppLoggerLike } from "./mailer.js";

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

  it("submits both plain text and escaped branded HTML to Resend", async () => {
    const originalFetch = globalThis.fetch;
    let submitted: Record<string, unknown> | null = null;
    globalThis.fetch = async (_input, init) => {
      submitted = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(null, { status: 202 });
    };
    try {
      await createResendMailer("secret", "Gym Tracker <hello@example.test>", createCaptureLogger().logger, "support@example.test").send({
        to: "person@example.test", subject: "Welcome <member>", text: "Open https://example.test\n\nNever share <tokens>."
      });
      const delivered = submitted as Record<string, unknown> | null;
      assert.ok(delivered);
      assert.match(String(delivered.text), /Never share <tokens>/);
      assert.match(String(delivered.html), /GYM PROGRESS TRACKER/);
      assert.doesNotMatch(String(delivered.html), /<member>|<tokens>/);
      assert.equal(delivered.reply_to, "support@example.test");
    } finally {
      globalThis.fetch = originalFetch;
    }
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
