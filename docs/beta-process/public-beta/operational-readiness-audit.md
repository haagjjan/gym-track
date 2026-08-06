# Gym Tracker Public-Beta and Operational-Readiness Audit

**Audit date:** 2026-08-06

**Decision:** **NO-GO for public beta**

**Audited target:** the current local working tree on `main`, based on committed `HEAD` `4cbcba8e73482b5c64d75bbcbd47ce06b99b4a7a` plus the substantial uncommitted Founding Beta changes present during the audit

**Audit type:** repository and documentation review with local, non-database checks; not a production attestation, penetration test, legal opinion, or disaster-recovery exercise

## 1. Executive assessment

The repository contains a credible private-product foundation and a substantial Founding Beta implementation. Authentication, opaque database sessions, invitation admission, explicit administrator authorization, user-scoped workout repositories, account export/deletion, structured logging, Prometheus/Grafana/Alertmanager assets, encrypted Restic backup automation, CI jobs, mobile-oriented UI work, and a canonical launch-gate document all exist.

That is not yet operational completeness. The correct decision is **NO-GO** because the current release candidate is not frozen or clean, all 29 canonical public-beta launch gates remain unchecked, and several launch-critical claims require evidence from systems that were not inspected. The most important blockers are:

1. Legal/controller/processor details, qualified legal review, and the full DPIA are explicitly unfinished.
2. There is no demonstrated staging environment or end-to-end rehearsal of the actual public topology, invite flow, email provider, migrations, rollback, and incident controls.
3. Current production deployment, Cloudflare/BFF isolation, DNS, email authentication/delivery, alerting, status hosting, backups, and restore behavior were not independently verified.
4. The security review is repository-only. A complete multi-user authorization/IDOR matrix and deployed black-box security test have not been recorded.
5. Core workout POST operations do not provide idempotency or optimistic-concurrency protection, and multi-tab, timeout/retry, weak-network, and process-interruption behavior is not adequately tested.
6. The UI disables browser zoom globally, dialog focus behavior is incomplete, and the required real-device, keyboard, and screen-reader checks are open.
7. The processing inventory says active-set drafts use session storage, but the implementation persists them in `localStorage`; browser behavior therefore does not match the declared retention model.
8. Email sending has no durable queue, retry, idempotency, or bounce/complaint integration. Production can start without a Resend key and then silently not deliver required action links.
9. The required deletion-safe recovery drill—older database snapshot plus a separately obtained newest erasure ledger, migrations, replay, and proof before network reopening—has not been demonstrated.
10. Capacity at 20 concurrent loggers and 2× peak, release rollback, email outage, signup/campaign pause, incident publication, and current-alert rehearsals remain open.

The recommended launch shape remains sensible: invite-only, 18+, 50-seat hard cap, at most 10 approvals per rolling 24 hours, first cohort of 10, and a 72-hour observation period. That rollout must start only after every launch blocker below has linked, dated evidence for a frozen release.

## 2. Evidence and limitations

### Evidence reviewed

- Source-of-truth product, schema, API, architecture, engineering, workflow, and handoff documents.
- The current API and web source, SQL migrations, environment validation, Docker/Render configuration, BFF and request-security boundaries, and browser-storage behavior.
- Unit, route, integration, performance, and Playwright test source.
- CI, logging, monitoring, alerting, backup, erasure-ledger, restore, status-page, deployment, operator, and disaster-recovery assets.
- Git status, current branch/commit, tags, tracked filenames, and a limited filename/pattern review for secrets and internal operational details.
- Historical server readiness reports from July 2026 and production-snapshot tags from August 2026.
- The supplied context that the app is currently owner-only behind Cloudflare Access and contains real workout data. This is useful context, not independently verified live evidence.

### Checks performed during this audit

`pnpm check` passed on the current working tree: TypeScript checks, lint, 227 non-database automated tests (182 API and 45 web), and the production builds completed successfully. `pnpm test:performance` also passed all four repository regression tests.

The API database integration suite, migration up/down cycle, Docker/Playwright smoke suite, load test, real-device checks, external email tests, and production-safe black-box tests were **not** run during this audit. They require isolated state, external systems, devices, or explicit operational coordination beyond a repository-only review.

### Important limits

- The worktree was heavily modified and included many untracked Founding Beta files. It is not a reproducible release artifact, and the committed `HEAD` alone does not represent the audited implementation.
- Historical reports show that a private July deployment had working monitoring, Telegram alerts, and encrypted backup/restore checks. They predate the current Founding Beta schema and do not attest to the present public-beta release or live state.
- No Cloudflare, DNS/registrar, Resend, Telegram, GitHub, host, router, Grafana, Alertmanager, Restic, MacBook backup destination, or production database account was accessed.
- No secret values were requested or inspected. The audit did not perform an exhaustive secret scan, dependency vulnerability scan, container/image scan, software-bill-of-materials review, or full license review.
- The security conclusions are code-review findings, not proof of resistance to an active attacker. The legal/privacy conclusions identify completion gaps; they are not legal advice.
- Passing local checks proves only that the inspected worktree builds and its selected automated tests pass. It does not prove deployment correctness, live data safety, availability, deliverability, accessibility, or recovery.

## 3. Status matrix

Status terms are intentionally strict. `Verified complete` means the whole area has current, relevant evidence; repository implementation by itself does not qualify when the area also depends on deployment or operations.

| # | Audit area | Status | Confidence | Beta criticality |
|---:|---|---|---|---|
| 1 | Public-beta scope and release boundaries | Partially implemented | High | Launch blocker |
| 2 | Removal of owner-only assumptions | Implemented but verification incomplete | High | Launch blocker |
| 3 | Registration and invitation flow | Implemented but verification incomplete | High | Launch blocker |
| 4 | Authentication and account management | Partially implemented | High | High |
| 5 | Authorization and user-data isolation | Implemented but verification incomplete | High | Launch blocker |
| 6 | Workout logging and data correctness | Partially implemented | High | Launch blocker |
| 7 | User-facing errors, loading, retry, offline, and maintenance states | Partially implemented | Medium | High |
| 8 | Mobile and browser readiness | Implemented but verification incomplete | High | Launch blocker |
| 9 | Accessibility and usability | Partially implemented | High | Launch blocker |
| 10 | Security hardening | Partially implemented | High | Launch blocker |
| 11 | Privacy, legal, and policy readiness | Blocked | High | Launch blocker |
| 12 | Transactional email | Partially implemented | High | Launch blocker |
| 13 | Database readiness | Implemented but verification incomplete | High | Launch blocker |
| 14 | Backups and disaster recovery | Implemented but verification incomplete | High | Launch blocker |
| 15 | Monitoring and logging | Implemented but verification incomplete | High | High |
| 16 | Alerting | Implemented but verification incomplete | High | High |
| 17 | Incident response | Partially implemented | Medium | Launch blocker |
| 18 | Deployment, migrations, releases, and rollback | Partially implemented | High | Launch blocker |
| 19 | Staging environment | Missing | High | Launch blocker |
| 20 | Performance and capacity | Partially implemented | High | Launch blocker |
| 21 | Home-server resilience | Partially implemented | Medium | High |
| 22 | Third-party dependencies | Partially implemented | Medium | High |
| 23 | Admin and operational tooling | Partially implemented | High | High |
| 24 | Onboarding and help | Implemented but verification incomplete | Medium | High |
| 25 | Feedback and support workflow | Partially implemented | High | High |
| 26 | Beta analytics | Partially implemented | High | Medium |
| 27 | Documentation | Partially implemented | High | High |
| 28 | Recurring maintenance | Partially implemented | High | High |
| 29 | Provider-account, billing, renewal, MFA, and recovery readiness | Insufficient evidence | High | High |
| 30 | Formal pre-launch security/privacy test plan | Partially implemented | High | Launch blocker |
| 31 | Explicit launch gates | Implemented but verification incomplete | High | Launch blocker |
| 32 | Definition of operational completeness | Partially implemented | Medium | High |
| 33 | Environment architecture | Partially implemented | High | Launch blocker |
| 34 | Secure remote administration | Missing | Medium | High |
| 35 | Standard operating procedures | Partially implemented | High | High |
| 36 | User data lifecycle | Partially implemented | High | Launch blocker |
| 37 | Operations dashboard and public stats page | Partially implemented | High | Medium |
| 38 | GitHub linking | Missing | High | Low |
| 39 | Public GitHub readiness | Blocked | High | High |
| 40 | README readiness | Partially implemented | High | Medium |
| 41 | Documentation separation and reduction | Missing | High | High |

No broad audit area is rated `Verified complete`. Individual repository controls are verified, but every area above also contains material unverified, missing, or externally dependent work.

## 4. Detailed findings

### 1. Public-beta scope and release boundaries

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** `docs/01-requirements.md`, `docs/18-public-beta-handoff.md`, ADRs 0012/0013, and `docs/public-beta/launch-gates.md` define invite-only admission, 18+ self-attestation, a 50-seat cap, 10 approvals per rolling 24 hours, and rollout stop rules.
- **Implemented:** Runtime admission controls exist and default closed in the schema. The waitlist, invitation, policies, account lifecycle, messaging, and administrator surfaces provide a concrete Founding Beta boundary.
- **Uncertain:** There is no frozen release SHA, clean release candidate, verified production configuration, or linked evidence bundle. It is unclear whether existing owner data will coexist with beta accounts, be migrated, or be reset, and which limitations will be shown to invitees.
- **Missing:** A release manifest covering deployed commit/image digests, migration set, configuration version, known limitations, rollback boundary, and data-reset/no-reset decision.
- **Risks:** Operators may launch an unrepeatable worktree or apply beta migrations to irreplaceable owner data without a reviewed rollback and recovery boundary.
- **Next action:** Freeze a candidate, document the exact data and release boundary, run every gate against that candidate, and require an explicit owner-signed go/no-go record.

