# ADR 0011 - Secure Single-Owner External Access

## Status

Accepted

## Context

ADR 0009 selected `gym-prod` as the active private deployment target but explicitly deferred
public DNS, tunnels, and HTTPS. Stage 1 now needs one externally usable hostname for the
existing owner without turning Gym Tracker into an open registration service or exposing
internal application and operations ports.

The browser already uses Next.js route handlers as a same-origin BFF. Fastify receives those
internal BFF requests rather than the original browser or Cloudflare request, so treating
Fastify as a public edge or trusting arbitrary forwarding headers would not improve security
or client attribution.

## Decision

Prepare the application for `https://app.gymtrack.ch` and retain the existing ingress chain:

```text
Cloudflare Access → Cloudflare Tunnel → Caddy → Next.js/BFF → Fastify → PostgreSQL
```

The infrastructure part of that chain remains a separately approved operator action. The
repository enforces these application rules:

- `REGISTRATION_MODE` accepts only `ENABLED` or `DISABLED`.
- Missing registration configuration defaults to `DISABLED` in production and `ENABLED` in
  development/test.
- The Fastify signup endpoint is authoritative and rejects disabled registration before
  validation, password hashing, mail, persistence, session creation, or analytics events.
- The Next.js signup route also rejects disabled registration, and `/signup` renders a
  private-access message instead of a form.
- Production requires an HTTPS `APP_BASE_URL` and secure, host-only, HttpOnly, SameSite=Lax
  session cookies.
- Next.js accepts only the canonical host plus explicitly configured LAN/operator hostnames.
- State-changing same-origin BFF requests require an allowed `Origin`; CORS preflights and
  cross-site requests are rejected. Fastify does not enable browser CORS.
- Application redirects remain relative. `APP_BASE_URL` owns generated absolute action links.
- `API_TRUST_PROXY=false` remains the production setting because Fastify is reached only by
  the internal BFF. Caddy and Cloudflare own edge/client-address evidence.
- HSTS is opt-in after the canonical HTTPS hostname is proven stable and is emitted only for
  that hostname. LAN HTTP responses do not receive HSTS.

No application, database, monitoring, or exporter port is added by this decision.

## Consequences

The registration lock remains effective if Cloudflare Access is weakened, and an unexpected
production environment omission closes registration instead of opening it. Host and
same-origin checks add a second application boundary behind Caddy without creating a public
Fastify API.

The canonical HTTPS hostname becomes the supported authenticated production entry point.
LAN HTTP can remain available for reachability and emergency inspection when its host/origin
is explicitly allowed, but browsers will not send the production Secure session cookie over
LAN HTTP. Preserving fully authenticated LAN use would require a separately reviewed LAN
HTTPS design.

Local Compose explicitly enables registration so disposable test accounts and the existing
integration/Playwright flows continue to work. It also labels itself `APP_ENV=local` so its
production-built containers may use HTTP and insecure disposable cookies. A production
release must use a non-local `APP_ENV` and explicitly set `REGISTRATION_MODE=DISABLED`, even
though the production default is also closed.

Stage 1 requires no database migration. Cloudflare, DNS, tunnel, Caddy publication, server
service installation, deployment, and external verification remain operator work outside
this repository change.
