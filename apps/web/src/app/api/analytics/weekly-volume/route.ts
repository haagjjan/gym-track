import type { NextRequest } from "next/server";
import { proxyAnalyticsApiRequest } from "../../../../features/analytics/analytics-api-proxy";

export async function GET(request: NextRequest): Promise<Response> {
  return proxyAnalyticsApiRequest(request, "analytics/weekly-volume");
}
