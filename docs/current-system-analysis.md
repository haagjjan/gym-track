# Current System Analysis — Gym Progress Tracker

**Analysis date:** 2026-08-27

**Repository revision reviewed:** `9d63a6dd12ec13d888200ec0118f271236da7a1e`

**Production evidence cutoff:** 2026-08-27 11:42 UTC

## Purpose of this document

This is my current technical and operational summary of Gym Progress Tracker. I use it to explain
what I have built, how the repository is structured, how the deployed environments work, what has
been verified, and where the remaining limits are.

This document describes the system as it exists now. Older roadmap, setup-wave and beta-process
documents remain valuable execution records, but their historical “still to do” wording does not
override this summary or the completed launch-gate record.

## Executive summary

I built Gym Progress Tracker as a mobile-first strength-training application. Its main purpose is
to make workout logging fast enough to use during a real gym session while turning the saved data
into useful history, exercise-progress and muscle-volume views.

The project is no longer an application scaffold. It is a complete, self-hosted product and
operations repository containing:

- the member-facing Next.js application;
- the Fastify API and PostgreSQL schema;
- owned authentication, account recovery, privacy, export and deletion workflows;
- workout sessions, templates, a reviewed exercise catalog, CSV transfer and analytics;
- invitation-only beta admission, administrator containment and member messaging;
- local, production-shaped staging and hardened production definitions;
- CI, unit, integration, performance, browser and accessibility checks;
- private monitoring, structured logs, alerting, encrypted backups and tested restoration;
- the legal, security, privacy, deployment and beta-verification record.

Goal 5 of the Founding Beta process is complete. Every launch gate is checked. Production remains
invitation-only, and Goal 6—the first deliberately observed cohort—still requires a separate
recorded go/no-go decision.

## What I am building

The product is aimed at lifters who want more than a notes app but do not need a social network or
coaching marketplace. The useful loop is intentionally direct:

1. Start a workout from scratch or from a template.
2. Add one or more exercises from a searchable catalog.
3. Log warm-up and working sets with weight, repetitions, reps in reserve (RIR) and notes.
4. Finish the session and review it in History.
5. Use Progress and Weekly Volume to understand training over time.

The dashboard adds fast entry into that loop, current-session recovery, favorite-lift context,
optional device-local biometrics and an interactive body presentation. The product remains a
training log and analysis tool; it is not medical advice, a treatment system or an automated
coach.

## Product scope implemented today

### Member experience

- Email/username/password accounts with Argon2id password hashing.
- Opaque database-backed sessions in secure, HttpOnly, SameSite cookies.
- Login lockout, email verification, password reset and generic enumeration-resistant recovery.
- Invitation-only signup for production and open registration for local development.
- Dashboard, onboarding, contextual help and an in-app message inbox.
- Live workout creation, renaming, exercise ordering, set creation/editing/deletion and finish
  summary.
- Previous-performance context, rest timer and 24-hour device-local unfinished-set recovery.
- Ordered workout templates, duplication, creation from a completed workout and template starts.
- Workout history and detail, with a canonical CSV import/export format and preview.
- A reviewed catalog of 820 system exercises plus controlled custom-exercise creation, editing,
  ownership rules, aliases, typo-tolerant search, facets and merge support.
- Exercise Progress with range-aware totals, tonnage, best set and estimated one-repetition max.
- Weekly muscle volume with account-synced heat thresholds and 2D/3D body-map presentation.
- Display, favorite-lift, privacy, onboarding and volume preferences.
- JSON account export, password-confirmed deletion scheduling, cancellation and final erasure.

### Administrator and beta operations

- Public email-only beta requests with a deliberately generic response.
- Manual approval, rejection, blocking, invitation reissue and seat accounting.
- A 50-seat cap, rolling daily approval limit and independent waitlist, invitation and campaign
  controls.
- Explicit operator bootstrap for the first administrator; no email-based implicit promotion.
- User suspension/reactivation, session revocation and deletion-cancellation support.
- Cursor-paginated audit records for administrative actions.
- Plain-text, trigger-based member campaigns with pause, resume, end, dismissal and bounded
  responses.
- A startup-and-hourly lifecycle runner for expired authentication state, beta state, deletion
  finalization and retention work.

## Codebase analysis

### Repository snapshot

The reviewed revision contains the following useful scale indicators:

