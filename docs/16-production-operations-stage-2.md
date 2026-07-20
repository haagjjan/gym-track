# Production Operations & Launch Readiness — Stage 2

**For:** Codex or Claude Code  
**Stage:** Controlled private beta  
**Status:** Ready for implementation after Stage 1 completion  
**Follows:** `15-production-operations-stage-1.md`  
**Related:** `12-saas-hardening.md`, `13-operator-guide.md`, `14-ui-polish-and-ops-round-2.md`  
**Assumes:** Stage 1 is complete, the owner has used the deployed application remotely, and no unresolved issue threatens authentication, workout-data integrity, backup recovery, or secure remote access.

---

## 1. Purpose

Stage 1 establishes a production service that one owner can operate safely. Stage 2 prepares that service for a controlled private beta with a small group of real users.

The operational problem changes materially at this stage.

During personal testing, the owner already knows:

- what they clicked,
- when a failure occurred,
- which account was involved,
- what data should exist,
- and whether a strange behavior was caused by deliberate testing.

During private beta, those assumptions disappear. Beta users will report incomplete symptoms, use unfamiliar devices and browsers, abandon workflows halfway through, make mistakes, create malformed data, trigger edge cases, and expect the operator to protect their training history.

Stage 2 must therefore make the service:

- supportable,
- auditable,
- privacy-conscious,
- recoverable at a smaller recovery point,
- observable across complete user journeys,
- measurable as a product,
- resistant to ordinary abuse,
- and validated under realistic beta usage.

This document is an implementation plan. Work through it in the specified order.

---

## 2. Stage 2 outcome

Stage 2 is complete only when the owner can invite a controlled set of beta users and confidently:

- determine whether the service is healthy,
- diagnose a user-reported problem from limited information,
- inspect a user account through a safe internal interface,
- distinguish product misuse from a software defect,
- see where latency occurs across the web, BFF, API, database, and email provider,
- identify which release introduced a regression,
- monitor signup, verification, first-workout, and retention funnels,
- audit privileged operator actions,
- export or delete user data through controlled workflows,
- restore the database to a recent point with substantially less than one day of data loss,
- detect authentication abuse and suspicious operational patterns,
- communicate with beta users during incidents,
- and operate within documented beta capacity and reliability targets.

Stage 2 remains a **single-region, primarily single-host deployment** unless Stage 1 evidence proves that architecture insufficient. Do not introduce distributed infrastructure merely because the application now has multiple users.

---

## 3. Entry criteria

Do not begin Stage 2 implementation until the Stage 1 launch checklist has been reviewed.

At minimum, confirm:

- [ ] HTTPS remote access works.
- [ ] PostgreSQL is not publicly exposed.
- [ ] Grafana, Prometheus, Loki, metrics, and exporters are private.
- [ ] Structured logs and request IDs work across Next.js and Fastify.
- [ ] Frontend and backend errors reach Sentry with release attribution.
- [ ] External uptime alerts have been tested.
- [ ] Host, container, API, and PostgreSQL metrics are visible.
- [ ] Real verification email delivery works.
- [ ] Daily encrypted off-host backups run.
- [ ] A real restore into a disposable database has succeeded.
- [ ] Deployment and rollback procedures are documented.
- [ ] The owner has completed at least several real remote workouts on the production system.
- [ ] No unresolved Stage 1 blocker is hidden in an unchecked exception.

If any item is false, return to Stage 1 rather than compensating with Stage 2 complexity.

---

## 4. Fixed architecture baseline

Do not replace these choices as part of Stage 2 unless a measured Stage 1 limitation requires a documented architectural decision.

| Piece | Choice |
|---|---|
| Framework | Next.js 15 App Router + React 19 |
| API | Existing Fastify backend |
| Database | PostgreSQL through the existing Prisma data layer |
| BFF | Existing Next.js proxy layer with cookie forwarding and server-side auth gating |
| Data fetching | TanStack Query |
| Validation | Zod at API and configuration boundaries |
| Styling | Tailwind CSS v4 using `DESIGN.md` tokens |
| Charts | Recharts |
| 3D | Three.js through `react-three-fiber` and `@react-three/drei` |
| Deployment | Docker-based production deployment on the existing home-hosted machine |
| Logging | Structured Pino logs centralized in Loki |
| Metrics | Prometheus-compatible application and infrastructure metrics |
| Dashboards | Grafana |
| Error tracking | Sentry |
| Email | Resend |
| Backups | PostgreSQL backups encrypted and copied off-host |
| Product events | Existing `app_events` foundation, extended deliberately |
| Package management | Existing pnpm workspace |

---

## 5. Scope boundaries

### Included in Stage 2

- Controlled beta enrollment and access management
- OpenTelemetry-based request tracing
- Better real-user performance monitoring
- Product analytics definitions and internal dashboard
- Internal user-support tooling
- Audit logging for privileged actions
- User data export and deletion workflows
- More frequent database recovery points
- Recovery drills and failure injection
- Security-event monitoring and abuse visibility
- Beta support and incident communication procedures
- Release safety improvements
- Staging or pre-production verification
- Feature flags or kill switches for risky features
- Capacity testing sized for a private beta
- Internal reliability targets and SLO dashboards
- Browser/device compatibility validation
- Operational evidence required before accepting more beta users

### Explicitly deferred to Stage 3

Do not implement these unless required to close a confirmed Stage 2 blocker:

- Open self-service public signup
- Public status page
- Public SLA commitments
- Multi-region deployment
- Automatic database failover
- Kubernetes
- Microservice decomposition
- Dedicated data warehouse
- Enterprise role hierarchy
- Multi-tenant organization accounts
- Public API and API keys
- Automated billing
- Large-scale customer-support system
- Full compliance certification
- 24/7 on-call rotation
- Multi-operator approval workflows
- Sophisticated fraud detection
- Advanced continuous profiling
- Public-scale queueing architecture
- Large-scale chaos engineering
- Full event-sourcing redesign
- Arbitrary production database editing

---

## 6. Work labels

Each task uses one or more labels:

- **`[CODE]`** — repository changes Codex/Claude Code can implement.
- **`[INFRA]`** — Docker, host, network, monitoring, or deployment configuration.
- **`[OWNER]`** — requires owner input, account creation, provider configuration, policy choice, or manual operation.
- **`[VERIFY]`** — must be demonstrated through commands, screenshots, logs, dashboards, or controlled tests.
- **`[DECISION]`** — stop and obtain an explicit owner decision before implementation if unresolved.
- **`[POLICY]`** — requires a written operational or privacy rule, not only code.
- **`[DATA]`** — changes event definitions, database schema, retention, or user-data workflows.

Do not silently choose legal language, retention periods, beta-user limits, support promises, deletion behavior, or incident communication rules.

---

## 7. Standing implementation rules

