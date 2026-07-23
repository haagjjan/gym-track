import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../../features/workouts/workout-api-proxy";

interface ExerciseMergeRouteContext {
  params: Promise<{
    exerciseId: string;
  }>;
}

export async function POST(
  request: NextRequest,
  context: ExerciseMergeRouteContext
): Promise<Response> {
  const { exerciseId } = await context.params;

  return proxyWorkoutApiRequest(request, `exercises/${encodeURIComponent(exerciseId)}/merge`);
}
