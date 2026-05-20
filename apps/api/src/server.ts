import fastify, { type FastifyInstance } from "fastify";
import type { Kysely } from "kysely";
import type { AppDatabase } from "./db/database.js";
import { registerHealthRoutes } from "./features/health/health.routes.js";

export async function buildServer(db: Kysely<AppDatabase>): Promise<FastifyInstance> {
  const server = fastify({
    logger: true
  });

  await registerHealthRoutes(server, db);

  return server;
}
