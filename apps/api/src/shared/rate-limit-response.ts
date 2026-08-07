export interface RateLimitResponseContext {
  after: string;
  statusCode: number;
}

interface RateLimitResponse {
  error: {
    code: "RATE_LIMITED";
    message: string;
  };
  readonly statusCode: number;
}

/**
 * Fastify reads `statusCode` from the thrown value, while the API response
 * keeps the public error envelope free of transport-only metadata.
 */
export function createRateLimitResponse(context: RateLimitResponseContext): RateLimitResponse {
  const response = {
    error: {
      code: "RATE_LIMITED" as const,
      message: `Too many requests. Try again in ${context.after}.`
    }
  } as RateLimitResponse;

  Object.defineProperty(response, "statusCode", {
    enumerable: false,
    value: context.statusCode
  });

  return response;
}
