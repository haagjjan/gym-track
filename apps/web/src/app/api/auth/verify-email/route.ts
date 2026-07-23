import type { NextRequest } from "next/server";
import { proxyAuthRequest } from "../../../../features/auth/auth-api-proxy";

export async function POST(request: NextRequest): Promise<Response> {
  return proxyAuthRequest(request, "verify-email");
}
