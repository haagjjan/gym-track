# Production Operations & Launch Readiness — Stage 1

**For:** Codex or Claude Code  
**Stage:** Personal remote testing  
**Status:** In progress — E2-E4 metrics and dashboard provisioning implemented; runtime verification pending  
**Follows:** `12-saas-hardening.md`, `13-operator-guide.md`, `14-ui-polish-and-ops-round-2.md`  
**Assumes:** Doc 14 Batches A, B, and C are closed. Batch D is functionally complete apart from minor frontend polish.

> **Current Stage 1 authority:** For secure single-owner external access, the plans under
> `docs/status/production-readiness/` and ADR 0011 supersede this document where they
> conflict. In particular, public signup and production email onboarding are deferred;
> Stage 1 uses an existing owner account with `REGISTRATION_MODE=DISABLED`.

---

## 1. Purpose

The application is now sufficiently mature in UI, UX, and core workout functionality for its first real deployment. The next objective is not another product redesign. It is to make the application safe and operable when it runs continuously on a home-hosted machine and is accessed remotely by the owner.

Stage 1 must establish the minimum production foundation required to answer these questions reliably:

- Is the application reachable?
- Is the API healthy?
- Is PostgreSQL healthy?
- Which version is deployed?
- What request failed?
- Which user and release were affected?
- How long did requests take?
- Is the host running out of CPU, memory, or disk?
- Did a backup complete?
- Can that backup actually be restored?
- Did verification email delivery work?
- Are production secrets and internal services protected?
- Is there a documented way to deploy, roll back, diagnose, and recover the service?

This document is an implementation plan, not a general recommendation list. Work through it in the specified order.

---

## 2. Stage 1 outcome

Stage 1 is complete only when the owner can remotely use the production deployment and the service meets all of the following conditions:

- The application is reachable through HTTPS.
- PostgreSQL is not exposed to the public internet.
- Grafana and other operator-only services are not publicly accessible.
- Every API request has a correlation ID.
- Production logs are structured, redacted, persistent, and searchable.
- Frontend and backend exceptions reach Sentry with release attribution.
- Liveness and readiness checks exist and are used by Docker and external monitoring.
- Basic host, container, API, and PostgreSQL metrics are visible.
- Critical failures trigger an alert through at least one tested notification channel.
- Daily encrypted PostgreSQL backups are stored off the application host.
- A restore into a disposable database has been completed successfully.
- Real verification emails are delivered through Resend.
- Production configuration is validated at startup.
- The deployed release can be tied to a Git commit.
- A deployment, rollback, backup, restore, and incident runbook exists.
- A complete owner smoke test passes from a remote device.

Stage 1 is for **one operator and one real user**. It should use professional operational principles without introducing infrastructure intended for a large distributed system.

---

## 3. Fixed architecture baseline

Do not replace or redesign these choices as part of this stage.

| Piece | Choice |
|---|---|
| Framework | Next.js 15 App Router + React 19 |
| API | Existing Fastify backend |
| Database | PostgreSQL through the existing Kysely data layer |
| 3D | Three.js through `react-three-fiber` and `@react-three/drei` |
| Styling | Tailwind CSS v4 using `DESIGN.md` tokens |
| Charts | Recharts |
| Data fetching | TanStack Query |
| Fonts | Space Grotesk + JetBrains Mono through `next/font` |
| Validation | Zod at API and configuration boundaries |
| Package management | Existing pnpm workspace |
| Deployment model | Existing Docker-based architecture, initially on one home-hosted machine |
| Logging foundation | Fastify/Pino structured logging |
| Email provider | Resend, as already anticipated by the repository |
| Product events | Existing `app_events` table and operator-guide definitions |

The existing Next.js BFF layer remains in place. It currently contains approximately 25 proxy routes that forward cookies to Fastify and participates in server-side auth gating. Do not bypass or remove that layer merely to simplify observability.

---

## 4. Scope boundaries

### Included in Stage 1

- Production runtime hardening
- Environment validation
- Release identification
- Request correlation
- Structured and centralized logs
- Error tracking
- Health checks
- Basic metrics and dashboards
- Minimal alerting
- Encrypted off-host backups
- Restore verification
- Real verification-email delivery
- Secure remote exposure
- Private operator access
- Deployment and recovery runbooks
- A small production smoke and load baseline

### Explicitly deferred

Do not implement these unless required to complete a Stage 1 item:

- Kubernetes
- Microservice decomposition
- Multi-region deployment
- High-availability PostgreSQL
- Automatic database failover
- Full distributed tracing with Tempo
- Continuous profiling
- Point-in-time recovery through WAL archiving
- A public status page
- A customer-facing support portal
- A full internal customer-support application
- Arbitrary database editing through a web UI
- Session replay by default
- A formal organization-wide SLO/error-budget program
- Large-scale load testing
- Multi-operator roles and permissions
- A data warehouse
- A new product-analytics event redesign
- A replacement for the existing frontend or BFF architecture

Those belong in Stage 2 or Stage 3.

---

## 5. Work labels

Each task uses one or more labels:

- **`[CODE]`** — repository changes Codex/Claude Code can implement.
- **`[INFRA]`** — Docker, host, networking, or monitoring configuration.
- **`[OWNER]`** — requires the owner to create an account, provide a domain, choose a provider, or enter a secret.
- **`[VERIFY]`** — must be demonstrated through commands, screenshots, logs, or a documented test.
- **`[DECISION]`** — stop and obtain an explicit owner choice before implementation if the choice is not already recorded.

Do not silently invent credentials, domains, email addresses, retention periods, notification destinations, backup repositories, or public-network configuration.

---

## 6. Standing implementation rules

These rules apply to every batch.

