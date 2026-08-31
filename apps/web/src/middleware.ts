import { type NextRequest, NextResponse } from "next/server";
import {
  canonicalRedirectTarget,
  evaluateRequestSecurity,
  readWebSecurityConfig,
  securityHeaders,
  type WebSecurityConfig
} from "./request-security";

export function middleware(request: NextRequest): NextResponse {
  let securityConfig: WebSecurityConfig;

  try {
    securityConfig = readWebSecurityConfig();
  } catch {
    return securedJson(
      {
        error: {
          code: "WEB_SECURITY_MISCONFIGURED",
          message: "The application security configuration is unavailable."
        }
      },
      503
    );
  }

  // The bare domain and its `www.` variant are bounced to the canonical origin
  // before the host guard runs, so visitors who type `gymtrack.ch` land on the
  // app instead of on an "untrusted host" error.
  const redirectTarget = canonicalRedirectTarget(
    {
      host: request.headers.get("host"),
      pathAndQuery: `${request.nextUrl.pathname}${request.nextUrl.search}`
    },
    securityConfig
  );

  if (redirectTarget) {
    const redirect = NextResponse.redirect(redirectTarget, 308);
    applySecurityHeaders(redirect, securityConfig, request.headers.get("host"));
    return redirect;
  }

  const rejection = evaluateRequestSecurity(
    {
      host: request.headers.get("host"),
      method: request.method,
      origin: request.headers.get("origin"),
      pathname: request.nextUrl.pathname,
      secFetchSite: request.headers.get("sec-fetch-site")
    },
    securityConfig
  );

  if (rejection) {
    return securedJson(
      { error: { code: rejection.code, message: rejection.message } },
      rejection.status,
      securityConfig,
      request.headers.get("host")
    );
  }

  const response = NextResponse.next();
  applySecurityHeaders(response, securityConfig, request.headers.get("host"));
  return response;
}

function securedJson(
  body: object,
  status: number,
  config?: WebSecurityConfig,
  host: string | null = null
): NextResponse {
  const response = NextResponse.json(body, { status });

  if (config) {
    applySecurityHeaders(response, config, host);
  }

  return response;
}

function applySecurityHeaders(
  response: NextResponse,
  config: WebSecurityConfig,
  host: string | null
): void {
  for (const [name, value] of Object.entries(securityHeaders(config, host))) {
    response.headers.set(name, value);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
