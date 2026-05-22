import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../features/workouts/workout-api-proxy";

interface WorkoutRouteContext {
  params: Promise<{
    workoutId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: WorkoutRouteContext
): Promise<Response> {
  const { workoutId } = await context.params;

  return proxyWorkoutApiRequest(request, `workouts/${encodeURIComponent(workoutId)}`);
}