1. **Do not log secrets or full sensitive request bodies.**
   Redact at minimum:
   - `authorization`
   - `cookie`
   - `set-cookie`
   - passwords
   - session tokens
   - email verification tokens
   - password-reset tokens
   - Resend API keys
   - Sentry auth tokens
   - database URLs
   - raw `.env` values

2. **Do not use user email addresses as routine telemetry identifiers.**
   Prefer internal user IDs. Emails may be shown only in deliberate operator workflows with appropriate access control.

3. **Do not expose internal operational endpoints publicly.**
   `/metrics`, PostgreSQL, Grafana, Loki, Prometheus, and exporter ports must remain on a private Docker network or private operator network.

4. **Do not use raw request paths as metric labels.**
   Use normalized route templates such as `/workout-sessions/:id`, not `/workout-sessions/123`.

5. **Do not use high-cardinality metric labels.**
   Never label Prometheus metrics with user ID, email, request ID, session ID, exercise ID, or workout ID.

6. **Do not treat a backup file existing as proof of recoverability.**
   A restore test is mandatory.

7. **Do not expose PostgreSQL or an unrestricted database browser to the internet.**

8. **Do not add an internal admin screen merely to inspect rows.**
   Stage 1 operator access should use a private connection and preferably a read-only database role.

9. **Do not commit production secrets.**
   Add templates and documentation only.

10. **Preserve the existing application behavior.**
    Operational changes must not regress signup, login, workout logging, history, charts, CSV import/export, or the completed frontend work.

---

## 7. Required owner decisions before implementation

Complete Batch A first. Stop after the inventory and decision report if these are not already known.

| Decision | Recommended Stage 1 default | Why it matters |
|---|---|---|
| Production host OS | Linux if the machine is dedicated; otherwise current macOS setup | Scheduling, firewall, service startup, and Docker behavior differ |
| Remote-access model | Cloudflare Tunnel with access restricted to the owner, or Tailscale for private-only access | Avoid raw router port forwarding |
| Production hostname | Dedicated subdomain such as `app.example.com` | Required for HTTPS and verification links |
| Error tracking | Sentry Cloud | Fastest reliable frontend/backend error visibility |
| External uptime provider | Any reputable monitor outside the home network | A monitor on the same host cannot detect home-network failure |
| Alert destination | Email, Telegram, Discord, or another channel checked reliably | Alerts are useless if they are not noticed |
| Backup destination | Encrypted Restic repository on an off-host provider or separate remote machine | Backups must survive loss of the application host |
| Grafana access method | Tailscale, SSH tunnel, or Cloudflare Access-protected hostname | Grafana must not be public |
| Log retention | Suggested: 14 days for Stage 1 | Prevent uncontrolled disk growth |
| Metrics retention | Suggested: 30 days for Stage 1 | Enough for early trend comparison |
| Sentry data policy | No session replay; no default PII | Minimize unnecessary collection during initial testing |

Record the final choices in this document or `.claude/memory/architecture-decisions.md` before continuing.

Implementation note (2026-07-16): ADR 0008 accepts the repository-level E2-E4 monitoring foundation with 30-day Prometheus retention, file-provisioned Grafana dashboards, and loopback-only Grafana access as safe defaults. This does **not** confirm the real production host OS, remote-access provider, public hostname, alert destination, backup provider, or owner credentials. ADR 0005 and the Render configuration remain in place until the owner explicitly changes the deployment target.

---

# Batch A — Production inventory and decision lock

**Goal:** Establish the real current state before modifying production behavior.

## A1. Repository inventory

- [ ] **`[CODE]`** Locate and document:
  - Fastify bootstrap and logger configuration
  - Request-ID behavior, if any
  - Global error handlers
  - Authentication hooks and session lookup
  - Kysely database initialization
  - Existing health endpoints
  - Existing metrics or observability packages
  - Existing Sentry configuration
  - Next.js instrumentation files
  - BFF proxy helper functions and header forwarding
  - Dockerfiles and Compose files
  - Render configuration
  - Production environment templates
  - Migration execution path
  - Existing backup scripts
  - Existing `app_events` implementation
  - Existing email/Resend integration
  - Current production logging destinations
  - Current `13-operator-guide.md` procedures

- [ ] **`[CODE]`** Produce a short implementation inventory in the pull request or working notes:
  - What already exists and is usable
  - What exists but is incomplete
  - What must be added
  - Any contradictions between docs and current code

- [ ] **`[CODE]`** Confirm whether the app is still deployed through Render anywhere. Do not remove the Render configuration merely because Stage 1 targets a home server.

## A2. Operational risk check

- [ ] **`[VERIFY]`** Identify whether any production secrets are currently tracked by Git.
- [ ] **`[VERIFY]`** Identify whether PostgreSQL or any admin tool is currently bound to `0.0.0.0`.
- [ ] **`[VERIFY]`** Identify whether logs currently contain cookies, passwords, verification URLs, database URLs, or full authorization headers.
- [ ] **`[VERIFY]`** Identify whether Docker volumes and database data persist across container recreation.
- [ ] **`[VERIFY]`** Confirm the actual host OS and Docker runtime intended for Stage 1.

## A3. Decision lock

- [ ] **`[DECISION]`** Resolve the decisions listed in Section 7.
- [ ] **`[CODE]`** Record confirmed decisions in `.claude/memory/architecture-decisions.md`.
- [ ] **`[CODE]`** Add a short `Stage 1 production operations` entry to the repository’s product/architecture memory if that convention already exists.

### Stop point

Stop and show the owner:

- Inventory findings
- Security-sensitive findings
- Required provider accounts
- Proposed Compose topology
- Final decision list

Do not proceed with network exposure or external-service configuration until the owner decisions are explicit.

---

# Batch B — Production runtime, configuration, and release identity

**Goal:** Make production startup deterministic, validated, and attributable to a specific release.

## B1. Centralized configuration schemas

