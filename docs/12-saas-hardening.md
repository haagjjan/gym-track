# SaaS Hardening — Security, Auth Flows, Analytics (2026-07-03)

Scope approved by owner: production-harden the app for a first phase of 10–10k users.
This explicitly opens the backend, which the frontend-rework brief (docs/10) had frozen.

## Audit result (what was already solid)

- Passwords hashed with argon2; sessions are random 256-bit tokens stored **hashed** (sha256)
  in Postgres with TTL + revocation; cookies are httpOnly/sameSite=lax/secure-in-prod.
- All SQL through Kysely (parameterized — no injection surface); zod validation on every input.
- Browser never calls the API directly (Next.js BFF proxy forwards the cookie) — no CORS surface.
- Hot query paths were already indexed (session token hash, user+started_at, partial
  one-open-workout index, exercise name search index).
- Prompt injection: **not applicable** — the app has no LLM surface. Revisit only if AI
  features are added.

## Gaps closed in this pass

| Area | Change |
|---|---|
| Password policy | Signup/reset now require ≥10 chars. Login stays permissive so pre-existing accounts can still sign in (they upgrade via reset). |
| Rate limiting | `@fastify/rate-limit`: 300 req/min/IP globally; 10 req/15min/IP on signup, login, verify, resend, forgot, reset. Stage 1 keeps `API_TRUST_PROXY=false` because Fastify receives internal Next.js BFF traffic rather than the edge request; Caddy/Cloudflare logs own client attribution. |
| Brute force | Per-account lockout: 10 consecutive failures → 15min lock (HTTP 423), independent of IP. Counter clears on success/reset. |
| Security headers | `@fastify/helmet` (CSP off — JSON-only API): HSTS, nosniff, frame-options, etc. |
| Payload bombs | Explicit 1 MiB `bodyLimit`; CSV imports additionally capped at 5,000 rows per request (bytes were already capped; this caps write amplification). |
| Email verification | Signup issues a 24h single-use token (stored hashed, same discipline as sessions). `POST /auth/verify-email`, `POST /auth/resend-verification`. `/auth/me` now returns `emailVerified` (additive). Soft-gate: unverified users see a dashboard banner, nothing is blocked. |
| Password reset | `POST /auth/forgot-password` (uniform 200 — no account enumeration) → 60min single-use token → `POST /auth/reset-password` updates the hash, **revokes every session**, clears lockout, and counts as email verification. |
| Email transport | Env-driven: `RESEND_API_KEY` + `EMAIL_FROM` → Resend HTTP API; without a key, mails (incl. action links) go to the server log — which is also the local-dev retrieval path. No vendor decision blocks deploys; swap providers by implementing the 1-method `Mailer` interface. |
| Product analytics | First-party `app_events` table (user_id, event_name, jsonb properties). Tracked **server-side only** (no client ingest endpoint = no new attack surface, no third party): `user_signed_up`, `user_logged_in`, `email_verified`, `password_reset_completed`, `workout_created`, `workout_completed`, `set_logged`, `csv_imported`. Fire-and-forget inserts; failures never block requests. Query with SQL for now. |
| Hygiene | Daily job purges sessions/tokens expired >7 days (inside `buildServer`, cleared on close). New index on `user_sessions(expires_at)`. |

Migration: `20260703120000000_add_auth_hardening_and_events.sql` (users columns:
`email_verified_at`, `failed_login_attempts`, `locked_until`; tables `auth_action_tokens`,
`app_events`).

Configuration now also includes `REGISTRATION_MODE`, `APP_ALLOWED_HOSTS`, and
`APP_ALLOWED_ORIGINS`. Production registration defaults closed, production `APP_BASE_URL`
must be HTTPS, and production cookies cannot be configured insecurely. `RESEND_API_KEY`
remains optional; without it, production auth mail is not delivered and message contents
are not logged.

Web: `/forgot-password`, `/reset-password`, `/verify-email` screens; forgot link on login;
min-10 hint on signup; dashboard `EMAIL_UNVERIFIED` banner with resend.

## Scale posture for 10–10k users

One API node + one Postgres is comfortably sufficient at this scale. The rate limiter uses
the default in-memory store — correct for a single node; if the API is ever scaled to
multiple replicas, move it to the Redis store (`@fastify/rate-limit` supports it) and the
lockout already lives in Postgres so it is replica-safe today.

## Deliberately not done (and why)

- **No third-party auth service** (Clerk/Auth0): the existing session model is sound;
  vendor cost/lock-in is an owner decision.
- **No hard verification gate**: blocking unverified users would lock out all pre-existing
  accounts; soft-gate first, tighten later if abuse appears.
- **No analytics dashboard UI**: data accrues in `app_events`; build a viewer when there is
  someone who needs it weekly.
- **No CAPTCHA**: rate limits + lockout are proportionate at this scale.
