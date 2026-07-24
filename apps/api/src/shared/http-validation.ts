import type { FastifyReply } from "fastify";
import type { ZodError } from "zod";

export function sendValidationError(
  reply: FastifyReply,
  error: ZodError,
  fallbackField = "body"
) {
  return reply.status(422).send({
    error: {
      code: "VALIDATION_ERROR",
      message: "One or more fields are invalid.",
      fields: toFieldErrors(error, fallbackField)
    }
  });
}

function toFieldErrors(error: ZodError, fallbackField: string): Record<string, string[]> {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? fallbackField);
    fields[key] = [...(fields[key] ?? []), issue.message];
  }

  return fields;
}
