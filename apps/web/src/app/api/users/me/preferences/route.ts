import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../../features/workouts/workout-api-proxy";

export async function GET(request: NextRequest): Promise<Response> {
  return proxyWorkoutApiRequest(request, "users/me/preferences");
}

export async function PATCH(request: NextRequest): Promise<Response> {
  return proxyWorkoutApiRequest(request, "users/me/preferences");
}