- [ ] **`[CODE]`** Create or consolidate Zod schemas for backend production configuration.
- [ ] **`[CODE]`** Create or consolidate Zod schemas for Next.js server-side production configuration.
- [ ] **`[CODE]`** Validate configuration during process startup, before accepting traffic.
- [ ] **`[CODE]`** Fail fast with a concise error listing missing or invalid variable names, never their secret values.
- [ ] **`[CODE]`** Distinguish required variables by environment:
  - development
  - test
  - production
- [ ] **`[CODE]`** Validate at minimum:
  - `NODE_ENV`
  - application environment name
  - public base URL
  - API base/internal URL
  - database URL
  - session/auth secrets
  - proxy trust configuration
  - Resend configuration when email is enabled
  - Sentry configuration when Sentry is enabled
  - allowed operator/admin identity configuration already used by Doc 14
  - release identifier
- [ ] **`[CODE]`** Add or update `.env.example` files with comments and safe placeholder values.
- [ ] **`[CODE]`** Ensure client-exposed variables are explicitly separated from server-only variables.

## B2. Release identity

- [ ] **`[CODE]`** Introduce a single release identifier, for example:
  - `APP_RELEASE`
  - value generated from Git SHA, version, or both
- [ ] **`[CODE]`** Include the release in:
  - API logs
  - Sentry events
  - metrics labels only where cardinality remains bounded
  - health/readiness response
  - operator-visible build information
- [ ] **`[CODE]`** Ensure the release is injected at build/deploy time rather than manually edited.
- [ ] **`[CODE]`** Add a safe `/version` or equivalent owner-readable endpoint if no appropriate build-info surface exists.
- [ ] **`[VERIFY]`** Demonstrate that the running deployment reports the expected Git commit.

## B3. Production Docker behavior

- [ ] **`[INFRA]`** Create or update a production Compose configuration without breaking local development.
- [ ] **`[INFRA]`** Use explicit service names and private networks.
- [ ] **`[INFRA]`** Add restart policies appropriate for a continuously running home server.
- [ ] **`[INFRA]`** Add container health checks once Batch E health endpoints exist.
- [ ] **`[INFRA]`** Ensure PostgreSQL data uses a persistent volume.
- [ ] **`[INFRA]`** Ensure observability data uses bounded persistent volumes where required.
- [ ] **`[INFRA]`** Prevent PostgreSQL, Prometheus, Loki, exporters, and internal API ports from being published publicly.
- [ ] **`[INFRA]`** Use the existing one-shot migration service or an explicit documented `node-pg-migrate` step.
- [ ] **`[INFRA]`** Do not run development servers in production.
- [ ] **`[INFRA]`** Configure graceful shutdown so active requests and database connections can close cleanly.
- [ ] **`[INFRA]`** Add log rotation or centralized log shipping so Docker JSON logs cannot grow without bound.
- [ ] **`[VERIFY]`** Recreate all containers and confirm application/database persistence.

## B4. Deployment script

- [ ] **`[CODE]`** Add one documented Stage 1 deployment entry point, for example:
  - `pnpm ops:deploy`
  - or a script under `scripts/ops/`
- [ ] **`[CODE]`** The deployment process must:
  1. verify a clean or explicitly approved Git state
  2. record the release
  3. build images
  4. run migrations
  5. start services
  6. wait for readiness
  7. run a smoke check
  8. print the deployed release
- [ ] **`[CODE]`** Fail the deployment when migration, readiness, or smoke checks fail.
- [ ] **`[CODE]`** Do not print secrets.

## B5. Rollback baseline

- [ ] **`[CODE]`** Document how to redeploy the prior image or Git tag.
- [ ] **`[CODE]`** Distinguish:
  - application rollback
  - database migration rollback
- [ ] **`[CODE]`** Do not claim destructive SQL migrations are automatically reversible.
- [ ] **`[CODE]`** Require a pre-deployment backup for migrations that alter or remove production data.

### Definition of done

- Production configuration fails fast and safely.
- A release is visible in logs, health output, and Sentry configuration.
- Compose services restart cleanly.
- Database data survives full container recreation.
- Deployment and rollback procedures are executable and documented.

---

# Batch C — Structured logging and request correlation

**Goal:** Make every production request diagnosable across the public Next.js layer and Fastify API.

## C1. Canonical log schema

- [ ] **`[CODE]`** Define a shared structured logging schema or documented field convention.
- [ ] **`[CODE]`** Include these fields where relevant:
  - timestamp
  - severity
  - service name
  - environment
  - release
  - request ID
  - trace ID when available
  - normalized route
  - HTTP method
  - status code
  - duration in milliseconds
  - internal user ID after authentication
  - error type
  - safe error message
  - database or external-service operation name
- [ ] **`[CODE]`** Keep development pretty-printing separate from production JSON output.
- [ ] **`[CODE]`** Ensure multiline stack traces remain machine-ingestible.

## C2. Redaction

- [ ] **`[CODE]`** Configure Pino redaction for sensitive headers and body fields.
- [ ] **`[CODE]`** Add tests proving sensitive values do not appear in serialized logs.
- [ ] **`[CODE]`** Avoid logging complete request/response bodies globally.
- [ ] **`[CODE]`** Allow deliberate safe event fields for important operations rather than blanket payload logging.
- [ ] **`[CODE]`** Ensure verification links and tokens are not logged in production after real email delivery is enabled.

## C3. Request-ID lifecycle

- [ ] **`[CODE]`** Accept a valid incoming `x-request-id` from the trusted Next.js BFF.
- [ ] **`[CODE]`** Generate a request ID when one is absent or invalid.
- [ ] **`[CODE]`** Return `x-request-id` in API responses.
- [ ] **`[CODE]`** Generate or preserve a request ID at the public Next.js boundary.
- [ ] **`[CODE]`** Forward the same request ID through every BFF proxy request to Fastify.
- [ ] **`[CODE]`** Include the same request ID in:
  - Next.js server logs
  - Fastify request logs
  - error responses where safe
  - Sentry tags/context