1. **Preserve Stage 1 controls.**  
   Stage 2 must extend the existing logging, monitoring, backup, and deployment foundation rather than create parallel systems.

2. **Every privileged operator action must be attributable.**  
   Record the actor, target, action, request ID, timestamp, result, and reason where appropriate.

3. **Internal support tooling must be safe by default.**  
   Read-only views first. Destructive or identity-sensitive actions require explicit confirmation.

4. **Do not expose unrestricted database access through the application.**

5. **Do not make email addresses routine telemetry labels.**  
   Use internal user IDs for logs, metrics, traces, and analytics joins.

6. **Do not put high-cardinality identifiers into Prometheus labels.**

7. **Do not collect product events without a defined purpose.**  
   Every event must have an owner, schema, trigger, and query use case.

8. **Do not use session replay by default.**  
   If later enabled for a specific beta investigation, mask text and inputs, obtain an explicit owner decision, and document the privacy implications.

9. **Do not allow support tooling to bypass domain validation.**

10. **Do not claim deletion is complete without documenting backup behavior.**

11. **Do not invite more users than the measured beta capacity.**

12. **Do not deploy an irreversible migration without a backup and rollback/recovery plan.**

13. **Do not treat a dashboard as an alert.**  
   Conditions requiring operator action must have an alert path.

14. **Do not treat traces as an excuse to log request bodies.**

15. **Do not promise beta users availability or support levels that are not operationally supported.**

---

## 8. Required owner decisions before implementation

Resolve these decisions in Batch A.

| Decision | Recommended Stage 2 default | Why it matters |
|---|---|---|
| Beta size | Start with 5–10 users; hard cap initially at 20 | Capacity and support load must remain controlled |
| Enrollment model | Invite-only | Prevents accidental public exposure |
| Beta duration | Four to eight weeks before Stage 3 review | Provides enough usage evidence |
| Support channel | One dedicated email address or private Discord/Slack channel | Centralizes user reports |
| Support response expectation | Best effort, no formal SLA | Avoids unsupported commitments |
| Product analytics retention | 12 months for aggregated/product events unless a shorter policy is preferred | Enough for retention cohorts |
| Operational log retention | 30 days for private beta | Better incident history than Stage 1 |
| Audit log retention | At least 12 months | Privileged actions must remain attributable |
| Account deletion grace period | Immediate logical disable, hard-delete workflow after a short configurable delay | Reduces accidental deletion risk |
| Backup recovery target | Suggested RPO 15–60 minutes, RTO 2 hours | Training data now belongs to other users |
| Tracing backend | Sentry tracing first; add Tempo only if needed | Avoid duplicate observability stacks |
| Feature flag approach | Simple server-side/database or environment-based flags | Enables kill switches without a large platform |
| Staging model | Same Compose topology on separate data and hostname | Validates production behavior safely |
| Beta terms/privacy notice | Minimal beta notice and privacy policy reviewed by owner | Users must understand data handling |
| Incident communication | Email/support channel message to affected users | Needed when data or access is affected |

Record decisions in:

- this document,
- `.claude/memory/architecture-decisions.md`,
- and the operator guide where operationally relevant.

---

# Batch A — Stage 1 review, beta inventory, and decision lock

**Goal:** Verify the real deployed state and define the beta operating envelope before adding new systems.

## A1. Stage 1 evidence review

- [ ] **`[VERIFY]`** Review every Stage 1 evidence item.
- [ ] **`[VERIFY]`** Confirm actual deployed versions of:
  - application
  - PostgreSQL
  - Grafana
  - Prometheus
  - Loki
  - Sentry SDKs
  - backup tooling
  - tunnel/reverse proxy
- [ ] **`[VERIFY]`** Confirm current retention settings.
- [ ] **`[VERIFY]`** Confirm current public and private ports.
- [ ] **`[VERIFY]`** Confirm current backup age and last restore date.
- [ ] **`[VERIFY]`** Confirm all production secrets are stored outside Git.
- [ ] **`[VERIFY]`** Confirm Stage 1 alerts are still firing and recovering correctly.

## A2. Beta risk inventory

- [ ] **`[CODE]`** Inspect current account lifecycle:
  - signup
  - verification
  - login/logout
  - password reset, if implemented
  - account lockout
  - session expiration
  - account deletion, if any
- [ ] **`[CODE]`** Inspect current admin/internal route protection.
- [ ] **`[CODE]`** Inspect current `app_events` schema and event usage.
- [ ] **`[CODE]`** Inspect current audit-event coverage.
- [ ] **`[CODE]`** Inspect existing historical edit and exercise-merge safeguards from Batch D.
- [ ] **`[CODE]`** Inspect CSV import behavior for duplicate, malformed, and large files.
- [ ] **`[CODE]`** Identify endpoints with destructive or bulk effects.
- [ ] **`[CODE]`** Identify data fields that contain personal information.
- [ ] **`[CODE]`** Identify data that must be included in export and deletion workflows.
- [ ] **`[CODE]`** Identify any direct production-only assumptions that prevent staging.

## A3. Stage 2 decision report

Produce a concise implementation report containing:

- Stage 1 gaps to close first
- Proposed beta size
- Proposed enrollment model
- Proposed support channel
- Proposed tracing implementation
- Proposed product-event changes
- Proposed internal-support route structure
- Proposed deletion semantics
- Proposed backup/PITR design
- Proposed staging topology
- Proposed feature-flag mechanism
- Expected migrations
- Expected external provider changes

### Stop point

Stop and show the owner the Stage 2 decision report. Do not implement account deletion, PITR, session replay, beta enrollment, or internal support actions until their behavior is explicitly approved.

---

# Batch B — Controlled beta enrollment and access lifecycle

**Goal:** Ensure only approved beta users can create and use accounts, and that the operator can manage access safely.

## B1. Invite-only enrollment

- [ ] **`[DECISION]`** Confirm invite-code, email allow-list, or explicit invitation-record model.
- [ ] **`[DATA]`** Prefer an invitation table if invitations need:
  - recipient identity
  - expiration
  - one-time use
  - issuance tracking
  - revocation
  - attribution
- [ ] **`[CODE]`** Enforce invitation eligibility server-side.
- [ ] **`[CODE]`** Do not rely only on hiding the signup page.
- [ ] **`[CODE]`** Return controlled generic errors that do not disclose whether an email is already registered.
- [ ] **`[CODE]`** Rate-limit invitation redemption and signup.
- [ ] **`[CODE]`** Audit invitation creation, revocation, and redemption.
- [ ] **`[CODE]`** Add operator documentation for issuing and revoking invitations.

## B2. Beta capacity cap

