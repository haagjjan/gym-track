import { randomBytes } from "node:crypto";

/** Process-local, bounded and single use; all attempts must return to the issuing process. */
export function createProviderNonceStore(options: { now?: () => number; maxKeys?: number } = {}) {
  const entries = new Map<string, number>();
  const now = options.now ?? Date.now;
  const maxKeys = options.maxKeys ?? 50_000;
  if (maxKeys < 1) throw new RangeError("Nonce capacity must be positive.");
  return {
    issue(): string {
      if (entries.size >= maxKeys) entries.delete(entries.keys().next().value!);
      const nonce = randomBytes(32).toString("base64url");
      entries.set(nonce, now() + 10 * 60 * 1000);
      return nonce;
    },
    consume(nonce: string): boolean {
      const expiresAt = entries.get(nonce);
      entries.delete(nonce);
      return expiresAt !== undefined && expiresAt > now();
    }
  };
}
