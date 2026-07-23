import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../features/workouts/workout-api-proxy";

interface Context { params: Promise<{ templateId: string }> }

async function proxy(request: NextRequest, context: Context): Promise<Response> {
  const { templateId } = await context.params;
  return proxyWorkoutApiRequest(request, `workout-templates/${encodeURIComponent(templateId)}`);
}

export const GET = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
