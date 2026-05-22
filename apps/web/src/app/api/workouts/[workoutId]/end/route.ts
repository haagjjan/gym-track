import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../../features/workouts/workout-api-proxy";

interface EndWorkoutRouteContext {
  params: Promise<{
    workoutId: string;
  }>;
}

export async function POST(
  request: NextRequest,
  context: EndWorkoutRouteContext
): Promise<Response> {
  const { workoutId } = await context.params;

  return proxyWorkoutApiRequest(request, `workouts/${encodeURIComponent(workoutId)}/end`);
}
