import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../../../features/workouts/workout-api-proxy";

export async function GET(request: NextRequest, context: { params: Promise<{ campaignId: string }> }): Promise<Response> {
  const { campaignId } = await context.params;
  return proxyWorkoutApiRequest(request, `admin/campaigns/${encodeURIComponent(campaignId)}/responses`);
}