- [ ] **`[CODE]`** Do not use request IDs as Prometheus metric labels.

## C4. Request completion logs

- [ ] **`[CODE]`** Log one canonical completion event per API request.
- [ ] **`[CODE]`** Record normalized route, status, and duration.
- [ ] **`[CODE]`** Reduce duplicate start/end noise unless both are operationally useful.
- [ ] **`[CODE]`** Ensure expected 4xx responses are not logged as server crashes.
- [ ] **`[CODE]`** Log unexpected 5xx failures at error level with stack trace and correlation fields.

## C5. Domain-operation logs

Add concise structured events for high-value operations only.

- [ ] **`[CODE]`** Authentication:
  - signup accepted/rejected
  - login succeeded/failed
  - account lockout or rate-limit activation
  - email verification succeeded/failed
- [ ] **`[CODE]`** Workout writes:
  - workout started/completed
  - set write failed
  - historical edit completed
  - exercise merge completed, if already implemented
- [ ] **`[CODE]`** Import/export:
  - import started/completed/failed
  - export completed/failed
- [ ] **`[CODE]`** Email:
  - provider accepted/rejected
  - provider request ID where available
- [ ] **`[CODE]`** Never log raw workout CSV contents or passwords.

## C6. Centralized log collection

Recommended Stage 1 stack:

- Grafana
- Loki
- Grafana Alloy or another supported Loki log collector

Tasks:

- [ ] **`[INFRA]`** Add Loki to the private observability network.
- [ ] **`[INFRA]`** Add Alloy/log collection for application and infrastructure container logs.
- [ ] **`[INFRA]`** Configure bounded retention.
- [ ] **`[INFRA]`** Add stable low-cardinality labels:
  - service
  - environment
  - level
  - container
- [ ] **`[INFRA]`** Do not label logs by user ID or request ID. Those remain searchable JSON fields.
- [ ] **`[INFRA]`** Add Loki as a Grafana data source through provisioned configuration.
- [ ] **`[INFRA]`** Provision a basic log dashboard or saved queries for:
  - all 5xx errors
  - one request ID
  - one internal user ID
  - authentication failures
  - email failures
  - events from the current release
- [ ] **`[VERIFY]`** Restart an application container and confirm older logs remain searchable.
- [ ] **`[VERIFY]`** Search one request across the BFF and API using the same request ID.

### Definition of done

A reported failure can be located through request ID, user ID, route, time, and release without searching raw terminal output.

---

# Batch D — Sentry error tracking

**Goal:** Capture actionable frontend and backend exceptions with source maps, release attribution, and privacy controls.

## D1. Next.js integration

- [ ] **`[CODE]`** Integrate the current official Sentry SDK for Next.js.
- [ ] **`[CODE]`** Cover:
  - browser runtime
  - Next.js server runtime
  - edge runtime only where the application actually uses it
- [ ] **`[CODE]`** Upload production source maps securely during build/deployment.
- [ ] **`[CODE]`** Set:
  - environment
  - release
  - request ID where available
  - internal user ID after authentication
- [ ] **`[CODE]`** Do not send passwords, cookies, tokens, request bodies, or email addresses by default.
- [ ] **`[CODE]`** Disable session replay for Stage 1 unless the owner explicitly enables it.
- [ ] **`[CODE]`** Use conservative trace/error sample settings suitable for one user.

## D2. Fastify integration

- [ ] **`[CODE]`** Integrate Sentry with the Fastify process.
- [ ] **`[CODE]`** Capture unhandled exceptions and rejected promises.
- [ ] **`[CODE]`** Capture unexpected route failures from the global error handler.
- [ ] **`[CODE]`** Preserve the request ID, normalized route, environment, release, and internal user ID.
- [ ] **`[CODE]`** Avoid double-reporting the same exception from multiple handlers.
- [ ] **`[CODE]`** Flush pending Sentry events during graceful shutdown.

## D3. Operational verification

- [ ] **`[OWNER]`** Create/configure the Sentry project and provide required secrets.
- [ ] **`[VERIFY]`** Trigger one controlled frontend test exception.
- [ ] **`[VERIFY]`** Trigger one controlled backend test exception.
- [ ] **`[VERIFY]`** Confirm:
  - readable source-mapped stack trace
  - correct release
  - correct environment
  - request ID
  - no secret or cookie leakage
- [ ] **`[CODE]`** Remove or disable temporary test-failure routes before closing the batch.
- [ ] **`[VERIFY]`** Confirm a new deployment creates a new Sentry release.

### Definition of done

A browser or API exception appears once in Sentry, points to readable application code, identifies the deployed release, and can be correlated with logs.

---

# Batch E — Health checks, metrics, dashboards, and alerts

**Goal:** Make application, host, container, and database health visible before remote access is enabled.

## E1. Health endpoints

Implement separate liveness and readiness semantics.

### Fastify

- [ ] **`[CODE]`** Add `GET /health/live`.
- [ ] **`[CODE]`** Liveness must verify only that the API process can respond.
- [ ] **`[CODE]`** Add `GET /health/ready`.
- [ ] **`[CODE]`** Readiness must verify at minimum:
  - required configuration loaded
  - database query succeeds within a strict timeout
  - application is not shutting down
- [ ] **`[CODE]`** Return a small safe payload:
  - status
  - service
  - environment
  - release
  - timestamp
- [ ] **`[CODE]`** Do not return database URLs, secrets, stack traces, or detailed dependency internals.
- [ ] **`[CODE]`** Return a non-2xx status when not ready.

### Next.js/public path