- [ ] **`[CODE]`** Add a configurable maximum active beta-user count if the selected invitation design does not enforce it naturally.
- [ ] **`[CODE]`** Fail closed when the beta cap is reached.
- [ ] **`[CODE]`** Expose current invited, registered, verified, and active counts in the internal dashboard.
- [ ] **`[CODE]`** Do not count deleted or explicitly disabled accounts as active unless policy requires it.

## B3. Account status model

Confirm whether the current user schema can represent:

- active
- invited
- unverified
- locked
- disabled by operator
- deletion requested
- deleted/anonymized

- [ ] **`[DATA]`** Add only the smallest schema changes needed.
- [ ] **`[CODE]`** Centralize status checks in authentication/authorization logic.
- [ ] **`[CODE]`** Disabled or deletion-pending accounts must not create sessions.
- [ ] **`[CODE]`** Existing sessions must be invalidated when an account is disabled.
- [ ] **`[CODE]`** Audit status changes.
- [ ] **`[VERIFY]`** Test each status transition.

## B4. Session management

- [ ] **`[CODE]`** Add an operator-safe way to revoke all sessions for one user.
- [ ] **`[CODE]`** Add a user-facing “log out all sessions” action if not already present.
- [ ] **`[CODE]`** Record session creation and revocation events without storing raw tokens.
- [ ] **`[CODE]`** Display last login and active-session summary in the internal support view where technically reliable.
- [ ] **`[VERIFY]`** Confirm revoked sessions fail immediately or within the documented cache window.

## B5. Beta welcome and expectations

- [ ] **`[POLICY]`** Draft a concise beta notice covering:
  - the product is in private beta
  - service interruptions may occur
  - training data is backed up but users should report anomalies quickly
  - how to report issues
  - what diagnostic information may be collected
  - no formal uptime SLA
- [ ] **`[CODE]`** Surface the notice at invitation or first login.
- [ ] **`[CODE]`** Record acceptance only if the owner decides explicit acceptance is required.
- [ ] **`[CODE]`** Do not create legal claims not approved by the owner.

### Definition of done

Only invited users can register, the beta population is bounded, account status is enforceable, and operator actions are auditable.

---

# Batch C — End-to-end tracing and real-user performance

**Goal:** Follow slow or failing user actions across browser, Next.js BFF, Fastify, Prisma/PostgreSQL, and external providers.

## C1. Trace propagation

Use the current OpenTelemetry-compatible conventions and the selected Sentry tracing approach.

- [ ] **`[CODE]`** Establish trace context at the public Next.js boundary.
- [ ] **`[CODE]`** Propagate `traceparent` and approved baggage fields through BFF proxy calls.
- [ ] **`[CODE]`** Continue propagating the existing request ID separately.
- [ ] **`[CODE]`** Instrument incoming Fastify requests.
- [ ] **`[CODE]`** Instrument outbound HTTP calls, especially Resend.
- [ ] **`[CODE]`** Instrument Prisma/database operations using supported instrumentation.
- [ ] **`[CODE]`** Ensure trace and request IDs appear in structured logs.
- [ ] **`[CODE]`** Avoid sensitive values in span names, attributes, and URLs.
- [ ] **`[CODE]`** Use normalized route names rather than concrete IDs.

## C2. Sampling

- [ ] **`[DECISION]`** Choose a Stage 2 trace sample rate appropriate to low traffic.
- [ ] **`[CODE]`** Prefer:
  - higher sampling for errors
  - lower sampling for routine successful requests
  - complete sampling for explicitly marked synthetic tests
- [ ] **`[CODE]`** Make sampling configurable by environment.
- [ ] **`[VERIFY]`** Confirm the selected rate does not create unexpected Sentry cost or noise.

## C3. Key user-journey transactions

Define named transactions for:

- signup
- email verification
- login
- dashboard load
- workout start/resume
- set creation
- set edit/delete
- workout completion
- history detail load
- progress chart load
- CSV import
- CSV export

- [ ] **`[CODE]`** Ensure each journey has a stable trace name.
- [ ] **`[CODE]`** Add safe spans around major application work.
- [ ] **`[CODE]`** Avoid manually tracing trivial functions.

## C4. Real-user performance monitoring

- [ ] **`[CODE]`** Capture Core Web Vitals.
- [ ] **`[CODE]`** Capture route-transition performance.
- [ ] **`[CODE]`** Capture API duration from the browser perspective.
- [ ] **`[CODE]`** Capture time to interactive/useful state for the Dashboard and Volume 3D scenes.
- [ ] **`[CODE]`** Capture 3D asset load failures.
- [ ] **`[CODE]`** Capture long tasks where supported.
- [ ] **`[CODE]`** Tag events with:
  - release
  - environment
  - route
  - browser/device class
  - reduced-motion status where useful
- [ ] **`[CODE]`** Do not capture typed workout values as telemetry attributes unless explicitly justified.

## C5. Performance dashboards

- [ ] **`[INFRA]`** Add an internal dashboard showing:
  - p50/p95/p99 end-to-end transaction duration
  - backend duration versus browser duration
  - slowest routes
  - slowest database operations
  - email-provider latency
  - Web Vitals by route
  - mobile versus desktop comparison
  - current versus previous release
- [ ] **`[VERIFY]`** Demonstrate one complete trace from browser to PostgreSQL.
- [ ] **`[VERIFY]`** Demonstrate one slow trace and identify the dominant span.
- [ ] **`[VERIFY]`** Confirm no password, cookie, token, email address, or workout payload appears in trace data.

### Definition of done

A beta-user report such as “saving a set took several seconds” can be investigated end to end rather than inferred from separate logs.

---

# Batch D — Product analytics and beta funnel dashboard

**Goal:** Measure whether beta users successfully reach the product’s core value without confusing product analytics with technical observability.

## D1. Event taxonomy

Review and formalize the existing `app_events` system.

Each event definition must include:

- event name
- business question answered
- trigger location
- required properties
- optional properties
- prohibited properties
- actor/user identity behavior
- deduplication behavior
- retention
- expected queries

Minimum Stage 2 events:

### Acquisition and activation

- `invitation_created`
- `invitation_redeemed`
- `user_signed_up`
- `email_verification_sent`
- `email_verified`
- `first_login_completed`
- `first_workout_started`
- `first_set_logged`
- `first_workout_completed`

### Core engagement

- `workout_started`
- `workout_resumed`
- `set_created`
- `set_edited`
- `set_deleted`
- `workout_completed`
- `history_viewed`
- `progress_chart_viewed`
- `volume_viewed`

### Reliability and friction

- `signup_failed`
- `verification_failed`
- `workout_write_failed`
- `csv_import_started`
- `csv_import_completed`
- `csv_import_failed`
- `session_abandoned` only if it can be defined reliably

### Account lifecycle

- `account_disabled`
- `account_reenabled`
- `data_export_requested`
- `data_export_completed`
- `account_deletion_requested`
- `account_deleted_or_anonymized`