| Area | Current size |
| --- | ---: |
| TypeScript/TSX source files under `apps/api/src` and `apps/web/src` | 361 |
| Source lines across those files | about 38,000 |
| API route paths | 57 |
| Same-origin Next.js BFF route files | 56 |
| Next.js page routes | 25 |
| PostgreSQL migrations | 9 |
| Application tables created by migrations | 21 |
| Test/specification files | 59 |
| Test declarations | about 295 |
| Production Prometheus alert rules | 31 |

These counts are orientation, not quality claims. The important property is that the core flows
cross UI, API and real PostgreSQL integration coverage rather than existing only as isolated
components.

### Application boundaries

The repository is a strict TypeScript pnpm workspace with two applications:

- `apps/web` is a Next.js App Router application using React 19. It owns pages, UI state,
  same-origin BFF routes, responsive interaction, charts and the 2D/3D visual layer.
- `apps/api` is a Fastify application using Kysely and Zod. It owns authentication,
  authorization, validation, business transactions, metrics and persistence.

The browser does not call Fastify directly in production. It calls the same-origin Next.js BFF.
The BFF normalizes the request boundary and signs the edge-derived client address; Fastify rejects
ordinary non-health requests without that proof. PostgreSQL and the API have no public listener.

API code is organized into feature slices: `admin`, `analytics`, `auth`, `beta`, `exercises`,
`health`, `lifecycle`, `messages`, `templates`, `users` and `workouts`. Routes delegate business
rules to services and persistence to repositories. The web application uses parallel
feature-owned modules for the member and administrator surfaces.

### Data model

PostgreSQL is the durable source of truth. The nine SQL migrations cover:

- users, opaque sessions and hashed action tokens;
- workouts, ordered exercises and ordered sets;
- muscle groups, multi-muscle exercise classification and the exercise catalog;
- templates and template exercises;
- account and display/privacy preferences;
- first-party product events;
- beta settings, access requests and invitations;
- administrator audit events;
- account-deletion tokens and external erasure tombstones;
- campaigns, materialized targets and message deliveries;
- idempotent client mutation identifiers and write-safety constraints.

Ownership constraints are applied in repository queries rather than delegated to the UI.
Workout-structure writes lock the parent workout, exercise/set creation is parent-scoped and
idempotent, and cross-account reads and writes are covered by PostgreSQL integration tests.

### Browser storage

Durable workout and account data stays server-side. Browser storage is intentionally narrow and
user-scoped:

- optional device-local biometrics and favorite-lift presentation;
- a versioned unfinished-set draft with a hard 24-hour maximum;
- per-surface filter state for the current tab session;
- a device preference for the volume visualization.

The storage choice is explicit, device data can be cleared from Settings, logout clears active-set
drafts, and no advertising or third-party browser analytics library is used.

## Security and privacy analysis

The main security boundary is defense in depth rather than one outer gate:

- production admission is enforced by hashed, expiring, single-use invitations;
- Argon2id is used for passwords, including a dummy verification path for unknown usernames;
- session and action tokens are stored as hashes where later lookup is required;
- route-level authentication and ownership checks are authoritative;
- administrator routes require an explicit database role and protect administrator/self targets;
- Origin, Host and fetch-metadata checks protect the Next.js ingress;
- Fastify requires signed BFF attribution and does not enable browser credentialed CORS;
- request bodies, cookies, authorization, email, token and secret fields are redacted from logs;
- metrics use bounded labels and contain no account, email, workout or request identifiers;
- rate limits exist globally and more tightly on authentication and administrative mutations;
- production services run with read-only roots, dropped capabilities and non-root identities;
- secrets are protected host files mounted only into the service that requires them.

The privacy implementation includes explicit policy versions and consent evidence, first-party
event preference, data export, seven-day deletion grace, immediate session revocation after
deletion scheduling, hard erasure, shared-exercise anonymization and an erasure ledger that must be
replayed before a restored database can reopen.

The security review is a focused project review, not an independent penetration-test
certification. The Founding Beta screen-reader review was deliberately descoped for the initial
cohort and must be revisited before the intended audience broadens.

## Quality and verification

The default project gate is:

```sh
pnpm check
```

It runs type checking, linting, unit tests and production builds. Separate gates cover:

- sequential algorithmic performance regression tests;
- real PostgreSQL integration flows;
- Playwright browser smoke tests;
- responsive layouts at 320, 390, 430 and 1440 pixels;
- Chromium and Firefox production-shaped flows;
- representative axe, keyboard, focus, reduced-motion and zoom behavior;
- migration-from-empty, upgrade, rollback-copy and restore rehearsals;
- production Compose, Caddy and immutable-runtime invariants.

The final repository revision reviewed here passed Project checks, API database integration, Web
smoke and status-page deployment in GitHub Actions.

Capacity evidence is intentionally bounded to the beta goal: production-shaped staging passed 20
concurrent active loggers and a 40-logger 2x probe with no failures. That is evidence for the
Founding Beta, not a claim of Internet-scale capacity.

## Environment analysis

### Local development

Local Docker Compose runs PostgreSQL 17, a one-shot migration container, Fastify and Next.js.
PostgreSQL and the API bind only to loopback; the web application is available on port 3000.
Local registration is enabled by default, secure cookies are off for HTTP development, and email
links are logged when no Resend key is configured.

The optional monitoring overlay adds Prometheus, Alertmanager, Node Exporter, cAdvisor,
PostgreSQL Exporter and Grafana. It is not required for ordinary feature development.

### Staging

Staging is production-shaped but logically isolated under `/srv/gym-tracker-staging` on the same
physical host. Its last recorded exact deployment is
`5a29890aa02f686e18fcfaa419981aa39be5adb4`.

It has its own PostgreSQL database and volume, roles, secrets, cookie, Caddy proxy and Docker
networks. Only `127.0.0.1:3100` is host-published, and Cloudflare Tunnel maps the controlled
staging hostname to that listener. Recipient delivery is restricted to two owner-controlled
addresses. Staging uses synthetic data, is excluded from production backups and monitoring, and
must be refreshed to a new exact SHA before it can provide evidence for later application changes.

Staging is isolated at the service/data level, not at the hardware level. A runaway staging
workload can still compete with production for the same CPU, memory, disk and Docker daemon, so
its runbook includes production preflight and resource stop conditions.

### Production

The currently recorded application release is
`9bbca92923b222d5b9edf8861d977b1c7845b39b`. The repository `main` branch is ahead because later
commits add test, gate and status evidence without deploying a new application build.

Production runs ten long-lived services plus a one-shot migration profile:

- PostgreSQL 17;
- Fastify API;
- Next.js web;
- Caddy ingress;
- Prometheus;
- Alertmanager;
- Node Exporter;
- cAdvisor;
- PostgreSQL Exporter;
- Grafana.

The application is publicly reached as browser → Cloudflare edge/Tunnel → Caddy → Next.js BFF →
Fastify → PostgreSQL. Caddy is the only application ingress. Grafana is loopback-only, and the API,
database, Prometheus, Alertmanager and exporters remain on internal networks.

The member hostname is public, but registration is `INVITE_ONLY`. Cloudflare Access is not used as
the product admission control. Remote SSH administration is separate and owner-only through
Cloudflare Access, with pinned host keys and private-LAN recovery paths.

### Production hardware

Production is intentionally small and owner-operated:

| Component | Recorded specification |
| --- | --- |
| Host | 2018 Apple Mac mini (`Macmini8,1`) |
| CPU | Intel Core i5-8500B, 3.0 GHz, 6 physical cores |
| Memory | 32 GB installed, about 30 GiB usable |
| Storage | About 500 GB Apple NVMe SSD, 458 GiB usable ext4 root filesystem |
| OS | Ubuntu 26.04 LTS, x86_64 |
| Kernel | T2-compatible `7.1.3-1-t2-resolute` |
| Swap | 8 GiB |
| Primary network | Ethernet, with Wi-Fi fallback |

The latest recorded pre-launch audits showed more than 28 GiB available memory and more than
400 GB free root storage. The active T2 kernel, firmware and boot path are operational constraints:
generic kernel cleanup or unattended bootloader changes must not be treated as routine maintenance.

## Operations analysis

### Monitoring and alerting

Prometheus scrapes six targets every 15 seconds: the API, node, containers, PostgreSQL,
Alertmanager and Prometheus itself. It retains 30 days with a 5 GB size bound. Grafana provisions
service, host/container and PostgreSQL dashboards from Git.

