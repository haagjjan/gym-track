import { createHash, createPublicKey, verify, type JsonWebKey } from "node:crypto";
import { z } from "zod";

export type Provider = "apple" | "google";
export interface ProviderIdentity {
  provider: Provider;
  subject: string;
  email: string | null;
  emailVerified: boolean;
}

const providers = {
  apple: { keys: "https://appleid.apple.com/auth/keys", issuers: ["https://appleid.apple.com"] },
  google: { keys: "https://www.googleapis.com/oauth2/v3/certs", issuers: ["https://accounts.google.com", "accounts.google.com"] }
};
const headerSchema = z.object({ alg: z.literal("RS256"), kid: z.string().min(1).max(256) });
const claimsSchema = z.object({
  iss: z.string(), sub: z.string().min(1).max(255),
  aud: z.union([z.string(), z.array(z.string()).min(1)]),
  exp: z.number().finite(), iat: z.number().finite(), nonce: z.string().min(1),
  email: z.string().email().max(254).optional(),
  email_verified: z.union([z.boolean(), z.string()]).optional()
});
const keySchema = z.object({
  kty: z.literal("RSA"), kid: z.string(), n: z.string(), e: z.string(),
  alg: z.literal("RS256").optional(), use: z.literal("sig").optional()
});
const keySetSchema = z.object({ keys: z.array(z.unknown()).max(100) });

export class ProviderAuthError extends Error {
  public constructor(public readonly code: string, public readonly status = 401) {
    super(code);
  }
}

export function createProviderTokenVerifier(options: {
  audiences: Record<Provider, readonly string[]>;
  fetcher?: typeof fetch;
  now?: () => number;
}) {
  const now = options.now ?? Date.now;
  const fetcher = options.fetcher ?? fetch;
  const cache = new Map<Provider, { keys: Array<JsonWebKey & { kid: string }>; expiresAt: number }>();

  async function load(provider: Provider) {
    const response = await fetcher(providers[provider].keys, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Key set unavailable");
    const body = keySetSchema.parse(await response.json());
    const keys = body.keys.flatMap((key) => {
      const parsed = keySchema.safeParse(key);
      return parsed.success ? [parsed.data] : [];
    });
    const entry = { keys, expiresAt: now() + 60 * 60 * 1000 };
    cache.set(provider, entry);
    return entry;
  }

  return async (provider: Provider, token: string, nonce: string): Promise<ProviderIdentity> => {
    if (!options.audiences[provider].length) throw new ProviderAuthError("PROVIDER_UNAVAILABLE", 503);
    try {
      const parts = token.split(".");
      if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) throw new Error("Malformed token");
      const [encodedHeader, encodedClaims, signature] = parts as [string, string, string];
      const header = headerSchema.parse(JSON.parse(Buffer.from(encodedHeader, "base64url").toString()));
      let entry = cache.get(provider);
      if (!entry || entry.expiresAt <= now()) entry = await load(provider);
      let jwk = entry.keys.find((key) => key.kid === header.kid);
      if (!jwk) {
        entry = await load(provider);
        jwk = entry.keys.find((key) => key.kid === header.kid);
      }
      if (!jwk) throw new Error("Unknown signing key");
      const key = createPublicKey({ key: jwk, format: "jwk" });
      if (!verify("RSA-SHA256", Buffer.from(`${encodedHeader}.${encodedClaims}`), key, Buffer.from(signature, "base64url"))) {
        throw new Error("Invalid signature");
      }
      const claims = claimsSchema.parse(JSON.parse(Buffer.from(encodedClaims, "base64url").toString()));
      const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      const seconds = now() / 1000;
      const hashedNonce = createHash("sha256").update(nonce).digest("hex");
      if (!providers[provider].issuers.includes(claims.iss)
        || !audiences.some((audience) => options.audiences[provider].includes(audience))
        || claims.exp <= seconds - 60 || claims.iat > seconds + 60 || claims.exp <= claims.iat
        || (claims.nonce !== nonce && claims.nonce !== hashedNonce)) throw new Error("Invalid claims");
      return {
        provider, subject: claims.sub, email: claims.email?.toLowerCase() ?? null,
        emailVerified: !!claims.email && (claims.email_verified === true || claims.email_verified === "true")
      };
    } catch {
      throw new ProviderAuthError("INVALID_PROVIDER_TOKEN");
    }
  };
}
