import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../features/workouts/workout-api-proxy";

export async function GET(request: NextRequest): Promise<Response> {
  return proxyWorkoutApiRequest(request, "admin/campaigns");
}

export async function POST(request: NextRequest): Promise<Response> {
  return proxyWorkoutApiRequest(request, "admin/campaigns");
}
