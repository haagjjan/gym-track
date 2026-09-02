import type { NextRequest } from "next/server";
import { proxyPublicStatus } from "../../../features/status/public-status-proxy";

export async function GET(request: NextRequest): Promise<Response> {
  return proxyPublicStatus(request);
}