- [ ] **`[CODE]`** Add a public health route that exercises the deployed public web/BFF path and the API readiness path.
- [ ] **`[CODE]`** Keep the response minimal.
- [ ] **`[VERIFY]`** Confirm the public readiness route fails when PostgreSQL is unavailable.
- [ ] **`[VERIFY]`** Confirm liveness can remain healthy while readiness is unhealthy.

## E2. API metrics

Use Prometheus-compatible metrics.

- [x] **`[CODE]`** Add default Node.js process metrics.
- [x] **`[CODE]`** Add HTTP request metrics:
  - request count
  - response count by status class
  - duration histogram
  - in-flight requests
- [x] **`[CODE]`** Use normalized Fastify route templates.
- [ ] **`[CODE]`** Add limited domain/external-service counters:
  - email accepted/failed
  - authentication failures
  - CSV import success/failure
- [x] **`[CODE]`** Do not label metrics by user, request, session, workout, or exercise.
- [x] **`[CODE]`** Expose `/api/v1/metrics` only on an internal network or protected internal listener.
- [ ] **`[VERIFY]`** Confirm `/api/v1/metrics` is not reachable from the public hostname.

## E3. Infrastructure metrics

Recommended Stage 1 components:

- Prometheus
- node_exporter or host-equivalent exporter
- cAdvisor or Docker-compatible container metrics
- postgres_exporter
- Grafana

Tasks:

- [x] **`[INFRA]`** Add Prometheus with bounded retention.
- [x] **`[INFRA]`** Add host CPU, memory, disk, filesystem, and network metrics.
- [x] **`[INFRA]`** Add container CPU, memory, restart, and filesystem metrics.
- [x] **`[INFRA]`** Add PostgreSQL health, connection, transaction, lock, and database-size metrics.
- [ ] **`[INFRA]`** Use a dedicated least-privilege PostgreSQL monitoring user where supported.
- [x] **`[INFRA]`** Keep all exporter endpoints private.
- [x] **`[INFRA]`** Provision data sources automatically in Grafana.

## E4. Dashboards

Provision at minimum three dashboards.

### Service overview

- [x] Request rate
- [x] 2xx/4xx/5xx rate
- [x] p50/p95/p99 API latency
- [x] slowest normalized routes
- [x] in-flight requests
- [x] current release
- [x] API/container uptime

### Host and containers

- [x] CPU utilization
- [x] memory and swap
- [x] disk usage by filesystem
- [x] disk I/O
- [x] network throughput
- [x] container CPU and memory
- [x] container restart count (best-effort cAdvisor signal; verify against Docker state)

### PostgreSQL

- [x] availability
- [x] active connections
- [x] connection saturation
- [x] transaction rate
- [x] deadlocks
- [x] long-running transactions where exporter support exists (query text intentionally excluded)
- [x] database size
- [x] lock activity

Dashboard visual design should be functional and compact. Do not spend application-UI polish time on Grafana styling.

## E5. Minimal alerts

Use Grafana Alerting or the existing selected alert mechanism. Stage 1 needs only actionable critical alerts.

- [ ] **`[INFRA]`** Alert when public readiness is unavailable for more than five minutes.
- [ ] **`[INFRA]`** Alert when PostgreSQL is unavailable.
- [ ] **`[INFRA]`** Alert when the API 5xx rate exceeds a meaningful threshold for at least five minutes.
- [ ] **`[INFRA]`** Alert when disk usage exceeds 85%.
- [ ] **`[INFRA]`** Alert when a critical container repeatedly restarts.
- [ ] **`[INFRA]`** Alert when the most recent successful backup becomes stale after Batch F.
- [ ] **`[OWNER]`** Configure one notification channel.
- [ ] **`[VERIFY]`** Trigger and receive one test alert.
- [ ] **`[VERIFY]`** Confirm alerts contain:
  - affected service
  - condition
  - duration
  - dashboard/log link when possible
  - immediate first action

### Definition of done

The owner can see service latency, errors, host pressure, container state, and PostgreSQL health in one private Grafana installation and receives a tested critical alert.

---

# Batch F — PostgreSQL backups and restore verification

**Goal:** Protect user history against host loss, disk failure, accidental deletion, and bad deployment changes.

## F1. Backup design

Recommended Stage 1 design:

1. `pg_dump` in PostgreSQL custom format
2. backup produced on a schedule
3. encrypted and transferred through Restic
4. repository stored off the application host
5. retention enforced
6. success/failure exposed to monitoring
7. restore test performed into a disposable database

- [ ] **`[DECISION]`** Confirm the off-host Restic repository.
- [ ] **`[OWNER]`** Provide repository credentials through the production secret mechanism.
- [ ] **`[CODE]`** Add versioned backup scripts under an operations directory.
- [ ] **`[CODE]`** Use `pg_dump --format=custom` or an equivalently restorable format.
- [ ] **`[CODE]`** Include timestamp, environment, database identity, and release metadata in the backup manifest.
- [ ] **`[CODE]`** Do not print the database password or repository key.
- [ ] **`[CODE]`** Fail nonzero when dump, upload, verification, or retention fails.
- [ ] **`[CODE]`** Prevent overlapping backup jobs.

## F2. Schedule and retention

Suggested Stage 1 policy:

- daily backups
- retain 7 daily snapshots
- retain 4 weekly snapshots
- retain 6 monthly snapshots

Tasks:

- [ ] **`[INFRA]`** Configure the scheduler appropriate to the confirmed host OS.
- [ ] **`[INFRA]`** Ensure the schedule survives reboot.
- [ ] **`[INFRA]`** Ensure backups continue when application containers are recreated.
- [ ] **`[INFRA]`** Store temporary dumps in a location with restricted permissions.
- [ ] **`[INFRA]`** Remove temporary plaintext dumps after successful encrypted transfer.

## F3. Backup observability

