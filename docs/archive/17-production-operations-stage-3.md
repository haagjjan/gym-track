# Production Operations & Launch Readiness — Stage 3

**For:** Codex or Claude Code  
**Stage:** Future broad public release
**Status:** Superseded for the first public beta by `18-public-beta-handoff.md`
**Follows:** `16-production-operations-stage-2.md`  
**Related:** `12-saas-hardening.md`, `13-operator-guide.md`, `14-ui-polish-and-ops-round-2.md`, `15-production-operations-stage-1.md`  
**Assumes:** Stage 2 is complete, the controlled private beta has produced real usage evidence, and no unresolved issue threatens authentication, workout-data integrity, privacy, supportability, or recovery.

> The next release is open-but-capped, not unrestricted. Use `18-public-beta-handoff.md` for its go/no-go scope and operational blockers. This document remains a longer-term reference and must not be read as evidence that unimplemented services or controls exist.

---

## 1. Purpose

Stage 3 prepares the application for its first openly available version.

This is not the point where the system must already resemble a global enterprise platform. It is the point where unknown users can discover the application, create accounts without direct operator approval, store meaningful personal training history, and reasonably expect the service to behave as a real public product.

The operational model changes again:

- user count is no longer manually bounded by invitations,
- unknown devices, browsers, networks, and usage patterns become normal,
- abuse and automated traffic become expected,
- support requests may arrive without prior relationship,
- public outages affect users who cannot be contacted individually in advance,
- legal and privacy claims become externally visible,
- data deletion and export must be reliable at scale,
- home-hosted infrastructure must be justified by evidence rather than preference,
- and every manual operational dependency becomes a launch risk.

Stage 3 must therefore make the service:

- safe for open signup,
- resilient against ordinary public abuse,
- supportable without direct database intervention,
- transparent during incidents,
- explicit about privacy and service expectations,
- capable of recovering within published internal targets,
- measurable against public-launch capacity,
- and governed by a repeatable release and operations process.

This document is an implementation plan. Work through it in the specified order.

---

## 2. Stage 3 outcome

Stage 3 is complete only when the application can be opened to the public and the owner can confidently:

- accept self-service signup,
- prevent or contain automated abuse,
- verify account identity and email-delivery health,
- diagnose user problems without requesting sensitive information,
- support account export, deletion, disablement, and recovery,
- communicate outages publicly,
- detect regressions before they affect a large portion of users,
- operate within measured infrastructure capacity,
- migrate away from the home server if public evidence requires it,
- restore recent production state within the approved recovery target,
- demonstrate that operational, product, security, and privacy controls are active in production,
- and stop or restrict new signups immediately if reliability degrades.

Stage 3 does **not** require:

- multi-region active-active deployment,
- Kubernetes,
- a large operations team,
- enterprise compliance certification,
- or internet-scale capacity.

It does require that the current architecture be demonstrably appropriate for the expected launch population.

---

## 3. Entry criteria

Do not begin Stage 3 implementation until Stage 2 has produced enough evidence to make public-launch decisions.

At minimum, confirm:

- [ ] The private beta ran for a meaningful period.
- [ ] The approved beta-user cap was not exceeded.
- [ ] No unresolved P0 or P1 incident remains.
- [ ] Invite-only enrollment worked correctly.
- [ ] Account status and session revocation worked.
- [ ] End-to-end tracing worked across browser, Next.js, Fastify, and PostgreSQL.
- [ ] Product activation and retention metrics reconciled with source data.
- [ ] Internal support tooling was used successfully.
- [ ] Audit logging covered every privileged action.
- [ ] User export and deletion workflows passed.
- [ ] More frequent recovery data was stored off-host.
- [ ] A point-in-time restore drill passed.
- [ ] Security alerts were tested.
- [ ] Staging and rollback drills passed.
- [ ] Feature flags or kill switches worked.
- [ ] The Stage 2 capacity test established a safe operating envelope.
- [ ] Browser and mobile compatibility testing passed.
- [ ] Beta-user feedback has been reviewed and classified.
- [ ] The owner has documented known limitations that remain acceptable for public launch.

If any item is false, return to Stage 2 rather than compensating with public-launch messaging.

---

## 4. Fixed architecture baseline

These choices remain fixed unless Stage 3 evidence requires a documented change.

| Piece | Choice |
|---|---|
| Framework | Next.js 15 App Router + React 19 |
| API | Existing Fastify backend |
| Database | PostgreSQL through Kysely and SQL migrations |
| BFF | Existing Next.js proxy layer |
| Data fetching | TanStack Query |
| Validation | Zod |
| Styling | Tailwind CSS v4 using `DESIGN.md` tokens |
| Charts | Recharts |
| 3D | Three.js through `react-three-fiber` and `@react-three/drei` |
| Logging | Structured Pino logs; production centralization remains an operational decision |
| Metrics | Prometheus-compatible metrics |
| Dashboards | Grafana |
| Error tracking | Not yet selected or implemented |
| Tracing | Not yet implemented end to end |
| Email | Provider not yet selected; development delivery foundation only |
| Backups | Logical backups plus Stage 2 near-point-in-time recovery |
| Product analytics | Existing governed `app_events` system |
| Deployment | Docker-based production topology unless Batch B selects another validated target |
| Package management | Existing pnpm workspace |

---

## 5. Scope boundaries

### Included in Stage 3

- Public signup and registration controls
- Public-facing terms, privacy, and service notices
- Stronger anti-abuse controls
- Signup throttling and email-domain protections
- Public status communication
- Public support intake
- Production infrastructure viability decision
- Capacity-based migration path
- Stronger release gates and change management
- Signup kill switch and overload protection
- Queueing or asynchronous execution where measured need exists
- Public-launch SLOs and error budgets
- More mature alerting and on-call expectations
- Security incident procedures
- Public deletion/export handling
- Data-retention enforcement
- Availability and recovery drills
- Disaster-recovery readiness
- Operational ownership and maintenance cadence
- Public-launch rehearsal
- Post-launch observation period

