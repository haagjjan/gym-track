import { createHash, randomBytes } from "node:crypto";

export interface SessionTokenPair {
  rawToken: string;
  tokenHash: string;
}

export interface SessionTokenGenerator {
  create(): SessionTokenPair;
  hash(rawToken: string): string;
}

export const cryptoSessionTokenGenerator: SessionTokenGenerator = {
  create() {
    const rawToken = randomBytes(32).toString("base64url");

    return {
      rawToken,
      tokenHash: hashSessionToken(rawToken)
    };
  },
  hash(rawToken) {
    return hashSessionToken(rawToken);
  }
};

function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