- [ ] **`[CODE]`** Emit structured backup logs.
- [ ] **`[CODE]`** Export at minimum:
  - last successful backup timestamp
  - last backup duration
  - last backup size
  - last backup result
- [ ] **`[INFRA]`** Add a Grafana backup panel.
- [ ] **`[INFRA]`** Add the stale-backup alert from Batch E.
- [ ] **`[VERIFY]`** Simulate one failed backup and confirm the failure is visible.

## F4. Restore procedure

- [ ] **`[CODE]`** Add a documented restore script or exact command sequence.
- [ ] **`[CODE]`** Require an explicit destination database; never default to overwriting production.
- [ ] **`[CODE]`** Include a safety confirmation before a production restore.
- [ ] **`[CODE]`** Document:
  - how to list snapshots
  - how to retrieve a snapshot
  - how to create a disposable restore database
  - how to restore with `pg_restore`
  - how to run application migrations if required
  - how to verify row counts and critical flows
- [ ] **`[VERIFY]`** Restore the latest backup into a disposable database.
- [ ] **`[VERIFY]`** Point a temporary app instance or verification script at the restored database.
- [ ] **`[VERIFY]`** Confirm at minimum:
  - users exist
  - workout sessions exist
  - exercises exist
  - sets exist
  - authentication-related schema exists
  - `app_events` exists
  - migration state is coherent
- [ ] **`[VERIFY]`** Record the actual restore duration.

## F5. Recovery targets

Record Stage 1 internal targets:

- **RPO:** no more than 24 hours of data loss
- **RTO:** restore service within 4 hours

These are internal engineering targets, not customer contractual guarantees.

### Stop point

Stop and show the owner:

- successful backup log
- off-host snapshot listing
- Grafana backup status
- restore commands
- restored database verification
- measured restore duration

Do not expose the service remotely until this restore test has passed.

---

# Batch G — Real email delivery and authentication verification

**Goal:** Replace log-only verification links with real production email and verify the complete auth loop.

## G1. Resend production setup

- [ ] **`[OWNER]`** Create or confirm the Resend account.
- [ ] **`[OWNER]`** Verify the sending domain.
- [ ] **`[OWNER]`** Configure SPF and DKIM records.
- [ ] **`[OWNER]`** Configure a basic DMARC policy if the domain does not already have one.
- [ ] **`[OWNER]`** Provide:
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
  - production `APP_BASE_URL`
- [ ] **`[CODE]`** Validate these variables at startup when production email is enabled.

## G2. Safe email instrumentation

- [ ] **`[CODE]`** Log provider acceptance/failure with:
  - request ID
  - provider message/request ID
  - email operation type
  - status
  - duration
- [ ] **`[CODE]`** Do not log:
  - verification token
  - full verification URL
  - API key
  - complete message body
- [ ] **`[CODE]`** Increment email success/failure metrics.
- [ ] **`[CODE]`** Capture unexpected provider failures in Sentry.

## G3. End-to-end verification

- [ ] **`[VERIFY]`** Sign up through the production public path.
- [ ] **`[VERIFY]`** Confirm the email arrives in a real inbox.
- [ ] **`[VERIFY]`** Click the verification link.
- [ ] **`[VERIFY]`** Confirm:
  - the link uses the production hostname
  - the token is accepted once
  - `emailVerified` becomes true
  - repeat use behaves safely
  - expired/invalid tokens return a controlled response
  - logs contain no token
- [ ] **`[VERIFY]`** Confirm the pending verification UI behaves as designed after verification.
- [ ] **`[VERIFY]`** Confirm rate limiting and account-lockout behavior from Doc 12 is active in the real deployment.
- [ ] **`[VERIFY]`** Confirm `API_TRUST_PROXY` matches the selected tunnel/reverse-proxy topology.

### Definition of done

A new production account can complete signup and email verification without reading server logs, and failures are observable without leaking the token.

---

# Batch H — Secure remote exposure and external uptime monitoring

**Goal:** Make the service remotely reachable without exposing internal databases or operator tooling.

## H1. Network model

- [ ] **`[DECISION]`** Confirm one remote-access model:
  - Cloudflare Tunnel with owner-only access for Stage 1
  - Tailscale private access
  - another reviewed reverse-proxy/tunnel design
- [ ] **`[INFRA]`** Do not implement raw PostgreSQL port forwarding.
- [ ] **`[INFRA]`** Avoid raw application port forwarding unless the owner explicitly accepts and documents the risk.
- [ ] **`[INFRA]`** Ensure only the intended web entry point is reachable.
- [ ] **`[INFRA]`** Keep Grafana and SSH/private management behind private access.
- [ ] **`[INFRA]`** Configure firewall rules appropriate to the host OS.
- [ ] **`[INFRA]`** Ensure the tunnel/reverse-proxy process starts automatically after reboot.

## H2. HTTPS and proxy correctness

- [ ] **`[INFRA]`** Configure HTTPS for the production hostname.
- [ ] **`[CODE]`** Confirm secure-cookie behavior through the selected proxy.
- [ ] **`[CODE]`** Confirm forwarded protocol and client-IP handling.
- [ ] **`[CODE]`** Configure trusted proxies narrowly; do not blindly trust arbitrary forwarded headers.
- [ ] **`[VERIFY]`** Confirm:
  - HTTP redirects to HTTPS where applicable
  - cookies are secure in production
  - login persists across page reloads
  - logout invalidates the session
  - CSRF/origin protections still behave correctly
  - the public host cannot reach internal ports

## H3. External uptime monitoring

The uptime monitor must run outside the home server and home network.

- [ ] **`[OWNER]`** Configure an external uptime provider.
- [ ] **`[OWNER]`** Monitor the public readiness endpoint at a reasonable interval.
- [ ] **`[OWNER]`** Configure the tested alert destination.
- [ ] **`[VERIFY]`** Stop the public web/API service and confirm the external monitor alerts.
- [ ] **`[VERIFY]`** Restore service and confirm recovery is detected.
- [ ] **`[VERIFY]`** Record:
  - check interval
  - failure threshold
  - notification delay
  - monitored URL

