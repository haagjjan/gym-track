export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/** Structural subset of FastifyBaseLogger so services stay framework-agnostic. */
export interface AppLoggerLike {
  info(payload: unknown, message?: string): void;
  warn(payload: unknown, message?: string): void;
  error(payload: unknown, message?: string): void;
}

interface MailerEnv {
  RESEND_API_KEY: string | undefined;
  EMAIL_FROM: string;
  EMAIL_REPLY_TO?: string | undefined;
  NODE_ENV: "development" | "test" | "production";
}

/**
 * Provider selection is env-driven so no vendor decision blocks deploys:
 * with RESEND_API_KEY set, mail goes out via Resend's HTTP API. Local
 * development writes messages to its log so action links can be retrieved.
 * Production never logs recipient addresses or message content.
 */
export function createMailerFromEnv(env: MailerEnv, logger: AppLoggerLike): Mailer {
  if (env.RESEND_API_KEY) {
    return createResendMailer(env.RESEND_API_KEY, env.EMAIL_FROM, logger, env.EMAIL_REPLY_TO);
  }

  if (env.NODE_ENV === "production") {
    logger.warn(
      {},
      "No RESEND_API_KEY configured in production — email delivery is disabled."
    );
  }

  return createLogMailer(logger, env.NODE_ENV !== "production");
}

export function createLogMailer(logger: AppLoggerLike, includeContent = true): Mailer {
  return {
    async send(message) {
      if (!includeContent) {
        logger.warn({}, "auth email not delivered because no provider is configured");
        return;
      }

      logger.info(
        { to: message.to, subject: message.subject, body: message.text },
        "auth email (log transport)"
      );
    }
  };
}

export function createResendMailer(
  apiKey: string,
  from: string,
  logger: AppLoggerLike,
  replyTo?: string
): Mailer {
  return {
    async send(message) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html ?? renderBrandedHtml(message.subject, message.text),
          ...(replyTo ? { reply_to: replyTo } : {})
        }),
        signal: AbortSignal.timeout(10_000)
      });

      if (!response.ok) {
        logger.error(
          { status: response.status },
          "resend email delivery failed"
        );
        throw new Error(`Email delivery failed with status ${response.status}`);
      }
    }
  };
}

function renderBrandedHtml(subject: string, text: string): string {
  const paragraphs = text.split(/\n{2,}/).map((paragraph) =>
    `<p style="margin:0 0 16px;line-height:1.6">${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`
  ).join("");
  return `<!doctype html><html lang="en"><body style="margin:0;background:#090b10;color:#eef2f7;font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;padding:32px 20px"><p style="color:#67e8f9;font-size:12px;letter-spacing:.12em">GYM PROGRESS TRACKER</p><h1 style="font-size:24px">${escapeHtml(subject)}</h1><div style="color:#cbd5e1;font-size:15px">${paragraphs}</div><p style="margin-top:32px;color:#7c8799;font-size:12px">Founding Beta · invitation only · limited to 50 members</p></div></body></html>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