### 2. Removal of owner-only assumptions

- **Current state:** **Implemented but verification incomplete**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** ADR 0012, the `users.role` model, `apps/api/src/features/beta/`, administrator route guards, and the operator role bootstrap remove runtime administrator inference by email. User-facing repositories generally accept authenticated user IDs.
- **Implemented:** Explicit `USER`/`ADMIN` roles, administrator-only beta and campaign routes, invite admission, user-scoped browser-storage keys, and multi-user integration fixtures exist.
- **Uncertain:** The currently deployed database role assignment, direct API exposure, Cloudflare Access policy, BFF secret, client-IP header chain, and legacy records/storage were not inspected. Older operator documents still describe Stage 1 as single-owner and recommend direct SQL support actions.
- **Missing:** A current production inventory of every owner-only assumption and a two-user black-box pass through both supported ingress and any directly reachable API hostname.
- **Risks:** A hidden owner-email assumption, inherited browser data, privileged legacy record, or ingress bypass could expose or mutate another member’s data.
- **Next action:** Run an explicit owner-assumption checklist against the frozen staging database and production-safe routes; verify role bootstrap, legacy data isolation, direct API denial, and per-user browser cleanup.

### 3. Registration and invitation flow

- **Current state:** **Implemented but verification incomplete**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** `apps/api/src/features/beta/`, auth signup modes, migrations, `public-beta-flow.integration-test.ts`, the beta pages, and ADR 0012 implement generic waitlist responses, email deduplication, policy/adult evidence, explicit approvals, seven-day hashed one-use invites, exact-email redemption, cap locking, and audited admin actions.
- **Implemented:** `ENABLED`, `INVITE_ONLY`, and `DISABLED` modes; cap 50; approval limit 10/day; default-paused controls; block/return/reissue actions; transactionally consumed invite tokens; and race coverage for the member cap.
- **Uncertain:** Real Resend delivery, expiry, bounced invitations, resend semantics under provider failure, Cloudflare/API bypass behavior, and the production values of every admission control.
- **Missing:** Focused tests for expired invites, failed mail after approval, reissue after failure, and all non-admin actions; a deployed black-box run; an email delivery/reconciliation procedure.
- **Risks:** Approval commits before email delivery. A provider failure can reserve a seat and return an error while the raw token is no longer recoverable; with no provider configured, production may report operational success while delivering nothing.
- **Next action:** Make email configuration fail closed, define durable/retryable invite delivery or explicit delivery state, add the missing tests, and prove invitation-only admission through every public network path.

### 4. Authentication and account management

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **High**.
- **Evidence:** `apps/api/src/features/auth/`, opaque hashed sessions, Argon2 password hashing, secure cookie tests, email verification/reset flows, lockout, rate limits, and account export/deletion are implemented and tested at unit/route level.
- **Implemented:** SameSite/Lax, HttpOnly, production Secure cookies; 30-day configurable sessions; generic recovery responses; one-use expiring action tokens; password reset that revokes all sessions; account-state enforcement; and login lockout.
- **Uncertain:** Live cookie/HSTS behavior and session revocation in the real ingress were not tested. Email verification is not required for login, invited accounts are auto-verified, and multiple-device sessions are allowed.
- **Missing:** Change-password, change-email, and username/profile-correction workflows; session listing and individual/all-session revocation UI; session rotation; user suspension/unsuspension tooling; a documented compromised-account path beyond reset/direct SQL.
- **Risks:** Support becomes the only correction path, leaked long-lived sessions persist until logout/reset/expiry, and promised suspension capability is operationally awkward.
- **Next action:** Define beta-minimum account-support policy, add administrator suspension and session revocation, test compromised-account recovery, and document intentionally deferred self-service features.

### 5. Authorization and user-data isolation

- **Current state:** **Implemented but verification incomplete**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** Workout, template, analytics, export, deletion, exercise, message, and administrator repositories/routes consistently derive user identity from the session. Existing integration tests cover several cross-user workout/template/exercise cases and explicit `ADMIN` checks.
- **Implemented:** Foreign resources generally return `404`, exports query the authenticated user independently, account deletion operates on the owned graph, and runtime administrator status is explicit.
- **Uncertain:** Coverage is not a complete resource/action matrix. Shared exercises, campaign deliveries, deletion cancellation, admin list/mutation routes, analytics identifiers, CSV behaviors, and every BFF proxy have not all been black-box tested with attacker/victim/admin accounts.
- **Missing:** A repeatable three-role authorization suite that enumerates every endpoint and direct object reference, including negative, stale-session, suspended, deletion-pending, and direct-API cases.
- **Risks:** One overlooked repository join or proxy could become a high-impact IDOR once strangers share the system.
- **Next action:** Build and run the full matrix in isolated staging, inspect database side effects as well as responses, and make a zero-isolation-failure result a non-waivable gate.

### 6. Workout logging and data correctness

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** SQL constraints, transactions, partial unique indexes, soft deletes, ordered exercises/sets, CSV validation, route/service tests, database integration tests in source, and the Playwright smoke flow cover the normal workout lifecycle.
- **Implemented:** One open workout per user, user-scoped reads/writes, compact ordering, history edits, templates, analytics, previous performance, whole-import transactions, and tested conflict mapping for selected operations.
- **Uncertain:** Database integration and smoke tests were not rerun during this audit. Concurrent add-exercise/add-set, multiple tabs, server commit followed by client timeout, process restart, weak mobile data, stale reorders, and simultaneous edit/delete are not adequately exercised.
- **Missing:** Idempotency keys or equivalent replay protection for create/add operations; optimistic concurrency/revisions for ordered or edited resources; durable client reconciliation after ambiguous failures; CSV formula escaping (`Papa.unparse` has no `escapeFormulae`).
- **Risks:** A retry can duplicate a set or exercise, concurrent inserts can violate order constraints or return 500, stale tabs can overwrite order, and exported notes/names beginning with spreadsheet formula characters can execute when opened in a spreadsheet.
- **Next action:** Define mutation idempotency and concurrency semantics, add database race/replay tests, enable formula escaping, and execute interruption/multi-tab/weak-network workflows before beta.

### 7. User-facing errors, loading, retry, offline, and maintenance states

- **Current state:** **Partially implemented**; confidence **Medium**; beta criticality **High**.
- **Evidence:** React Query configuration, route error components, skeletons, retry buttons, inline validation, draft recovery, and the smoke test demonstrate normal loading/error handling on major screens.
- **Implemented:** Bounded query retry, visible pending states, validation messages, generic auth recovery responses, workout draft recovery, and many explicit empty/error states.
- **Uncertain:** Behavior during offline transitions, 502/503/429 responses, suspended tabs, expired sessions during writes, partial provider outages, and application restarts was not tested across all surfaces.
- **Missing:** A maintenance mode/read-only mode, persistent connectivity indicator, standardized recoverable-vs-terminal error guidance, and ambiguous-write reconciliation.
- **Risks:** Users may retry a committed write, lose confidence about whether a set saved, or continue entering data during a database/email incident with unclear outcomes.
- **Next action:** Specify failure-state behavior per critical flow, add safe retry/reconciliation and a maintenance control, then test representative network and service faults in staging.

### 8. Mobile and browser readiness

- **Current state:** **Implemented but verification incomplete**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** Responsive CSS, safe-area handling, 44px-class controls, 390/320/430/1440 Playwright viewport checks, Chromium/Firefox CI projects, mobile workout interactions, and a coarse-pointer gesture test exist.
- **Implemented:** The primary workflow is designed mobile-first and automated smoke coverage spans core workout, history, progress, volume, and account-deletion paths.
- **Uncertain:** No recorded pass exists for the required Samsung S22 Plus with Firefox and mobile data, Safari/iOS, real soft keyboards, rotation, tab suspension, browser back/forward cache, multiple tabs, low-memory reloads, or poor connectivity.
- **Missing:** A supported-browser/device policy and a dated manual matrix with screenshots/issues linked to the frozen candidate.
- **Risks:** Emulator-sized desktop browsers miss viewport, touch, keyboard, WebGL, power, memory, and network behaviors that dominate gym usage.
- **Next action:** Run the canonical real-device matrix, include interruption and network scenarios, record browser limitations, and block rollout on core-flow failures.

### 9. Accessibility and usability

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** Semantic labels, status/alert roles, reduced-motion support, minimum target sizing, static fallbacks, and some Escape/focus handling exist. `apps/web/src/app/layout.tsx` sets `maximumScale: 1` and `userScalable: false`. Several dialogs do not trap focus, restore focus, or make the background inert.
- **Implemented:** Good foundations are visible in labeled controls, keyboard-invokable buttons, guided-tour focus, and 2D fallbacks for 3D surfaces.
- **Uncertain:** Contrast, zoom/text resize, screen-reader names/order/announcements, keyboard-only completion, mobile keyboard obstruction, and cognitive clarity have not received recorded manual or automated accessibility validation.
- **Missing:** Automated accessibility checks and a manual keyboard/screen-reader/focus checklist for every modal and core flow.
- **Risks:** Disabling zoom creates a direct accessibility barrier; incomplete modal focus management can strand keyboard or assistive-technology users.
- **Next action:** Remove global zoom restrictions, implement robust dialog focus behavior, measure contrast, add automated checks, and complete a manual VoiceOver/NVDA-style pass before launch.

