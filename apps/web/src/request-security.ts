export interface WebSecurityConfig {
  allowedHosts: ReadonlySet<string>;
  allowedOrigins: ReadonlySet<string>;
  canonicalHostname: string;
  canonicalOrigin: string;
  hstsEnabled: boolean;
  /** Hostnames answered with a permanent redirect to the canonical origin. */
  redirectHosts: ReadonlySet<string>;
}

export interface RequestSecurityInput {
  host: string | null;
  method: string;
  origin: string | null;
  pathname: string;
  secFetchSite: string | null;
}

export interface RequestRejection {
  code: "CORS_NOT_ALLOWED" | "CSRF_ORIGIN_MISMATCH" | "UNTRUSTED_HOST";
  message: string;
  status: 403 | 421;
}

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

const LOCAL_ORIGINS = ["http://127.0.0.1:3000", "http://localhost:3000"];
const STATE_CHANGING_METHODS = new Set(["DELETE", "PATCH", "POST", "PUT"]);

export function readWebSecurityConfig(
  source: EnvironmentSource = process.env
): WebSecurityConfig {
  const production = source.NODE_ENV === "production"
    && source.APP_ENV !== "local"
    && source.APP_ENV !== "private-lan";
  const canonicalOrigin = parseOrigin(
    "APP_BASE_URL",
    source.APP_BASE_URL ?? (production ? undefined : "http://localhost:3000")
  );

  if (production && !canonicalOrigin.startsWith("https://")) {
    throw new Error("APP_BASE_URL must use HTTPS in production.");
  }

  const canonicalHostname = new URL(canonicalOrigin).hostname.toLowerCase();
  const hstsEnabled = parseBoolean("HSTS_ENABLED", source.HSTS_ENABLED, false);
  const allowedHosts = new Set([canonicalHostname]);
  const allowedOrigins = new Set([canonicalOrigin]);
  const redirectHosts = new Set(
    source.APP_REDIRECT_HOSTS === undefined
      ? defaultRedirectHosts(canonicalHostname)
      : commaSeparated(source.APP_REDIRECT_HOSTS)
          .map((host) => parseHostname("APP_REDIRECT_HOSTS", host))
  );

  for (const host of commaSeparated(source.APP_ALLOWED_HOSTS)) {
    allowedHosts.add(parseHostname("APP_ALLOWED_HOSTS", host));
  }

  for (const origin of commaSeparated(source.APP_ALLOWED_ORIGINS)) {
    allowedOrigins.add(parseOrigin("APP_ALLOWED_ORIGINS", origin));
  }

  if (!production) {
    for (const origin of LOCAL_ORIGINS) {
      allowedOrigins.add(origin);
      allowedHosts.add(new URL(origin).hostname);
    }
  }

  // A host that is served directly — the canonical one included — must never
  // also be bounced, or it would redirect to itself forever.
  for (const host of allowedHosts) {
    redirectHosts.delete(host);
  }

  return {
    allowedHosts,
    allowedOrigins,
    canonicalHostname,
    canonicalOrigin,
    hstsEnabled,
    redirectHosts
  };
}

/**
 * Bare-domain and `www.` variants of the canonical hostname.
 *
 * Visitors type `gymtrack.ch`, not `app.gymtrack.ch`, so those two hostnames
 * are bounced to the canonical origin by default instead of being rejected as
 * untrusted. The registrable domain is taken as the last two labels, which is
 * correct for the deployed `.ch` domain but not for multi-part suffixes such as
 * `.co.uk`; set `APP_REDIRECT_HOSTS` explicitly for those, or to an empty
 * value to turn the redirect off entirely.
 */
function defaultRedirectHosts(canonicalHostname: string): string[] {
  const labels = canonicalHostname.split(".");

  if (labels.length < 2 || isIpAddress(canonicalHostname)) {
    return [];
  }

  const registrable = labels.slice(-2).join(".");

  return [registrable, `www.${registrable}`];
}

function isIpAddress(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
}

/**
 * The canonical URL a request should be redirected to, or `null` when the
 * request is already on a host that is served directly.
 */
export function canonicalRedirectTarget(
  input: { host: string | null; pathAndQuery: string },
  config: WebSecurityConfig
): string | null {
  const hostname = requestHostname(input.host);

  if (!hostname || !config.redirectHosts.has(hostname)) {
    return null;
  }

  return `${config.canonicalOrigin}${input.pathAndQuery}`;
}

export function evaluateRequestSecurity(
  input: RequestSecurityInput,
  config: WebSecurityConfig
): RequestRejection | null {
  const hostname = requestHostname(input.host);

  if (!hostname || !config.allowedHosts.has(hostname)) {
    return {
      code: "UNTRUSTED_HOST",
      message: "The request host is not allowed.",
      status: 421
    };
  }

  if (!isApiPath(input.pathname)) {
    return null;
  }

  if (input.method.toUpperCase() === "OPTIONS") {
    return {
      code: "CORS_NOT_ALLOWED",
      message: "Cross-origin API access is not supported.",
      status: 403
    };
  }

  if (!STATE_CHANGING_METHODS.has(input.method.toUpperCase())) {
    return null;
  }

  const origin = requestOrigin(input.origin);
  const isCrossSite = input.secFetchSite?.toLowerCase() === "cross-site";

  if (!origin || !config.allowedOrigins.has(origin) || isCrossSite) {
    return {
      code: "CSRF_ORIGIN_MISMATCH",
      message: "The request origin is not allowed.",
      status: 403
    };
  }

  return null;
}

export function securityHeaders(
  config: WebSecurityConfig,
  requestHost: string | null
): Readonly<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Security-Policy": "base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  };

  if (
    config.hstsEnabled &&
    config.canonicalOrigin.startsWith("https://") &&
    requestHostname(requestHost) === config.canonicalHostname
  ) {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  }

  return headers;
}

function commaSeparated(value: string | undefined): string[] {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function parseBoolean(name: string, value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  if (value === "true" || value === "false") {
    return value === "true";
  }

  throw new Error(`${name} must be true or false.`);
}

function parseHostname(name: string, value: string): string {
  if (
    value.includes("@") ||
    value.includes("/") ||
    value.includes("\\") ||
    value.includes(":") ||
    value.includes("?") ||
    value.includes("#") ||
    /\s/.test(value)
  ) {
    throw new Error(`${name} contains an invalid hostname: ${value}`);
  }

  const hostname = new URL(`http://${value}`).hostname.toLowerCase();

  if (!hostname) {
    throw new Error(`${name} contains an invalid hostname: ${value}`);
  }

  return hostname;
}

function parseOrigin(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is required in production.`);
  }

  const url = new URL(value);

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${name} must contain an HTTP(S) origin without a path.`);
  }

  return url.origin;
}

function requestHostname(host: string | null): string | null {
  if (
    !host ||
    host.includes("@") ||
    host.includes("/") ||
    host.includes("\\") ||
    host.includes("?") ||
    host.includes("#") ||
    /\s/.test(host)
  ) {
    return null;
  }

  try {
    return new URL(`http://${host}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function requestOrigin(origin: string | null): string | null {
  if (!origin) {
    return null;
  }

  try {
    return parseOrigin("Origin", origin);
  } catch {
    return null;
  }
}

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}