The 31 alert rules cover service loss, API errors and latency, host/disk/memory/CPU pressure,
container restarts/OOM/read-only failures, PostgreSQL pressure, backup freshness and lifecycle/email
liveness. Alertmanager is not host-published and sends bounded infrastructure notifications to one
private Telegram destination.

The final Goal 5 rehearsal loaded and validated all 31 rules, fired a temporary no-impact lifecycle
alert through the deployed path, removed it and confirmed that no alert remained active. All six
targets were up and no systemd unit was failed at the evidence cutoff.

### Logging

Fastify produces structured JSON with normalized routes and request correlation. Caddy removes
sensitive edge/identity headers and filters secret-bearing query keys. PostgreSQL records slow
statements and lock diagnostics without parameter values. Docker logs, journald and local operator
views are size/age bounded; there is intentionally no Loki or Sentry deployment yet.

### Backup and recovery

Production creates a custom-format PostgreSQL dump, stages required operational configuration and
secrets, exports the erasure ledger, then encrypts the bundle with Restic before sending it over a
restricted SFTP path.

The off-machine destination is a dedicated, chrooted, internal-SFTP-only account on my MacBook.
A persistent reverse SSH tunnel exposes the destination only on production loopback port 2222.
There are four daily backup opportunities, a 24-hour RPO target, a four-hour RTO target, seven-day
local-dump retention and strict 30-day Restic snapshot retention.

The recovery claim is tested rather than inferred. The project has restored PostgreSQL and
configuration into isolated environments, restored an older database with a newer erasure ledger,
replayed the ledger idempotently and verified that erased identities remained absent before any
network reopening.

On 2026-08-27 a scheduled backup failed while the reverse destination tunnel was unavailable. The
tunnel was restored, encrypted snapshot `7ff8599c` completed, and the full repository check read
all 55 snapshots without errors. This is both proof that the recovery path works and a reminder
that the current off-machine destination depends on the MacBook being reachable during one of the
daily windows.

### Independent status path

`status.gymtrack.ch` is a dependency-free page on GitHub Pages. Its DNS is not proxied through
Cloudflare, so it remains independent of the application host and tunnel. The publication workflow
is manual because every deployment is an operational claim. The publish, public observation,
resolve and archive rehearsal passed on 2026-08-27.

## Current strengths

- The core gym workflow is complete from UI to PostgreSQL and is usable on a real mobile device.
- The architecture has clear web/API/database ownership and avoids direct browser-to-database or
  browser-to-Fastify shortcuts.
- Authorization, deletion, invitation, mutation and restore boundaries have real integration and
  production-shaped evidence.
- The deployment is reproducible from reviewed, non-secret files and immutable Git-SHA images.
- Monitoring, alerting, backup, restore and incident publication are part of the repository rather
  than undocumented host knowledge.
- Privacy behavior is implemented in data flows, not only described in policy pages.

## Current constraints and risks

- This is a single-owner, single-production-host system. There is no high availability or automatic
  failover.
- Staging and production share the same hardware and Docker daemon despite having separate data,
  credentials and networks.
- The primary off-machine backup destination depends on my MacBook and its Access-authenticated
  reverse tunnel. A second immutable destination would reduce that dependency.
- Telegram is the only alert notification path, and the status page is manually published rather
  than an independent automated uptime monitor.
- Staging is intentionally excluded from production monitoring and backup; synthetic staging data
  is disposable.
- The capacity result supports a small beta only. It is not evidence for large or hostile traffic.
- Raw single-use invitation/action links necessarily exist in delivered email and may appear in a
  recipient browser history or the contracted mail provider. Application storage retains hashes;
  the remaining control is short expiry, one-time use, access discipline and provider retention.
- Full screen-reader coverage was not claimed for the Founding Beta and is required before the
  intended audience expands.
- Render remains a checked-in alternative, not the active production platform.
- Historical documentation is extensive and sometimes preserves now-resolved “remaining work.”
  This summary, the current README, ADRs, launch gates and exact execution reports should be used
  before interpreting an older roadmap paragraph as current state.

## Current conclusion

I consider the repository and production setup ready for the decision between Goal 5 and Goal 6.
The application, admission controls, security-quality gates, production operations and recovery
path are implemented and evidenced for a small invitation-only Founding Beta.

That does not mean the system is finished forever or hardened for arbitrary public scale. It means
the defined Goal 5 bar is met, the known limits are explicit, and the next step is an operational
decision to begin the first cohort—not another round of foundation work.