### 10. Security hardening

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** Host/origin validation, no CORS opt-in, BFF attribution signing, secure cookies, Helmet, request/body limits, rate limiting, Argon2, opaque sessions, generic enumeration-resistant responses, redacted structured logs, and `docs/public-beta/security-review.md` provide a meaningful foundation.
- **Implemented:** Production environment validation requires HTTPS, secure cookies, and a 32+ character BFF secret. API and BFF tests cover forged attribution and origin/host boundaries. Input schemas are bounded and campaign content rejects executable links.
- **Uncertain:** Live Cloudflare/Caddy headers and routing, direct API reachability, TLS/HSTS, dependency/container vulnerabilities, host patch state, secret history, abuse behavior, and actual log/metric leakage were not tested. The CSP is minimal and app containers run as root without read-only filesystems/capability drops.
- **Missing:** Deployed black-box testing, complete IDOR/admin test coverage, dependency/image/secret scans, CSRF and rate-limit verification at the edge, CSV formula mitigation, a hardened container baseline, and a published vulnerability-reporting policy.
- **Risks:** The real ingress may differ from code assumptions; supply-chain or container compromise has a broad blast radius; weak CSP and untested public endpoints increase exposure.
- **Next action:** Execute the formal security plan on staging, remediate findings, harden runtime images, scan the full Git history and dependencies, then run production-safe boundary tests.

### 11. Privacy, legal, and policy readiness

- **Current state:** **Blocked**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** Versioned draft Privacy, Terms, Cookie/Storage, Support, and Founding Beta pages exist; the UI displays `PUBLICATION_BLOCKED` when controller/contact configuration is incomplete. `docs/public-beta/dpia-screening.md` explicitly requires a full DPIA and qualified review.
- **Implemented:** Adult and policy attestations are recorded, processing purposes are described, analytics/storage/feedback preferences are opt-in, and the inventory covers major data categories and retention intentions.
- **Uncertain:** Controller identity/address, jurisdictions, lawful bases, health/sensitive-data classification, processor regions/subprocessors/transfers, contractual terms, representatives, support provider, and final legal wording.
- **Missing:** Full DPIA approval/review date, qualified legal approval, completed processor register, actual retention mapping, archived rendered policy versions, and evidence that production behavior matches the notices.
- **Risks:** Publishing draft notices or worldwide access before resolving legal obligations creates regulatory, contractual, and user-trust exposure.
- **Next action:** Complete the DPIA and processor facts, obtain qualified review, restrict jurisdictions if advised, configure real contacts, archive the final rendered versions, and rerun the behavior-to-inventory inspection.

### 12. Transactional email

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** `apps/api/src/shared/mailer.ts` sends escaped HTML and text through Resend with a 10-second timeout. Auth, invite, deletion, and cancellation services construct action links and tests cover payload formatting.
- **Implemented:** Provider abstraction, reply-to support, non-enumerating recovery responses, expiring one-use tokens, and production log redaction.
- **Uncertain:** Domain verification, SPF/DKIM/DMARC, sender reputation, real HTML rendering, bounce/complaint handling, suppression, quotas, provider account ownership, and end-to-end delivery.
- **Missing:** Production fail-closed validation for `RESEND_API_KEY`; durable queue/outbox, retry/backoff, delivery state, idempotency, bounce/complaint webhook/process, and an outage runbook. The current no-key production transport logs a warning and returns success without delivery.
- **Risks:** Users can be locked out of verification, reset, invitation, or deletion recovery. Admin approval can commit an invite before a provider failure and leave ambiguous state.
- **Next action:** Fail closed on missing production email configuration, add observable/retryable delivery semantics, configure DNS and suppression ownership, and black-box every required message/link/expiry path.

### 13. Database readiness

- **Current state:** **Implemented but verification incomplete**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** PostgreSQL migrations, Kysely repositories, foreign keys, checks, unique/partial indexes, transactions, migration documentation, CI migration-up and integration jobs, and health checks exist. The actual stack is Kysely plus `node-pg-migrate`, not Prisma.
- **Implemented:** Strong schema constraints, user/session/workout indexes, deletion and beta tables, transaction boundaries for many compound operations, and health reporting.
- **Uncertain:** Applying the new Founding Beta migrations to the actual legacy production dataset, table/index growth, vacuum/analyze health, connection saturation, lock duration, and rollback compatibility. `pg` uses its default pool size because no explicit pool sizing or timeouts are configured.
- **Missing:** Recorded legacy-data migration rehearsal, migration up/down/redo CI, compatibility test between old app/new schema and new app/old schema where required, query plans on realistic data, and a production migration evidence template.
- **Risks:** Migration locks or incompatible rollback can interrupt writes or strand real owner data; default connection behavior may not match a small host under burst load.
- **Next action:** Clone sanitized production-shaped data into staging, rehearse backup/migration/validation/rollback or forward-fix, record timings and locks, and set capacity-informed pool/timeouts.

### 14. Backups and disaster recovery

- **Current state:** **Implemented but verification incomplete**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** Encrypted Restic automation, four daily attempts, seven-day local dump cleanup, strict 30-day maintenance, Prometheus metrics, restore scripts, erasure-ledger export/replay, ADR 0013, and disaster-recovery runbooks exist. Historical July evidence records an isolated newest-snapshot restore.
- **Implemented:** Off-machine encrypted backup to a MacBook SFTP repository, retention/prune jobs, monitoring, isolated restore tooling, and documented RPO 24 hours/RTO 4 hours targets.
- **Uncertain:** Current timers, newest snapshot, current beta schema contents, Restic integrity, credential recovery, actual RPO/RTO, MacBook availability, and whether erased users stay erased after recovery.
- **Missing:** The required older-snapshot restore with the newest valid erasure ledger obtained separately, migrations applied before replay as appropriate, proof of absent erased IDs before network reopening, and a full replacement-host exercise. The current PostgreSQL restore-test script selects ledger and database from the same snapshot.
- **Risks:** Recovery from an older backup can resurrect deleted personal data; a writable, intermittently available single off-machine destination can fail or be compromised; the spare host is not ready.
- **Next action:** Perform and evidence the exact deletion-safe drill, test credential recovery and a replacement host, measure RPO/RTO, and add another independent/offsite or immutable layer without replacing the existing off-machine requirement.

### 15. Monitoring and logging

- **Current state:** **Implemented but verification incomplete**; confidence **High**; beta criticality **High**.
- **Evidence:** Structured API/BFF logging, request IDs, redaction tests, Prometheus exporters, provisioned Grafana dashboards, bounded route labels, container/host/Postgres metrics, and retention configuration exist. July reports record then-working dashboards.
- **Implemented:** Health, request rate/error/latency, process, container, host, disk, memory, Postgres, exporter, restart, and backup visibility; logs are bounded and sensitive fields are redacted by design.
- **Uncertain:** Current production scrape targets, dashboards, retention, disk use, log completeness, release labels, alert-to-request correlation, and whether the current Founding Beta paths emit useful signals.
- **Missing:** External uptime monitoring; first-class lifecycle/email/admission/cleanup failure metrics; user-impact service-level indicators; documented routine review; production client diagnostics. Client diagnostics are in-memory/console-only and normally disabled in production.
- **Risks:** A total home-host/power/Internet failure cannot reliably alert from the same host, and critical beta failures may appear only as a warning log.
- **Next action:** Verify the current deployed telemetry, add external probes and beta-critical metrics, define retention/review/ownership, and attach screenshots/queries to the release evidence.

### 16. Alerting

- **Current state:** **Implemented but verification incomplete**; confidence **High**; beta criticality **High**.
- **Evidence:** Alertmanager Telegram routing and alert rules cover service targets, API errors/latency, exporters, container/host resources, Postgres connections/deadlocks/transactions, restarts, and backups. Historical reports record firing/resolved Telegram tests.
- **Implemented:** Warning/critical routing, repeat intervals, credential secret files, and actionable annotations for many infrastructure conditions.
- **Uncertain:** Current rule load, receiver credentials, ownership, escalation, silence handling, delivery during host/Internet outage, and alert quality for the current release.
- **Missing:** External-host alerts and dedicated alerts for disabled/broken email, failed lifecycle cleanup, cap/admission anomalies, erasure failures, and sustained core write failures; a current end-to-end alert drill.
- **Risks:** Same-host alerting fails with the host it monitors, and public-beta user-impact failures may remain undetected until a member reports them.
- **Next action:** Add an independent probe/receiver path, instrument beta-critical jobs, run warning/critical/firing/resolved and total-host-loss drills, and record on-call ownership and response times.

### 17. Incident response

- **Current state:** **Partially implemented**; confidence **Medium**; beta criticality **Launch blocker**.
- **Evidence:** Deployment, logging, monitoring, recovery, status-page, and retention runbooks contain incident fragments; admission/campaign controls can be paused; `ops/status/public/` provides an independent static incident template.
- **Implemented:** Basic health triage, bounded log retrieval, database-preservation guidance, recovery decisions, and stop rules for P0/P1, isolation/deletion, backup, unexplained-write, email, and capacity failures.
- **Uncertain:** Operator availability, incident authority, contact channels, status hosting, user notification process, evidence preservation, and credential-compromise response.
- **Missing:** One consolidated public-beta incident playbook with severity definitions, declaration/escalation, maintenance/write-stop choices, containment for compromised account/provider/host, member communications, regulatory assessment, recovery validation, and post-incident review. Rehearsals are open.
- **Risks:** A solo operator may improvise during a data or availability incident and communicate inconsistently while recovery actions threaten evidence or privacy.
- **Next action:** Consolidate the playbook, define named responsibilities and backup contacts, rehearse six canonical scenarios, and link the outputs from the launch gate.

### 18. Deployment, migrations, releases, and rollback

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** Docker Compose, home-server deployment runbooks, a retained Render blueprint, predeploy migrations, health checks, CI, production tags, and rollback notes exist.
- **Implemented:** Rebuildable containers, ordered migrations, service health checks, a Git-based deployment concept, backup-before-risk guidance, and application-only rollback instructions.
- **Uncertain:** The actual deployed SHA/image/config, whether current tags match production, migration execution and logs, Cloudflare/Caddy rollout, database snapshot timing, and the effective rollback path for the current schema.
- **Missing:** A clean immutable release candidate, artifact/image digests, signed release evidence, automatic or mandatory backup gate, deployed version endpoint/label coverage, migration compatibility matrix, rollback rehearsal, and a database rollback/forward-fix decision per migration.
- **Risks:** Reverting application code after a schema change may be unsafe; a worktree deploy is not reproducible; migration or config drift may not be visible.
- **Next action:** Adopt a release manifest and immutable build, require green CI plus staging evidence, rehearse application and schema failure paths, and record the exact production deployment and postdeploy smoke results.

