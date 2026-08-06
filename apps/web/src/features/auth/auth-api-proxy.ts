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

type AuthProxyTarget =
  | "signup"
  | "login"
  | "logout"
  | "me"
  | "verify-email"
  | "resend-verification"
  | "forgot-password"
  | "reset-password";

export async function proxyAuthRequest(
  request: NextRequest,
  target: AuthProxyTarget
): Promise<NextResponse> {
  const logContext = createBffRequestContext(request, `auth/${target}`);
  try {
    const init: RequestInit = {
      method: request.method,
      headers: buildForwardHeaders(request),
      cache: "no-store"
    };
    forwardBffRequestId(init.headers as Headers, logContext);

    if (shouldForwardBody(request.method)) {
      init.body = await request.text();
    }

    const upstream = await fetch(`${getApiBaseUrl()}/auth/${target}`, init);

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

function buildForwardHeaders(request: NextRequest): Headers {
  const headers = new Headers({
    accept: "application/json"
  });
  const contentType = request.headers.get("content-type");
  const cookie = request.headers.get("cookie");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (cookie) {
    headers.set("cookie", cookie);
  }

  addBffClientAttribution(request, headers);

  return headers;
}

function shouldForwardBody(method: string): boolean {
  return method !== "GET" && method !== "HEAD";
}

async function toProxyResponse(upstream: Response): Promise<NextResponse> {
  const body = await upstream.text();
  const responseHeaders = new Headers();
  const contentType = upstream.headers.get("content-type");
  const setCookie = upstream.headers.get("set-cookie");

  if (contentType) {
    responseHeaders.set("content-type", contentType);
  }

  if (setCookie) {
    responseHeaders.set("set-cookie", setCookie);
  }

  return new NextResponse(body, {
    status: upstream.status,
    headers: responseHeaders
  });
}
