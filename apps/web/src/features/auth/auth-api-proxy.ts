import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getApiBaseUrl } from "./api-base-url";

type AuthProxyTarget = "signup" | "login" | "logout" | "me";

export async function proxyAuthRequest(
  request: NextRequest,
  target: AuthProxyTarget
): Promise<NextResponse> {
  try {
    const init: RequestInit = {
      method: request.method,
      headers: buildForwardHeaders(request),
      cache: "no-store"
    };

    if (shouldForwardBody(request.method)) {
      init.body = await request.text();
    }

    const upstream = await fetch(`${getApiBaseUrl()}/auth/${target}`, init);

    return await toProxyResponse(upstream);
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "API_UNAVAILABLE",
          message: "The API is unavailable."
        }
      },
      { status: 502 }
    );
  }
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