### 19. Staging environment

- **Current state:** **Missing**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** Local Compose and CI test environments exist. Render is documented as an alternative deployment, but there is no evidence of a persistent, production-like, isolated staging environment with its own database, domain, email sandbox, and Cloudflare/BFF policy.
- **Implemented:** Components needed to create staging—container definitions, migrations, seed/test flows, health checks, and environment-driven configuration—are available.
- **Uncertain:** Whether an unrecorded preview environment exists and whether it is sufficiently isolated.
- **Missing:** Environment ownership, dedicated credentials/database/buckets or backup namespace, sanitized fixtures, restricted tester access, email behavior, monitoring, deploy promotion, reset policy, and teardown/retention rules.
- **Risks:** The first real test of public ingress, migrations, provider integration, and multi-user behavior would occur against real owner/member data.
- **Next action:** Provision an isolated production-like staging environment and make it the mandatory location for black-box, migration, rollback, email, capacity, accessibility, and incident rehearsals.

### 20. Performance and capacity

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** Four local pure-function performance regression tests passed; pagination, request-size and CSV-row limits, admin list caps, and Prometheus resource/database metrics exist. The beta hard cap is 50.
- **Implemented:** Basic bounded inputs, selected pagination, health/resource visibility, and deterministic computation budgets.
- **Uncertain:** End-to-end write latency, connection use, CPU/memory/disk growth, image/3D asset cost, cold start, export memory, mobile-data behavior, and overload recovery on the actual T2 Mac mini.
- **Missing:** The canonical 20-concurrent-active-logger and 2×-peak test, stated traffic/workout/set assumptions, explicit Postgres pool sizing/timeouts, application resource limits, service-level thresholds, and overload/shedding policy. Account export is assembled without pagination and may be large.
- **Risks:** A small home server or default 10-connection pool can saturate unexpectedly; load can turn correct concurrency conflicts into user-visible failures or disk pressure.
- **Next action:** Define a workload model, run realistic staging/load tests with monitoring, set thresholds/pool/resource bounds, test recovery after overload, and record the safe cohort ceiling.

### 21. Home-server resilience

- **Current state:** **Partially implemented**; confidence **Medium**; beta criticality **High**.
- **Evidence:** Historical server reports document Ubuntu, Docker, systemd timers, reboot checks, LAN-restricted SSH, Caddy, monitoring, and backups on the T2 Mac mini. The disaster-recovery runbook acknowledges power, storage, MacBook-destination, and spare-host limitations.
- **Implemented:** Services can restart, boot checks exist, backups are off the primary host, host/container resources are monitored, and the database/API are not intended to be directly public.
- **Uncertain:** Current disk SMART/temperature/health, router/tunnel recovery, Internet/power history, automatic startup after an outage, remote access, spare capacity, and whether a UPS exists.
- **Missing:** UPS and shutdown policy, externally observed uptime, tested replacement host, alternate Internet/routing plan or accepted outage policy, secure remote administration, and current hardware lifecycle/spares plan.
- **Risks:** One host, one residential connection, and one operator create correlated failure. Same-host monitoring cannot report total failure, and physical access may be required to recover.
- **Next action:** Document accepted availability, add UPS/external monitoring/secure recovery access, verify boot and tunnel restoration, prepare the spare host, and rehearse primary-host loss.

### 22. Third-party dependencies

- **Current state:** **Partially implemented**; confidence **Medium**; beta criticality **High**.
- **Evidence:** Repository references identify Cloudflare, Resend, Telegram, GitHub Actions, npm/pnpm registries, Docker image registries, a MacBook SFTP/Restic destination, optional Render, and an unresolved support/status host. The data inventory notes that the final processor facts are missing.
- **Implemented:** Major technical integrations and secret-variable names are documented; no payments, ads, or third-party analytics are present.
- **Uncertain:** Registrar/DNS provider, legal entity/region/subprocessors, service plans/quotas, billing owners, renewal dates, MFA/recovery, support provider, status host, and contractual retention. Exercise catalog and visual/3D asset license provenance were not fully reviewed.
- **Missing:** A single dependency register covering purpose, data, owner, account, plan/quota, billing, renewal, MFA/recovery, region/transfers, outage fallback, exit/export, and license.
- **Risks:** Expiry, quota, account loss, provider outage, or incompatible licensing can interrupt access or block public repository publication.
- **Next action:** Complete the register, assign primary/backup ownership, verify legal/security settings, set renewal/quota alerts, and record fallback/exit procedures.

### 23. Admin and operational tooling

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **High**.
- **Evidence:** The admin UI and API list requests/users, manage admission controls, approve/reissue/block/return requests, manage campaigns, and cancel pending deletion after support authentication. An audited operator CLI bootstraps explicit admin role.
- **Implemented:** The most important invitation and feedback controls exist, default paused, and enforce `ADMIN` server-side.
- **Uncertain:** Usability and behavior on production data, audit-event review, operator concurrency, accessibility, and safe recovery when an action partially fails.
- **Missing:** Suspend/unsuspend account, revoke user sessions, inspect email delivery/failure, emergency global session invalidation, read admin audit events, lifecycle job visibility/retry, health summary, and safe bulk/seat reconciliation. Direct SQL remains documented for several operations.
- **Risks:** Incident containment and member support depend on ad hoc SQL/SSH, increasing error and audit risk.
- **Next action:** Add the beta-minimum containment/support actions with audit logs, remove obsolete “no admin panel” guidance, and rehearse operator workflows with least-privilege credentials.

### 24. Onboarding and help

- **Current state:** **Implemented but verification incomplete**; confidence **Medium**; beta criticality **High**.
- **Evidence:** A guided Founding Member tour, repeatable help screen, practice workout that does not enter history, contextual explanations, checklist, legal/support links, and onboarding state endpoints are present.
- **Implemented:** Core terms such as working set, warmup, RIR, estimated 1RM, volume, history, and navigation receive in-product explanation; tour replay and completion state exist.
- **Uncertain:** First-time completion rate, screen-reader/keyboard behavior, comprehension by novice lifters, interruption/resume behavior, and whether instructions match every final UI state.
- **Missing:** Recorded usability sessions, troubleshooting for common failed writes/email/account states, supported-device limitations, and a versioned beta “known limitations” page tied to the release.
- **Risks:** New members may misinterpret analytics, fail to recover from an interruption, or create support load during the small cohort.
- **Next action:** Conduct task-based onboarding tests with representative invitees, fix critical confusion, publish limitations, and use opt-in funnel metrics plus support feedback to iterate.

### 25. Feedback and support workflow

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **High**.
- **Evidence:** In-app targeted campaigns/messages, bounded responses, response opt-in, a support page, contact guidance, status link, and administrator campaign controls exist. Support copy warns users not to send credentials or action tokens.
- **Implemented:** Feedback can be paused and targeted; messages cannot contain executable links; campaign delivery and responses are user-scoped; urgent deletion cancellation has an authenticated administrator path.
- **Uncertain:** Real support mailbox/provider, service hours, response expectations, ticket ownership, escalation, data retention, privacy terms, and how members learn that an issue is fixed.
- **Missing:** Issue/ticket IDs, severity/triage rules, reproducible diagnostic collection, screenshot/privacy rules, app release/request-ID capture, response templates, and closure/fix-notification workflow. Production client diagnostics are not a user-shareable artifact.
- **Risks:** A solo mailbox can lose urgent privacy/security or data-integrity reports, and unstructured reports slow diagnosis.
- **Next action:** Choose/configure the support system, publish expectations, define triage/escalation/retention, add safe diagnostic guidance, and rehearse a P1 member report through closure.

### 26. Beta analytics

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **Medium**.
- **Evidence:** First-party `app_events`, opt-in analytics preferences, events for signup/login/verification/reset/workout/set/import/edit/merge, and operator SQL examples exist. Campaign responses can provide qualitative signals.
- **Implemented:** Data remains in PostgreSQL and analytics failure does not block product actions; consent is explicit for optional account-linked events.
- **Uncertain:** Event completeness/accuracy after recent changes, production opt-in rates, user/time-zone definitions, data quality, and routine review ownership.
- **Missing:** A defined beta KPI dictionary, reliable admission-to-first-workout and repeat-use funnel, support/device distribution measures, privacy thresholds, dashboards, data-quality checks, and a scheduled readout.
- **Risks:** The cohort may run without evidence of activation, reliability, or retention, while ad hoc SQL encourages inconsistent definitions.
- **Next action:** Define a minimal consent-respecting scorecard, validate events against database truth, build private aggregates, and schedule daily first-week and weekly reviews.

### 27. Documentation

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **High**.
- **Evidence:** Product, query, model, schema, API, architecture, engineering, deployment, operations, privacy, security, and recovery documents are extensive. `docs/08-next-implementation-plan.md` and `docs/public-beta/launch-gates.md` are useful current handoffs.
- **Implemented:** Most major decisions and operational concepts are documented, with ADRs and runbooks for the active architecture.
- **Uncertain:** Which historical report or plan is authoritative when claims conflict, and whether operator procedures match the current release and live host.
- **Missing:** A concise current release/operations index, evidence links per launch gate, version/owner/review date on operational SOPs, and a public/private documentation policy.
- **Risks:** Operators can follow outdated Stage 1/single-owner/Render guidance or treat a historical test as current proof.
- **Next action:** Establish authoritative current documents, mark/supersede historical material, update stale guides, and move sensitive operations content out of any future public repository.