### Explicitly deferred beyond Stage 3

Do not implement these unless required by measured launch behavior:

- Multi-region active-active architecture
- Kubernetes
- Service mesh
- Microservice decomposition
- Dedicated 24/7 operations staff
- Enterprise SSO
- Organization/team accounts
- Formal SOC 2 or ISO 27001 certification
- Enterprise data residency
- Multi-currency billing
- Complex subscriptions
- Public API platform
- Advanced fraud scoring
- Data warehouse
- Large-scale machine-learning analytics
- Dedicated SIEM
- Automatic cross-region failover
- Public contractual SLA
- Enterprise customer support tooling

---

## 6. Work labels

Each task uses one or more labels:

- **`[CODE]`** — repository changes Codex/Claude Code can implement.
- **`[INFRA]`** — host, Docker, network, database, or provider configuration.
- **`[OWNER]`** — requires owner input, account creation, provider setup, policy choice, or manual action.
- **`[VERIFY]`** — requires evidence through tests, dashboards, screenshots, logs, or drills.
- **`[DECISION]`** — stop and obtain an explicit owner decision if unresolved.
- **`[POLICY]`** — requires a written public or operational policy.
- **`[DATA]`** — affects database schema, retention, event data, export, or deletion behavior.
- **`[LEGAL]`** — requires owner review and, where appropriate, qualified legal review before publication.

Do not invent public promises, jurisdiction-specific legal claims, retention guarantees, security claims, or availability commitments.

---

## 7. Standing implementation rules

1. **Public signup must fail safely.**  
   If abuse controls, database availability, or email delivery are unhealthy, new account creation must be pausable.

2. **Existing users take priority over new signups.**  
   Under pressure, protect login, active workouts, and set writes before registration and analytics.

3. **No public operational surface.**  
   Grafana, Prometheus, Loki, PostgreSQL, exporters, internal APIs, and support tools remain private.

4. **No unrestricted production writes from internal tools.**

5. **No silent privilege expansion.**

6. **No public claim without operational evidence.**  
   Do not claim “secure,” “always available,” “fully deleted,” or “encrypted everywhere” unless the exact claim is true and documented.

7. **No collection without purpose.**  
   Public launch is not permission to collect more telemetry by default.

8. **No large architectural change without measured justification.**

9. **No public launch while recovery is theoretical.**

10. **No destructive migration without a tested recovery path.**

11. **No automatic retry of non-idempotent writes unless idempotency is implemented.**

12. **No source-IP trust beyond the verified proxy chain.**

13. **No use of personal emails or user IDs as metric labels.**

14. **No unbounded queues, logs, backups, or uploads.**

15. **No hidden test accounts in public metrics without explicit exclusion.**

16. **No new public dependency without failure behavior and monitoring.**

17. **No launch without an explicit stop-the-line authority.**  
    The owner must be able to disable signup or revert a release immediately.

---

## 8. Required owner decisions before implementation

Resolve these decisions in Batch A.

| Decision | Recommended Stage 3 default | Why it matters |
|---|---|---|
| Initial public user target | 100–500 registered users with a smaller active subset | Defines capacity requirements |
| Signup model | Open signup with email verification and adaptive rate limits | Enables public access while containing abuse |
| Hosting model | Keep home-host only if Batch B proves sufficient reliability; otherwise move production to a managed/VPS environment | Public launch changes risk |
| Public hostname | Stable production domain | Required for trust and email links |
| Public support route | Dedicated support email plus in-app issue form | Needed for unknown users |
| Public status mechanism | Hosted external status page or static external status site | Must remain reachable during home-host outage |
| Availability target | Suggested 99.5% monthly internal SLO | Realistic first public target |
| Recovery target | Suggested RPO 15 minutes, RTO 2 hours | Public user data requires stronger recovery |
| Signup kill switch | Required | Needed during incidents or capacity pressure |
| New-user daily cap | Recommended during early launch | Prevents uncontrolled growth |
| Log retention | Suggested 30–60 days | Supports public incident investigation |
| Audit retention | Suggested 12–24 months | Privileged actions must remain attributable |
| Product analytics retention | Explicit policy required | Public users must be told what is collected |
| Deletion grace period | Explicit public policy | Must match implementation |
| Incident notification threshold | Define when all users versus affected users are notified | Avoid inconsistent communication |
| Maintenance policy | Scheduled windows only when necessary | Public users need notice |
| Legal review | Required before publishing final terms/privacy if applicable | Public legal claims matter |
| Post-launch observation period | Suggested 14 days with restricted change scope | Reduces launch regression risk |

---

# Batch A — Public-launch evidence review and decision lock

**Goal:** Use Stage 2 evidence to define the public operating model.

## A1. Private-beta evidence review

- [ ] **`[VERIFY]`** Review:
  - active beta users
  - retention
  - support volume
  - P0/P1 incidents
  - error rates
  - p95/p99 latency
  - database growth
  - backup growth
  - restore times
  - email-delivery success
  - abusive or malformed traffic
  - browser/device distribution
  - operator workload
- [ ] **`[VERIFY]`** Identify the highest-risk user journey.
- [ ] **`[VERIFY]`** Identify the most common support issue.
- [ ] **`[VERIFY]`** Identify the largest performance bottleneck.
- [ ] **`[VERIFY]`** Identify the most expensive operational dependency.
- [ ] **`[VERIFY]`** Identify every manual action required to keep production healthy.

## A2. Public-launch risk register

Create a risk register containing:

- risk
- likelihood
- impact
- detection method
- mitigation
- owner
- launch-blocking status
- review date

Minimum risks:

- home internet outage
- host hardware failure
- power loss
- database corruption
- disk exhaustion
- signup abuse
- credential stuffing
- email-provider outage
- tunnel/reverse-proxy outage
- bad migration
- data deletion bug
- account takeover
- public traffic spike
- user-support overload
- monitoring-provider outage
- backup repository failure
- privacy-policy mismatch
- accidental public exposure of internal services

## A3. Decision report

Produce a report containing:

- proposed initial public-user target
- proposed daily signup cap
- proposed hosting decision
- proposed public support path
- proposed public status mechanism
- proposed availability and recovery targets
- proposed overload behavior
- proposed rate-limit policy
- proposed retention policy
- proposed launch observation period
- required legal/policy documents
- remaining launch blockers

### Stop point

Stop and show the owner the risk register and decision report. Do not implement public signup or publish legal documents before approval.

---

# Batch B — Production hosting viability and infrastructure decision

**Goal:** Decide whether the home server remains acceptable for public launch.

## B1. Hosting viability criteria

Evaluate the current deployment against:

- measured uptime during Stage 2
- home internet stability
- upstream bandwidth
- power-loss behavior
- host reboot recovery
- hardware age and failure risk
- disk redundancy
- backup independence
- physical access
- thermal behavior
- security patching
- remote recovery ability
- tunnel/provider dependency
- operator availability
- capacity-test results

- [ ] **`[VERIFY]`** Produce measured evidence for each criterion.
- [ ] **`[DECISION]`** Choose one:
  1. remain home-hosted for initial public release,
  2. use a hybrid model,
  3. migrate production to a VPS/managed environment.

## B2. Home-hosted approval conditions

If remaining home-hosted, require:

- [ ] UPS or documented power-loss handling.
- [ ] Automatic startup after power restoration.
- [ ] Remote management path independent of the app.
- [ ] Off-host backups.
- [ ] External status page.
- [ ] External uptime monitoring.
- [ ] Spare restore target or documented replacement-host procedure.
- [ ] Disk-health monitoring.
- [ ] Security-update procedure.
- [ ] Network and firewall review.
- [ ] Measured capacity headroom of at least 2× expected launch load.
- [ ] Explicit user-facing wording that does not overpromise availability.

## B3. Migration path

If moving away from the home host:

- [ ] **`[INFRA]`** Select a deployment target.
- [ ] **`[INFRA]`** Preserve Docker-based reproducibility where practical.
- [ ] **`[INFRA]`** Separate:
  - application runtime
  - PostgreSQL
  - backups
  - monitoring
- [ ] **`[INFRA]`** Prefer managed PostgreSQL if it materially improves recovery and operations.
- [ ] **`[INFRA]`** Re-validate trusted proxies, secure cookies, network policy, and secrets.
- [ ] **`[VERIFY]`** Perform migration rehearsal using staging.
- [ ] **`[VERIFY]`** Measure downtime.
- [ ] **`[VERIFY]`** Confirm data parity.
- [ ] **`[VERIFY]`** Confirm rollback to the original environment.

## B4. Infrastructure-as-code baseline

- [ ] **`[CODE]`** Version all non-secret infrastructure configuration.
- [ ] **`[CODE]`** Document all manually configured provider settings.
- [ ] **`[CODE]`** Add an environment inventory:
  - production
  - staging
  - recovery
- [ ] **`[CODE]`** Ensure a new host can be recreated from documentation and versioned config.
- [ ] **`[VERIFY]`** Rebuild staging or a disposable environment from scratch.

### Definition of done

The production hosting model is an explicit evidence-based decision, not an assumption.

---

# Batch C — Public signup, verification, and abuse controls

**Goal:** Open registration without allowing uncontrolled automated account creation or resource exhaustion.

## C1. Open-signup transition

- [ ] **`[CODE]`** Remove invite-only enforcement only after all controls below are active.
- [ ] **`[CODE]`** Preserve the ability to return to invite-only mode.
- [ ] **`[CODE]`** Add a global signup kill switch.
- [ ] **`[CODE]`** Add configurable daily and hourly registration limits.
- [ ] **`[CODE]`** Add an operator-visible signup state:
  - open
  - limited
  - invite-only
  - paused
- [ ] **`[CODE]`** Audit signup-state changes.

## C2. Registration protections

- [ ] **`[CODE]`** Rate-limit by trusted client network signals.
- [ ] **`[CODE]`** Rate-limit by normalized email identity where appropriate.
- [ ] **`[CODE]`** Prevent repeated verification-email abuse.
- [ ] **`[CODE]`** Use generic responses to reduce account enumeration.
- [ ] **`[CODE]`** Validate email format and normalization consistently.
- [ ] **`[CODE]`** Bound request-body size.
- [ ] **`[CODE]`** Bound verification attempts.
- [ ] **`[CODE]`** Expire verification tokens.
- [ ] **`[CODE]`** Make verification tokens one-time use.
- [ ] **`[CODE]`** Record security events without logging tokens.

## C3. Bot and abuse challenge

- [ ] **`[DECISION]`** Determine whether observed traffic justifies CAPTCHA or proof-of-work.
- [ ] **`[CODE]`** Prefer adaptive challenges rather than forcing every user through them.
- [ ] **`[CODE]`** Keep server-side enforcement authoritative.
- [ ] **`[CODE]`** Monitor challenge failures and false positives.
- [ ] **`[CODE]`** Add a provider kill switch if using an external challenge service.
- [ ] **`[VERIFY]`** Confirm signup remains possible when the challenge provider fails, according to the approved fallback policy.

## C4. Disposable and abusive email policy

- [ ] **`[DECISION]`** Decide whether disposable email domains are:
  - allowed,
  - challenged,
  - or blocked.
- [ ] **`[CODE]`** Do not hardcode an unmaintainable static list without update strategy.
- [ ] **`[CODE]`** Audit policy-triggered rejections.
- [ ] **`[POLICY]`** Document false-positive handling.

## C5. Signup observability

