import "dotenv/config";
import { createDatabase } from "./db/database.js";
import { readEnv } from "./shared/env.js";
import { createApiLogger } from "./shared/logger.js";
import { buildServer } from "./server.js";

const env = readEnv();
const db = createDatabase(env.DATABASE_URL);
const server = await buildServer(
  db,
  {
    cookieName: env.AUTH_COOKIE_NAME,
    cookieSecure: env.AUTH_COOKIE_SECURE,
    sessionTtlDays: env.AUTH_SESSION_TTL_DAYS
  },
  createApiLogger({
    level: env.LOG_LEVEL,
    nodeEnv: env.NODE_ENV
  })
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
