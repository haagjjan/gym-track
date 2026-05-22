import type { NextRequest } from "next/server";
import { proxyAnalyticsApiRequest } from "../../../../../../features/analytics/analytics-api-proxy";

interface AnalyticsExerciseRouteContext {
  params: Promise<{
    exerciseId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: AnalyticsExerciseRouteContext
): Promise<Response> {
  const { exerciseId } = await context.params;

  return proxyAnalyticsApiRequest(
    request,
    `analytics/exercises/${encodeURIComponent(exerciseId)}/progress`
  );
}
