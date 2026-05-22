import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getApiBaseUrl } from "../../shared/api-base-url";

export async function proxyAnalyticsApiRequest(
  request: NextRequest,
  targetPath: string
): Promise<NextResponse> {
  try {
    const upstream = await fetch(buildApiUrl(request, targetPath), {
      method: request.method,
      headers: buildForwardHeaders(request),
      cache: "no-store"
    });

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
