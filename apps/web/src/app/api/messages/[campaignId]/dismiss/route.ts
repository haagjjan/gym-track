import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../../features/workouts/workout-api-proxy";

export async function POST(request: NextRequest, context: { params: Promise<{ campaignId: string }> }): Promise<Response> {
  const { campaignId } = await context.params;
  return proxyWorkoutApiRequest(request, `messages/${encodeURIComponent(campaignId)}/dismiss`);
}