Add dashboards for:

- signup attempts
- successful registrations
- verification success
- rejected signups
- rate-limit triggers
- challenge triggers
- provider failures
- signup latency
- daily new-user cap
- signup-state changes

Add alerts for:

- sudden signup spike
- verification failure spike
- provider outage
- repeated rate-limit saturation
- signup database errors

### Definition of done

Public signup can be opened, limited, paused, or reverted to invite-only without code changes, and abuse cannot consume unbounded resources.

---

# Batch D — Public legal, privacy, and service disclosures

**Goal:** Ensure public-facing claims match the real implementation.

## D1. Privacy notice

The notice must accurately describe:

- account data
- workout and body-related data stored
- product analytics
- operational logs
- error tracking
- tracing
- email provider
- hosting and backup providers
- operator access
- retention
- export
- deletion
- backup behavior after deletion
- security-event data
- support contact
- policy changes

- [ ] **`[LEGAL]`** Draft and review final wording.
- [ ] **`[OWNER]`** Approve final version.
- [ ] **`[CODE]`** Publish on a stable public route.
- [ ] **`[DATA]`** Version the policy.
- [ ] **`[CODE]`** Record acceptance only if legally or operationally required.
- [ ] **`[VERIFY]`** Confirm wording matches actual provider settings and retention.

## D2. Terms of use

Cover at minimum:

- acceptable use
- account responsibility
- beta/early-product limitations
- no medical advice
- no guarantee of training outcomes
- service availability limitations
- account suspension
- data export/deletion
- prohibited automation or abuse
- limitation of support
- termination
- policy changes

- [ ] **`[LEGAL]`** Review final wording.
- [ ] **`[CODE]`** Publish on a stable route.
- [ ] **`[CODE]`** Link from signup and footer/settings.

## D3. Cookie and telemetry disclosure

- [ ] **`[POLICY]`** Document session cookies.
- [ ] **`[POLICY]`** Document analytics and error-monitoring behavior.
- [ ] **`[DECISION]`** Determine whether consent controls are required for any nonessential telemetry.
- [ ] **`[CODE]`** Disable nonessential telemetry until consent where required by the adopted policy.
- [ ] **`[VERIFY]`** Confirm actual cookies and trackers match disclosure.

## D4. Public service expectations

Publish concise information on:

- service is an early public version
- support is best effort
- planned maintenance may occur
- data is backed up
- availability is not contractually guaranteed
- how incidents are communicated
- how to contact support

Do not publish internal SLOs as contractual promises.

## D5. Policy-change workflow

- [ ] **`[POLICY]`** Define how material policy changes are announced.
- [ ] **`[DATA]`** Store policy version and effective date.
- [ ] **`[CODE]`** Require re-acceptance only where explicitly chosen.
- [ ] **`[VERIFY]`** Test policy version display and archival access.

### Definition of done

Every public claim is traceable to actual system behavior and provider configuration.

---

# Batch E — Public support and status communication

**Goal:** Provide reliable support and incident information to users with no prior relationship to the owner.

## E1. Public support intake

- [ ] **`[OWNER]`** Configure a dedicated support email.
- [ ] **`[CODE]`** Add a public support page.
- [ ] **`[CODE]`** Add an authenticated issue-report form.
- [ ] **`[CODE]`** Include safe diagnostics:
  - release
  - route
  - support reference
  - browser family
  - device class
  - timestamp
- [ ] **`[CODE]`** Allow user description and optional screenshot upload only if secure upload handling exists.
- [ ] **`[CODE]`** Bound attachment size and allowed file types.
- [ ] **`[CODE]`** Scan or isolate uploads if implemented.
- [ ] **`[CODE]`** Do not accept secrets or passwords in the form.
- [ ] **`[CODE]`** Add clear guidance not to send credentials.

## E2. Support workflow

Define states:

- new
- acknowledged
- investigating
- waiting for user
- resolved
- closed

- [ ] **`[POLICY]`** Define response expectations as best effort.
- [ ] **`[POLICY]`** Define escalation for:
  - security
  - data integrity
  - account access
  - billing, if ever introduced
- [ ] **`[CODE]`** Link support references to internal support tooling.

## E3. Public status page

The status page must remain available when the application host is down.

Track:

- web application
- API
- authentication
- database-backed operations
- email verification
- data export
- operational maintenance

- [ ] **`[OWNER]`** Select hosted or external static status solution.
- [ ] **`[INFRA]`** Integrate external uptime signals.
- [ ] **`[POLICY]`** Define manual versus automatic incident publication.
- [ ] **`[VERIFY]`** Simulate an outage and publish an incident.
- [ ] **`[VERIFY]`** Confirm status page remains reachable during host outage.

## E4. Incident communication policy

Define when to communicate:

- all-user outage
- login outage
- write failures
- delayed email
- data restore
- security incident
- maintenance
- partial degradation

Communication must include:

- what users observe
- when it started
- current mitigation
- whether data is affected
- next update timing only when the owner can actually provide it
- resolution confirmation

## E5. Security contact

- [ ] **`[POLICY]`** Publish a security contact.
- [ ] **`[POLICY]`** Define responsible-reporting expectations.
- [ ] **`[CODE]`** Add `security.txt` if adopted.
- [ ] **`[POLICY]`** Do not promise a bounty unless one exists.

### Definition of done

Unknown users can obtain help and see current service status without access to internal tools.

---

# Batch F — Public reliability targets, error budgets, and alert maturity

**Goal:** Define measurable launch reliability and prevent alert overload.

## F1. Public-launch service indicators

Track at minimum:

- public readiness availability
- valid API request success
- workout-write success
- login success
- email verification delivery
- p95/p99 write latency
- dashboard p95 latency
- database connection saturation
- backup archive lag
- support-impacting frontend error rate

## F2. Stage 3 internal SLOs

Suggested initial targets:

