import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { FastifyRequest } from "fastify";

export function trustedClientKey(request: FastifyRequest, secret: string | undefined): string {
  return verifiedClientIp(request, secret) ?? request.ip;
}

export function verifiedClientIp(request: FastifyRequest, secret: string | undefined): string | null {
  if (!secret || secret.length < 32) return null;
  const ip = singleHeader(request.headers["x-gym-client-ip"]);
  const supplied = singleHeader(request.headers["x-gym-client-signature"]);
  if (!ip || !isIP(ip) || !supplied) return null;
  const expected = createHmac("sha256", secret).update(ip).digest("base64url");
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer)
    ? ip
    : null;
}

function singleHeader(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value.trim() : null;
}