## H4. Reboot recovery

- [ ] **`[VERIFY]`** Reboot the host.
- [ ] **`[VERIFY]`** Confirm automatic recovery of:
  - Docker runtime
  - PostgreSQL
  - application
  - tunnel/reverse proxy
  - monitoring stack
  - backup scheduler
- [ ] **`[VERIFY]`** Confirm the application becomes ready without manual shell commands.
- [ ] **`[VERIFY]`** Confirm the release and data remain correct.

### Definition of done

The owner can reach the application remotely over HTTPS, while PostgreSQL and operational services remain private. External monitoring detects real loss of reachability.

---

# Batch I — Private operator access and operational runbooks

**Goal:** Give the owner safe visibility into the system without creating an unsafe public admin surface.

## I1. Database inspection

- [ ] **`[CODE]`** Create a documented read-only PostgreSQL role for routine inspection.
- [ ] **`[CODE]`** Grant only the required read privileges.
- [ ] **`[CODE]`** Document how new tables receive read permissions if PostgreSQL defaults do not cover them.
- [ ] **`[INFRA]`** Permit connection only through:
  - Tailscale
  - SSH tunnel
  - local host access
  - another explicitly private path
- [ ] **`[INFRA]`** Do not expose port 5432 publicly.
- [ ] **`[OWNER]`** Configure DBeaver, `psql`, or another chosen client using the read-only role.
- [ ] **`[VERIFY]`** Confirm the role can inspect users, workouts, exercises, sets, and `app_events`.
- [ ] **`[VERIFY]`** Confirm the role cannot update or delete rows.

Routine inspection should use the read-only role. Emergency write access should remain separate and deliberate.

## I2. Grafana access

- [ ] **`[INFRA]`** Protect Grafana through private networking or strong access control.
- [ ] **`[OWNER]`** Change all default credentials.
- [ ] **`[INFRA]`** Disable anonymous admin access.
- [ ] **`[INFRA]`** Persist Grafana provisioning and required state.
- [ ] **`[VERIFY]`** Confirm Grafana is inaccessible from an unauthenticated public client.

## I3. Runbooks

Update `13-operator-guide.md` or create a dedicated `docs/ops/` directory if that is cleaner. Avoid duplicating contradictory procedures.

Required runbooks:

- [ ] **`[CODE]`** Production deployment
- [ ] **`[CODE]`** Application rollback
- [ ] **`[CODE]`** Database migration procedure
- [ ] **`[CODE]`** Backup verification
- [ ] **`[CODE]`** Database restore
- [ ] **`[CODE]`** Host reboot recovery
- [ ] **`[CODE]`** Sentry/log investigation using request ID
- [ ] **`[CODE]`** High-latency investigation
- [ ] **`[CODE]`** Disk-space emergency
- [ ] **`[CODE]`** PostgreSQL unavailable
- [ ] **`[CODE]`** Email delivery failure
- [ ] **`[CODE]`** Secret rotation
- [ ] **`[CODE]`** Lost or compromised operator device
- [ ] **`[CODE]`** Incident timeline template

Each runbook must contain:

1. symptom
2. first checks
3. exact commands or dashboard locations
4. safe mitigation
5. escalation/recovery path
6. verification that service is healthy again

## I4. Minimal incident process

- [ ] **`[CODE]`** Define Stage 1 incident severities:
  - **SEV-1:** data loss, suspected compromise, or complete service outage
  - **SEV-2:** major function unavailable or repeated write failures
  - **SEV-3:** degraded performance or isolated noncritical failure
- [ ] **`[CODE]`** Add a simple incident record template:
  - start time
  - detection source
  - affected release
  - symptoms
  - actions taken
  - recovery time
  - root cause
  - preventive follow-up

### Definition of done

The owner can inspect production safely, investigate a request, deploy, roll back, restore, and recover from common failures using written procedures.

---

# Batch J — Stage 1 smoke test, performance baseline, and launch gate

**Goal:** Validate the complete production system from outside the host before declaring Stage 1 ready.

## J1. Automated smoke script

- [ ] **`[CODE]`** Add a production-safe smoke script that checks:
  - public readiness
  - public web page load
  - API readiness
  - reported release
  - authentication endpoint behavior without destructive changes
- [ ] **`[CODE]`** Allow optional authenticated checks using a dedicated owner test account.
- [ ] **`[CODE]`** Do not store credentials in the script or repository.
- [ ] **`[CODE]`** Exit nonzero on failure.

## J2. Owner workflow smoke test

Run from a remote device on a different network, not from the host LAN.

- [ ] Open the application.
- [ ] Sign up a fresh test account.
- [ ] Receive and complete email verification.
- [ ] Log in.
- [ ] Start or resume a workout.
- [ ] Add an exercise.
- [ ] Add, edit, and delete a set.
- [ ] Reorder an exercise block if currently supported.
- [ ] End the workout.
- [ ] Open history and the session detail.
- [ ] View progress charts.
- [ ] Export CSV.
- [ ] Import a valid CSV into a disposable test account or controlled dataset.
- [ ] Log out.
- [ ] Log back in.
- [ ] Confirm no unexpected browser-console errors.
- [ ] Confirm relevant logs, metrics, and Sentry context are present.
- [ ] Confirm data persists after application-container restart.

## J3. Basic load baseline

This is not a public-scale capacity test.

- [ ] **`[CODE]`** Add a small reproducible load test using an existing approved tool such as k6 or Autocannon.
- [ ] **`[CODE]`** Exercise:
  - health/readiness
  - dashboard/API reads
  - a safe authenticated read path
  - a controlled write path against test data
