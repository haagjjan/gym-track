import { createHmac } from "node:crypto";
import { isIP } from "node:net";

const CLIENT_IP_HEADER = "x-gym-client-ip";
const CLIENT_SIGNATURE_HEADER = "x-gym-client-signature";
type HeaderRequest = { headers: { get(name: string): string | null } };

export function addBffClientAttribution(request: HeaderRequest, headers: Headers): void {
  const secret = process.env.BFF_CLIENT_IP_SECRET;
  const clientIp = readTrustedEdgeIp(request);
  if (!secret || secret.length < 32 || !clientIp) return;
  headers.set(CLIENT_IP_HEADER, clientIp);
  headers.set(CLIENT_SIGNATURE_HEADER, createHmac("sha256", secret).update(clientIp).digest("base64url"));
}

function readTrustedEdgeIp(request: HeaderRequest): string | null {
  const candidate = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",").at(-1)
    ?? request.headers.get("x-real-ip");
  const normalized = candidate?.trim();
  return normalized && isIP(normalized) ? normalized : null;
}
