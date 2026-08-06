import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../../../features/workouts/workout-api-proxy";

export async function POST(request: NextRequest, context: { params: Promise<{ requestId: string }> }): Promise<Response> {
  const { requestId } = await context.params;
  return proxyWorkoutApiRequest(request, `admin/beta/requests/${encodeURIComponent(requestId)}`);
}