### 28. Recurring maintenance

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **High**.
- **Evidence:** Backup timers, weekly Restic maintenance/checks, log/metric retention, auth/invite/account lifecycle cleanup, and host operational reports exist.
- **Implemented:** Automated backup/retention tasks and application-level cleanup cover important recurring data hygiene.
- **Uncertain:** Current timer execution, failure review, OS/container/Postgres maintenance, database vacuum/analyze, certificate/tunnel behavior, and ownership during absence.
- **Missing:** One maintenance calendar for OS/security patches, dependencies/images, Postgres health, capacity, backups/restores, credential rotation, provider renewals/quotas, policy/DPIA review, access review, incident exercises, and documentation review. Dependabot/Renovate and security scanning are absent.
- **Risks:** Quiet drift can invalidate an otherwise good launch snapshot; an in-process hourly lifecycle timer can be delayed by downtime and processes only a bounded batch per run.
- **Next action:** Create a dated owner/backup-owner calendar with evidence retention and escalation, and move critical lifecycle work to a durable scheduled job or prove bounded delay is acceptable and alerted.

### 29. Provider-account, billing, renewal, MFA, and recovery readiness

- **Current state:** **Insufficient evidence**; confidence **High**; beta criticality **High**.
- **Evidence:** Environment templates and runbooks name technical credentials, but repository evidence intentionally does not reveal actual account ownership or security settings.
- **Implemented:** Secrets are designed to live outside the repository, and recovery requirements for Restic/deploy access are partially described.
- **Uncertain:** Account owner/admin lists, MFA/passkeys, recovery codes, recovery email/phone, billing method, free-tier limits, renewal dates, domain auto-renew, API quotas, backup ownership, and succession/emergency access for Cloudflare, registrar, Resend, GitHub, Telegram, status/support host, and backup systems.
- **Missing:** A private account register and a tested account-recovery exercise.
- **Risks:** Losing one identity, billing method, domain, or recovery device can disable the service or prevent incident response even when the software is healthy.
- **Next action:** Build the register in a private password-manager/vault, enable phishing-resistant MFA where available, store recovery codes separately, assign backup access, and calendar renewals/quota reviews.

### 30. Formal pre-launch security/privacy test plan

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** `docs/public-beta/security-review.md` and the security/quality launch-gate checklist enumerate authorization, admin, cap races, invite reuse/expiry, CSRF, brute force, enumeration, feedback XSS, deletion, headers, leakage, devices, capacity, and recovery.
- **Implemented:** Many unit/route/integration tests already exercise components of that scope; the repository review records known limits and does not claim penetration-test status.
- **Uncertain:** Test ownership, environment, fixtures, evidence format, pass criteria, retest policy, and production-safe subset.
- **Missing:** One executable plan mapped to every endpoint/control/data lifecycle, dependency/secret/container scanning, browser storage inspection, adversarial test cases, staging and production-safe phases, severity handling, and signed acceptance.
- **Risks:** A checklist can be marked inconsistently and fail to prove that all public paths and roles were tested on the exact release.
- **Next action:** Convert the checklist into a versioned test protocol and evidence bundle for the frozen candidate; require zero unresolved critical/high isolation, deletion, auth, or ingress defects.

### 31. Explicit launch gates

- **Current state:** **Implemented but verification incomplete**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** `docs/public-beta/launch-gates.md` is an appropriately strict canonical gate with 29 checkboxes and rollout stop rules. At audit time every checkbox is unchecked.
- **Implemented:** The gate covers legal/external, production systems, data lifecycle/recovery, security/quality/capacity, and phased rollout.
- **Uncertain:** Gate owner, approver, evidence location, waiver policy, validity window, and whether each checkbox applies to the same immutable release/environment.
- **Missing:** Completed linked evidence, timestamp/release identifiers, independent review for high-risk gates, and a final go/no-go record.
- **Risks:** The existence of a good checklist can be mistaken for readiness, or boxes can be checked against different builds and stale environments.
- **Next action:** Keep all gates non-waivable for this first public cohort, add evidence links and approver/date/release fields, and launch only when the document is fully satisfied.

### 32. Definition of operational completeness

- **Current state:** **Partially implemented**; confidence **Medium**; beta criticality **High**.
- **Evidence:** The handoff, launch gates, rollout stop rules, RPO/RTO targets, and runbooks collectively describe much of “done.”
- **Implemented:** There are explicit requirements beyond code completion: legal approval, external delivery, recovery, security, devices, capacity, and rehearsals.
- **Uncertain:** Who accepts residual risks, how long evidence remains valid, what changes invalidate evidence, and which service levels/support commitments apply.
- **Missing:** A single definition covering immutable release identity, environment/config identity, evidence freshness, zero-defect categories, residual-risk owner, support/availability expectations, rollback readiness, and postlaunch observation.
- **Risks:** Teams can declare success based on feature completeness while operational evidence is stale or mismatched.
- **Next action:** Add a short acceptance standard to the launch process and require any code/schema/infra/policy change after verification to trigger a scoped rerun.

### 33. Environment architecture

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** Local development, CI PostgreSQL integration, Docker smoke, a private home production topology, a retained Render alternative, internal API/database networking, monitoring overlay, and independent status-page intent are documented.
- **Implemented:** Environment-driven configuration, production validation, private database design, BFF routing, and separate monitoring/backup assets provide a workable base.
- **Uncertain:** Live topology and configuration drift, Cloudflare/Caddy boundary, secret separation, and whether monitoring/status/backups remain independent enough from production failure.
- **Missing:** A genuine staging environment, canonical current architecture diagram, per-environment data/credential/domain/provider policy, promotion flow, and explicit prohibition on using production personal data in test/staging.
- **Risks:** Ambiguous Render-versus-home documentation and mixed environment rules can cause deployment to the wrong target or leak production data/secrets into testing.
- **Next action:** Adopt the target model in section 10, publish the canonical live diagram/config inventory privately, and test promotion from isolated staging to production.

### 34. Secure remote administration

- **Current state:** **Missing**; confidence **Medium**; beta criticality **High**.
- **Evidence:** Historical operations favor LAN-only SSH and Grafana through an SSH tunnel. Cloudflare Access for the web app does not by itself prove secure shell/host administration. Documents conflict on whether password SSH remained available at different stages.
- **Implemented:** Restricting administration to the LAN reduces public attack surface, and SSH-based recovery steps are documented.
- **Uncertain:** Effective current `sshd` configuration, key policy, root login, MFA, VPN/zero-trust administrative access, audit logs, and emergency access while away from the LAN.
- **Missing:** A reviewed, tested remote-admin design; named access list; key rotation/revocation; break-glass access; and current configuration evidence.
- **Risks:** An incident may be unmanageable away from home, while an improvised port-forward or shared credential creates a new attack path.
- **Next action:** Choose a secure administrative channel such as a tightly controlled VPN/zero-trust SSH path, enforce keys and least privilege, test break-glass access, and document/review it privately.

### 35. Standard operating procedures

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **High**.
- **Evidence:** Operator, deployment, logging, monitoring, backup, restore, disaster-recovery, status, retention, and server wave documents exist.
- **Implemented:** Day-to-day start/check, logs, health, backup status, isolated restore, and some support/incident procedures have command-level guidance.
- **Uncertain:** Currency, operator rehearsal, least-privilege applicability, and which instructions match the current beta release. `docs/13-operator-guide.md` still says no admin panel and describes single-owner Stage 1.
- **Missing:** Concise SOPs for beta admission, email failure/reconciliation, user suspension/session revocation, support triage, maintenance mode/write stop, release evidence, incident declaration, provider/account recovery, and post-incident review.
- **Risks:** Long historical documents increase decision time and invite direct-SQL mistakes during support or incidents.
- **Next action:** Create short authoritative SOPs with prerequisites, safe checks, approval/destructive-action boundaries, verification, rollback, owner, and last-tested date; archive obsolete instructions.

### 36. User data lifecycle

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **Launch blocker**.
- **Evidence:** Password-confirmed JSON export, password-confirmed deletion, immediate access lock/session revocation, seven-day grace, link/admin cancellation, hard erasure, shared-exercise anonymization, tombstones, retention cleanup, and erasure-ledger recovery controls exist.
- **Implemented:** The deletion repository performs a transaction over the ownership graph; exports independently scope categories to the authenticated user; retained shared exercise records can be anonymized.
- **Uncertain:** Export completeness on realistic accounts, all cross-user/shared fixtures, cancellation races/expiry/reuse, cleanup during downtime, current production retention, and restored-data erasure.
- **Missing:** Durable/alerted lifecycle scheduling, exact staging tests for every retention class, and the required recovery drill. The processing inventory says active-set drafts use session storage, while `set-draft-storage.ts` uses persistent `localStorage`; abandoned drafts may therefore outlive the documented session.
- **Risks:** Incomplete deletion, post-restore resurrection, delayed cleanup, stale browser data on shared devices, or misleading privacy claims are launch-critical.
- **Next action:** Resolve the storage mismatch, expand lifecycle integration/black-box tests, make cleanup observable/durable, inspect browser and database retention, and complete deletion-safe recovery proof.

### 37. Operations dashboard and public stats page

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **Medium**.
- **Evidence:** Private Grafana dashboards and an independent static status-page template exist. No public product-statistics page or deployed status evidence exists.
- **Implemented:** Infrastructure/application operations can be visualized privately; the status template avoids coupling incident communication to the app host.
- **Uncertain:** Current dashboard deployment, access controls, data freshness, independent status host, and which aggregate beta metrics would be safe and useful.
- **Missing:** A concise operator beta-health view, deployed public status history, and privacy-preserving public stats if desired.
- **Risks:** Operators must correlate SQL, Grafana, logs, email, and support manually; public low-count metrics could identify individuals.
- **Next action:** Build a private launch cockpit for admission, activation, errors, email, cleanup, capacity, and backups. Keep public output limited to service status initially; publish aggregate stats only with minimum-count suppression and reviewed definitions.