- [ ] **`[DATA]`** Define event schema versioning.
- [ ] **`[DATA]`** Prevent unrestricted arbitrary JSON from becoming an ungoverned data sink.
- [ ] **`[DATA]`** Avoid storing raw exercise names or free-text session names unless explicitly needed.
- [ ] **`[DATA]`** Never store passwords, tokens, cookies, IP addresses, or full user-agent strings in product-event payloads.
- [ ] **`[CODE]`** Add tests for high-value event emission.
- [ ] **`[CODE]`** Ensure failed database writes do not incorrectly emit success events.

## D2. Metric definitions

Define exact calculations for:

- invitations issued
- invitation redemption rate
- signup completion rate
- email verification conversion
- first-workout activation rate
- first-workout completion rate
- daily active users
- weekly active users
- workouts per active user
- sets per completed workout
- seven-day retention
- thirty-day retention when enough time has passed
- CSV import success rate
- write-failure rate
- users with no activity after signup

For every metric specify:

- numerator
- denominator
- time zone
- event-time versus processing-time behavior
- user inclusion/exclusion rules
- handling of deleted test accounts
- minimum sample-size warning

## D3. Internal product dashboard

Extend or complete the Doc 14 internal analytics dashboard.

Required views:

### Beta overview

- invited users
- registered users
- verified users
- active users
- disabled users
- deletion-pending users
- current beta cap

### Activation funnel

- invitation
- signup
- verification
- first login
- first workout
- first set
- first completed workout

### Engagement

- DAU/WAU
- workouts per day
- completed versus abandoned workouts
- sets per workout
- returning users

### Reliability from the user perspective

- failed writes
- failed imports
- verification failures
- users affected by errors
- recent regressions by release

- [ ] **`[CODE]`** Keep the dashboard outside the normal user-facing navigation.
- [ ] **`[CODE]`** Reuse the approved Stage 1 operator allow-list or internal-access mechanism.
- [ ] **`[CODE]`** Add date-range filters.
- [ ] **`[CODE]`** Add test-account exclusion.
- [ ] **`[CODE]`** Show metric definitions or tooltips.
- [ ] **`[CODE]`** Show sample-size warnings.
- [ ] **`[CODE]`** Avoid exposing raw personal data in aggregate views.

## D4. Data quality checks

- [ ] **`[CODE]`** Add diagnostics for impossible funnel states, for example:
  - workout completed before signup
  - verified without verification event where event coverage should be complete
  - duplicate first-workout events
- [ ] **`[CODE]`** Add a daily or on-demand reconciliation between product events and source-of-truth tables.
- [ ] **`[CODE]`** Document known differences between operational events and business source-of-truth data.
- [ ] **`[VERIFY]`** Validate dashboard totals against direct SQL for a controlled test dataset.

### Definition of done

The owner can determine whether beta users are activating, returning, and completing workouts, and can trust the definitions behind those numbers.

---

# Batch E — Internal support console and audit logging

**Goal:** Allow the owner to support beta users without direct ad hoc production writes.

## E1. Internal support route

Create a private route such as `/internal/users`.

Minimum capabilities:

- search by exact email or internal user ID
- view account status
- view signup and verification timestamps
- view last login/activity
- view workout/session/set counts
- view recent operational errors linked to the user ID
- view recent product events
- view session summary
- view data-export/deletion status
- view current release associated with recent errors where available

- [ ] **`[CODE]`** Protect the route with the approved operator access mechanism.
- [ ] **`[CODE]`** Require fresh authentication or equivalent stronger check for sensitive actions if technically appropriate.
- [ ] **`[CODE]`** Do not expose password hashes, tokens, secret values, or raw cookies.
- [ ] **`[CODE]`** Do not expose complete database rows without purpose.
- [ ] **`[CODE]`** Paginate potentially large histories.
- [ ] **`[CODE]`** Default to read-only behavior.

## E2. Controlled operator actions

Candidate Stage 2 actions:

- resend verification email
- revoke all sessions
- disable account
- re-enable account
- generate data export
- begin account deletion workflow
- cancel deletion during grace period
- inspect affected workout/set counts before a destructive maintenance action

Every action must:

1. show the target identity,
2. state the impact,
3. require confirmation,
4. use normal domain services,
5. create an audit record,
6. return a clear result,
7. remain idempotent where possible.

- [ ] **`[CODE]`** Do not allow arbitrary email changes or password setting from the support console unless separately approved.
- [ ] **`[CODE]`** Do not add generic SQL execution.
- [ ] **`[CODE]`** Do not allow silent historical data mutation.

## E3. Audit-log model

Audit records should include:

- audit ID
- timestamp
- actor type and actor ID
- target type and target ID
- action
- result
- reason where required
- request ID
- trace ID where available
- release
- safe metadata
- source IP or network context only if policy allows
- previous/new status for status transitions where safe

Minimum audited actions:

- invitation creation/revocation
- account disable/re-enable
- session revocation
- verification-email resend
- historical session-time edit
- historical set edit
- exercise merge
- data export generation
- deletion request/cancel/execute
- operator access to especially sensitive user detail, if the owner adopts view auditing
- production restore
- migration execution
- configuration or feature-flag changes

- [ ] **`[DATA]`** Make audit records append-oriented.
- [ ] **`[DATA]`** Prevent ordinary application code from updating existing audit records.
- [ ] **`[CODE]`** Add an internal audit viewer with filters.
- [ ] **`[CODE]`** Redact secrets from audit metadata.
- [ ] **`[CODE]`** Add retention policy documentation.
- [ ] **`[VERIFY]`** Confirm each support action creates exactly one correct audit event.

## E4. User issue correlation

- [ ] **`[CODE]`** Add a safe user-visible support reference when an unexpected request fails:
  - request ID or shortened support code
- [ ] **`[CODE]`** Ensure support codes cannot be used to retrieve another user’s data publicly.
- [ ] **`[CODE]`** Document the issue-report template:
  - approximate time
  - page/action
  - support reference
  - browser/device
  - screenshot if appropriate
- [ ] **`[VERIFY]`** Use a support reference to locate logs, trace, Sentry event, release, and user account.

### Definition of done

The owner can support a beta user through an audited, limited internal console without editing production tables manually.

---

# Batch F — User data export, deletion, and retention

**Goal:** Establish controlled data-lifecycle workflows before multiple external users entrust the service with training history.

## F1. Data inventory

Document all user-linked data locations:

- user/account table
- sessions/auth records
- workout sessions
- exercises and ownership model
- sets
- imports/exports
- product events
- audit events
- logs
- traces
- Sentry
- email-provider records
- backups
- uploaded files, if any
- derived analytics

For each location record:

- identifier used
- retention
- export inclusion
- deletion behavior
- legal/operational reason for retention
- whether deletion is immediate, delayed, anonymized, or naturally expires

## F2. User data export

- [ ] **`[CODE]`** Provide a user-facing export request or an operator-triggered export for Stage 2.
- [ ] **`[CODE]`** Include at minimum:
  - account metadata
  - workout sessions
  - exercises
  - sets
  - session names
  - relevant user-created values
- [ ] **`[CODE]`** Use a documented machine-readable format, preferably JSON plus the existing canonical CSV where appropriate.
- [ ] **`[CODE]`** Do not include:
  - password hashes
  - session tokens
  - internal secrets
  - other users’ data
  - internal security notes
- [ ] **`[CODE]`** Protect downloads with authenticated, short-lived access.
- [ ] **`[CODE]`** Expire generated export files.
- [ ] **`[CODE]`** Audit generation and download.
- [ ] **`[VERIFY]`** Compare an export against source-of-truth tables for a controlled account.

## F3. Account deletion workflow

Recommended Stage 2 model:

1. user or operator requests deletion,
2. account is immediately disabled,
3. sessions are revoked,
4. configurable grace period allows cancellation,
5. deletion job removes or anonymizes user-linked application data,
6. audit record retains minimal operational proof,
7. backup retention is explained rather than falsely claiming immediate erasure from historical snapshots.

- [ ] **`[DECISION]`** Confirm hard delete versus anonymization for:
  - user record
  - product events
  - audit events
- [ ] **`[CODE]`** Implement the approved workflow.
- [ ] **`[CODE]`** Use database transactions where appropriate.
- [ ] **`[CODE]`** Make the deletion job resumable/idempotent.
- [ ] **`[CODE]`** Produce a deletion summary.
- [ ] **`[CODE]`** Prevent deleted accounts from authenticating.
- [ ] **`[CODE]`** Prevent identifier reuse ambiguities if the same email later registers again.
- [ ] **`[CODE]`** Audit request, cancellation, execution, and failure.
- [ ] **`[VERIFY]`** Test with a realistic account containing workouts, sets, product events, and sessions.

## F4. Retention jobs

- [ ] **`[DATA]`** Define retention for:
  - expired invitations
  - expired sessions
  - generated exports
  - operational logs
  - traces
  - Sentry events
  - product analytics
  - audit logs
  - backup snapshots
- [ ] **`[CODE]`** Add safe cleanup jobs where the application owns retention.
- [ ] **`[INFRA]`** Configure provider-side retention where providers own it.
- [ ] **`[CODE]`** Emit metrics and logs for cleanup success/failure.
- [ ] **`[VERIFY]`** Confirm cleanup does not remove active data.

## F5. Privacy documentation

- [ ] **`[POLICY]`** Draft a concise privacy notice for private beta covering:
  - data collected
  - purpose
  - operational telemetry
  - email provider
  - error tracking/monitoring providers
  - retention
  - export
  - deletion
  - operator access
  - contact route
- [ ] **`[OWNER]`** Review and approve wording.
- [ ] **`[CODE]`** Surface it at signup or an accessible settings/legal route.
- [ ] **`[CODE]`** Record version/acceptance only if explicitly required.

### Definition of done

The operator can export and delete a beta user’s data through controlled workflows, and the service accurately documents what happens to operational records and backups.

---

# Batch G — Stronger database recovery and resilience

**Goal:** Reduce potential data loss and prove the service can recover from realistic beta-stage failures.

## G1. Recovery design

Stage 1 daily dumps are no longer sufficient as the only recovery layer.

Recommended Stage 2 design:

- continue daily logical dumps for portability,
- add more frequent physical or WAL-based recovery capability,
- store recovery data off-host,
- retain enough history to recover from delayed discovery,
- preserve encrypted transport and storage,
- test point-in-time or near-point-in-time restoration.

- [ ] **`[DECISION]`** Select:
  - WAL-G,
  - pgBackRest,
  - Barman,
  - or another reviewed PostgreSQL-native recovery tool.
- [ ] **`[DECISION]`** Confirm target RPO:
  - recommended 15–60 minutes.
- [ ] **`[DECISION]`** Confirm target RTO:
  - recommended two hours.
- [ ] **`[INFRA]`** Configure encrypted off-host archive storage.
- [ ] **`[INFRA]`** Ensure backup credentials have minimum required permissions.
- [ ] **`[INFRA]`** Keep daily logical dumps as an independent recovery path.

## G2. Recovery monitoring

Expose:

- last successful base backup
- last archived WAL/recovery segment
- archive lag
- backup repository health
- backup verification result
- estimated recoverable point
- restore-test date

- [ ] **`[INFRA]`** Add Grafana panels.
- [ ] **`[INFRA]`** Alert when archive lag exceeds the RPO.
- [ ] **`[INFRA]`** Alert when base backup becomes stale.
- [ ] **`[INFRA]`** Alert on repository or verification failure.
- [ ] **`[VERIFY]`** Simulate archive interruption and receive an alert.

## G3. Point-in-time restore drill

- [ ] **`[VERIFY]`** Create controlled records with known timestamps.
- [ ] **`[VERIFY]`** Delete or corrupt the controlled records after the target point.
- [ ] **`[VERIFY]`** Restore to a disposable environment at a timestamp before the destructive action.
- [ ] **`[VERIFY]`** Confirm the expected records exist and later records do not.
- [ ] **`[VERIFY]`** Run application-level smoke checks against the restored database.
- [ ] **`[VERIFY]`** Measure actual RPO and RTO.
- [ ] **`[CODE]`** Update the restore runbook with exact observed steps.

## G4. Database failure handling

- [ ] **`[CODE]`** Ensure API database timeouts are bounded.
- [ ] **`[CODE]`** Return controlled errors when PostgreSQL is unavailable.
- [ ] **`[CODE]`** Do not retry non-idempotent writes blindly.
- [ ] **`[CODE]`** Mark readiness unhealthy during database outage.
- [ ] **`[CODE]`** Ensure connection pools recover after PostgreSQL restarts.
- [ ] **`[VERIFY]`** Restart PostgreSQL during controlled traffic.
- [ ] **`[VERIFY]`** Confirm:
  - no corrupted writes
  - no container restart loop
  - readiness alert fires
  - recovery occurs without full host restart

## G5. Disk and storage failure precautions

- [ ] **`[INFRA]`** Monitor database-volume free space separately from root filesystem.
- [ ] **`[INFRA]`** Alert at warning and critical thresholds.
- [ ] **`[CODE]`** Document emergency steps when disk is nearly full.
- [ ] **`[VERIFY]`** Test the alert without actually filling production storage.

### Stop point

Stop and show the owner:

- chosen recovery architecture,
- current RPO/RTO,
- point-in-time restore evidence,
- archive-lag dashboard,
- updated restore runbook.

