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

There is no admin panel yet. Everything below is either through the running app's UI, or
direct SQL against Postgres for the rare case the UI can't reach it (e.g. manually verifying
someone during support).

### Normal signup flow (what a real user experiences)

1. `/signup` → account is created immediately (no email wait to start using the app).
2. A verification email is sent in the background. **Locally, with no `RESEND_API_KEY` set,
   this email is never actually sent** — instead it's printed to the API's terminal log:
   ```
   auth email (log transport)
     to: "jan@example.com"
     subject: "Verify your Gym Progress Tracker email"
     body: "...http://localhost:3000/verify-email?token=XXXXX..."
   ```
   Copy that URL into your browser to complete verification during local testing.
3. Until verified, the dashboard shows an `EMAIL_UNVERIFIED` banner with a `RESEND_LINK`
   button — nothing else is blocked. This is intentional (see `docs/12`): don't lock users out
   over an unverified email at this stage.

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

### Turning on real email delivery

By default (no `RESEND_API_KEY`), nothing is emailed — links only appear in server logs. To
actually send verification/reset emails:

1. Create a free account at resend.com, verify a sending domain (or use their `onboarding@resend.dev` test address for early testing).
2. Set in `.env` (or your hosting provider's environment variables):
   ```
   RESEND_API_KEY=re_your_key_here
   EMAIL_FROM=Gym Progress Tracker <no-reply@yourdomain.com>
   APP_BASE_URL=https://your-real-domain.com   # so emailed links point at prod, not localhost
   ```
3. Restart the API. That's it — no code changes. Swapping to a different provider later means
   implementing one function (`send()`) in `apps/api/src/shared/mailer.ts`.

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
| `AUTH_COOKIE_SECURE` | HTTPS-only cookies | `true` in prod, `false` in dev |
| `AUTH_SESSION_TTL_DAYS` | How long a login lasts | 30 |
| `API_TRUST_PROXY` | Trust `X-Forwarded-For` (needed behind any reverse proxy/CDN so rate limits see real client IPs, not the proxy's IP) | `true` in prod |
| `APP_BASE_URL` | Used to build links inside emails | `http://localhost:3000` |
| `EMAIL_FROM` | "From" address on outgoing mail | a Resend test address |
| `RESEND_API_KEY` | Turns on real email sending | unset = log-only |
| `LOG_LEVEL` | API log verbosity | `info` |

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
