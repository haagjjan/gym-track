import type { FastifyInstance } from "fastify";
import type { DatabaseHealthCheck } from "../../db/database-health.js";
import { getHealthReport } from "./health.service.js";

export async function registerHealthRoutes(
  server: FastifyInstance,
  databaseHealth: DatabaseHealthCheck
): Promise<void> {
  server.get("/api/v1/health", async (_request, reply) => {
    const report = await getHealthReport(databaseHealth);
    const statusCode = report.status === "ok" ? 200 : 503;

    return reply.status(statusCode).send({
      data: report
    });
  });
}