- public readiness availability: **99.5% monthly**
- valid API request success: **99.7%**
- workout-write success: **99.9%**
- workout-write p95: **under 750 ms**
- workout-write p99: **under 2 seconds**
- dashboard API p95: **under 1 second**
- verification-email provider acceptance: **99%**
- recovery point: **15 minutes**
- recovery time: **2 hours**

- [ ] **`[DECISION]`** Confirm targets using Stage 2 evidence.
- [ ] **`[CODE]`** Document exclusions.
- [ ] **`[INFRA]`** Create SLO dashboards.
- [ ] **`[INFRA]`** Track error-budget burn.
- [ ] **`[POLICY]`** Freeze risky releases when error budget is exhausted.

## F3. Alert tiers

Define:

### Page/immediate

- complete outage
- database unavailable
- write failures
- suspected data loss
- backup/PITR failure beyond RPO
- security incident
- disk critical
- repeated crash loop

### Urgent but not immediate

- sustained latency degradation
- email provider failure
- signup abuse
- high 5xx rate with partial service
- capacity threshold crossed

### Informational

- deployment completed
- backup completed
- daily signup cap reached
- noncritical dependency degradation

- [ ] **`[INFRA]`** Deduplicate and group alerts.
- [ ] **`[INFRA]`** Add runbook links.
- [ ] **`[INFRA]`** Add silence/maintenance handling.
- [ ] **`[VERIFY]`** Conduct alert-fire drill.

## F4. On-call ownership

Even with one operator:

- [ ] **`[POLICY]`** Define who receives critical alerts.
- [ ] **`[POLICY]`** Define unavailable periods.
- [ ] **`[POLICY]`** Define when signup is paused because no operator is available.
- [ ] **`[POLICY]`** Define emergency contact backup if one exists.
- [ ] **`[POLICY]`** Do not imply 24/7 support.

### Definition of done

Reliability is measured against explicit internal targets, and alerts identify actions rather than generate noise.

---

# Batch G — Overload protection, idempotency, and graceful degradation

**Goal:** Prevent traffic spikes or dependency failures from corrupting data or collapsing the service.

## G1. Idempotency for critical writes

Review:

- set creation
- workout completion
- historical edits
- imports
- deletion requests
- export generation
- email-verification resend
- account disablement

- [ ] **`[CODE]`** Add idempotency keys where duplicate submission can create harmful duplicates.
- [ ] **`[DATA]`** Add uniqueness constraints where appropriate.
- [ ] **`[CODE]`** Store idempotency result safely and expire it.
- [ ] **`[CODE]`** Ensure client retries use the same key.
- [ ] **`[VERIFY]`** Simulate double submit and network retry.

## G2. Resource bounds

Add explicit limits for:

- request body size
- CSV upload size
- CSV row count
- session duration
- exercise count per workout
- set count per workout
- export generation frequency
- support attachment size
- pagination limits
- query date ranges
- analytics dashboard ranges

- [ ] **`[CODE]`** Return clear validation errors.
- [ ] **`[CODE]`** Log limit-trigger events safely.
- [ ] **`[VERIFY]`** Confirm limits cannot exhaust memory or disk.

## G3. Dependency timeouts and circuit behavior

For:

- PostgreSQL
- Resend
- Sentry
- monitoring exporters
- external challenge provider
- object storage, if used

- [ ] **`[CODE]`** Set bounded timeouts.
- [ ] **`[CODE]`** Avoid retry storms.
- [ ] **`[CODE]`** Use circuit-breaker or temporary backoff only where justified.
- [ ] **`[CODE]`** Keep core workout operations independent of noncritical telemetry.
- [ ] **`[VERIFY]`** Confirm Sentry/Loki/Prometheus failure does not break user requests.

## G4. Graceful degradation

Define degradation order:

1. disable nonessential analytics
2. disable heavy 3D effects or use static fallback
3. pause exports/imports
4. pause new signup
5. preserve login and workout writes
6. enter read-only mode only if write integrity cannot be guaranteed

- [ ] **`[CODE]`** Add kill switches for each approved degradation mode.
- [ ] **`[CODE]`** Show clear user messaging.
- [ ] **`[CODE]`** Audit mode changes.
- [ ] **`[VERIFY]`** Rehearse each mode in staging.

## G5. Queueing decision

- [ ] **`[DECISION]`** Determine whether exports, deletion jobs, and email sends require a background job queue.
- [ ] **`[CODE]`** Add a queue only if synchronous execution or reliability evidence justifies it.
- [ ] **`[CODE]`** If added:
  - bound queue length
  - retry with backoff
  - dead-letter failures
  - expose queue depth
  - alert on stuck jobs
  - make jobs idempotent

### Definition of done

Traffic spikes and dependency outages fail predictably without duplicating writes or taking down core logging workflows.

---

# Batch H — Security hardening for public exposure

**Goal:** Strengthen controls for unknown public users and automated traffic.

## H1. Authentication security review

- [ ] **`[CODE]`** Review password policy.
- [ ] **`[CODE]`** Review password hashing parameters.
- [ ] **`[CODE]`** Review session lifetime.
- [ ] **`[CODE]`** Review session rotation.
- [ ] **`[CODE]`** Review cookie flags.
- [ ] **`[CODE]`** Review CSRF/origin protections.
- [ ] **`[CODE]`** Review email-verification and reset token expiry.
- [ ] **`[CODE]`** Review account-enumeration resistance.
- [ ] **`[VERIFY]`** Re-run abuse and lockout tests through the public path.

## H2. Authorization review

- [ ] **`[CODE]`** Verify every user-scoped route enforces ownership.
- [ ] **`[CODE]`** Add negative tests for cross-user access.
- [ ] **`[CODE]`** Verify internal/admin routes separately.
- [ ] **`[CODE]`** Verify bulk and historical-edit routes.
- [ ] **`[VERIFY]`** Test direct object reference attacks with controlled accounts.

