import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createLogMailer,
  createMailerFromEnv,
  createResendMailer,
  MailDeliveryError,
  type AppLoggerLike
} from "./mailer.js";

describe("mailer logging", () => {
  it("keeps local-development message retrieval available", async () => {
    const captured = createCaptureLogger();
    const mailer = createLogMailer(captured.logger);

    await mailer.send(testMessage);

    assert.match(captured.output(), /private@example\.test/);
    assert.match(captured.output(), /private-action-token/);
  });

  it("fails closed when public production has no provider", () => {
    const captured = createCaptureLogger();
    assert.throws(() => createMailerFromEnv(
      {
        APP_ENV: "production",
        RESEND_API_KEY: undefined,
        EMAIL_FROM: "Gym Tracker <no-reply@example.test>",
        NODE_ENV: "production"
      },
      captured.logger
    ), /RESEND_API_KEY/);
    assert.doesNotMatch(captured.output(), /private@example\.test|private-action-token/);
  });

  it("keeps log delivery for the explicit local production exception", async () => {
    const mailer = createMailerFromEnv({
      APP_ENV: "local",
      RESEND_API_KEY: undefined,
      EMAIL_FROM: "Gym Tracker <no-reply@example.test>",
      NODE_ENV: "production"
    }, createCaptureLogger().logger);
    assert.equal((await mailer.send(testMessage)).provider, "log");
  });

  it("submits both plain text and escaped branded HTML to Resend", async () => {
    const originalFetch = globalThis.fetch;
    let submitted: Record<string, unknown> | null = null;
    globalThis.fetch = async (_input, init) => {
      submitted = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({ id: "provider-message-1" }, { status: 202 });
    };
    try {
      await createResendMailer("secret", "Gym Tracker <hello@example.test>", createCaptureLogger().logger, "support@example.test").send({
        kind: "INVITATION", to: "person@example.test", subject: "Welcome <member>", text: "Open https://example.test\n\nNever share <tokens>."
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

  it("records bounded provider failures without logging message content", async () => {
    const originalFetch = globalThis.fetch;
    const captured = createCaptureLogger();
    const observations: Array<{ duration: number; kind: string; outcome: string }> = [];
    globalThis.fetch = async () => new Response("provider rejected private@example.test", { status: 422 });
    try {
      const mailer = createResendMailer(
        "secret",
        "Gym Tracker <hello@example.test>",
        captured.logger,
        undefined,
        { record: (kind, outcome, duration) => observations.push({ kind, outcome, duration }) }
      );
      await assert.rejects(() => mailer.send(testMessage), MailDeliveryError);

      assert.deepEqual(observations.map(({ kind, outcome }) => ({ kind, outcome })), [
        { kind: "PASSWORD_RESET", outcome: "FAILED" }
      ]);
      assert.doesNotMatch(captured.output(), /private@example\.test|private-action-token|https:\/\/example\.test/);
      assert.match(captured.output(), /PASSWORD_RESET|422/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

const testMessage = {
  kind: "PASSWORD_RESET" as const,
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