### 38. GitHub linking

- **Current state:** **Missing**; confidence **High**; beta criticality **Low**.
- **Evidence:** No complete live-app/portfolio/CV/public-repository link strategy is documented, and the repository is not yet safe to publish.
- **Implemented:** The application has Support, legal, beta, and independent status destinations that can anchor a future public project presence.
- **Uncertain:** Whether the repository will be fully open source, source-available, portfolio-only, or kept private; the desired public support/security channel.
- **Missing:** Approved canonical URLs, link labels, support boundaries, and a publication checklist.
- **Risks:** Linking early exposes sensitive operational documents and can imply that GitHub Issues are the supported privacy/security channel.
- **Next action:** Do not link the current repository. After public-readiness completion, link the README to the live app/status, link portfolio/CV to a stable project page or repository, and add an in-app Source link only if it helps users and clearly separates support/security reporting.

### 39. Public GitHub readiness

- **Current state:** **Blocked**; confidence **High**; beta criticality **High**.
- **Evidence:** No `LICENSE` file exists. A limited tracked/history filename review found no committed `.env`, private-key, or credential file, but no exhaustive secret scan was performed. Operational reports contain internal IP addresses, usernames/paths, SSH/topology details, backup-destination information, and historical production facts. Git metadata includes personal author identity.
- **Implemented:** `.env.example` contains placeholders, secrets are generally excluded, contribution/architecture/engineering documents exist, and logs/configs are designed not to commit secret values.
- **Uncertain:** Full Git-history secrets, deleted blobs, dependency/asset licenses, whether personal metadata is acceptable, and which operational information an attacker could combine.
- **Missing:** License choice, `SECURITY.md`, code of conduct if desired, exhaustive secret/history scan, dependency/license/SBOM review, sensitive-document removal/history decision, and public issue/support policy.
- **Risks:** Public release can expose operational attack surface, personal details, unlicensed assets, or historical secrets that deleting the working-tree file would not remove.
- **Next action:** Keep the repository private, move private operations material first, choose a license, scan the entire history with dedicated tools, review assets/dependencies, and use a clean public export or carefully reviewed history rewrite only as a separately approved project.

### 40. README readiness

- **Current state:** **Partially implemented**; confidence **High**; beta criticality **Medium**.
- **Evidence:** The README explains the product, stack, local setup, checks, Docker, and historical status. It still says account settings/export/deletion need work even though the current worktree implements those surfaces.
- **Implemented:** Technical readers can understand the Kysely/Fastify/Next/PostgreSQL foundation and start the local stack.
- **Uncertain:** Final public audience, license, demo/live link, hosted limitations, and acceptable disclosure of architecture/operations.
- **Missing:** Accurate current feature/beta status, screenshots, concise architecture, privacy/security/support links, known limitations, public setup prerequisites, license, contribution expectations, data safety warning, and release/status links.
- **Risks:** A public reader receives stale product claims and may treat a beta system as generally available or production-supported.
- **Next action:** Rewrite only after release and public-repository scope are decided; keep sensitive infrastructure out and make limitations, data handling, support, security reporting, and license explicit.

### 41. Documentation separation and reduction

- **Current state:** **Missing**; confidence **High**; beta criticality **High**.
- **Evidence:** Product/developer plans, active runbooks, detailed server topology, historical status reports, wave plans, audit reports, and future public material coexist in one repository. Multiple documents repeat or contradict current status.
- **Implemented:** File naming and topical directories provide some organization, and ADRs preserve decision history.
- **Uncertain:** Which documents must remain versioned with code, which can be public, and where private operational evidence should live.
- **Missing:** A classification and retention model separating public product docs, developer docs, user help, private operational runbooks/evidence, and archived historical planning.
- **Risks:** Public publication leaks security-relevant detail; operators follow stale material; contributors cannot identify sources of truth.
- **Next action:** Apply the section 11 structure: keep public/developer/user docs lean and current, move host/provider/account/recovery evidence to a private operations repository or vault, and archive rather than intermingle historical plans.

## 5. Contradictions and outdated claims

| Claim or source | Conflicting evidence | Required resolution |
|---|---|---|
| The audit brief’s “known context” refers to Prisma. | `package.json`, `apps/api/src/db/database.ts`, migrations, architecture docs, and repositories use Kysely with `node-pg-migrate`. | Treat Kysely/PostgreSQL as authoritative and remove Prisma from future briefs unless the stack changes through an ADR. |
| `docs/public-beta/data-processing-inventory.md` says active-set drafts use browser session storage and last for the current session. | `apps/web/src/features/session/set-draft-storage.ts` reads and writes `window.localStorage`. | Change the implementation to match the approved model or revise/re-review the inventory, retention, and notices; test stale/shared-browser cleanup. |
| `README.md` says account settings, deletion, and export still need work. | The current worktree contains settings, password-confirmed JSON export, deletion/grace/cancellation, and integration coverage. | Update the README only after the release scope is frozen and verified. |
| `docs/13-operator-guide.md` says there is no admin panel and production is single-owner with registration disabled. | The current worktree contains an admin UI/API, explicit roles, waitlist/invites, campaigns, and `INVITE_ONLY`. | Mark the Stage 1 text historical or rewrite the guide for the Founding Beta. |
| Older status/workflow documents describe public HTTPS/custom-domain work as future or Render as the hosted target. | ADR 0009 and later server reports select the home server; supplied context and production tags indicate `app.gymtrack.ch`/Cloudflare work occurred. | Publish one canonical current deployment document and mark alternatives/history clearly. Do not infer live readiness from tags. |
| Historical July reports record working monitoring, Telegram alerts, backups, and newest-snapshot restoration. | The Founding Beta code/schema and August worktree are newer; current live systems were not inspected. | Preserve reports as historical evidence only and rerun critical controls on the frozen beta release. |
| Recovery policy requires an older snapshot plus the newest valid erasure ledger obtained separately before reopening. | `ops/backup/scripts/restore-test-postgres.sh` restores the database and ledger from the same selected snapshot. | Add and run the exact separate-ledger/migration/replay drill required by ADR 0013 and the launch gates. |
| User-facing Terms allow the operator to suspend accounts. | `SUSPENDED` state exists, but the current admin UI/API does not provide suspend/unsuspend or session-revocation operations. | Add the operational control or narrow the final terms/support promise. |
| Local operator guidance says action links can be recovered from logs when no mail provider is set. | Production logging intentionally suppresses recipients/content, and production without Resend returns from a non-delivery logger. | Make production mail configuration fail closed and document separate development and production behavior accurately. |
| Public-beta implementation is described as a foundation ready for operationalization. | All 29 canonical launch-gate checkboxes are still open, and the worktree is not a clean release. | Use “implementation foundation” only; never equate it with launch readiness. |
| Security documentation reports no known repository blocker. | That same review explicitly excludes deployed black-box, provider, infrastructure, capacity, device, and restore evidence; this audit also found zoom, storage-retention, email, CSV, and concurrency gaps. | Update the review after remediation and execute its staging/production-safe verification plan. |

## 6. Public-beta blockers

These are ordered by dependency and user harm. “Minimum evidence” is the smallest acceptable closure evidence; additional fixes may be required if testing reveals defects.

| Priority | Blocker | Why it blocks | Minimum closure evidence |
|---:|---|---|---|
| 0 | Freeze a reproducible release | The audited functionality is spread across a dirty worktree and is not represented by committed `HEAD`. | Clean immutable candidate SHA/tag and image digests; exact migration/config manifest; green required CI; reviewed diff; no untracked release code. |
| 1 | Legal/privacy publication approval | The pages self-identify as drafts; controller, processors/transfers, jurisdictions, full DPIA, and qualified review are unresolved. | Approved DPIA, counsel decision/jurisdiction scope, completed processor register, real contacts, archived rendered policy versions matching behavior. |
| 2 | Isolated production-like staging | Public ingress, migration, email, multi-user, capacity, and recovery cannot safely be proven against real owner data first. | Separate domain, database, credentials, mail strategy, monitoring and restricted access; reset/retention policy; documented parity and differences. |
| 3 | Admission and transactional-email black-box proof | Invite approval can outlive delivery, production mail can be disabled without startup failure, and external DNS/delivery/bounces are unverified. | Fail-closed provider config; SPF/DKIM/DMARC; observable delivery/failure; invite/verify/reset/delete/cancel HTML/text/link/expiry/reuse tests; pause/recovery procedure. |
| 4 | Public ingress and authorization proof | Owner-only Cloudflare context and repository tests do not prove every public path, direct API boundary, role, and resource is isolated. | Staging three-role endpoint/IDOR matrix; direct API `BFF_REQUIRED`; forged headers rejected; host/origin/CSRF/rate-limit tests; production-safe boundary confirmation. |
| 5 | Core workout write correctness under interruption/concurrency | Add-set/add-exercise lack idempotency and ordered writes lack versioning; ambiguous retries and stale tabs can corrupt the user experience. | Defined semantics and remediation; race/replay/multi-tab/timeout/process-restart tests; no unexplained or duplicate writes; formula-safe CSV export. |
| 6 | Accessibility and real-device acceptance | Global zoom is disabled, modal focus is incomplete, and required device/keyboard/screen-reader tests are open. | Zoom restriction removed; accessible dialog behavior; contrast/automated checks; 390/430/1440 and Samsung S22 Plus Firefox/mobile-data core-flow pass; keyboard and screen-reader record. |
| 7 | Data-lifecycle and browser-retention proof | The active-draft storage declaration conflicts with code, cleanup is process-timer based, and deletion/restored-data coverage is incomplete. | Inventory/code alignment; export/isolation and deletion/cancel/shared-record tests; durable observable cleanup; production/browser inventory inspection. |
| 8 | Deletion-safe backup and restore | Restoring older backups can resurrect erased people; existing historical restore evidence does not prove the required current process. | Current backup/retention evidence plus isolated older snapshot, independently newest ledger, migrations, replay, absent-ID proof, no-network-until-clear record, and measured RPO/RTO. |
| 9 | Release, migration, rollback and incident rehearsal | The current beta schema has not been proven on legacy data or safely rolled back/forward; critical operational controls are unrehearsed. | Staging migration timing/validation, backup, app rollback and schema forward-fix plan; signup/campaign pause, email outage, incident notice, status publish, and compromised-session drills. |
| 10 | Capacity and current observability | Pure-function budgets do not establish safe public write capacity; same-host monitoring misses full-host loss. | 20 concurrent active loggers and 2× peak with recorded latency/connections/disk/failure/recovery; current dashboards/alerts; external uptime; beta-critical cleanup/email/write signals. |
| 11 | Canonical gate completion and go/no-go | A release cannot be called ready while its own 29-item gate is entirely open. | Every item checked with dated links for the same release/environment, independent review of high-risk evidence, and recorded owner approval. |