## H3. Web security headers

- [ ] **`[CODE]`** Review and configure:
  - Content-Security-Policy
  - Strict-Transport-Security
  - X-Content-Type-Options
  - Referrer-Policy
  - frame-ancestors or equivalent
  - Permissions-Policy
- [ ] **`[CODE]`** Ensure 3D assets, fonts, Sentry, and required providers are covered without broad unsafe directives.
- [ ] **`[VERIFY]`** Confirm headers on public routes.

## H4. Upload/import hardening

- [ ] **`[CODE]`** Parse CSV safely.
- [ ] **`[CODE]`** Reject oversized or malformed files early.
- [ ] **`[CODE]`** Protect against spreadsheet formula injection on export.
- [ ] **`[CODE]`** Avoid temporary-file leakage.
- [ ] **`[CODE]`** Bound parsing time and memory.
- [ ] **`[VERIFY]`** Test malformed, large, duplicate, and adversarial files.

## H5. Supply-chain and deployment security

- [ ] **`[CODE]`** Pin production dependencies through lockfiles.
- [ ] **`[CODE]`** Review CI permissions.
- [ ] **`[CODE]`** Restrict deployment credentials.
- [ ] **`[CODE]`** Scan dependencies and images.
- [ ] **`[CODE]`** Produce a software inventory or SBOM if practical.
- [ ] **`[POLICY]`** Define critical vulnerability response.
- [ ] **`[VERIFY]`** Conduct one dependency-update rehearsal.

## H6. Security incident response

Create runbooks for:

- account takeover
- leaked secret
- exposed database/admin port
- malicious upload
- mass signup abuse
- suspected data exfiltration
- compromised operator device
- compromised deployment credential

Each must include:

- containment
- evidence preservation
- secret rotation
- user/session invalidation
- communication decision
- recovery
- post-incident actions

### Definition of done

Public routes have tested authentication, authorization, input, header, and incident controls.

---

# Batch I — Data lifecycle, deletion scale, and privacy operations

**Goal:** Ensure public users can exercise data controls reliably and that retention remains bounded.

## I1. Export reliability

- [ ] **`[CODE]`** Queue or bound export generation if required.
- [ ] **`[CODE]`** Add progress/status.
- [ ] **`[CODE]`** Add expiry.
- [ ] **`[CODE]`** Add retry-safe generation.
- [ ] **`[CODE]`** Add audit event.
- [ ] **`[CODE]`** Add support recovery when export fails.
- [ ] **`[VERIFY]`** Test large realistic accounts.

## I2. Deletion reliability

- [ ] **`[CODE]`** Ensure deletion is resumable.
- [ ] **`[CODE]`** Ensure partial failure is visible.
- [ ] **`[CODE]`** Ensure deleted users cannot authenticate.
- [ ] **`[CODE]`** Ensure user-linked files and exports are removed.
- [ ] **`[CODE]`** Ensure product analytics behavior matches policy.
- [ ] **`[CODE]`** Preserve only the approved minimal audit evidence.
- [ ] **`[VERIFY]`** Run repeated deletion tests.

## I3. Backup interaction

- [ ] **`[POLICY]`** State clearly that deleted data may remain in encrypted backups until retention expiry.
- [ ] **`[CODE]`** Ensure restored historical backups are not silently promoted without re-applying deletion records or procedures.
- [ ] **`[CODE]`** Add restore runbook step for post-restore deletion reconciliation.
- [ ] **`[VERIFY]`** Test deletion reconciliation in a disposable restore.

## I4. Retention enforcement

- [ ] **`[DATA]`** Confirm all retention schedules.
- [ ] **`[CODE]`** Monitor cleanup jobs.
- [ ] **`[INFRA]`** Verify provider retention:
  - Sentry
  - Loki
  - backups
  - status/support tooling
  - email provider
- [ ] **`[VERIFY]`** Produce a retention report.

## I5. Data-access audit

- [ ] **`[POLICY]`** Define when operator viewing is audited.
- [ ] **`[CODE]`** Audit sensitive user-detail access if adopted.
- [ ] **`[CODE]`** Restrict exports of internal user lists.
- [ ] **`[VERIFY]`** Confirm support staff cannot access more than required; for one operator, confirm controls still exist.

### Definition of done

Export, deletion, restore, and retention behavior remain consistent under public usage and match published policy.

---

# Batch J — Release governance and change management

**Goal:** Prevent public regressions through disciplined release controls.

## J1. Release classes

Define:

- patch
- normal feature
- high-risk feature
- migration-heavy release
- emergency hotfix

Each class must specify:

- required tests
- staging duration
- backup requirement
- approval
- rollback plan
- observation window

## J2. Production deployment gate

A release cannot deploy unless:

- CI passes
- security scans pass or accepted findings are documented
- staging migration passes
- staging smoke passes
- critical end-to-end flows pass
- feature flags are reviewed
- backup is current
- rollback path exists
- release notes exist

- [ ] **`[CODE]`** Automate checks.
- [ ] **`[CODE]`** Record deployment evidence.
- [ ] **`[CODE]`** Tag every release.

## J3. Progressive rollout

For risky releases:

- owner account first
- small beta cohort
- broader public cohort
- full rollout

- [ ] **`[CODE]`** Use feature flags or cohort controls.
- [ ] **`[CODE]`** Compare error/latency by cohort and release.
- [ ] **`[VERIFY]`** Rehearse progressive rollout.

## J4. Change freeze

- [ ] **`[POLICY]`** Define launch freeze period.
- [ ] **`[POLICY]`** Permit only:
  - blocker fixes
  - security fixes
  - operational fixes
- [ ] **`[POLICY]`** Defer unrelated product polish during launch observation.

## J5. Post-deploy review

After every public release:

