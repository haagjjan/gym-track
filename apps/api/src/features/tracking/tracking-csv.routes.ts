import type { FastifyInstance } from "fastify";
import { authenticateRequest } from "../auth/authenticate-request.js";
import type { AuthService } from "../auth/auth.service.js";
import type { createTrackingCsvRepository } from "./tracking-csv.repository.js";

export async function registerTrackingCsvRoutes(server: FastifyInstance, options: {
  authService: AuthService; cookieName: string; repository: ReturnType<typeof createTrackingCsvRepository>;
}): Promise<void> {
  server.get("/api/v1/tracking/export.csv", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    return reply.type("text/csv; charset=utf-8").header("content-disposition", 'attachment; filename="gym-time-cardio.csv"').send(await options.repository.exportCsv(user.id));
  });
  server.post("/api/v1/tracking/import.csv", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    if (typeof request.body !== "string") return reply.status(400).send({ error: { code: "INVALID_TRACKING_CSV", message: "Send a time/cardio CSV file." } });
    const result = await options.repository.importCsv(user.id, request.body);
    if (!result.ok) return reply.status(422).send({ error: { code: "INVALID_TRACKING_CSV", message: "The time/cardio CSV could not be imported.", details: { errors: result.errors } } });
    return reply.status(201).send({ data: { importedRows: result.importedRows, importedWorkouts: result.importedWorkouts } });
  });
}