## 7. High-priority non-blockers

These should be scheduled early, but a consciously limited 10-person cohort can proceed without all of them once the blockers are closed and the limitations are documented.

1. Add self-service password change, email change, profile correction, and session/device management.
2. Expand administrator tooling for suspension, unsuspension, session revocation, delivery/lifecycle visibility, audit review, and emergency global containment.
3. Add UPS-backed shutdown, a tested spare host, and a second independent or immutable backup layer; keep the current off-machine backup until the replacement is proven.
4. Implement secure remote administration and a private provider/account/MFA/recovery register with backup ownership.
5. Create a private beta-health dashboard and KPI definitions for admission, activation, first workout, repeat usage, reliability, support, email, cleanup, and backups.
6. Formalize support tickets, severity/triage, response expectations, safe diagnostics, fix notification, and correspondence retention.
7. Establish automated dependency/image/secret/license scanning, dependency-update ownership, SBOM generation, and a recurring maintenance calendar.
8. Improve CSP and container hardening, including non-root runtimes, minimal images, explicit resources, read-only filesystems/capability reduction where compatible, and pinned image provenance.
9. Review historical workout fidelity: current exercise classification changes affect historical volume presentation, and completed workouts remain editable by design.
10. Build a public repository/export only after operational details are separated, licensing is resolved, history is scanned, and public support/security policies exist.

## 8. Verification plan

All evidence must identify the release SHA/image digest, migration version, environment, tester, date/time zone, command or procedure, sanitized result, linked defect, and retest result. Never copy secrets or member personal data into evidence.

### 8.1 Repository and release-candidate checks

Run on a clean checkout of the frozen candidate:

1. Inspect `git status --short`, `git diff --check`, release diff/name/stat, lockfile, migration list, environment-template changes, and documentation changes.
2. Run `pnpm install --frozen-lockfile`, `pnpm check`, and `pnpm test:performance`.
3. Run API database integration tests on a new ephemeral PostgreSQL 17 database.
4. Run migrations from empty, down/up where supported, and from a sanitized production-shaped pre-beta snapshot. Validate constraints, row counts, roles, seat settings, ownership, and app health.
5. Run the full Docker Chromium/Firefox Playwright suite in invitation-only mode, not only local open-registration mode.
6. Run exhaustive Git-history secret scanning, dependency vulnerability/audit scanning, container/image scanning, license/SBOM checks, and asset provenance review.
7. Verify Docker images run with reviewed users/permissions, health checks, resource assumptions, pinned base provenance, and no embedded secrets.
8. Publish immutable artifacts/digests and a release manifest; do not deploy from a local dirty worktree.

### 8.2 Automated application tests to add or expand

- A generated authorization matrix for anonymous, ordinary A, ordinary B, suspended, deletion-pending, and admin actors across every endpoint and direct object reference.
- Invitation expiry, exact-email, reuse, cap and approval races, provider failure after commit, resend/reconciliation, disabled controls, non-admin denial, and direct-API admission bypass.
- Session expiry/revocation, password reset across multiple devices, administrator suspension, and compromised-account containment.
- Add-set/add-exercise idempotency or replay behavior, simultaneous ordering, stale edit/delete/reorder, ambiguous timeout after commit, and process restart.
- CSV formula escaping and import/export isolation/completeness, including large allowed input and shared/soft-deleted exercise fixtures.
- Export/deletion password confirmation, cross-user isolation, grace lock, link expiry/reuse/race, admin cancellation, idempotent finalization, retained shared records, and cleanup batching/restart.
- Browser-storage inventory tests for consent, user scoping, logout/account deletion, shared-device switch, abandoned drafts, expiry/clear, and legacy migration.
- Email content/link/expiry tests and an outbox/retry/delivery-state suite if that architecture is added.
- Automated accessibility checks on public/auth/core/app/admin routes, plus focused tests for modal focus trap/restore and zoom support.
- Monitoring assertions for route-label bounds, redaction, mail/lifecycle failures, release identifiers, and critical metrics.

### 8.3 Staging tests

Use only synthetic or explicitly approved sanitized data in the isolated staging model from section 10.

1. Deploy by the exact production procedure, including backup gate, migrations, secrets, BFF, Cloudflare/tunnel/proxy, and health checks.
2. Start from the legacy/pre-beta schema and data shape; validate migration time, locks, defaults, owner role/data, and both application versions where compatibility matters.
3. Execute the complete waitlist → admin approval → real email → invited signup → verification state → first workout → history/analytics → export → deletion/cancellation/finalization journey.
4. Exercise wrong/expired/reused invitation and action links, provider failure/bounce, duplicate approval, cap race, signup pause, campaign pause, and direct API attempts.
5. Run the multi-user authorization plan, browser-storage inspection, security headers, rate limits, CSRF/origin/host behavior, feedback XSS/input bounds, and log/metric leakage checks.
6. Inject Postgres/API/web/email/Internet-style failures; inspect messages, ambiguous writes, maintenance behavior, alerts, public status update, and recovery.
7. Run load/capacity tests with realistic workout write cadence, 20 active loggers, and 2× measured peak; capture latency, connections, CPU, memory, disk, errors, and recovery.
8. Rehearse app rollback and reviewed schema forward-fix/rollback, then repeat smoke and data-integrity checks.

### 8.4 Production-safe verification

Use a dedicated approved beta test account and tiny clearly labeled records. Do not mutate the owner’s real workouts, run destructive deletion/restore tests, or expose secrets.

- Record deployed release/config identifiers and health from the supported public origin.
- Verify TLS, certificate chain/renewal monitoring, canonical redirects, Host rejection, HSTS decision, cookie flags, CSP and other headers.
- Confirm only the web origin is usable publicly; non-health API requests without the shared BFF proof fail; forged forwarding headers do not affect attribution.
- Submit one waitlist request and one controlled invitation/account path only after email and legal gates are approved; verify no applicant email appears in Telegram/logs/metrics.
- Verify an ordinary user cannot reach admin pages/routes and cannot access a second controlled user’s IDs.
- Complete one disposable workout flow and remove only the approved test data through normal supported behavior.
- Confirm external uptime, dashboards, logs, request IDs, alerts, release labels, backup freshness, and independent status hosting.
- Verify registration/campaign emergency controls without disrupting existing real accounts.

### 8.5 Mobile and browser validation

At minimum, record 390px, 430px, and 1440px desktop-browser results plus the specified Samsung S22 Plus on Firefox over mobile data. Add current iOS Safari if any invited member is expected to use it.

Test signup/invite, login/reset, tour/help, start/resume workout, exercise selection, repeated sets, edit/delete/reorder, timer, phone lock/unlock, tab suspension, rotation, browser back/forward, multiple tabs, offline/online, timeout/retry, finish, history/detail, progress/volume, export, privacy choices, and deletion. Repeat critical flows with large text/zoom, keyboard only, reduced motion, VoiceOver or another screen reader, and soft keyboard open. Capture layout overflow, focus order/restore, announcements, touch target behavior, WebGL fallback, battery/heat concerns, and network error clarity.

### 8.6 Multi-user authorization validation

Create synthetic ordinary users A and B, an administrator, a suspended user, and a deletion-pending user. For every list/read/create/update/delete/action endpoint:

1. Verify unauthenticated denial.
2. Verify A can act only on A’s resources.
3. Substitute B’s identifiers in path, query, and body; expect the documented non-disclosing response and no database side effect.
4. Verify ordinary users receive server-side denial for every administrator operation.
5. Verify suspended/deletion-pending sessions and stale cookies cannot read or write.
6. Verify admin scope is only what the contract intends; administrator status must not silently grant access to private workouts.
7. Repeat through the browser BFF and any reachable API host, including forged headers, malformed UUIDs, pagination/search, CSV, analytics, shared exercises, campaigns, export, deletion/cancellation, and sessions.
8. Inspect audit records and database ownership after tests; a correct status code without correct side effects is not a pass.

### 8.7 Disaster-recovery validation

1. Create an approved synthetic account, workouts, and shared/unshared exercise references; complete erasure and capture only opaque identifiers needed for the test.
2. Select an isolated database backup older than that erasure.
3. Obtain the newest valid erasure ledger independently from the older database snapshot and validate its integrity/provenance.
4. Restore into an isolated, network-closed target; apply the release’s migrations in the documented order.
5. Replay the newest ledger before any web/API network access.
6. Prove erased IDs/email hashes or prohibited personal records are absent, shared retained records are correctly anonymized, constraints hold, and supported application queries work.
7. Run login/history/analytics checks only for retained synthetic accounts; scan logs and exports for resurrected data.
8. Measure actual RPO/RTO, document deviations, destroy the isolated copy securely, and review the evidence.
9. Separately rehearse full replacement-host recovery, credential retrieval, DNS/tunnel/status decisions, and return-to-service approval.

