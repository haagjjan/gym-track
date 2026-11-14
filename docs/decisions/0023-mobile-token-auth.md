# ADR 0023 - Mobile Token Auth

## Status

Proposed, 2026-11-14. The owner reviews this before the mobile app ships. The spike on branch
`mobile/app` is built against it behind a flag that defaults off.

## Context

The web app authenticates through the Next.js BFF: same-origin route handlers forward the
session cookie to `apps/api` ([ADR 0011](0011-secure-single-owner-external-access.md)). The
mobile app is a bundled static build inside Capacitor ([ADR 0021](0021-mobile-app-stack.md)).
It has no BFF and runs on the origins `capacitor://localhost` (iOS) and `https://localhost`
(Android), so it must talk to `apps/api` directly.

What exists today:

- Sessions are opaque random tokens. The API stores only a hash in `user_sessions` and reads
  the raw token from an `HttpOnly` cookie (`features/auth/authenticate-request.ts`,
  `auth.routes.ts`). There is no `Authorization` header path.
- The API has no CORS configuration, because only the BFF calls it.
- In production the API is not reachable from the internet. Caddy proxies only `web:3000`
  (`ops/production/Caddyfile`).
- Rate limits key on the client IP that the BFF signs with `BFF_CLIENT_IP_SECRET`
  (`shared/client-attribution.ts`). A direct caller has no signature, so the key falls back
  to `request.ip`.

Cookies are a poor fit for the app. WKWebView treats a cookie from the API host as
third-party for a `capacitor://` page and may drop it, and a cookie readable by the WebView
is not stored in the Keychain or Keystore.

## Decision

1. **Same sessions, second transport.** The app uses the same opaque session tokens and the
   same `user_sessions` rows as the web. A request that carries `X-Gym-Client: app` is an
   app request: the API reads its session token from `Authorization: Bearer <token>` and
   ignores any cookie on it. Every other request authenticates with the cookie, as today.
   Expiry, revocation, account status checks and the admin "revoke sessions" action work
   unchanged, because they act on the row, not on the transport.
2. **The token is returned in the body only to the app client.** Login and signup return
   `data.sessionToken` and `data.expiresAt` only on app requests. Those responses set no
   cookie. Requests without the header behave exactly as today, so the web contract does
   not change.
3. **Storage on the phone.** The app keeps the token in the iOS Keychain and the Android
   Keystore through a Capacitor secure-storage plugin. It is never written to
   `localStorage`, the offline database or logs. The API logger already redacts the
   `authorization` header.
4. **Logout and loss of session.** Logout sends the bearer token; the API revokes the row and
   the app deletes the stored token. Any `401` from the API makes the app delete the token
   and show Login. Pending offline writes stay on the device (ADR 0025).
5. **CORS.** The API answers CORS preflights only for an explicit allow-list from
   `MOBILE_APP_ORIGINS` (default `capacitor://localhost,https://localhost`), with
   `Authorization`, `Content-Type`, `X-Gym-Client` and `X-App-Version` as allowed headers and
   no `Access-Control-Allow-Credentials`. CORS only decides who may read a response and
   who may send the custom headers; it is not the CSRF defence.
6. **CSRF boundary.** Two rules together keep cookies off the public route:
   - An app request never authenticates with a cookie (item 1). A foreign website cannot
     forge one, because `X-Gym-Client` is a custom header: the browser must preflight it,
     and the preflight is refused for origins outside the allow-list.
   - A request without that header is only served when it carries the BFF's signed
     client-IP header (`BFF_CLIENT_IP_SECRET`, required in production). A browser that
     posts straight to the public API route with the user's cookie has no signature and
     gets `403 BFF_REQUIRED` before any handler runs.

   So cookie-authenticated requests still reach handlers only through the BFF and its
   origin checks, and header-authenticated requests need no CSRF token because the browser
   never attaches a bearer token by itself.
7. **Rate limits.** Auth routes keep their per-route limits. For direct calls the key is the
   client IP as seen through the trusted proxy chain (`API_TRUST_PROXY`). The signed BFF
   header stays the only way to assert a different IP.
8. **Feature flag.** `ENABLE_MOBILE_TOKEN_AUTH` (default `false`) gates items 1, 2 and 5.
   With the flag off the API ignores the header, returns no token and sends no CORS headers.
9. **No schema change now.** A later additive column `user_sessions.client_kind` can let
   Settings list "this phone" separately. It is not needed for the first release.

## Consequences

- **Deployment change needed before the app can reach production.** The API must be
  reachable from phones. Proposed: Caddy routes `app.gymtrack.ch/api/v1/*` to `api:4000`.
  The web's own BFF routes live under `/api/<name>` without `v1`, so the paths do not
  collide. Caddy must strip incoming `X-Gym-Client-IP` and `X-Gym-Client-Signature` on that
  route as it does for the web, and the API must trust only Caddy as a proxy. This is a
  deployment decision and stays with the owner; nothing on staging or production changes on
  the spike branch.
- The API becomes a public surface. Every route's own authorization already runs in the API
  (the BFF adds none), but the launch-gate IDOR matrix should be re-run against the bearer
  path before release, and admin routes should stay unreachable from the public route or be
  explicitly reviewed.
- A stolen phone backup cannot yield the token if the secure-storage entry is excluded from
  backups; this is checked in the spike.
- Session lifetime on phones equals the web lifetime (`sessionTtlDays`). If phones should
  stay signed in longer, that is a later change to the session policy, not to this design.
- The minimum-client-version header (`X-App-Version`) is defined in
  [ADR 0024](0024-mobile-static-export.md).

## Verification gates

- Unit and integration tests: bearer accepted only with the flag on and only on app
  requests; an app request with only a cookie returns `401`; revoked and expired tokens
  return `401`; login without `X-Gym-Client: app` never returns a token; CORS headers
  appear only for allow-listed origins; a direct cookie request without the BFF signature
  (for example a cross-site logout) returns `403` when the secret is configured.
- The bundled app logs in, survives an app restart, logs out, and returns to Login after the
  session is revoked from the admin console.

## Alternatives

- **Cookies from the WebView to the API.** No new code path, but unreliable in WKWebView for
  a cross-site host and not stored in secure storage.
- **JWT access and refresh tokens.** Adds key management, a second revocation model and
  refresh logic for no benefit at this size; opaque rows are already revocable.
- **OAuth 2.0 with PKCE.** The right tool for third-party clients or social login. The app
  is a first-party client with a password form, so it adds a browser round trip only.
- **Hosting the UI remotely (`server.url`).** Keeps cookies and the BFF, but Capacitor
  advises against it in production and it fails the store's minimum-functionality rules
  (ADR 0021).
