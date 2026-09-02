import type { FastifyInstance } from "fastify";
import type { StatusService } from "./status.service.js";

export async function registerStatusRoutes(
  server: FastifyInstance,
  service: StatusService
): Promise<void> {
  server.get("/api/v1/status-metrics", async (_request, reply) => {
    reply.header("cache-control", "no-store");

    return reply.send({
      data: await service.getPublicMetrics()
    });
  });
}
