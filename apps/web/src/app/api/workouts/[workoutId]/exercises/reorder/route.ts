import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../../../features/workouts/workout-api-proxy";

interface ReorderExercisesRouteContext {
  params: Promise<{
    workoutId: string;
  }>;
}

export async function PATCH(
  request: NextRequest,
  context: ReorderExercisesRouteContext
): Promise<Response> {
  const { workoutId } = await context.params;

  return proxyWorkoutApiRequest(
    request,
    `workouts/${encodeURIComponent(workoutId)}/exercises/reorder`
  );
}
