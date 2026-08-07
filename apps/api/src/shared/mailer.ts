export interface MailMessage {
  kind: MailKind;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export type MailKind =
  | "INVITATION"
  | "EMAIL_VERIFICATION"
  | "PASSWORD_RESET"
  | "DELETION_SCHEDULED"
  | "DELETION_CANCELLED"
  | "DELETION_CANCELLED_BY_SUPPORT"
  | "DELETION_COMPLETED";

export interface MailDeliveryResult {
  messageId?: string | undefined;
  provider: "log" | "resend";
}

export interface Mailer {
  send(message: MailMessage): Promise<MailDeliveryResult>;
}

export interface MailDeliveryObserver {
  record(kind: MailKind, outcome: "FAILED" | "SENT", durationSeconds: number): void;
}

export class MailDeliveryError extends Error {
  public readonly statusCode: number | null;

  public constructor(message: string, statusCode: number | null = null) {
    super(message);
    this.name = "MailDeliveryError";
    this.statusCode = statusCode;
  }
}

/** Structural subset of FastifyBaseLogger so services stay framework-agnostic. */
export interface AppLoggerLike {
  info(payload: unknown, message?: string): void;
  warn(payload: unknown, message?: string): void;
  error(payload: unknown, message?: string): void;
}

interface MailerEnv {
  APP_ENV: string;
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
export function createMailerFromEnv(
  env: MailerEnv,
  logger: AppLoggerLike,
  observer?: MailDeliveryObserver
): Mailer {
  if (env.RESEND_API_KEY) {
    return createResendMailer(env.RESEND_API_KEY, env.EMAIL_FROM, logger, env.EMAIL_REPLY_TO, observer);
  }

  if (env.NODE_ENV === "production" && !["local", "private-lan"].includes(env.APP_ENV)) {
    throw new Error("RESEND_API_KEY is required for public production email delivery.");
  }

  return createLogMailer(logger);
}

export function createLogMailer(logger: AppLoggerLike, includeContent = true): Mailer {
  return {
    async send(message) {
      if (!includeContent) {
        logger.warn({}, "auth email not delivered because no provider is configured");
        throw new MailDeliveryError("Email delivery is unavailable.");
      }

      logger.info(
        { kind: message.kind, to: message.to, subject: message.subject, body: message.text },
        "auth email (log transport)"
      );
      return { provider: "log" };
    }
  };
}

export function createResendMailer(
  apiKey: string,
  from: string,
  logger: AppLoggerLike,
  replyTo?: string,
  observer?: MailDeliveryObserver
): Mailer {
  return {
    async send(message) {
      const startedAt = performance.now();
      try {
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
          throw new MailDeliveryError(
            `Email delivery failed with status ${response.status}`,
            response.status
          );
        }

        const result = await readProviderResult(response);
        observer?.record(message.kind, "SENT", elapsedSeconds(startedAt));
        logger.info(
          { kind: message.kind, messageId: result.messageId, status: response.status },
          "resend email accepted"
        );
        return { provider: "resend", ...result };
      } catch (error) {
        const deliveryError = error instanceof MailDeliveryError
          ? error
          : new MailDeliveryError("Email delivery failed before provider acceptance.");
        observer?.record(message.kind, "FAILED", elapsedSeconds(startedAt));
        logger.error(
          { kind: message.kind, status: deliveryError.statusCode },
          "resend email delivery failed"
        );
        throw deliveryError;
      }
    }
  };
}

async function readProviderResult(response: Response): Promise<{ messageId?: string }> {
  try {
    const body = await response.json() as { id?: unknown };
    return typeof body.id === "string" ? { messageId: body.id } : {};
  } catch {
    return {};
  }
}

function elapsedSeconds(startedAt: number): number {
  return Math.max(performance.now() - startedAt, 0) / 1_000;
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
