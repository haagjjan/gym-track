# Operator Guide

Practical how-to for running this app day to day: starting it, managing users, reading
analytics, and using the features added in the SaaS hardening pass (`docs/12`). This is not
architecture — see `docs/repository-structure.md` for that, and `docs/deployment-runbook.md`
for the hosted deploy.

---

## 1. Starting the app

### Full local stack (closest to production)

```sh
pnpm start        # Postgres + migrations + API + web, all via Docker
```

Open `http://localhost:3000`. Stop with `pnpm stop`.

### Day-to-day development (faster iteration, hot reload)

```sh
pnpm db:start      # just Postgres, in Docker
pnpm migrate:up    # apply any new migrations
pnpm dev:api        # Fastify with file-watch reload, http://localhost:4000
pnpm dev:web        # Next.js dev server, http://localhost:3000
```

Run `dev:api` and `dev:web` in separate terminals (or background them). `pnpm db:stop` when done.

**Gotcha:** `dev:api` reads `.env` from the repo root automatically via `dotenv/config` — you
do not need to `source .env` yourself unless you're calling the API directly with `curl` in
the same shell (in that case: `set -a && source .env && set +a` first, so `DATABASE_URL` etc.
are in your shell's environment too).

### Checks before you ship anything

```sh
pnpm check   # type-check + lint + test + build, everything
```

---

## 2. Users — creating, verifying, resetting

The administrator page now includes the Founding Beta queue/settings, ordinary-user
containment, deletion support, campaigns, and recent audit events. Direct SQL remains an
emergency support escape hatch, not the routine user-management interface.

Stage 1 production is single-owner and uses an existing account. It must run with
`REGISTRATION_MODE=DISABLED`; there is no public or administrator account-creation endpoint.
Local development and test stacks explicitly use `REGISTRATION_MODE=ENABLED`.

### Development signup flow

1. `/signup` → account is created immediately (no email wait to start using the app).
2. The signup request synchronously attempts verification-email delivery, but a delivery
   failure does not roll back the new account. **Locally, with no `RESEND_API_KEY` set, this
   email is never actually sent** — instead it is printed to the API's terminal log:
   ```
   auth email (log transport)
     to: "jan@example.com"
     subject: "Verify your Gym Progress Tracker email"
     body: "...http://localhost:3000/verify-email?token=XXXXX..."
   ```
   Copy that URL into your browser to complete verification during local testing.
   Recipient, subject, body and action link appear only in this explicit local log transport;
   public-production logs and metrics never contain them.
3. Until verified, the dashboard shows an `EMAIL_UNVERIFIED` banner with a `RESEND_LINK`
   button — nothing else is blocked. This is intentional (see `docs/12`): don't lock users out
   over an unverified email at this stage.

Each explicit verification resend invalidates unused earlier verification tokens. The UI
distinguishes `SENT`, `NOT_REQUIRED`, and `FAILED`; after a failure, use the explicit resend
action rather than retrying an old link.

With registration disabled, `/signup` shows `REGISTRATION_UNAVAILABLE`, the login page does
not link to account creation, and both `POST /api/auth/signup` and
`POST /api/v1/auth/signup` return `403 REGISTRATION_DISABLED` without creating a user or
session.

### Password reset flow

1. `/forgot-password` → enter the account email → always shows a generic "link sent" message,
   whether or not the email exists (this is deliberate — prevents someone from using the form
   to check who has an account).
2. Locally: the reset link prints to the API log the same way, e.g.
   `http://localhost:3000/reset-password?token=XXXXX`. It's valid for **60 minutes** and
   **works once**.
3. On successful reset: the password changes, **every existing session for that user is
   killed** (so a stolen cookie dies the moment someone resets their password), and the
   account is marked email-verified (proving you clicked an emailed link is as good as
   clicking a verification link).

Each new reset request invalidates unused earlier password-reset tokens. The public response
remains identical for unknown accounts and provider failures; use bounded internal delivery
telemetry for diagnosis rather than changing that response.

### Turning on real email delivery

Development, test, and explicit local/private-LAN deployments may omit `RESEND_API_KEY`; links
then appear only in server logs. Public production refuses to start without the provider key,
a syntactically valid sender, and the existing support address used as reply-to. To send real
invitation, verification, reset, deletion, and cancellation emails:

1. Create a free account at resend.com, verify a sending domain (or use their `onboarding@resend.dev` test address for early testing).
2. Set in `.env` (or your hosting provider's environment variables):
   ```
   RESEND_API_KEY=re_your_key_here
   EMAIL_FROM=Gym Progress Tracker <no-reply@yourdomain.com>
   SUPPORT_EMAIL=support@yourdomain.com   # published support contact and reply-to
   APP_BASE_URL=https://app.gymtrack.ch   # so emailed links point at the canonical origin
   ```
3. Restart the API. A successful provider-acceptance attempt records bounded mail kind,
   outcome, status, optional provider message ID, and duration. Recipient, body, link, and raw
   token must never be copied into production logs or metrics.

Email is synchronous and has no durable outbox. If delivery is failed or ambiguous, the next
explicit resend rotates the unused verification/reset/invitation token. Do not copy raw links
into tickets, audit details, or retry payloads.

### Administrator user containment

Use `/admin` for routine containment:

- **Suspend** changes an ordinary account to `SUSPENDED`, revokes every live session, and
  writes the audit event in one transaction.
- **Reactivate** changes a suspended ordinary account to `ACTIVE`; it creates no session and
  does not change email verification.
- **Revoke sessions** ends all current sessions without changing account status. Repeating it
  safely returns zero revoked sessions.
- **Administrator audit trail** lists recent privileged events in pages of 50; load older
  pages with the provided cursor.

Administrator accounts, the signed-in administrator, role promotion, and
`DELETION_PENDING` status changes are intentionally unavailable from containment controls.
Use the existing deletion-support cancellation action for a pending deletion. The API's
canonical read route is `GET /api/v1/admin/users`; `/api/v1/admin/beta/users` is a temporary,
deprecated read-only alias whose response points to the successor route through `Deprecation`
and `Link` headers.

Invitation approval/reissue also waits for provider acceptance. `FAILED` leaves the request
in `INVITED`, records an audit event, and exposes `RESEND`; do not tell the operator to repeat
the generic approval action.

### Deletion email outcomes

Deletion scheduling is complete only after the cancellation email is accepted. If delivery
fails, the API returns `503 EMAIL_DELIVERY_FAILED`, compensates the account back to `ACTIVE`,
and invalidates the pending cancellation token. Sessions were already revoked and are not
recreated, so tell the user that deletion was not scheduled and that they may need to sign in
again.

A cancellation remains successful if its informational confirmation cannot be sent; the API
and admin UI expose `notificationStatus: FAILED` and record the bounded failure. Final-deletion
email is best effort because the erased address must not be retained for retry.

### Manually verifying or unlocking a user (support/SQL escape hatch)

Connect to Postgres (`pnpm db:start` must be running):

```sh
docker exec -it gym-progress-tracker-postgres psql -U gym_progress_tracker -d gym_progress_tracker
```

```sql
-- Manually verify someone's email (e.g. they lost the link and can't get a new one)
UPDATE users SET email_verified_at = now() WHERE lower(email) = 'jan@example.com';

-- Unlock an account that's mid-lockout (10 failed logins → 15 min auto-lock; this skips the wait)
UPDATE users SET locked_until = null, failed_login_attempts = 0 WHERE lower(username) = 'jan';

-- Force-logout a user everywhere (e.g. suspected compromised account)
UPDATE user_sessions SET revoked_at = now() WHERE user_id = (SELECT id FROM users WHERE lower(username) = 'jan') AND revoked_at IS NULL;

-- List all users
SELECT username, email, email_verified_at IS NOT NULL AS verified, created_at FROM users ORDER BY created_at DESC;
```

There is intentionally no way to read a plaintext password back out — passwords are
irreversibly hashed. To help someone log in, send them through `/forgot-password`.

### Login lockout behavior (what users will experience)

- After 10 wrong-password attempts on one account, it locks for 15 minutes regardless of
  which device/IP is trying (HTTP 423, message "Too many failed attempts").
- Separately, any single IP is capped at **10 requests per 15 minutes** to
  signup/login/verify/resend/forgot/reset combined — this stops one IP from farming multiple
  accounts, not just brute-forcing one. A legitimate user who mistypes a password 3 times
  won't notice either limit.
- A correct login (or a password reset) clears the failure counter immediately.

Fastify sees the internal Next.js BFF as its peer, so Stage 1 intentionally keeps
`API_TRUST_PROXY=false`. Use Cloudflare Access and Caddy logs for external client-address
investigation; do not enable Fastify proxy trust to consume browser-supplied forwarding
headers.

---

## 3. Analytics — what's tracked and how to read it

Analytics are **first-party only** — no third-party script, nothing sent off your server. Events
land in the `app_events` table in your own Postgres.

### What's tracked today

| Event | Fires when |
|---|---|
| `user_signed_up` | New account created |
| `user_logged_in` | Successful login |
| `email_verified` | Verification link clicked |
| `password_reset_completed` | Reset flow finished |
| `workout_created` | A session is started |
| `workout_completed` | A session is ended |
| `set_logged` | A set is saved during a workout |
| `csv_imported` | A workout-history CSV import succeeds |
| `workout_session_edited` | A session's title or start/end time is edited after the fact (properties list the changed fields) |
| `exercise_merged` | One exercise's history is merged into another (properties carry both exercise ids and the affected set count) |

Each row has `user_id` (nullable — some events, like a failed forgot-password, don't have one),
`event_name`, a `properties` JSON blob with event-specific extras, and `created_at`.

### Querying it

Same `psql` connection as above:

```sql
-- Signups per day, last 30 days
SELECT date_trunc('day', created_at) AS day, count(*) 
FROM app_events WHERE event_name = 'user_signed_up' AND created_at > now() - interval '30 days'
GROUP BY 1 ORDER BY 1;

-- Daily active users (anyone who logged in that day)
SELECT date_trunc('day', created_at) AS day, count(DISTINCT user_id)
FROM app_events WHERE event_name = 'user_logged_in' AND created_at > now() - interval '30 days'
GROUP BY 1 ORDER BY 1;

-- Sets logged per user, most active first
SELECT user_id, count(*) AS sets_logged
FROM app_events WHERE event_name = 'set_logged'
GROUP BY user_id ORDER BY 2 DESC LIMIT 20;

-- Funnel: signups vs. verified vs. first workout, last 7 days
SELECT
  count(*) FILTER (WHERE event_name = 'user_signed_up') AS signups,
  count(*) FILTER (WHERE event_name = 'email_verified') AS verified,
  count(*) FILTER (WHERE event_name = 'workout_created') AS started_a_workout
FROM app_events WHERE created_at > now() - interval '7 days';
```

There's no dashboard UI for this yet — it's SQL-only. Worth building a viewer once someone is
checking these numbers regularly enough that `psql` becomes annoying.

### Adding a new event to track

In any route handler, call `events.track("your_event_name", userId, { any: "extra data" })`.
See `apps/api/src/features/workouts/workout.routes.ts` for a working example. It's
fire-and-forget — it never slows down or fails the actual request.

---

## 4. CSV import/export (workout history portability)

Available from the History screen once it's rebuilt in Phase 3 (currently a placeholder in
the new UI) — the API endpoints work today and can be exercised directly:

```sh
# Export everything for the logged-in user (cookie auth required)
curl -b cookies.txt http://localhost:4000/api/v1/workouts/export.csv -o my-workouts.csv

# Preview an import without committing it (flags unknown exercise names for review)
curl -b cookies.txt -X POST --data-binary @my-workouts.csv \
  -H 'content-type: text/csv' http://localhost:4000/api/v1/workouts/import.csv/preview

# Actually import
curl -b cookies.txt -X POST --data-binary @my-workouts.csv \
  -H 'content-type: text/csv' http://localhost:4000/api/v1/workouts/import.csv
```

Limits: max 5,000 rows per import request (split larger files), max 1 MiB request body overall.

Exports enable Papa Parse formula escaping. Cells beginning with a spreadsheet formula prefix
are written as literal text, so user-authored titles/notes/names do not execute as formulas
when opened in common spreadsheet software. The downloadable sample contains only fixed
canonical content. Do not remove the leading escape character while handling an exported file
in a spreadsheet.

---

## 5. Rate limits at a glance

| Scope | Limit |
|---|---|
| Any single IP, all endpoints combined | 300 requests / minute |
| Any single IP, auth endpoints (signup/login/verify/resend/forgot/reset) | 10 requests / 15 minutes |
| Any single account, failed logins | 10 attempts → 15 minute lock |

If you (or a tester) get rate-limited during manual testing, either wait it out or restart the
API dev process — the limiter is in-memory and resets on restart.

**If you ever deploy more than one API instance**, the rate limiter needs to move to a shared
store (Redis) or each instance enforces its own separate 300/min — see `docs/12` for the note.
Account lockout is already safe across multiple instances (it lives in Postgres).

---

## 6. Environment variables reference

All in `.env` locally; set as real environment variables on your host in production. Full
template: `.env.example`.

| Variable | Purpose | Default if unset |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | — required |
| `APP_ENV` | Deployment label and explicit local/private-LAN security exception | follows `NODE_ENV`; public production must not use an exception label |
| `AUTH_COOKIE_SECURE` | HTTPS-only cookies | `true` in prod; explicit `false` is rejected in prod |
| `AUTH_SESSION_TTL_DAYS` | How long a login lasts | 30 |
| `REGISTRATION_MODE` | `ENABLED`, `INVITE_ONLY`, or `DISABLED` account creation | `DISABLED` in prod, `ENABLED` otherwise |
| `API_TRUST_PROXY` | Whether Fastify trusts forwarding headers | `false`; keep false for the BFF topology |
| `APP_BASE_URL` | Canonical origin used for absolute action links | required HTTPS origin in prod |
| `APP_ALLOWED_HOSTS` | Extra comma-separated hostnames accepted by Next.js | none beyond `APP_BASE_URL` host in prod |
| `APP_ALLOWED_ORIGINS` | Extra comma-separated origins accepted for state-changing BFF requests | none beyond `APP_BASE_URL` origin in prod |
| `HSTS_ENABLED` | Emit HSTS for the canonical HTTPS hostname | `false`; enable only after HTTPS stability is verified |
| `EMAIL_FROM` | Valid sender address, optionally with display name | a Resend test address; configure a verified sender before public production |
| `SUPPORT_EMAIL` | Published support contact and transactional-mail reply-to | required in public production |
| `RESEND_API_KEY` | Enables Resend transactional delivery | required in public production; unset uses log transport only in development/test/local/private-LAN |
| `LOG_LEVEL` | API log verbosity | `info` |

### Stage 1 production application values

The reviewed non-secret application values for the active home-server release are:

```dotenv
NODE_ENV=production
APP_ENV=production
REGISTRATION_MODE=DISABLED
APP_BASE_URL=https://app.gymtrack.ch
APP_ALLOWED_HOSTS=app.gymtrack.ch,192.168.1.57
APP_ALLOWED_ORIGINS=https://app.gymtrack.ch,http://192.168.1.57
HSTS_ENABLED=false
AUTH_COOKIE_SECURE=true
API_TRUST_PROXY=false
```

The LAN entries preserve page reachability and same-origin request validation where
possible. The production session cookie is Secure, so authenticated use must use
`https://app.gymtrack.ch`; browsers will not send that cookie over
`http://192.168.1.57`.

The Next.js ingress rejects unexpected Host headers with `421`, rejects missing or
unapproved Origins on state-changing `/api` requests with `403`, and rejects CORS
preflights. Fastify remains internal and intentionally sends no
`Access-Control-Allow-Origin` or credentialed-CORS headers. Application redirects are
relative, so an untrusted Host cannot turn them into an external redirect.

After deployment, verify the application boundary through Caddy—not by publishing Fastify:

```sh
curl -i -H 'Host: app.gymtrack.ch' http://127.0.0.1/
curl -i -X POST \
  -H 'Host: app.gymtrack.ch' \
  -H 'Origin: https://app.gymtrack.ch' \
  -H 'Content-Type: application/json' \
  --data '{"email":"blocked@example.invalid","username":"blocked","password":"not-a-real-password"}' \
  http://127.0.0.1/api/auth/signup
```

The second command must return `403 REGISTRATION_DISABLED`. Do not use a real personal
email in verification payloads.

After the external hostname, certificate, Access policy, tunnel recovery, and rollback path
have been verified, set `HSTS_ENABLED=true`, restart only the web service through the
approved deployment procedure, and confirm HSTS appears on `app.gymtrack.ch` but not the LAN
IP. Do not enable HSTS during repository preparation.

---

## 7. Demo/seed data

There's a one-off Python script pattern used to seed realistic training history against the
live API (signup → create exercises → backdated workouts/sets via the API's `startedAt`/
`endedAt` fields). It's not checked into the repo (it lived in a scratch location during
development) — recreate it if you need fresh demo data: hit `POST /auth/signup`, then
`POST /workouts` with a backdated `startedAt`, add exercises and sets, then `POST
/workouts/:id/end` with a backdated `endedAt`. All of this works through the normal API with
no special seed mode.

---

## 8. Private Stage 1 monitoring

The Stage 1 monitoring overlay runs Prometheus, Grafana, `node_exporter`, cAdvisor, and
`postgres_exporter` beside the existing application Compose services. It provisions three
operator dashboards automatically:

- **Service overview** — request/status rates, p50/p95/p99 latency, slow normalized routes,
  in-flight requests, release, and API/container uptime.
- **Host and containers** — CPU, memory/swap, filesystem, disk I/O, network, and container
  resource/restart signals.
- **PostgreSQL** — availability, connections/saturation, transactions, deadlocks,
  long-running transactions, database size, and locks.

One-time secret creation and the idempotent `pg_monitor` role setup are documented in
`ops/monitoring/README.md`. After that setup:

```sh
pnpm ops:monitoring:config
pnpm ops:monitoring:start
```

Open `http://127.0.0.1:3001`. Grafana is deliberately loopback-only; Prometheus and every
exporter have no published host port. PostgreSQL and the API also bind their development host
ports to loopback, while the web entry point remains unchanged.

Set these deployment identifiers before startup:

| Variable | Purpose | Safe local default |
| --- | --- | --- |
| `APP_ENV` | Stable environment label | `local` |
| `APP_RELEASE` | Git SHA or release tag shown in Grafana | `development` |
| `METRICS_ENABLED` | Registers the internal API metrics endpoint | overlay forces `true` |
| `PROMETHEUS_RETENTION_TIME` | Metrics retention | `30d` |
| `GRAFANA_PORT` | Loopback Grafana port | `3001` |

The metrics endpoint is disabled outside the overlay unless explicitly enabled. Render remains
the accepted first hosted target, and its public API therefore does not gain a metrics endpoint
from this change.

### First checks when a panel is empty

1. Run the Prometheus target check from `ops/monitoring/README.md`.
2. Confirm the affected target is `UP` and inspect its last scrape error.
3. For API panels, make a few real application requests and confirm `APP_RELEASE` is set.
4. For PostgreSQL, verify the `gym_progress_monitor` password matches the Docker secret.
5. For host panels, confirm the production host is native Linux. Docker Desktop reports its VM,
   not the physical macOS host.

The cAdvisor restart panel is a best-effort signal. Confirm suspected restarts with
`docker compose ps` and container logs before taking action.

---

## 9. Public-beta lifecycle cleanup and email alerts

The API process owns one single-flight lifecycle runner for the accepted single-process,
50-account beta topology. It runs once during API startup and then hourly. Do not add a second
API replica without first replacing this assumption with coordinated scheduling.

Each run isolates these phases so one error does not skip later work or the next run:

1. expired authentication records;
2. expired invitations;
3. every account deletion due within the beta cap;
4. deletion-completion notifications; and
5. account/campaign retention cleanup.

One completion-email failure does not stop later due deletions. The operational metrics are:

- `gym_progress_tracker_lifecycle_cleanup_last_start_timestamp_seconds`;
- `gym_progress_tracker_lifecycle_cleanup_last_success_timestamp_seconds`;
- `gym_progress_tracker_lifecycle_cleanup_last_duration_seconds`;
- `gym_progress_tracker_lifecycle_cleanup_phase_failures_total{phase}`;
- `gym_progress_tracker_lifecycle_due_deletions`;
- `gym_progress_tracker_lifecycle_finalized_deletions_total`; and
- `gym_progress_tracker_email_deliveries_total{kind,outcome}` plus its bounded duration
  histogram.

Checked-in Prometheus rules warn when no full cleanup succeeds for two hours, become critical
at four hours, become critical when a due-deletion backlog persists for four hours, and warn
after at least three transactional-email failures in 30 minutes. The repository rules are not
proof that Prometheus loaded or fired them in a deployment.

For a lifecycle alert, inspect the bounded `phase` and API logs, database health, provider
health, and the current due-backlog metric. Fix the failed dependency; a controlled API
restart performs one startup catch-up run, but do not restart repeatedly as a substitute for
diagnosis. For email alerts, use only kind/outcome/provider status/message ID telemetry and
the provider dashboard—never paste recipient addresses, message bodies, links, or tokens into
logs or incident notes.
