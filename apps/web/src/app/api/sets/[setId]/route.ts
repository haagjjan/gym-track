import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../features/workouts/workout-api-proxy";

interface SetRouteContext {
  params: Promise<{
    setId: string;
  }>;
}

export async function PATCH(request: NextRequest, context: SetRouteContext): Promise<Response> {
  const { setId } = await context.params;

  return proxyWorkoutApiRequest(request, `sets/${encodeURIComponent(setId)}`);
}

export async function DELETE(request: NextRequest, context: SetRouteContext): Promise<Response> {
  const { setId } = await context.params;

  return proxyWorkoutApiRequest(request, `sets/${encodeURIComponent(setId)}`);
}
