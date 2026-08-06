import "dotenv/config";
import { createDatabase } from "./db/database.js";
import { readEnv } from "./shared/env.js";
import { createApiLogger } from "./shared/logger.js";
import { buildServer } from "./server.js";
import { createTelegramOperatorNotifier } from "./shared/operator-notifier.js";

const env = readEnv();
const db = createDatabase(env.DATABASE_URL);
const server = await buildServer(
  db,
  {
    cookieName: env.AUTH_COOKIE_NAME,
    cookieSecure: env.AUTH_COOKIE_SECURE,
    registrationMode: env.REGISTRATION_MODE,
    sessionTtlDays: env.AUTH_SESSION_TTL_DAYS
  },
  createApiLogger({
    level: env.LOG_LEVEL,
    nodeEnv: env.NODE_ENV,
    environment: env.APP_ENV,
    version: env.APP_RELEASE
  }),
  {
    appBaseUrl: env.APP_BASE_URL,
    ...(env.BFF_CLIENT_IP_SECRET ? { clientIpSecret: env.BFF_CLIENT_IP_SECRET } : {}),
    ...(env.SUPPORT_EMAIL ? { supportEmail: env.SUPPORT_EMAIL } : {}),
    trustProxy: env.API_TRUST_PROXY,
    ...(env.METRICS_ENABLED
      ? {
          metrics: {
            environment: env.APP_ENV,
            release: env.APP_RELEASE
          }
        }
      : {}),
    mailerEnv: {
      RESEND_API_KEY: env.RESEND_API_KEY,
      EMAIL_FROM: env.EMAIL_FROM,
      EMAIL_REPLY_TO: env.SUPPORT_EMAIL,
      NODE_ENV: env.NODE_ENV
    },
    ...(env.TELEGRAM_BETA_BOT_TOKEN && env.TELEGRAM_BETA_CHAT_ID
      ? { operatorNotifier: createTelegramOperatorNotifier({
          botToken: env.TELEGRAM_BETA_BOT_TOKEN,
          chatId: env.TELEGRAM_BETA_CHAT_ID
        }) }
      : {})
  }
);

async function shutdown(): Promise<void> {
  await server.close();
  await db.destroy();
}

process.on("SIGINT", () => {
  void shutdown().then(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void shutdown().then(() => process.exit(0));
});

await server.listen({
  host: env.API_HOST,
  port: env.API_PORT
});
