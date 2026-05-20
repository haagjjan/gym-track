import type { FastifyInstance } from "fastify";
import type { Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import { getHealthReport } from "./health.service.js";

export async function registerHealthRoutes(
  server: FastifyInstance,
  db: Kysely<AppDatabase>
): Promise<void> {
  server.get("/api/v1/health", async (_request, reply) => {
    const report = await getHealthReport(db);
    const statusCode = report.status === "ok" ? 200 : 503;

    return reply.status(statusCode).send({
      data: report
    });
  });
}
