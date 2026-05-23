import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../features/workouts/workout-api-proxy";

export async function POST(request: NextRequest): Promise<Response> {
  return proxyWorkoutApiRequest(request, "workouts/import.csv");
}
