import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../features/workouts/workout-api-proxy";

export async function PATCH(request: NextRequest, context: { params: Promise<{ exerciseId: string }> }): Promise<Response> {
  const { exerciseId } = await context.params;
  return proxyWorkoutApiRequest(request, `exercises/${encodeURIComponent(exerciseId)}`);
}
