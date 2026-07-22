export interface MailMessage {
  to: string;
  subject: string;
  text: string;
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
    return createResendMailer(env.RESEND_API_KEY, env.EMAIL_FROM, logger);
  }

  if (env.NODE_ENV === "production") {
    logger.warn(
      {},
      "No RESEND_API_KEY configured in production — auth emails are only logged."
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
  logger: AppLoggerLike
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
          text: message.text
        })
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
