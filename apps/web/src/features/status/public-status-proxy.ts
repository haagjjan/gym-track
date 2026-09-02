import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { addBffClientAttribution } from "../../shared/bff-client-attribution";
import { getApiBaseUrl } from "../../shared/api-base-url";
import {
  createBffRequestContext,
  finalizeBffResponse,
  forwardBffRequestId,
  logBffFailure
} from "../../shared/server-logging";

export const STATUS_PAGE_ORIGIN = "https://status.gymtrack.ch";

export async function proxyPublicStatus(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get("origin");

  if (origin && origin !== STATUS_PAGE_ORIGIN) {
    return statusResponse({
      error: { code: "CORS_NOT_ALLOWED", message: "This origin cannot read status metrics." }
    }, 403, null);
  }

  const logContext = createBffRequestContext(request, "public-status");

  try {
    const headers = new Headers({ accept: "application/json" });
    addBffClientAttribution(request, headers);
    forwardBffRequestId(headers, logContext);
    const upstream = await fetch(`${getApiBaseUrl()}/status-metrics`, {
      method: "GET",
      headers,
      cache: "no-store"
    });
    const response = new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" }
    });

    applyPublicHeaders(response, origin);
    return finalizeBffResponse(logContext, response);
  } catch (error) {
    logBffFailure(logContext, { statusCode: 502, errorCode: "API_UNAVAILABLE", error });
    const response = statusResponse({
      error: { code: "API_UNAVAILABLE", message: "Live project metrics are unavailable." }
    }, 502, origin);

    response.headers.set("x-request-id", logContext.requestId);
    return response;
  }
}

function statusResponse(body: object, status: number, origin: string | null): NextResponse {
  const response = NextResponse.json(body, { status });
  applyPublicHeaders(response, origin);
  return response;
}

function applyPublicHeaders(response: NextResponse, origin: string | null): void {
  response.headers.set("cache-control", "no-store");
  response.headers.set("vary", "Origin");

  if (origin === STATUS_PAGE_ORIGIN) {
    response.headers.set("access-control-allow-origin", STATUS_PAGE_ORIGIN);
  }
}