## 9. Launch gates

`docs/public-beta/launch-gates.md` remains the canonical detailed checklist. At audit time it contains **29 open items and zero checked items**. The following decision groups clarify required evidence; they do not replace any canonical checkbox.

| Gate group | Pass condition | Current result |
|---|---|---|
| Release identity | Clean immutable candidate, exact config/migrations/artifacts, all required CI green | **Fail** — worktree is not a release artifact |
| Legal/privacy | Approved controller/contact/processor facts, DPIA, legal scope, final archived policies | **Fail** — explicitly incomplete |
| Staging | Isolated production-like environment and promotion procedure | **Fail** — missing |
| Admission/admin | Invite-only settings, admin bootstrap, cap/rate controls, emergency pause, no bypass | **Open** — code exists; deployed proof missing |
| Ingress/security | Cloudflare/BFF/direct API, authz/IDOR, CSRF/origin/host, headers, rate limits, scanning | **Open** — repository controls exist; complete test missing |
| Email/support/status | Authenticated domain, delivery/bounces, all action emails, support owner, independent status | **Open** — external proof missing |
| Core data correctness | Concurrent/replayed workout writes, CSV safety, migration integrity, no unexplained writes | **Fail/Open** — known gaps and missing evidence |
| Accessibility/devices | Required viewports/device/network, keyboard, screen reader, focus, zoom, reduced motion | **Fail/Open** — zoom defect and missing manual evidence |
| Lifecycle/recovery | Inventory match, export/deletion, retention, erasure-safe restore, RPO/RTO | **Fail/Open** — storage mismatch and drill missing |
| Capacity/observability | 20 active loggers and 2× peak; current monitoring/alerts/external uptime | **Open** — load proof missing |
| Rehearsals | Rollback, restore, pauses, incident/status, email outage | **Open** — canonical gate unchecked |
| Approval | All 29 items linked to the same release and signed off | **Fail** |

Launch procedure after all gates pass:

1. Invite no more than 10 members.
2. Observe for 72 hours with daily beta-health, support, backup, email, alert, capacity, and data-integrity review.
3. Never approve more than 10 in a rolling 24-hour window and never exceed 50 active/reserved seats.
4. Stop immediately for P0/P1, authorization/isolation/deletion failure, unavailable recovery email, failed backups, unexplained workout writes, or capacity threshold breach.
5. Resume only with documented cause, remediation, verification on the current release, and owner approval.

## 10. Recommended environment model

| Environment | Purpose | Data | Access/network | Providers and operations |
|---|---|---|---|---|
| Local development | Fast feature work | Generated/local-only fixtures; never production dumps | Developer machine; open registration allowed only by explicit local config | Log/sandbox email; disposable DB; no production credentials |
| CI/test | Reproducible automated checks | Ephemeral generated fixtures | Isolated GitHub runner/services | No production network or secrets; PostgreSQL 17; Chromium/Firefox; artifacts sanitized |
| Staging | Production-like validation and rehearsals | Synthetic or approved sanitized production-shaped data | Separate restricted domain; same BFF/edge topology; never publicly indexed | Separate DB, credentials, mail domain/sandbox/recipient allowlist, monitoring, backup namespace and status rehearsal; reset policy documented |
| Production | Invite-only Founding Beta | Real owner/member data | `app.gymtrack.ch`; Cloudflare/edge to web; API/database/metrics not directly browser-public; admin least-privilege | Real Resend/support/Telegram; independent external status and uptime; off-host backups; immutable release manifest |
| Private operations/recovery | Runbooks, account register, evidence, restored copies | Minimal necessary encrypted evidence; isolated restore data | Private repo/vault and restricted hosts; no public GitHub | Provider ownership/MFA/billing, secrets, host topology, internal addresses, restore reports, incident records |

Environment rules:

- Use separate credentials, databases, domains, provider keys, backup paths, and monitoring labels. Never infer environment from hostname alone.
- Production personal data must not flow to local/CI/staging. If a sanitized shape is required, define and verify irreversible sanitization.
- Promote the same immutable artifact from staging to production; configuration differences must be enumerated and reviewed.
- Staging email must not reach arbitrary real addresses. Use an allowlist, provider sandbox, or captured mailbox while still testing production-like content and callbacks.
- Restores are a separate, network-closed environment until migrations, ledger replay, privacy checks, and approval complete.
- The static status page and external uptime observer must not share the application host, database, tunnel dependency, or only notification path.

## 11. Recommended documentation structure

The public code repository should contain only material safe and useful for users/contributors. Operationally sensitive facts and evidence belong in a private, access-controlled location.

```text
README.md
SECURITY.md
LICENSE
CONTRIBUTING.md
ARCHITECTURE.md
ENGINEERING.md
docs/
  public/
    beta-scope-and-limitations.md
    privacy-and-data-summary.md
    support-and-status.md
  user/
    getting-started.md
    workout-and-analytics-guide.md
    export-and-deletion.md
  developer/
    repository-structure.md
    local-development.md
    testing.md
    api-contract.md
    data-model.md
  decisions/
    ...active and clearly superseded ADRs...
  archive/
    ...historical public-safe plans and reports...

private operations repository or vault/
  current-environment-inventory.md
  provider-account-register.md
  release-evidence/
  launch-gates/
  runbooks/
  incidents/
  restore-reports/
  host-network-backup-details/
```

Reduction rules:

- Give each topic one authoritative current document with owner, last reviewed date, applicable environment/release, and links to evidence.
- Keep ADRs as decision history; mark superseded decisions explicitly rather than rewriting history.
- Move July/server wave reports and superseded stage plans into an archive or private operations history. Do not treat them as current status.
- Remove internal IPs, usernames, SSH aliases, file paths, backup endpoints, credential-recovery topology, and private host reports from a public repository.
- Generate public policy/help content from, or reconcile it against, the reviewed processing inventory so code, notices, and operational retention do not drift.
- Maintain one current project-status/handoff document. Avoid parallel “current state,” workflow status, stage status, and README claims.

## 12. Broad prioritized phases

This is sequencing guidance, not a detailed implementation plan.

### Phase 0 — Freeze truth and ownership

Decide the data/release boundary, create the private provider/account register, establish the canonical environment and documentation sources, select the staging target, identify approvers, and freeze a reproducible candidate.

### Phase 1 — Close known code and policy blockers

Resolve zoom/dialog accessibility, browser-storage/retention mismatch, email fail-closed/delivery semantics, workout replay/concurrency behavior, CSV formula safety, admin containment gaps, lifecycle scheduling/visibility, and any findings from legal/DPIA work.

### Phase 2 — Build staging and execute the formal test plan

Deploy the immutable candidate to isolated production-like staging. Complete migrations, multi-user authorization, browser/mobile/accessibility, external email, capacity, security scans/black-box tests, failure injection, incident/status, rollback, and deletion-safe restore drills.

### Phase 3 — Production preparation and safe verification

Verify provider accounts, DNS/Cloudflare/BFF, secrets, email authentication, support/status, monitoring/alerts/external uptime, backups, remote recovery, immutable artifacts, and production-safe boundary/smoke checks. Attach evidence to all 29 gates.

### Phase 4 — Founding cohort and observation

Invite 10 members, observe 72 hours under the documented stop rules, review beta health daily, address issues, and expand only within the approval/cap limits after evidence-based approval.

### Phase 5 — Operational maturity and public repository

Improve self-service account/admin/support tooling, redundancy, maintenance automation, analytics, and documentation. Separately prepare a safe licensed public repository and linking strategy after sensitive operations content and history risks are resolved.

## 13. Open questions

Only questions that cannot be answered safely from the repository remain here:

1. What exact commit/image/config/migration set is currently deployed at `app.gymtrack.ch`, and does it include any of the uncommitted Founding Beta work reviewed here?
2. Is the Fastify API reachable from the Internet by any hostname or path other than the trusted BFF, and what are the effective Cloudflare/Caddy Access and forwarding-header rules?
3. Will existing owner workout data remain in the beta production database? If yes, what migration, backup, rollback, isolation, and no-reset guarantees are accepted?
4. Which legal entity/person is the controller, which jurisdictions will be admitted, and what conclusions will qualified counsel and the full DPIA record?
5. What are the actual providers, regions, subprocessors, transfer mechanisms, retention terms, contracts, and owners for hosting/edge, email, support, status, alerting, source control, and backups?
6. Are Cloudflare, registrar/DNS, Resend, GitHub, Telegram, support/status hosting, server, router, and Restic accounts protected by MFA with tested recovery and backup ownership? Who owns billing and renewals?
7. Has Resend domain authentication passed, how are bounces/complaints/suppression monitored, and what should an administrator see/do when invitation delivery fails after approval?
8. Is secure remote host administration available when the owner is away from the LAN, and are current `sshd`, key, root-login, logging, and break-glass settings reviewed?
9. Is there a UPS, tested spare/replacement host, externally independent uptime check, and accepted availability expectation for residential power/Internet outages?
10. What is the newest successful production backup and maintenance time, and when will the exact older-snapshot/newest-ledger/replacement-host recovery drills be completed on the beta schema?
11. Which self-service account features and support response expectations are promised for the first cohort, and which limitations will invitees explicitly accept?
12. Is the eventual GitHub repository intended to be open source, source-available, or portfolio-only, and is the owner willing to publish personal Git metadata after operational material is removed?

Until those answers are recorded and the blockers/gates are closed with current evidence, the Founding Beta should remain behind the existing owner-only boundary.
