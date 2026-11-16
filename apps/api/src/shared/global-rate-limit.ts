import type { FastifyInstance } from "fastify";
import { trustedClientKey } from "./client-attribution.js";
import { createRateLimitResponse } from "./rate-limit-response.js";

/** Independent of route overrides: all traffic retains the aggregate address ceiling. */
export function registerGlobalRateLimits(
  server: FastifyInstance,
  cookieName: string,
  clientIpSecret?: string
): void {
  const options = {
    timeWindow: "1 minute",
    keyGenerator: (request: Parameters<typeof trustedClientKey>[0]) => trustedClientKey(request, clientIpSecret)
  };
  const global = server.createRateLimit({ ...options, max: 300 });
  const anonymous = server.createRateLimit({ ...options, max: 120 });

  server.addHook("onRequest", async (request, reply) => {
    const path = request.url.split("?", 1)[0];
    const credentialless = !request.cookies[cookieName] && request.headers.authorization === undefined;
    const exempt = path === "/api/v1/health" || path === "/api/v1/status-metrics";
    const limits = [global];
    if (credentialless && !exempt) limits.push(anonymous);
    for (const limit of limits) {
      const result = await limit(request);
      if (!result.isAllowed && result.isExceeded) {
        return reply.header("retry-after", result.ttlInSeconds).status(429).send(
          createRateLimitResponse({ statusCode: 429, after: `${result.ttlInSeconds} seconds` })
        );
      }
    }
  });
}
