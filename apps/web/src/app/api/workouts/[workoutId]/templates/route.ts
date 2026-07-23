import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../../features/workouts/workout-api-proxy";

export async function POST(request: NextRequest, context: { params: Promise<{ workoutId: string }> }): Promise<Response> {
  const { workoutId } = await context.params;
  return proxyWorkoutApiRequest(request, `workouts/${encodeURIComponent(workoutId)}/templates`);
}
