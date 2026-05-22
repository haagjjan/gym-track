import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../../../features/workouts/workout-api-proxy";

interface SessionExerciseRouteContext {
  params: Promise<{
    workoutId: string;
    sessionExerciseId: string;
  }>;
}

export async function DELETE(
  request: NextRequest,
  context: SessionExerciseRouteContext
): Promise<Response> {
  const { workoutId, sessionExerciseId } = await context.params;

  return proxyWorkoutApiRequest(
    request,
    `workouts/${encodeURIComponent(workoutId)}/exercises/${encodeURIComponent(sessionExerciseId)}`
  );
}
