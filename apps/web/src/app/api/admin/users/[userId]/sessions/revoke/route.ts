import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../../../../features/workouts/workout-api-proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<Response> {
  const { userId } = await params;
  return proxyWorkoutApiRequest(request, `admin/users/${encodeURIComponent(userId)}/sessions/revoke`);
}