- verify readiness
- verify critical journeys
- inspect error rate
- inspect write failures
- inspect p95/p99
- inspect database saturation
- inspect signup behavior
- inspect email delivery

- [ ] **`[CODE]`** Automate summary where practical.
- [ ] **`[POLICY]`** Define rollback thresholds.

### Definition of done

Public releases are traceable, staged, reversible, and observed.

---

# Batch K — Public-scale capacity and disaster-recovery validation

**Goal:** Prove the system can survive expected public traffic and recover from major failures.

## K1. Public launch load model

Model:

- signup burst
- verification burst
- morning/evening dashboard use
- concurrent active workouts
- high set-write activity
- chart/history reads
- CSV import
- export generation
- internal support usage
- monitoring overhead

## K2. Capacity tests

Run:

- expected launch load
- 2× expected launch load
- 5× short spike
- sustained test
- signup-heavy test
- write-heavy test
- read-heavy test

Measure:

- request throughput
- p50/p95/p99
- error rate
- event-loop lag
- memory growth
- PostgreSQL pool use
- slow queries
- disk I/O
- backup interference
- tunnel/network saturation
- queue depth
- email-provider limits
- recovery after load

- [ ] **`[VERIFY]`** Determine maximum safe concurrent active workouts.
- [ ] **`[VERIFY]`** Determine safe registrations per hour/day.
- [ ] **`[VERIFY]`** Determine safe import/export concurrency.
- [ ] **`[CODE]`** Configure caps below measured saturation.

## K3. Disaster-recovery scenarios

Rehearse:

- complete application-host loss
- database-volume loss
- corrupted latest deployment
- accidental destructive migration
- backup repository temporary loss
- tunnel provider outage
- primary domain/DNS issue
- operator credential loss

For each:

- detection
- containment
- recovery target
- actual recovery time
- data loss
- communication
- follow-up

## K4. Replacement-host drill

- [ ] **`[VERIFY]`** Provision a clean replacement environment.
- [ ] **`[VERIFY]`** Restore config.
- [ ] **`[VERIFY]`** Restore database.
- [ ] **`[VERIFY]`** restore secrets through approved mechanism.
- [ ] **`[VERIFY]`** bring application online.
- [ ] **`[VERIFY]`** validate DNS/tunnel routing.
- [ ] **`[VERIFY]`** complete critical smoke test.
- [ ] **`[VERIFY]`** measure full recovery time.

## K5. Recovery targets

Suggested Stage 3 internal targets:

- **RPO:** 15 minutes
- **RTO:** 2 hours for database/service recovery
- **Replacement-host target:** 4 hours

- [ ] **`[DECISION]`** Confirm based on drills.
- [ ] **`[POLICY]`** Do not publish as contractual SLA.

### Stop point

Stop and show the owner:

- public capacity report
- safe signup cap
- safe concurrency
- disaster-recovery report
- replacement-host timing
- unresolved infrastructure constraints

Do not launch if expected public load exceeds safe capacity.

---

# Batch L — Public launch rehearsal and go/no-go review

**Goal:** Rehearse the complete public launch and make an explicit launch decision.

## L1. Full public-user journey

From a clean external device:

1. discover public site,
2. read terms/privacy,
3. sign up,
4. pass abuse controls,
5. receive verification email,
6. verify account,
7. log in,
8. complete onboarding,
9. start workout,
10. log sets,
11. complete workout,
12. view history and progress,
13. export data,
14. request support,
15. request deletion,
16. cancel or complete deletion according to policy.

- [ ] **`[VERIFY]`** Confirm all telemetry, audit, and product events are correct.
- [ ] **`[VERIFY]`** Confirm no sensitive values leak.

## L2. Operator journey

Rehearse:

- pause signup
- switch to invite-only
- disable risky feature
- locate support request
- inspect trace/log/Sentry
- revoke sessions
- disable account
- generate export
- execute deletion
- publish status incident
- deploy hotfix
- roll back
- restore database in disposable environment
- rotate one credential

## L3. Incident launch rehearsal

Simulate:

- database outage during active workouts
- email outage during signup
- public web outage
- suspicious signup spike
- write-failure regression after deployment

For each:

- alert
- runbook
- status communication
- mitigation
- recovery
- incident closure
- post-incident record

## L4. Go/no-go criteria

Launch only if:

- no open P0/P1 issue
- public signup controls work
- signup kill switch works
- safe capacity exceeds expected launch load
- backup and PITR are healthy
- replacement-host recovery passed
- terms/privacy are published
- support and status routes work
- security review passed
- release rollback passed
- all critical alerts are active
- operator is available during launch observation
- launch freeze is active

## L5. Explicit owner approval

- [ ] **`[OWNER]`** Record:
  - launch date
  - approved user target
  - approved daily signup cap
  - approved hosting model
  - approved SLOs
  - approved policies
  - known accepted limitations
  - rollback threshold
  - observation-period duration

---

# Batch M — Post-launch observation and stabilization

**Goal:** Operate the first public release conservatively and convert real launch evidence into the next roadmap.

## M1. Observation window

Suggested: 14 days.

During this period:

- no unrelated redesign
- no migration-heavy features
- no major analytics changes
- no infrastructure replacement unless required
- daily health review
- daily signup review
- daily support review
- daily backup review
- daily error review

## M2. Daily launch review

Track:

- signups
- verification conversion
- active users
- workout-write success
- p95/p99 latency
- 5xx rate
- frontend errors
- abuse events
- support tickets
- database growth
- backup archive lag
- capacity headroom

## M3. Launch thresholds

Pause signup when:

- write integrity is uncertain
- recovery falls outside target
- 5xx rate exceeds approved threshold
- database saturation persists
- support backlog becomes unsafe
- security incident is unresolved
- backup health is uncertain
- email verification is broadly failing

## M4. Post-launch review

At the end of the observation window, produce:

