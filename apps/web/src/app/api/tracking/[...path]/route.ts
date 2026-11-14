import type { NextRequest } from "next/server";
import { proxyWorkoutApiRequest } from "../../../../features/workouts/workout-api-proxy";

type Context = { params: Promise<{ path: string[] }> };
async function forward(request: NextRequest, context: Context): Promise<Response> {
  if (process.env.ENABLE_EXTENDED_TRACKING !== "true") return new Response(null, { status: 404 });
  const { path } = await context.params;
  return proxyWorkoutApiRequest(request, `tracking/${path.map(encodeURIComponent).join("/")}`);
}
export { forward as GET, forward as POST, forward as PATCH, forward as DELETE };