- [ ] **`[VERIFY]`** Run a short test with approximately 10 concurrent virtual users.
- [ ] **`[VERIFY]`** Record:
  - request rate
  - p50/p95/p99 latency
  - error rate
  - API CPU and memory
  - PostgreSQL connections
  - host CPU and memory
- [ ] **`[VERIFY]`** Confirm:
  - no unhandled exceptions
  - no connection-pool exhaustion
  - no container restart
  - no persistent memory growth after the test
- [ ] **`[CODE]`** Store results in a dated operations note without committing secrets or personal data.

Do not invent strict public-launch performance promises from this small test. It establishes a baseline for later comparison.

## J4. Security exposure check

- [ ] **`[VERIFY]`** From an external network, confirm only intended web ports/hostnames respond.
- [ ] **`[VERIFY]`** Confirm PostgreSQL does not respond publicly.
- [ ] **`[VERIFY]`** Confirm Grafana, Loki, Prometheus, metrics, and exporter endpoints do not respond publicly.
- [ ] **`[VERIFY]`** Confirm production error responses do not expose stack traces.
- [ ] **`[VERIFY]`** Confirm logs contain no tested password, cookie, verification token, or API key.
- [ ] **`[VERIFY]`** Confirm production source maps are available to Sentry but not casually exposed beyond the chosen build behavior.
- [ ] **`[VERIFY]`** Confirm rate limiting and account lockout on the live path.

## J5. Backup and alert re-check

- [ ] **`[VERIFY]`** Confirm the newest backup is off-host.
- [ ] **`[VERIFY]`** Confirm the backup-staleness alert sees the latest success.
- [ ] **`[VERIFY]`** Confirm one Grafana alert has been received.
- [ ] **`[VERIFY]`** Confirm one external uptime alert has been received.
- [ ] **`[VERIFY]`** Confirm the restore procedure remains accurate after all final migrations.

---

# Final Stage 1 launch checklist

Every item below must be checked before Stage 1 is marked complete.

## Application and deployment

- [ ] Production build is reproducible.
- [ ] Production configuration is validated with Zod.
- [ ] Release identifier maps to a Git commit.
- [ ] Migrations are applied through a documented process.
- [ ] Rollback procedure exists.
- [ ] Host reboot recovery succeeds.

## Security and access

- [ ] HTTPS is active.
- [ ] PostgreSQL is private.
- [ ] Grafana and metrics are private.
- [ ] Secrets are not committed.
- [ ] Secure cookies work through the proxy/tunnel.
- [ ] Trusted-proxy configuration is correct.
- [ ] Rate limiting and lockout are active.
- [ ] Read-only database access is available privately.

## Logging and errors

- [ ] Structured JSON logs are active.
- [ ] Sensitive fields are redacted.
- [ ] Request IDs cross Next.js and Fastify.
- [ ] Logs are persistent and searchable in Loki.
- [ ] Frontend errors reach Sentry.
- [ ] Backend errors reach Sentry.
- [ ] Source maps and releases are correct.
- [ ] A request can be traced from user report to logs and Sentry.

## Monitoring

- [ ] Liveness endpoint works.
- [ ] Readiness endpoint checks PostgreSQL.
- [ ] Public readiness path works.
- [ ] Prometheus collects API metrics.
- [ ] Host metrics are visible.
- [ ] Container metrics are visible.
- [ ] PostgreSQL metrics are visible.
- [ ] Grafana dashboards are provisioned.
- [ ] Critical alert channel is tested.
- [ ] External uptime monitor is tested.

## Data resilience

- [ ] Daily encrypted backups run automatically.
- [ ] Backups are stored off-host.
- [ ] Retention is configured.
- [ ] Backup success is monitored.
- [ ] A failed backup is visible.
- [ ] A real restore into a disposable database passed.
- [ ] RPO and RTO targets are recorded.

## Email and authentication

- [ ] Resend production delivery works.
- [ ] Domain authentication is configured.
- [ ] Signup email arrives.
- [ ] Verification link uses the production hostname.
- [ ] Verification updates the account.
- [ ] Tokens do not appear in logs.

## Operational readiness

- [ ] Deployment runbook exists.
- [ ] Rollback runbook exists.
- [ ] Backup and restore runbooks exist.
- [ ] Incident runbook exists.
- [ ] Remote owner workflow smoke test passed.
- [ ] Basic load baseline completed.
- [ ] No known Stage 1 blocker remains undocumented.

---

# Required implementation evidence

Before closing this document, attach or reference:

1. Final production architecture diagram
2. Final Compose service list and exposed-port list
3. Screenshot of the Grafana service dashboard
4. Screenshot of the Grafana host/container dashboard
5. Screenshot of the Grafana PostgreSQL dashboard
6. Screenshot of searchable correlated logs
7. Screenshot of one source-mapped Sentry frontend event
8. Screenshot of one source-mapped Sentry backend event
9. External uptime monitor success and tested alert
10. Backup snapshot listing
11. Successful restore output and verification results
12. Successful production email-verification flow
13. Remote smoke-test result
14. Basic load-test result
15. Final Stage 1 checklist with every accepted exception documented

Do not include secret values in screenshots or committed evidence.

---

# Definition of done

Stage 1 is done when the owner can use the application remotely as a real production service and can:

- verify that it is healthy,
- detect that it is unavailable,
- identify which release is running,
- find a failed request,
- inspect an exception,
- observe latency and resource usage,
- receive a critical alert,
- confirm a recent off-host backup,
- restore the database,
- complete real email verification,
- reboot the host without manual recovery,
- and follow written deployment and incident procedures.

Minor product-polish tasks may remain. No unresolved issue may remain that threatens authentication, workout-data integrity, recovery, remote security, or the operator’s ability to diagnose a failure.
