import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getApiBaseUrl } from "../../shared/api-base-url";

export async function proxyWorkoutApiRequest(
  request: NextRequest,
  targetPath: string
): Promise<NextResponse> {
  try {
    const init: RequestInit = {
      method: request.method,
      headers: buildForwardHeaders(request),
      cache: "no-store"
    };
    const body = await getRequestBody(request);

    if (body !== undefined) {
      init.body = body;
    }

    const upstream = await fetch(buildApiUrl(request, targetPath), init);

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
  const headers = new Headers();
  const accept = request.headers.get("accept");
  const contentType = request.headers.get("content-type");
  const cookie = request.headers.get("cookie");

  headers.set("accept", accept ?? "application/json");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (cookie) {
    headers.set("cookie", cookie);
  }

  return headers;
}

async function getRequestBody(request: NextRequest): Promise<string | undefined> {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const body = await request.text();

  return body.length > 0 ? body : undefined;
}

async function toProxyResponse(upstream: Response): Promise<NextResponse> {
  const body = await upstream.text();
  const responseHeaders = new Headers();
  const contentType = upstream.headers.get("content-type");
  const contentDisposition = upstream.headers.get("content-disposition");

  if (contentType) {
    responseHeaders.set("content-type", contentType);
  }

  if (contentDisposition) {
    responseHeaders.set("content-disposition", contentDisposition);
  }

  return new NextResponse(body, {
    status: upstream.status,
    headers: responseHeaders
  });
}
