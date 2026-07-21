import type { FastifyInstance } from "fastify";
import { authenticateRequest } from "../auth/authenticate-request.js";
import type { AuthService } from "../auth/auth.service.js";
import { updateUserPreferencesSchema } from "./user-preferences.schemas.js";
import type { UserPreferencesService } from "./user-preferences.service.js";

export async function registerUserPreferencesRoutes(
  server: FastifyInstance,
  options: { authService: AuthService; cookieName: string; service: UserPreferencesService }
): Promise<void> {
  server.get("/api/v1/users/me/preferences", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    const preferences = await options.service.get(user.id);
    return preferences
      ? reply.send({ data: { preferences } })
      : reply.status(404).send({ error: { code: "USER_NOT_FOUND", message: "User was not found." } });
  });

  server.patch("/api/v1/users/me/preferences", async (request, reply) => {
    const user = await authenticateRequest(request, reply, options);
    if (!user) return;
    const input = updateUserPreferencesSchema.safeParse(request.body);
    if (!input.success) {
      return reply.status(422).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Volume heat ceiling must be a whole number from 5 to 50.",
          fields: { volumeHeatCeiling: input.error.issues.map((issue) => issue.message) }
        }
      });
    }
    const preferences = await options.service.update(user.id, input.data);
    return preferences
      ? reply.send({ data: { preferences } })
      : reply.status(404).send({ error: { code: "USER_NOT_FOUND", message: "User was not found." } });
  });
}