Do not expand the beta population until the restore drill passes.

---

# Batch H — Security monitoring and abuse visibility

**Goal:** Detect ordinary account abuse, authentication attacks, and suspicious operator activity without building an enterprise security operations platform.

## H1. Security event taxonomy

Define structured security events for:

- repeated failed login
- account lockout
- rate-limit trigger
- invalid/expired session
- session revocation
- password-reset request and completion, if supported
- email verification abuse
- invitation abuse
- access denied to internal routes
- unexpected admin/support action failure
- CSRF/origin rejection
- malformed or oversized import
- suspicious request volume
- disabled-account login attempt
- secret/configuration failure at startup

Each event must specify:

- severity
- safe fields
- whether it belongs in logs, audit records, Sentry, or metrics
- alert threshold
- retention

## H2. Abuse dashboards

Add dashboards for:

- login failures over time
- lockouts
- rate-limit activations
- invitation redemption failures
- internal-route access denials
- source-network concentration where policy permits
- disabled-account access attempts
- authentication errors by release
- unusual request spikes

- [ ] **`[CODE]`** Avoid raw IP display in general product dashboards.
- [ ] **`[POLICY]`** Define whether and how IP addresses are retained for security.
- [ ] **`[CODE]`** If IPs are retained, minimize retention and restrict access.
- [ ] **`[CODE]`** Ensure trusted-proxy configuration produces correct client-network data.

## H3. Security alerts

Minimum Stage 2 alerts:

- high failed-login rate
- repeated lockouts
- repeated denied internal-route access
- sudden high 401/403 rate
- unusual signup/invitation activity
- unexpected configuration/secret startup failure
- repeated destructive-action failures
- Sentry spike in authentication exceptions

- [ ] **`[INFRA]`** Route alerts to the tested operator channel.
- [ ] **`[VERIFY]`** Trigger one controlled auth-abuse alert.
- [ ] **`[VERIFY]`** Confirm alert grouping prevents one notification per request.

## H4. Dependency and image hygiene

- [ ] **`[CODE]`** Add automated dependency vulnerability scanning in CI.
- [ ] **`[CODE]`** Add container-image scanning where practical.
- [ ] **`[CODE]`** Fail CI only on an approved severity policy; do not create unmaintainable noise.
- [ ] **`[CODE]`** Document how accepted vulnerabilities are reviewed and time-bounded.
- [ ] **`[CODE]`** Keep lockfiles deterministic.
- [ ] **`[VERIFY]`** Review the first report and resolve or document findings.

## H5. Secret rotation drill

- [ ] **`[POLICY]`** Define rotation procedures for:
  - session/auth secret
  - database credentials
  - Resend API key
  - Sentry credentials
  - tunnel/access credentials
  - backup repository credentials
- [ ] **`[VERIFY]`** Rotate one noncritical production credential.
- [ ] **`[VERIFY]`** Confirm service recovery and no secret leakage.
- [ ] **`[CODE]`** Record the procedure in the operator guide.

### Definition of done

The operator has visibility into authentication abuse, receives actionable alerts, and can rotate critical credentials using documented procedures.

---

# Batch I — Release safety, staging, and feature controls

**Goal:** Reduce the chance that a routine release breaks all beta users at once.

## I1. Staging environment

Create a production-like staging environment with:

- separate hostname
- separate database
- separate secrets
- separate email behavior
- separate Sentry environment
- same Docker/Compose topology where possible
- representative synthetic data
- no production user data by default

- [ ] **`[INFRA]`** Provision staging.
- [ ] **`[CODE]`** Add environment validation that prevents production/staging confusion.
- [ ] **`[CODE]`** Mark staging clearly in the UI.
- [ ] **`[CODE]`** Prevent staging emails from reaching unintended real recipients.
- [ ] **`[VERIFY]`** Confirm staging cannot connect to the production database.

## I2. Pre-deployment checks

Before production deployment:

1. build and test,
2. apply migrations to staging,
3. run smoke tests,
4. run selected end-to-end tests,
5. inspect new Sentry errors,
6. create required production backup,
7. deploy production,
8. run post-deploy smoke,
9. compare error and latency signals.

- [ ] **`[CODE]`** Automate as much of this sequence as reasonable.
- [ ] **`[CODE]`** Add a migration-risk classification:
  - additive/safe
  - backfill required
  - destructive
- [ ] **`[CODE]`** Require owner acknowledgement for destructive migrations.

## I3. Feature flags and kill switches

Stage 2 does not need a large external feature-flag platform.

Add minimal controls for:

- new or risky UI flows
- CSV import
- historical-edit features
- exercise merge
- internal beta-only features
- 3D scene fallback if a release causes performance issues
- new product-event emission if it causes problems

- [ ] **`[DECISION]`** Choose environment-based, database-based, or small server-side flag configuration.
- [ ] **`[CODE]`** Evaluate flags server-side for security-sensitive behavior.
- [ ] **`[CODE]`** Add operator-visible current flag state.
- [ ] **`[CODE]`** Audit flag changes.
- [ ] **`[CODE]`** Document rollback behavior.
- [ ] **`[VERIFY]`** Disable one feature without redeploying if the selected model supports runtime changes.

## I4. Canary owner account

- [ ] **`[POLICY]`** Keep the owner account as the first user of every production release.
- [ ] **`[CODE]`** Add a short release observation window before inviting all beta users to use a major release.
- [ ] **`[VERIFY]`** Compare:
  - error rate
  - latency
  - database health
  - browser errors
  - critical user journeys
  before and after release.

## I5. Automated rollback conditions

Do not implement fully automatic rollback unless it is proven safe. Instead:

- [ ] **`[CODE]`** Define explicit manual rollback triggers:
  - sustained 5xx increase
  - failed workout writes
  - authentication failure spike
  - migration failure
  - readiness failure
  - severe frontend regression
- [ ] **`[CODE]`** Add a one-command or concise rollback path.
- [ ] **`[VERIFY]`** Perform one rollback drill in staging.

### Definition of done

Every production change is first exercised in staging, risky behavior can be disabled, and rollback is fast and rehearsed.

---

# Batch J — Beta support, incident communication, and issue workflow

**Goal:** Ensure beta feedback and incidents are recorded, triaged, and communicated consistently.

## J1. Support intake

- [ ] **`[OWNER]`** Establish one beta support channel.
- [ ] **`[POLICY]`** Define the information users should provide:
  - approximate time
  - action attempted
  - support reference/request ID
  - device/browser
  - screenshot when useful
  - whether retry succeeded
- [ ] **`[CODE]`** Add an in-app “Report a problem” link or instructions.
- [ ] **`[CODE]`** Pre-fill safe diagnostic context where appropriate:
  - release
  - route
  - support reference
  - browser family
