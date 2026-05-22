import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../../features/workouts/workout-api-proxy";

interface WorkoutExercisesRouteContext {
  params: Promise<{
    workoutId: string;
  }>;
}

export async function POST(
  request: NextRequest,
  context: WorkoutExercisesRouteContext
): Promise<Response> {
  const { workoutId } = await context.params;

  return proxyWorkoutApiRequest(request, `workouts/${encodeURIComponent(workoutId)}/exercises`);
}
