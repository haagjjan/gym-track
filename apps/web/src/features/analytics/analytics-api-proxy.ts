import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getApiBaseUrl } from "../../shared/api-base-url";
import {
  createBffRequestContext,
  finalizeBffResponse,
  forwardBffRequestId,
  logBffFailure
} from "../../shared/server-logging";
import { addBffClientAttribution } from "../../shared/bff-client-attribution";

export async function proxyAnalyticsApiRequest(
  request: NextRequest,
  targetPath: string
): Promise<NextResponse> {
  const logContext = createBffRequestContext(request, targetPath);
  try {
    const headers = buildForwardHeaders(request);
    forwardBffRequestId(headers, logContext);
    const upstream = await fetch(buildApiUrl(request, targetPath), {
      method: request.method,
      headers,
      cache: "no-store"
    });

    return finalizeBffResponse(logContext, await toProxyResponse(upstream));
  } catch (error) {
    logBffFailure(logContext, { statusCode: 502, errorCode: "API_UNAVAILABLE", error });
    return finalizeUnavailableResponse(logContext.requestId, NextResponse.json(
      {
        error: {
          code: "API_UNAVAILABLE",
          message: "The API is unavailable."
        }
      },
      { status: 502 }
    ));
  }
}

function finalizeUnavailableResponse(requestId: string, response: NextResponse): NextResponse {
  response.headers.set("x-request-id", requestId);
  return response;
}

function buildApiUrl(request: NextRequest, targetPath: string): string {
  const path = targetPath.replace(/^\/+/, "");

  return `${getApiBaseUrl()}/${path}${request.nextUrl.search}`;
}

function buildForwardHeaders(request: NextRequest): Headers {
  const headers = new Headers({
    accept: "application/json"
  });
  const cookie = request.headers.get("cookie");

  if (cookie) {
    headers.set("cookie", cookie);
  }

  addBffClientAttribution(request, headers);

  return headers;
}

async function toProxyResponse(upstream: Response): Promise<NextResponse> {
  const body = await upstream.text();
  const responseHeaders = new Headers();
  const contentType = upstream.headers.get("content-type");

  if (contentType) {
    responseHeaders.set("content-type", contentType);
  }

  return new NextResponse(body, {
    status: upstream.status,
    headers: responseHeaders
  });
}
