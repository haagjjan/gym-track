import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../../features/workouts/workout-api-proxy";

export async function POST(request: NextRequest, context: { params: Promise<{ templateId: string }> }): Promise<Response> {
  const { templateId } = await context.params;
  return proxyWorkoutApiRequest(request, `workout-templates/${encodeURIComponent(templateId)}/start`);
}