- [ ] **`[CODE]`** Do not pre-fill private workout content without user intent.

## J2. Issue classification

Define categories:

- data integrity
- authentication/access
- workout write failure
- UI/UX defect
- performance
- browser/device compatibility
- email delivery
- import/export
- operator/admin issue
- feature request
- user misunderstanding

Define priority:

- **P0:** suspected data loss, security incident, or all users blocked
- **P1:** major workflow broken for one or more users
- **P2:** workaround exists
- **P3:** cosmetic or feature request

- [ ] **`[POLICY]`** Add a triage checklist.
- [ ] **`[POLICY]`** Link each class to the relevant dashboards/runbooks.

## J3. Incident communication

Create templates for:

- investigating
- identified
- mitigation in progress
- resolved
- data-impact follow-up

- [ ] **`[POLICY]`** Define when beta users are notified.
- [ ] **`[POLICY]`** Notify affected users when:
  - their data may be wrong,
  - login is broadly unavailable,
  - a restore was required,
  - a security incident may affect them,
  - the service will be intentionally unavailable for maintenance.
- [ ] **`[POLICY]`** Avoid claiming root cause before it is known.
- [ ] **`[CODE]`** Add templates to the operator guide.

## J4. Post-incident review

For every P0/P1 incident record:

- timeline
- detection method
- affected users
- affected release
- technical cause
- contributing factors
- recovery action
- data impact
- why existing controls did or did not detect it
- follow-up tasks
- owner and deadline

- [ ] **`[CODE]`** Add a reusable post-incident template.
- [ ] **`[POLICY]`** Require at least one preventive improvement for repeated classes of failure.

## J5. Beta feedback review

- [ ] **`[POLICY]`** Review beta feedback on a regular cadence.
- [ ] **`[POLICY]`** Separate:
  - defects
  - operational issues
  - UX friction
  - feature requests
- [ ] **`[POLICY]`** Do not let feature requests bypass launch-readiness work.

### Definition of done

Beta users have one clear support path, incidents are triaged consistently, and the operator can communicate accurately during disruptions.

---

# Batch K — Reliability targets and beta-scale capacity validation

**Goal:** Define what “healthy enough for private beta” means and test the actual deployment against it.

## K1. Service-level indicators

Define measured indicators for:

### Availability

- proportion of valid requests not returning 5xx
- public readiness uptime
- critical workout-write success rate

### Latency

- dashboard load p95
- workout-read p95
- workout-write p95
- login p95
- email-provider acceptance p95

### Correctness

- successful set writes that remain persisted
- completed workouts with expected set count
- failed/partial CSV imports

### Recovery

- backup archive lag
- successful restore duration
- freshness of last tested backup

## K2. Stage 2 internal SLOs

Suggested initial targets, subject to measured Stage 1 baseline:

- public readiness availability: **99.5% per month**
- valid API request success: **99.5% excluding expected 4xx**
- workout-write success: **99.9%**
- workout-write p95: **under 750 ms**
- dashboard API p95: **under 1 second**
- email-provider acceptance p95: **under 30 seconds**
- backup recovery point: **within 60 minutes**
- restore target: **within 2 hours**

- [ ] **`[DECISION]`** Confirm or revise targets based on real measurements.
- [ ] **`[CODE]`** Document exclusions carefully.
- [ ] **`[INFRA]`** Add SLO dashboards.
- [ ] **`[INFRA]`** Alert on sustained error-budget consumption rather than individual slow requests where practical.
- [ ] **`[POLICY]`** Treat targets as internal beta goals, not contractual SLAs.

## K3. Beta load model

Define realistic scenarios for the approved beta cap:

- users opening the app before/after work
- several concurrent active workouts
- dashboard and chart loads
- set writes every few minutes
- CSV import by one user
- email verification bursts after invitation batch
- operator dashboard use during normal traffic

- [ ] **`[CODE]`** Extend the Stage 1 load suite.
- [ ] **`[CODE]`** Use isolated test accounts and data.
- [ ] **`[CODE]`** Include authenticated flows.
- [ ] **`[CODE]`** Avoid destructive load against real beta accounts.

## K4. Capacity test

Run at least:

- expected beta load
- 2× expected beta load
- brief spike test

Record:

- request throughput
- p50/p95/p99 latency
- error rate
- event-loop lag
- API memory
- Next.js memory
- PostgreSQL connections
- slow queries
- host CPU/memory
- disk I/O
- tunnel/network behavior
- recovery after test

- [ ] **`[VERIFY]`** Confirm no connection-pool exhaustion.
- [ ] **`[VERIFY]`** Confirm no memory leak across repeated runs.
- [ ] **`[VERIFY]`** Confirm no lost or duplicate controlled writes.
- [ ] **`[VERIFY]`** Confirm alerts remain useful and do not flood.
- [ ] **`[CODE]`** Document the measured safe beta cap.

## K5. Failure injection

Run controlled tests for:

- PostgreSQL restart
- API container restart
- Next.js container restart
- Resend timeout/failure
- Sentry unavailable
- Loki unavailable
- Prometheus unavailable
- backup destination unavailable
- tunnel restart
- host reboot
- low-disk alert simulation

For each scenario verify:

- user-visible behavior
- readiness/liveness behavior
- logs
- trace/Sentry behavior
- alerts
- recovery
- no data corruption

### Stop point

Stop and show the owner:

- SLO proposal,
- measured capacity,
- failure-injection results,
- safe beta cap,
- unresolved bottlenecks.

Do not exceed the measured beta cap.

---

# Batch L — Cross-browser, mobile, and beta launch verification

**Goal:** Verify that operational readiness corresponds to a usable product across realistic beta environments.

## L1. Browser/device matrix

At minimum test:

- current Chrome desktop
- current Firefox desktop
- current Safari desktop
- current Chrome Android
- current Safari iOS if accessible
- one lower-power mobile device or throttled equivalent

Prioritize:

- login/session persistence
- active workout logger
- keyboard/numeric input
- chart interaction
- 3D fallback behavior
- history editing
- import/export
- email verification links
- internal support console on desktop

## L2. Network conditions

Test:

- normal broadband
- mobile connection
- high-latency throttling
- intermittent connection
- offline during a set write
- reconnect after failure

- [ ] **`[CODE]`** Ensure TanStack Query retries do not duplicate non-idempotent writes.
- [ ] **`[CODE]`** Ensure failed writes remain visible to the user.
- [ ] **`[CODE]`** Ensure loading and error states are not mistaken for success.
- [ ] **`[VERIFY]`** Confirm request IDs exist for failed network/server operations.

## L3. Data-integrity scenarios

Test with controlled accounts:

- concurrent tabs
- duplicate submit
- refresh during active workout
- browser crash/reopen
- expired session during write
- editing historical set
- exercise merge
- CSV duplicate rows
- malformed import
- very long workout
- timezone/day-boundary behavior
- daylight-saving transition assumptions where relevant

