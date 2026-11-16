import { createHash } from "node:crypto";

interface LimiterOptions {
  max: number;
  windowMs: number;
  maxKeys?: number;
  now?: () => number;
}

export function identifierKey(identifier: string): string {
  return createHash("sha256").update(identifier.trim().toLowerCase()).digest("hex");
}

/** Fixed windows per process; insertion order bounds memory without storing identifiers. */
export function createIdentifierLimiter(options: LimiterOptions) {
  const entries = new Map<string, { attempts: number; expiresAt: number }>();
  const now = options.now ?? Date.now;
  const maxKeys = options.maxKeys ?? 50_000;
  if (options.max < 1 || options.windowMs <= 0 || maxKeys < 1) {
    throw new RangeError("Limiter bounds must be positive.");
  }

  return {
    consume(identifier: string): { allowed: boolean; retryAfterSeconds: number } {
      const key = identifierKey(identifier);
      const time = now();
      let entry = entries.get(key);
      if (!entry || entry.expiresAt <= time) {
        entries.delete(key);
        if (entries.size >= maxKeys) {
          entries.delete(entries.keys().next().value!);
        }
        entry = { attempts: 0, expiresAt: time + options.windowMs };
        entries.set(key, entry);
      }
      const allowed = entry.attempts < options.max;
      if (allowed) entry.attempts += 1;
      return { allowed, retryAfterSeconds: Math.ceil((entry.expiresAt - time) / 1000) };
    }
  };
}
