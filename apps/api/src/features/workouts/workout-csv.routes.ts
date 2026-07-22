import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { noopEventTracker, type EventTracker } from "../../shared/events.js";
import { authenticateRequest } from "../auth/authenticate-request.js";
import type { AuthService } from "../auth/auth.service.js";
import type { WorkoutCsvError } from "./workout-csv.js";
import type { WorkoutCsvService } from "./workout-csv.service.js";

interface WorkoutCsvRouteOptions {
  authService: AuthService;
  cookieName: string;
  csvService: WorkoutCsvService;
  events?: EventTracker;
}

export async function registerWorkoutCsvRoutes(
  server: FastifyInstance,
  options: WorkoutCsvRouteOptions
): Promise<void> {
  const events = options.events ?? noopEventTracker;
  const importQuerySchema = z.object({
    confirmNameWarnings: z.coerce.boolean().optional().default(false)
  });

  server.addContentTypeParser(
    ["text/csv", "application/csv"],
    { parseAs: "string" },
    (_request, body, done) => done(null, body)
  );

  server.get("/api/v1/workouts/export.csv", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

    if (!user) {
      return;
    }

    const csv = await options.csvService.exportCsv(user.id);

    return reply
      .type("text/csv; charset=utf-8")
      .header("content-disposition", 'attachment; filename="gym-workouts.csv"')
      .send(csv);
  });

  server.post("/api/v1/workouts/import.csv", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

    if (!user) {
      return;
    }

    const parsedQuery = importQuerySchema.safeParse(request.query);

    if (!parsedQuery.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_IMPORT_OPTIONS",
          message: "CSV import options are invalid."
        }
      });
    }

    if (typeof request.body !== "string") {
      return reply.status(400).send({
        error: {
          code: "INVALID_CSV",
          message: "CSV upload must use text/csv content."
        }
      });
    }

    const result = await options.csvService.importCsv(
      user.id,
      request.body,
      parsedQuery.data.confirmNameWarnings
    );

    if (!result.ok) {
      return reply.status(422).send({
        error: {
          code: "CSV_VALIDATION_ERROR",
          message: "CSV could not be imported.",
          fields: toRowErrors(result.errors),
          details: result.preview ? { preview: result.preview } : undefined
        }
      });
    }

    events.track("csv_imported", user.id, {
      importedWorkouts: result.value.importedWorkouts,
      importedRows: result.value.importedRows
    });

    return reply.status(201).send({
      data: result.value
    });
  });

  server.post("/api/v1/workouts/import.csv/preview", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);

    if (!user) {
      return;
    }

    if (typeof request.body !== "string") {
      return reply.status(400).send({
        error: {
          code: "INVALID_CSV",
          message: "CSV upload must use text/csv content."
        }
      });
    }

    const result = await options.csvService.previewImport(user.id, request.body);

    if (!result.ok) {
      return reply.status(422).send({
        error: {
          code: "CSV_VALIDATION_ERROR",
          message: "CSV could not be previewed.",
          fields: toRowErrors(result.errors)
        }
      });
    }

    return reply.send({
      data: {
        preview: result.value
      }
    });
  });
}

function toRowErrors(errors: WorkoutCsvError[]): Record<string, string[]> {
  const fields: Record<string, string[]> = {};

  for (const error of errors) {
    const key = `row ${error.row}`;
    fields[key] = [...(fields[key] ?? []), `${error.field}: ${error.message}`];
  }

  return fields;
}
