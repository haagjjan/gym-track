import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../../../../features/workouts/workout-api-proxy";

interface SessionExerciseSetsRouteContext {
  params: Promise<{
    workoutId: string;
    sessionExerciseId: string;
  }>;
}

export async function POST(
  request: NextRequest,
  context: SessionExerciseSetsRouteContext
): Promise<Response> {
  const { workoutId, sessionExerciseId } = await context.params;

  return proxyWorkoutApiRequest(
    request,
    `workouts/${encodeURIComponent(workoutId)}/exercises/${encodeURIComponent(
      sessionExerciseId
    )}/sets`
  );
}