- [ ] **`[VERIFY]`** Confirm no duplicate or orphaned records.
- [ ] **`[VERIFY]`** Confirm timestamps are interpreted consistently.
- [ ] **`[VERIFY]`** Confirm destructive actions remain guarded.

## L4. Beta launch rehearsal

Perform a full rehearsal:

1. issue invitations,
2. redeem invitation,
3. verify email,
4. complete first workout,
5. inspect activation funnel,
6. locate user in support console,
7. trigger controlled user error,
8. correlate support reference,
9. generate export,
10. request and cancel deletion,
11. disable and re-enable account,
12. restore a test record in disposable recovery environment,
13. deploy a new release through staging,
14. roll back in staging.

- [ ] **`[VERIFY]`** Record all failures and resolve or explicitly accept them.
- [ ] **`[VERIFY]`** Confirm all privileged actions appear in audit logs.

---

# Final Stage 2 launch checklist

Every item below must be checked before the private beta expands beyond the owner.

## Enrollment and account lifecycle

- [ ] Signup is invite-only.
- [ ] Beta-user cap is enforced.
- [ ] Invitation lifecycle is auditable.
- [ ] Account status is enforced centrally.
- [ ] Sessions can be revoked.
- [ ] Disabled accounts cannot authenticate.
- [ ] Beta notice and support route are visible.

## Observability

- [ ] Trace context crosses browser, Next.js, Fastify, and PostgreSQL.
- [ ] Request IDs remain correlated with traces and logs.
- [ ] Key user journeys have stable transaction names.
- [ ] Real-user Web Vitals are collected.
- [ ] 3D load/performance is observable.
- [ ] Trace data contains no tested secrets or workout payloads.
- [ ] Performance can be compared by release.

## Product analytics

- [ ] Event taxonomy is documented.
- [ ] Activation funnel is implemented.
- [ ] Engagement metrics are defined.
- [ ] Test accounts can be excluded.
- [ ] Product dashboard is private.
- [ ] Metrics reconcile with source-of-truth data.
- [ ] Sample-size warnings are visible.

## Support and audit

- [ ] Internal user search works.
- [ ] Sensitive fields are hidden.
- [ ] Support actions use domain services.
- [ ] Destructive actions require confirmation.
- [ ] Every privileged action produces an audit event.
- [ ] Audit records are append-oriented.
- [ ] User support reference correlates logs, traces, and Sentry.

## Data lifecycle

- [ ] User data inventory is documented.
- [ ] Data export works.
- [ ] Export downloads expire.
- [ ] Account deletion workflow works.
- [ ] Deletion is idempotent.
- [ ] Backup-deletion behavior is documented honestly.
- [ ] Retention jobs are monitored.
- [ ] Privacy notice is approved and accessible.

## Recovery

- [ ] Daily logical dumps still work.
- [ ] More frequent recovery data is stored off-host.
- [ ] Archive lag is monitored.
- [ ] RPO alert is tested.
- [ ] Point-in-time restore drill passed.
- [ ] Actual RPO and RTO are recorded.
- [ ] PostgreSQL restart recovery passed.
- [ ] Disk alerts are active.

## Security

- [ ] Authentication-abuse events exist.
- [ ] Security dashboards exist.
- [ ] Critical security alerts are tested.
- [ ] Dependency scanning runs in CI.
- [ ] Container scanning runs where practical.
- [ ] One secret-rotation drill passed.
- [ ] Internal-route access denials are visible.

## Release safety

- [ ] Staging is isolated from production.
- [ ] Staging uses production-like topology.
- [ ] Pre-deploy checks run.
- [ ] Destructive migrations require explicit acknowledgement.
- [ ] Feature flags/kill switches exist.
- [ ] Current flag state is visible.
- [ ] Rollback drill passed.

## Support and incidents

- [ ] Beta support channel exists.
- [ ] Issue-report guidance exists.
- [ ] Priority/severity definitions exist.
- [ ] Incident communication templates exist.
- [ ] Post-incident template exists.
- [ ] P0/P1 process is documented.

## Reliability and capacity

- [ ] Stage 2 SLOs are defined.
- [ ] SLO dashboard exists.
- [ ] Expected beta load test passed.
- [ ] 2× beta load test passed or limitations are documented.
- [ ] Safe beta-user cap is recorded.
- [ ] Failure-injection tests passed.
- [ ] No unresolved data-integrity issue remains.

## Compatibility and launch rehearsal

- [ ] Required browser/device matrix passed.
- [ ] Mobile network behavior was tested.
- [ ] Duplicate-submit and reconnect scenarios passed.
- [ ] Full beta launch rehearsal passed.
- [ ] All launch exceptions are documented.

---

# Required implementation evidence

Before closing Stage 2, attach or reference:

1. Final controlled-beta architecture diagram
2. Invitation and account-status schema
3. End-to-end trace screenshot
4. Real-user performance dashboard
5. Product activation-funnel dashboard
6. Product metric-definition document
7. Internal support-console screenshots
8. Audit-log examples for each privileged action
9. User data inventory
10. Successful export artifact from a controlled account
11. Successful deletion-workflow evidence
12. Backup/PITR architecture diagram
13. Point-in-time restore evidence
14. Recovery dashboard and archive-lag alert
15. Authentication-abuse dashboard and tested alert
16. Staging/production isolation evidence
17. Feature-flag/kill-switch evidence
18. Dependency/container scan summary
19. Beta capacity-test report
20. Failure-injection report
21. Browser/device compatibility matrix
22. Full beta launch rehearsal result
23. Final Stage 2 checklist with every accepted exception documented

Do not include production secrets, password hashes, session tokens, verification tokens, or identifiable user workout data in committed evidence.

---

# Definition of done

Stage 2 is done when the owner can operate a controlled private beta and can:

- admit only approved users,
- cap the beta population,
- support a user without direct database mutation,
- trace a user action across the complete request path,
- measure activation and retention with defined metrics,
- audit every privileged operator action,
- export and delete user data through controlled workflows,
- recover to a recent point in time,
- detect ordinary authentication abuse,
- deploy through a production-like staging environment,
- disable risky features quickly,
- communicate clearly during incidents,
- and demonstrate that the actual home-hosted system can support the approved beta population.

No unresolved issue may remain that threatens:

- workout-data integrity,
- authentication and session control,
- user privacy,
- recovery within the approved RPO/RTO,
- supportability,
- auditability,
- or the operator’s ability to detect and communicate a significant incident.

Completion of Stage 2 does not automatically authorize an open public release. Stage 3 must separately address public signup, broader abuse resistance, public-facing policies, scaling limits, public incident communication, and open-launch readiness.