- launch summary
- user count
- activation
- retention
- reliability
- incidents
- support themes
- capacity headroom
- infrastructure decision
- security findings
- recovery performance
- next-stage recommendations

## M5. Stage 4 decision

Stage 3 completion should lead to one of:

- continue current architecture,
- scale vertically,
- migrate database,
- migrate full production,
- add queueing,
- improve support automation,
- improve onboarding/product,
- begin monetization work,
- or pause growth to fix reliability.

Do not assume the next step is automatically “more users.”

---

# Final Stage 3 launch checklist

Every item below must be checked before open public signup.

## Public access

- [ ] Open signup works.
- [ ] Signup can be paused.
- [ ] Invite-only fallback works.
- [ ] Daily signup cap works.
- [ ] Verification abuse controls work.
- [ ] Account enumeration resistance is verified.
- [ ] Bot challenge policy is implemented if required.

## Hosting and infrastructure

- [ ] Hosting decision is documented.
- [ ] Home-host approval conditions are met, or migration completed.
- [ ] Infrastructure can be recreated.
- [ ] Remote management exists.
- [ ] External status remains available during outage.
- [ ] Capacity headroom exceeds launch target.

## Legal and privacy

- [ ] Privacy notice is published.
- [ ] Terms are published.
- [ ] Telemetry/cookie behavior matches disclosure.
- [ ] Deletion behavior matches disclosure.
- [ ] Backup behavior matches disclosure.
- [ ] Support and security contacts are published.
- [ ] Final wording has owner/legal review where appropriate.

## Support and status

- [ ] Public support route works.
- [ ] Authenticated issue form works.
- [ ] Support references correlate internally.
- [ ] Public status page works.
- [ ] Incident communication templates exist.
- [ ] Status outage rehearsal passed.

## Reliability

- [ ] Stage 3 SLOs are approved.
- [ ] Error-budget dashboard exists.
- [ ] Alert tiers exist.
- [ ] Critical alerts are tested.
- [ ] Signup pause policy exists.
- [ ] On-call ownership is explicit.

## Overload and data integrity

- [ ] Critical writes are idempotent where needed.
- [ ] Resource limits exist.
- [ ] Dependency timeouts exist.
- [ ] Retry behavior is bounded.
- [ ] Graceful-degradation modes work.
- [ ] Queueing, if added, is bounded and observable.
- [ ] Core workout writes survive noncritical telemetry failure.

## Security

- [ ] Authentication review passed.
- [ ] Authorization negative tests passed.
- [ ] Security headers are correct.
- [ ] Import/upload hardening passed.
- [ ] Dependency/image scans pass or findings are accepted.
- [ ] Security incident runbooks exist.
- [ ] Secret-rotation drill passed.

## Data lifecycle

- [ ] Export works for large realistic accounts.
- [ ] Deletion is resumable.
- [ ] Restore/deletion reconciliation works.
- [ ] Retention is enforced.
- [ ] Provider retention is verified.
- [ ] Sensitive support access is controlled.

## Release governance

- [ ] Release classes exist.
- [ ] Production gate is automated.
- [ ] Progressive rollout works.
- [ ] Change freeze is active.
- [ ] Rollback thresholds exist.
- [ ] Release tags and evidence exist.

## Capacity and recovery

- [ ] Expected public load test passed.
- [ ] 2× load test passed.
- [ ] Spike test passed or caps protect the service.
- [ ] Safe concurrency is recorded.
- [ ] Safe signup cap is recorded.
- [ ] Replacement-host drill passed.
- [ ] RPO and RTO targets passed.
- [ ] Disaster-recovery runbooks are current.

## Launch rehearsal

- [ ] Full public-user journey passed.
- [ ] Full operator journey passed.
- [ ] Incident rehearsal passed.
- [ ] No open P0/P1 issue remains.
- [ ] Owner go/no-go approval is recorded.
- [ ] Observation window is scheduled.

---

# Required implementation evidence

Before closing Stage 3, attach or reference:

1. Public-launch architecture diagram
2. Hosting viability report
3. Public-launch risk register
4. Signup-control dashboard
5. Signup kill-switch evidence
6. Abuse-control test results
7. Published privacy notice
8. Published terms
9. Cookie/telemetry inventory
10. Public support page
11. Public status page and outage rehearsal
12. Stage 3 SLO/error-budget dashboard
13. Alert-tier configuration
14. Idempotency test report
15. Resource-limit test report
16. Graceful-degradation rehearsal
17. Security review report
18. Authorization negative-test report
19. Dependency/container scan summary
20. Data export/deletion scale test
21. Restore/deletion reconciliation evidence
22. Release-gate evidence
23. Progressive-rollout evidence
24. Public capacity report
25. Disaster-recovery report
26. Replacement-host drill
27. Full public-user rehearsal
28. Full operator rehearsal
29. Incident rehearsal
30. Owner go/no-go record
31. Post-launch observation checklist

Do not include production secrets, raw personal data, access tokens, password hashes, verification tokens, or identifiable workout histories in committed evidence.

---

# Definition of done

Stage 3 is done when the application can be opened to unknown public users and the owner can:

- control signup growth,
- contain ordinary automated abuse,
- protect core workout writes under load,
- support users without unsafe database changes,
- communicate outages publicly,
- operate against explicit reliability targets,
- recover from host or database failure,
- prove export, deletion, retention, and privacy behavior,
- deploy progressively and roll back safely,
- pause growth immediately when reliability degrades,
- and demonstrate that the selected infrastructure can support the approved launch population.

No unresolved issue may remain that threatens:

- authentication,
- authorization,
- workout-data integrity,
- recovery,
- privacy,
- public support,
- incident communication,
- capacity,
- or the operator’s ability to stop growth and stabilize the service.

Stage 3 completion authorizes an initial open public release only within the approved capacity and policy limits. It does not imply enterprise readiness, unlimited growth, contractual availability, or suitability for a multi-million-user platform.
