# Gym Tracker Operational-Readiness Audit

Audit date: 2026-08-06
Repository: `/Users/janva/Projects/gym-progress-tracker`, branch `main`, HEAD `4cbcba8`
Scope: repository, working tree, and Git history only. No production host access.

---

## 1. Executive assessment

### Overall readiness summary

The application is **technically substantial and operationally immature in a small number of specific, fixable ways**. The engineering quality is well above what the phrase "hobby beta" implies: user-data isolation is scoped at the repository layer throughout, the public-beta admission machinery (waitlist → hashed single-use invitation → seat cap → audit trail) is implemented with real database transactions and row locks, account export/erasure is implemented end-to-end including a backup erasure-ledger replay design, and the monitoring/backup/DR layer is genuinely strong for a one-person home-server deployment.

What is *not* ready is the boundary between the repository and the running world: several controls that the documents describe as "implemented" are implemented in code but **disabled, unproven, or actively bypassed by the current production environment shape**. The three most consequential examples are the `APP_ENV=private-lan` escape hatch that switches off every production security assertion in `apps/api/src/shared/env.ts:44-88`, the client-IP attribution path that trusts a browser-supplied `cf-connecting-ip` header (`apps/web/src/shared/bff-client-attribution.ts:18`), and the statically pre-rendered legal pages that will freeze the "PUBLICATION_BLOCKED / [controller configuration required]" placeholders into the built image regardless of runtime configuration.

The project's own documents are unusually honest about this. `docs/public-beta/launch-gates.md` and `docs/public-beta/security-review.md` both state the system is **not approved for public traffic** until deployed evidence exists. My independent reading of the code agrees with that conclusion and adds a handful of defects the documents do not mention.

### Strongest areas

- **Backups and disaster recovery** (`ops/backup/`, `docs/server/disaster-recovery.md`) — encrypted Restic, four daily attempts, weekly maintenance with 10% verification, isolated restore-test script that hash-compares row counts, a documented RPO/RTO, an erasure-ledger replay script, and an explicit rule forbidding reopening a restored database before replay. This is the most mature part of the project.
- **Authorization scoping** — every user-owned read and mutation I traced re-derives ownership from the authenticated user rather than from a client-supplied ID. The reorder endpoint, which is the classic hole in this pattern, is correctly closed by set-membership validation (`workout-logging.service.ts:196-221`).
- **Data-lifecycle implementation** — export, seven-day grace deletion with immediate session revocation, idempotent finalization under a row lock, shared-exercise anonymization, tombstones, and typed retention cutoffs (`user-account.repository.ts:98-245`).
- **Database integrity** — `workout_sessions_one_open_per_user_idx` makes duplicate active workouts structurally impossible; check constraints enforce the deletion state machine and role/status enums; every new table has FKs and appropriate indexes.
- **Alerting design** — meaningful thresholds, warning/critical separation, inhibit rules, and an actionable `first_action` annotation on every rule (`ops/monitoring/prometheus/rules/alerts.yaml`).

### Largest remaining risks

1. **Production may still be running with all production security assertions disabled.** `APP_ENV=private-lan` (documented as the current home-server value in `.env.example:13-14`) causes `isProductionDeployment` to evaluate false, skipping the HTTPS, `AUTH_COOKIE_SECURE`, `BFF_CLIENT_IP_SECRET`, and `SUPPORT_EMAIL` requirements entirely. The same bypass exists in the web tier (`request-security.ts:31-33`). This cannot be resolved from the repository.
2. **Rate limiting is bypassable if the edge does not strip `cf-connecting-ip`.** The BFF signs whatever value it finds, so an attacker rotating that header defeats every per-IP limit, including the 10-per-15-minutes credential limit and the 5-per-hour waitlist limit.
3. **Legal pages will publish with placeholder controller/contact text.** Static prerendering means the runtime env vars in `compose.yaml:89-94` are never read.
4. **No operator tooling for abuse response.** There is no endpoint or admin UI to suspend an account or revoke another user's sessions; `docs/13-operator-guide.md:103-127` documents raw SQL as the mechanism. `SUSPENDED` is a valid state in the schema and in the login check, but nothing can set it.
5. **No staging environment.** Migrations and releases go from a developer laptop to the only database that holds real user data.
6. **A large volume of unreviewed, uncommitted work.** 123 working-tree entries, including roughly 40 untracked directories that constitute most of the public-beta web surface (`apps/web/src/app/admin/`, `apps/web/src/features/beta/`, `apps/web/src/features/legal/`, `apps/web/src/app/api/users/me/deletion/`, …). None of this has passed CI, because CI runs on push/PR to `main`.

### Is it ready for external testers today?

**No.** Not because the product is bad — the core loop is well built — but because at least four launch-blocking conditions are unresolved (Section 6), and because the code that implements the beta is not yet committed and therefore has never run through the project's own quality gates.

### Technically functional but operationally immature?

Yes, and that is the accurate framing. The gap is not features; it is: (a) unverified production configuration, (b) missing operator controls for the things that go wrong with real users, (c) no staging, and (d) documentation that has drifted far enough that it can no longer be trusted as a status source.

### The most important uncertainty

**What the production `.env` on `gym-prod` actually contains** — specifically `APP_ENV`, `REGISTRATION_MODE`, `AUTH_COOKIE_SECURE`, `HSTS_ENABLED`, `BFF_CLIENT_IP_SECRET`, and whether the deployed commit includes the public-beta work at all. Every other finding is secondary to this, because the same codebase is either hardened or wide open depending on those values, and I could not observe them.

---

## 2. Evidence limitations

### What I could inspect

- Full application source: `apps/api/src` (117 TS files), `apps/web/src` (~200 TS/TSX files), `apps/web/e2e`.
- All 8 SQL migrations in `apps/api/db/migrations/`.
- Build and deploy definitions in the repository: `Dockerfile`, `compose.yaml`, `compose.monitoring.yaml`, `render.yaml`, `.dockerignore`.
- CI: `.github/workflows/repo-checks.yml`.
- Ops assets: `ops/backup/` (11 scripts, 5 systemd units), `ops/monitoring/` (Prometheus, Alertmanager, Grafana provisioning, 3 dashboards), `ops/logging/`, `ops/status/`.
- All documentation under `docs/` (~36 directories), including 13 ADRs, 11 server stage reports, the public-beta document set, and the private-beta-1 evidence.
- Git: 899 commits, all branches and tags, author list, and a targeted search of history for added secret-like files.
- Working-tree status: 123 modified/untracked entries.

### What I could not inspect

- **The live production host.** No SSH, no shell on `gym-prod`, no container state, no running configuration.
- **The production environment file.** `.env` is correctly untracked and outside the repository.
- **The production Compose overlay, the Caddyfile, and the Cloudflare Tunnel configuration.** None of these exist in the repository. The alert rules reference a Compose service named `proxy` (`alerts.yaml:48-57`) that `compose.yaml` does not define, confirming the production stack is assembled from files kept only on the host at `/srv/gym-tracker`.
- **Cloudflare** — Access policies, Tunnel configuration, WAF, DNS records, and which client-IP header the edge actually sets or overwrites.
- **DNS and domain registration** for `gymtrack.ch`, including registrar, expiry, and lock state.
- **Email** — Resend account state, domain verification, SPF/DKIM/DMARC records, sending quota, bounce/complaint handling.
- **Backups in practice** — the actual Restic repository, snapshot list, last successful run, or any restore-test report under `/srv/gym-tracker/backups/reports/`.
- **Monitoring in practice** — whether Prometheus/Grafana/Alertmanager are currently running, whether alerts deliver, or what the dashboards show.
- **Account ownership, MFA state, billing, and recovery paths** for any external provider.
- **Any live behavior whatsoever.** I did not run the application, the test suite, the linter, or any browser. No claim in this report about runtime behavior is based on observation; all are read from source.

### Findings based only on repository evidence

**All of them.** Every status below should be read as "as represented in the repository at commit `4cbcba8` plus the current working tree." Where a document asserts that something was verified on the host (e.g. the Stage 9/10/11 reports), I record that the *claim* exists and note that I could not confirm it.

One specific evidence failure worth flagging: `docs/beta-process/private-beta-1/private-beta-1-remediation.md:6` cites the tested production baseline as commit `1ba15973df255d2e5bd3b94def03e25b050e870a`. **That object does not exist in this repository** (`git cat-file -t` fails on it across all refs). The real-device test evidence therefore cannot be tied to any commit I can inspect.

---

## 3. Status matrix

| # | Area | Status | Confidence | Beta criticality | Main evidence | Main gap |
|---|------|--------|-----------|------------------|---------------|----------|
| 1 | Public-beta scope and release boundaries | Implemented but verification incomplete | Medium | High | `docs/18-public-beta-handoff.md`; ADR 0012; `beta_settings` cap 50 / 10-per-day (`20260805120000000_add_public_beta_foundation.sql:37-51`) | No production evidence of the configured values; no data-reset mechanism behind the stop rules |
| 2 | Removal of owner-only assumptions | Partially implemented | High | Blocker | No owner email/ID anywhere in `apps/`; admin is a stored role (`beta.routes.ts:65-75`); bootstrap CLI `apps/api/scripts/promote-admin.mjs` | `APP_ENV=private-lan` disables all production assertions (`env.ts:44-48`, `request-security.ts:31-33`) |
| 3 | Registration and invitation lifecycle | Implemented but verification incomplete | High | High | Hashed single-use 7-day invites, `forUpdate()` cap race guard (`beta.repository.ts:89-131`); concurrency integration test | Mail-send failure after commit consumes a seat and returns 500; raw token in URL query string |
| 4 | Authentication and account management | Partially implemented | High | Blocker | signup/login/logout/verify/reset/lockout (`auth.routes.ts`, `auth-action.routes.ts`) | No password change, no email change, no session listing/revocation, no suspension endpoint |
| 5 | Authorization and user-data isolation | Implemented but verification incomplete | Medium-High | Blocker | Ownership re-derived in every repository; reorder membership check (`workout-logging.service.ts:196-221`); export joins constrained (`user-account.repository.ts:99-127`) | No cross-user black-box matrix; only one workout-ownership integration test |
| 6 | Core workout-data correctness | Implemented but verification incomplete | Medium-High | High | `workout_sessions_one_open_per_user_idx`; transactional position compaction; draft persistence (`set-draft-storage.ts`) | No offline queue/retry; `refetchOnWindowFocus: false`; no idempotency key on set creation |
| 7 | User-facing messages and failure states | Partially implemented | Medium | Medium | Uniform `{error:{code,message}}` envelope; rate-limit message includes retry window (`server.ts:179-184`) | Technical codes surface to users (`BFF_REQUIRED`, `UNTRUSTED_HOST`, `PUBLICATION_BLOCKED`); no offline/maintenance state |
| 8 | Mobile and browser reliability | Partially implemented | Medium | High | Real S22 Plus/Firefox/mobile-data test recorded in `private-beta-1-report.md`; Playwright Chromium+Firefox | Tested baseline commit absent from repo; device retest explicitly still open; no suspended-tab/reconnect handling |
| 9 | Accessibility and usability | Partially implemented | Medium | Medium | `prefers-reduced-motion` honoured in 4 places; `role="alertdialog"`, `aria-modal` (`confirm-dialog.tsx:47`) | No focus trap or initial focus in modals; no automated a11y check; contrast/scaling unverified |
| 10 | Security hardening | Partially implemented | High | Blocker | Helmet, rate limits, HMAC BFF attribution, host/Origin/Sec-Fetch guard, 1 MB body limit, Argon2 | `cf-connecting-ip` trusted from the browser; web CSP has no `default-src`/`script-src`; containers run as root with compilers; no dependency scanning |
| 11 | Privacy and legal implementation | Partially implemented | High | Blocker | Versioned policies, consent capture, export, erasure, retention cutoffs, DPIA screening | Legal pages are statically prerendered → placeholders freeze at build; no real controller facts; legal review outstanding |
| 12 | Transactional email | Partially implemented | High | Blocker | Resend HTTP transport with 10 s timeout, branded HTML, reply-to (`mailer.ts:63-97`) | No retry, no bounce/suppression handling, no delivery record; deletion cleanup aborts on first send failure |
| 13 | Database production readiness | Implemented but verification incomplete | High | High | 9 unique indexes, FK + check constraints, reversible migrations, transactional writes | No down-migration test in CI; pool has no `max`, `statement_timeout`, or connection timeout (`database.ts:276-285`) |
| 14 | Backups and disaster recovery | Implemented but verification incomplete | Medium-High | Blocker | `ops/backup/scripts/*` (lockfile, failure metric, manifest), `restore-test-postgres.sh` hash comparison, `disaster-recovery.md` | Single off-site destination that sleeps; 30-day strict retention and old-snapshot + ledger-replay drill not evidenced |
| 15 | Monitoring, logging, observability | Implemented but verification incomplete | Medium-High | High | Prometheus + 3 dashboards; redacting Pino logger; request-ID propagation BFF→API | All monitoring is host-local — a host/tunnel outage is silent; no user-flow failure metrics; no external uptime check |
| 16 | Alerting | Implemented but verification incomplete | Medium-High | High | 24 rules with severity split, inhibit rules, `first_action` on every rule; Telegram file-backed secrets | Same host-local blind spot; nothing alerts on cleanup-job failure, email failure, or ledger-export failure |
| 17 | Incident response | Partially implemented | Medium | High | DR decision tree; rollout stop rules (`launch-gates.md:46-48`); status page template | No maintenance mode, no user-communication templates, no post-incident review, no credential-compromise procedure |
| 18 | Deployment, migration, release, rollback | Partially implemented | Medium-High | Blocker | CI runs check + performance + DB integration + Playwright; `migrate` Compose stage gates the API | Production Compose/Caddy/Tunnel not in Git; `APP_RELEASE` defaults `unknown`; no backup-before-migration; rollback unrehearsed |
| 19 | Staging and pre-production | Missing | High | Blocker | Only `previews: generation: manual` in `render.yaml:1-2` | No staging domain, database, credentials, or email sandbox anywhere |
| 20 | Performance and capacity | Partially implemented | Medium | High | Pagination (limit ≤ 100, default 20); pure-function perf gates in CI | Three.js/R3F/postprocessing bundle unmeasured on mobile; no load test; no container resource limits; no defined capacity assumption |
| 21 | Home-server resilience | Implemented but verification incomplete | Low-Medium | High | `restart: unless-stopped`; systemd timers; `gym-tracker-stage11-post-reboot.service` | No UPS; spare Mac mini untested; tunnel reconnection and T2 kernel update path unverified |
| 22 | Third-party dependency management | Partially implemented | Medium | Medium | `docs/public-beta/data-processing-inventory.md` lists processors | No consolidated ownership/billing/quota/renewal/outage-impact register |
| 23 | Administrative and operational tooling | Partially implemented | High | Blocker | Admin API + UI for waitlist, settings, campaigns, deletion-cancel; audited bootstrap CLI | No suspend, no session revocation, no failed-registration view, no manual verify — all raw SQL (`13-operator-guide.md:103-127`) |
| 24 | Beta-user onboarding | Implemented but verification incomplete | Medium | Medium | `/beta`, `/help`, onboarding overlay + checklist, practice workout, `onboarding_steps` sync | No stated supported-device matrix in-product; first-run flow unverified on a device |
| 25 | Feedback, support, bug reporting | Partially implemented | Medium | Medium | `/support`, in-app campaign inbox with bounded responses, `client-diagnostics.ts` | No structured bug report capturing release/device/request-ID; diagnostics are opt-in via env flag only |
| 26 | Beta analytics and success metrics | Partially implemented | High | Medium | `app_events` tracker with per-user opt-in gate (`events.ts:19-33`); `login_count`, `completed_workout_count` counters | `analytics_enabled` defaults **false**, so registration/activation funnels will be largely unmeasurable; no metrics dashboard |
| 27 | Documentation | Partially implemented | High | Medium | 13 ADRs, 11 stage reports, public-beta set, operator guide | `99-current-project-state.md` and `README.md` predate the entire public beta; no authority ranking; heavy duplication |
| 28 | Recurring maintenance | Partially implemented | Medium | Medium | Weekly `gym-tracker-backup-maintenance.timer`; four-daily backup timer | No cadence for dependency/OS/container updates, credential review, restore tests, secret rotation, or domain renewal |
| 29 | Account ownership, billing, renewals, recovery | Insufficient evidence | Low | High | Only the credential-recovery list in `disaster-recovery.md:38-48` | Nothing recorded about MFA, backup codes, recovery email, payment expiry, or provider account separation |
| 30 | Formal pre-launch security and privacy test | Partially implemented | High | High | `docs/public-beta/security-review.md` (17-threat repo review) | No repeatable executable suite or pass/fail-recorded checklist; the review itself is explicitly not a penetration test |
| 31 | Public-beta launch gates | Implemented but verification incomplete | High | High | `docs/public-beta/launch-gates.md` — 30 objectively worded gates | Every gate is unchecked; no evidence links attached |
| 32 | Operational-completeness definition | Partially implemented | Medium | Low | Launch gates plus the rollout paragraph in `18-public-beta-handoff.md:28` imply one | No written definition of "operationally complete" separable from "launch-ready" |
| 33 | Environment architecture | Partially implemented | High | High | dev / test / production separation exists; `APP_ENV` distinguishes `local`, `private-lan`, production | Staging absent; `APP_ENV` semantics documented only in an `.env.example` comment; two competing deploy targets |
| 34 | Secure remote administrative access | Insufficient evidence | Low | High | ADR 0011 (no new public ports); `03-access-network-hardening.md` (key auth, LAN-restricted SSH) | `ops/monitoring/README.md:126` states private remote-access provisioning "remain later work"; no VPN/zero-trust admin path evidenced |
| 35 | Standard operating procedures | Partially implemented | Medium | High | Restore, DR, monitoring, logging, backup runbooks | No deployment, rollback, migration, user-administration, or credential-rotation SOP |
| 36 | User-data lifecycle | Implemented but verification incomplete | High | High | `user-account.repository.ts:98-245`; `retention-and-erasure-runbook.md`; ADR 0013 | No correction path (email/username immutable); erasure replay never rehearsed end-to-end |
| 37 | Operational and public statistics page | Partially implemented | High | Low | Grafana dashboards (private); `ops/status/public/` (incident status template) | No public aggregate statistics page and no aggregate-stats endpoint |
| 38 | GitHub linking | Missing | High | Low | — | No repository link in README, app footer, or any legal/support page |
| 39 | Public GitHub readiness | Partially implemented | High | High | No secrets in 899 commits; catalog upstream licensing recorded (`Unlicense`, pinned revision) | `docs/server/**` publishes LAN IPs, host topology, SSH hardening, port policy; no LICENSE; no SECURITY.md |
| 40 | README and public project documentation | Partially implemented | High | Medium | `README.md` covers setup, checks, structure | Describes pre-beta state; names Render as the target; no beta status, limitations, security reporting, screenshots, or license |
| 41 | Documentation separation | Missing | High | Medium | All documentation sits flat under `docs/` | No public / developer / user / private-ops / historical separation; ops-sensitive docs would ship with a public repo |

---

## 4. Detailed findings

### Area 1 — Public-beta scope and release boundaries
**Status: Implemented but verification incomplete · Confidence: Medium · Criticality: High**

The release model is unusually well defined: worldwide-targeted, English-only, 18+, invitation-only, 50 seats, with the truthful public wording specified (`docs/18-public-beta-handoff.md:5`). It is enforced technically at four independent layers — the `REGISTRATION_MODE` environment value, three database runtime switches (`waitlist_open`, `invitations_open`, `campaigns_open`), the `account_cap`, and the `daily_approval_limit`. All three activity switches default to `false` on a fresh migration (`20260805120000000_add_public_beta_foundation.sql:39-41`), which is the correct fail-safe default. Seat accounting correctly counts `ACTIVE`, `DELETION_PENDING`, and `SUSPENDED` accounts plus unexpired invitations (`beta.repository.ts:100-109`).

**Uncertain:** whether production actually has `REGISTRATION_MODE=INVITE_ONLY` and cap 50 / 10-per-day. **Missing:** a data-reset capability. The stop rules say "stop immediately" but there is no defined or implemented path to wipe beta data and restart a cohort — only per-account deletion. **Risk:** if an early cohort produces corrupt data, the only tool is the DR restore path, which is far heavier than a beta reset.

**Next action:** read back the production settings through `GET /api/v1/admin/beta/settings` and record the values as launch-gate evidence; decide explicitly whether a cohort-reset procedure is in scope or accepted as absent.

### Area 2 — Removal of owner-only assumptions
**Status: Partially implemented · Confidence: High · Criticality: Blocker**

The *identity* side is clean. I searched `apps/` for owner emails, hardcoded user IDs, `isOwner`, `OWNER_EMAIL`, and `ADMIN_EMAIL` and found nothing. Admin is a stored `users.role` constrained to `USER`/`ADMIN`, checked server-side on every privileged route, with the web guard secondary. Bootstrap is an audited CLI that refuses unless exactly one non-admin row matches (`promote-admin.mjs:14-25`).

The *environment* side is not clean, and this is the single most important finding in the audit:

```
apps/api/src/shared/env.ts:44-48
const deploymentEnvironment = env.APP_ENV ?? env.NODE_ENV;
const isProductionDeployment = env.NODE_ENV === "production"
  && deploymentEnvironment !== "local"
  && deploymentEnvironment !== "private-lan";
if (!isProductionDeployment) return;
```

Everything below that early return — the HTTPS requirement on `APP_BASE_URL`, the refusal to run with `AUTH_COOKIE_SECURE=false`, the mandatory `BFF_CLIENT_IP_SECRET`, and the mandatory `SUPPORT_EMAIL` — is skipped whenever `APP_ENV=private-lan`. `.env.example:13-14` documents that value as exactly what the existing home-server deployment uses. The identical bypass exists in the web tier at `request-security.ts:31-33`, where it additionally re-adds `http://localhost:3000` and `http://127.0.0.1:3000` to the allowed-origin set.

**Risk:** if the beta launches without changing `APP_ENV`, the app runs externally with none of its production assertions active, and a misconfiguration such as an insecure cookie or a missing BFF secret fails open rather than refusing to boot.

**Next action:** confirm the production `APP_ENV`. If it is `private-lan`, changing it to a production label is a launch blocker; expect the app to refuse to start until `APP_BASE_URL`, `AUTH_COOKIE_SECURE`, `BFF_CLIENT_IP_SECRET`, and `SUPPORT_EMAIL` are all correct — that refusal is the control working.

### Area 3 — Registration and invitation lifecycle
**Status: Implemented but verification incomplete · Confidence: High · Criticality: High**

Well built. Only hashed tokens persist (`beta.service.ts:22-24`; unique partial index on `invitation_token_hash`). Approval takes `forUpdate()` on the settings singleton *and* the request row before counting, so the cap race is closed at the database level, and there is a concurrency integration test. Waitlist intake returns a generic `{received:true}` for every outcome including duplicates and existing accounts (`beta.repository.ts:58-77`), which prevents enumeration. Expiry is enforced both by the `invitation_expires_at > now` filter in the seat count and by the hourly `expireInvitations` sweep.

**Defects found:**
- `issueInvitation` commits the approval transaction and *then* sends mail (`beta.service.ts:22-32`). If Resend fails, the seat is consumed, an audit row exists, the admin sees a 500, and nothing indicates the invitee got nothing. It is recoverable via the `RESEND` action (which correctly does not re-consume a daily approval slot), but only if the operator realises what happened.
- The invitation link carries the raw token *and* the invitee's email as query parameters. Query strings are excluded from the app's own logs, but they will appear in Cloudflare logs, browser history, and any referrer chain.
- No CAPTCHA — explicitly accepted in the security review, mitigated only by the 5-per-hour limit, which is itself only as strong as the client-IP attribution (see Area 10).

**Next action:** wrap the mail send so a failure returns a distinct, actionable error to the admin UI; verify a real expired-token and a real reuse attempt against the deployed stack.

### Area 4 — Authentication and account management
**Status: Partially implemented · Confidence: High · Criticality: Blocker**

Present: signup (with invite consumption), login with 10-attempt/15-minute per-account lockout, logout, email verification and resend, forgot/reset password, current-user, DB-backed opaque sessions with a 30-day TTL, Argon2 hashing, HttpOnly/SameSite=Lax cookies.

**Missing, and normal users will expect these:**
- **Password change while authenticated.** `auth-action.routes.ts` has verify-email, resend, forgot-password, and reset-password — nothing else. The only way to change a password is the emailed reset flow.
- **Email address change.** No endpoint; `users.email` is effectively immutable, which also means the GDPR "correction" right has no self-service path (Area 36).
- **Session listing and per-device or global revocation.** Sessions are only revoked wholesale on deletion request, or by raw SQL.
- **Account suspension.** `SUSPENDED` is a valid `account_status`, is honoured by `login` and `currentUser`, and is counted against the seat cap — but no code path sets it.

**Also found — an enumeration leak.** `auth.service.ts:122-124` checks `accountStatus !== "ACTIVE"` and returns `account_unavailable` (HTTP 403) *before* verifying the password. An unauthenticated attacker can therefore distinguish "username exists and is suspended or pending deletion" from "wrong credentials" without knowing the password. Move that check after password verification.

**Next action:** add authenticated password change and a "sign out everywhere" action before inviting testers; move the account-status check below the password check.

### Area 5 — Authorization and user-data isolation
**Status: Implemented but verification incomplete · Confidence: Medium-High · Criticality: Blocker**

I traced this deliberately, because it is the failure mode that hurts most with real users. The pattern is consistent and correct: `authenticateRequest` resolves the user from the session cookie, and every repository query then constrains by `user_id` or joins back to `workout_sessions.user_id` — `workoutExists`, `sessionExerciseExists`, `findSetByUser`, the export's eleven parallel queries, and the template repository all follow it. Exercise editing checks `existing.createdByUserId !== userId` (`exercise-mutations.ts:60`), so system exercises (`created_by_user_id IS NULL`) are not editable by users.

The one place this pattern usually breaks — bulk reorder, where the loop updates by ID — is correctly protected: `reorderSessionExercises` in the repository does update by `id` alone (`workout-logging.repository.ts:145-152`), but the service validates every submitted ID against the workout's actual membership set first, rejecting on any unknown ID (`workout-logging.service.ts:196-221`). The guard is in the right place, though it is worth noting the repository method is unsafe if ever called from a new path without that check.

**Uncertain:** admin endpoints are role-checked in code, but no test exercises a `USER`-role account hitting `/api/v1/admin/*`. There is exactly one cross-user integration test (workout ownership). **Missing:** a systematic two-account matrix over every user-owned resource.

**Next action:** run a two-account black-box matrix — guessed UUIDs against every `GET`/`PATCH`/`DELETE`, export cross-contamination, and a `USER`-role call to each of the nine admin routes.

### Area 6 — Core workout-data correctness
**Status: Implemented but verification incomplete · Confidence: Medium-High · Criticality: High**

Strong foundations. `workout_sessions_one_open_per_user_idx` makes two concurrent open workouts impossible regardless of client behavior, and the service maps that violation to a clean `conflict`. Position and set-order compaction happen inside transactions. Soft deletes preserve history. Set drafts persist to `localStorage` keyed by user + workout + exercise, so a refresh, a crash, or a killed tab does not lose an in-progress set (`set-draft-storage.ts:39-70`).

**Gaps:**
- **No offline handling at all.** No `navigator.onLine` listener, no request queue, no reconnect retry. React Query is configured with `retry: 1` and `refetchOnWindowFocus: false` (`query-provider.tsx:11-15`). On a weak gym connection a set save fails with a message; the draft survives, but the user must retry manually.
- **`refetchOnWindowFocus: false` is the wrong default for this app.** Phones lock constantly mid-workout. On unlock, nothing refetches, so the UI can show stale session state indefinitely.
- **No idempotency key on set creation.** `saveSet` awaits the mutation, but if the response is lost after the server commits, a retry creates a duplicate set. Rapid double-tap protection depends entirely on UI disabling.
- **Time zones:** all timestamps are `timestamptz` and durations are computed from `Date.now()` deltas, which is correct, but week-boundary handling in weekly volume is not something I verified against a non-UTC client.

**Next action:** enable `refetchOnWindowFocus` (or a visibility-change refetch) for session queries; add a client-generated idempotency key for set creation; field-test on mobile data with airplane-mode toggles.

### Area 7 — User-facing messages and failure states
**Status: Partially implemented · Confidence: Medium · Criticality: Medium**

The error envelope is uniform and the rate-limit message usefully includes the retry window. Destructive actions route through a shared `ConfirmDialog` with a `DESTRUCTIVE_ACTION` label. Auth errors are appropriately generic.

**Problems:** several machine codes reach users as-is — `BFF_REQUIRED` ("Requests must use the public web application."), `UNTRUSTED_HOST`, `WEB_SECURITY_MISCONFIGURED` ("The application security configuration is unavailable."), `API_UNAVAILABLE`, and the `PUBLICATION_BLOCKED:` banner on legal pages. The last is deliberately operator-facing but is rendered to *every visitor*. There is no maintenance state and no offline banner. The house style (`DESTRUCTIVE_ACTION`, `DATA_TRANSPARENCY`, `label-caps`) is a deliberate aesthetic, but it means genuine failures are hard to distinguish from decoration.

**Next action:** audit every user-reachable error string for a plain-English rewrite; hide the `PUBLICATION_BLOCKED` banner from end users and fail the build or startup instead (see Area 11).

### Area 8 — Mobile and browser reliability
**Status: Partially implemented · Confidence: Medium · Criticality: High**

Real evidence exists and is unusually specific: a full black-box workout on a Samsung S22 Plus over Firefox and mobile data, producing 20 concrete observations, each mapped to a remediation with automated evidence (`private-beta-1-report.md`, `private-beta-1-remediation.md`). Several findings — first stepper tap being consumed by keyboard dismissal, picker autofocus removal, bounded muscle overlays, fixed bottom navigation — are precisely the mobile issues that only surface on a real device. Playwright covers Chromium and Firefox at desktop sizes.

**But:** the remediation document explicitly states that every "device retest" row remains open, and lists four categories of verification still required. And the cited baseline commit is not in this repository, so I cannot determine how much has changed since that test. Meanwhile there is no handling for suspended tabs, no reconnect logic, and `refetchOnWindowFocus` is off.

**Distinguish clearly:** verified = one black-box mobile run at an unidentifiable commit. Assumed = everything since, including the entire uncommitted public-beta UI surface.

**Next action:** repeat the exact S22 Plus / Firefox / mobile-data run against the actual release candidate and record the commit SHA that exists in this repository.

### Area 9 — Accessibility and usability
**Status: Partially implemented · Confidence: Medium · Criticality: Medium**

Better than typical. `prefers-reduced-motion` is honoured in four independent places including the 3D avatar and chart zoom. `ConfirmDialog` uses `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`, Escape-to-close, and body scroll locking. Semantic landmarks (`<main>`, `<section>`, `<nav>`, `<article>`) are used in the legal pages. An `info-popover` component exists for contextual help.

**Gaps:** the dialog has **no focus trap and does not move focus on open** — keyboard and screen-reader users can tab into the page behind the modal. No automated accessibility check exists in CI. Touch-target sizes, contrast ratios, and 200% text scaling are unverified. Screen-reader behavior on the 3D volume figure is unaddressed.

**Next action:** add focus capture/restore to `ConfirmDialog`; run one axe pass over the main flows; confirm 44 px minimum touch targets on the set composer, which is used with sweaty hands mid-set.

### Area 10 — Security hardening
**Status: Partially implemented · Confidence: High · Criticality: Blocker**

Genuinely good: Zod validation at every boundary; Argon2; hashed opaque sessions; a 1 MB body limit explicitly justified as a decompression-bomb guard; `@fastify/helmet`; global 300/min plus 10-per-15-min on all credential routes, 5/hour on the waitlist, 3/hour on export and deletion; no CORS credentials opt-in; a host allowlist plus Origin plus `Sec-Fetch-Site` check on state-changing BFF requests; `X-Frame-Options: DENY` and `frame-ancestors 'none'`; conditional HSTS; a redacting logger; and an HMAC-signed client-IP channel with `timingSafeEqual`.

**Specific weaknesses:**

1. **Browser-controlled rate-limit key (highest severity).** `readTrustedEdgeIp` reads, in order, `cf-connecting-ip`, then the *last* entry of `x-forwarded-for`, then `x-real-ip` — from the incoming request, with no proof of origin (`bff-client-attribution.ts:18-24`). The BFF then HMAC-signs whatever it found, and the API accepts it as authoritative for rate limiting. Unless Caddy or the Tunnel strips or overwrites `cf-connecting-ip` on ingress, any client can rotate that header per request and defeat every per-IP limit — including credential brute-force and waitlist-flood protection. The signature proves the *BFF* vouched for the value; it does not prove the value is real. The project's own security review lists "review the final edge's canonical client-IP header" as outstanding, so this is a known-unknown — but the code as written is trust-by-default, not deny-by-default.
2. **Weak web CSP.** `Content-Security-Policy: base-uri 'self'; form-action 'self'; frame-ancestors 'none'` (`request-security.ts:121`) has no `default-src`, `script-src`, or `connect-src`, so it provides no XSS mitigation. The security review acknowledges this ("reconsider a fuller CSP after measuring Next production requirements").
3. **Container hardening.** The `api` and `web` images derive from a `base` stage carrying `g++`, `make`, and `python3`, with **no `USER` directive** — both run as root with a compiler toolchain. Dev dependencies are never pruned. `cadvisor` runs `privileged: true`. By contrast, `alertmanager` is exemplary (`user: 65534`, `read_only`, `cap_drop: ALL`, `no-new-privileges`).
4. **Metrics and health bypass the BFF guard.** `server.ts:107` exempts `/api/v1/health` and `/api/v1/metrics` from the `BFF_REQUIRED` check. If the API hostname ever becomes publicly reachable with `METRICS_ENABLED=true`, Prometheus metrics are public.
5. **No dependency scanning.** CI has no `pnpm audit`, no Dependabot, no SAST. I could not run an audit offline.
6. **No resource limits** on any application container in `compose.yaml`.

**Next action:** verify what the edge does with `cf-connecting-ip` and make the BFF reject browser-supplied values (accept only a header the edge is known to overwrite, ideally on a private ingress path); add `USER node`, a production prune, and memory limits; add dependency scanning to CI.

### Area 11 — Privacy and legal implementation
**Status: Partially implemented · Confidence: High · Criticality: Blocker**

The technical machinery is well ahead of the legal substance, which is the correct order. Implemented: versioned policies (`PUBLIC_TERMS_VERSION`/`PUBLIC_PRIVACY_VERSION` = `2026-08-05-beta-1`), consent capture at both waitlist and signup with `policy_accepted_at` and `adult_attested_at` persisted, per-user privacy preferences with analytics defaulting off, password-confirmed JSON export, seven-day-grace erasure, typed retention cutoffs (90/180/30 days), backup-aging policy, shared-exercise anonymization, and a DPIA screening plus a data-processing inventory.

**A concrete defect that will bite on launch day.** `legalContacts()` reads `process.env.NEXT_PUBLIC_*` inside server components (`legal-page.tsx:9-18`) that use no dynamic API. There is no `export const dynamic`, no `revalidate`, and no `next.config` override — so Next.js will **statically prerender `/privacy`, `/terms`, `/cookies`, and `/support` at build time**. The Dockerfile passes no build args, so at build time those variables are unset. The result: the published pages will permanently show `[controller configuration required]` and the red `PUBLICATION_BLOCKED` banner, no matter what `compose.yaml:89-94` sets at runtime. The same applies to `NEXT_PUBLIC_SUPPORT_URL` in the client-side `help-support-panel.tsx:6`.

**Remaining non-technical blockers**, correctly identified by the project: no real controller name/address, no dedicated privacy/security/support mailboxes, no completed DPIA, no qualified legal review of the worldwide target, and processors named only as categories.

**Next action:** add `export const dynamic = "force-dynamic"` to the legal routes (or pass the values as build args) and verify the rendered production HTML — this is a launch gate, not a nicety.

### Area 12 — Transactional email
**Status: Partially implemented · Confidence: High · Criticality: Blocker**

The transport is clean: Resend HTTP API, 10-second `AbortSignal.timeout`, branded HTML with a correctly escaped plain-text fallback, optional reply-to, and a log-only transport locally that prints action links. Production without a key logs a warning and silently drops mail rather than crashing — defensible, but it means a missing key produces no user-visible signal.

**Gaps, all of which matter because email is the *only* channel for invitations, verification, password reset, and deletion cancellation:**
- **No retry.** A single failed HTTP call is final.
- **No delivery record.** Nothing persists that a message was attempted, so "did the invite go out?" is unanswerable after the fact.
- **No bounce or complaint handling**, and no suppression list.
- **A cleanup-loop defect:** `cleanup()` iterates due deletions and awaits `mailer.send` inside the loop with no `try/catch` (`user-account.service.ts:76-88`). One failing address aborts the whole pass, so every subsequent due deletion is skipped — and will be skipped again on every subsequent hourly run while that address keeps failing. `cleanupRetention` never runs either.
- **SPF/DKIM/DMARC** are unverifiable from the repository.
- **Dev/prod separation** rests solely on `RESEND_API_KEY` presence; nothing prevents a development instance from sending real mail if the key leaks into a dev `.env`.

**Next action:** wrap each per-user send in the cleanup loop in `try/catch` and continue; add one retry with backoff; verify SPF/DKIM/DMARC and assign a bounce-monitoring owner before the first invite.

### Area 13 — Database production readiness
**Status: Implemented but verification incomplete · Confidence: High · Criticality: High**

Schema quality is high: 9 unique indexes including case-insensitive email/username uniqueness and the partial one-open-workout index; check constraints enforcing role, account status, non-negative counters, and a deletion state machine that makes an inconsistent `DELETION_PENDING` row impossible; foreign keys with deliberate `ON DELETE SET NULL` on `exercises.created_by_user_id` so shared exercises survive creator erasure; every migration has a hand-written Down section; multi-step writes are transactional with `forUpdate()` where races matter.

**Gaps:** CI runs `migrate:up` but never `migrate:down`, so reversibility is asserted rather than tested. The connection pool is constructed with only a connection string and `application_name` (`database.ts:276-285`) — default `max: 10`, no `statement_timeout`, no `connectionTimeoutMillis`, no idle timeout, so one pathological query can hold a connection indefinitely. There is no automated backup-before-migration step; the Compose `migrate` service runs unconditionally before the API starts.

**Next action:** add an up/down/up cycle to CI; set `statement_timeout`, a connection timeout, and an explicit pool max; make a verified backup a precondition of production migration.

### Area 14 — Backups and disaster recovery
**Status: Implemented but verification incomplete · Confidence: Medium-High · Criticality: Blocker**

The strongest area in the project. `backup-restic.sh` uses `flock` for mutual exclusion, an `EXIT` trap that records a failure metric on any non-completion, a controlled staging tree, and a validated dump path with a manifest. `restore-test-postgres.sh` restores into an isolated container, then **hash-compares row counts against production** and checks for unvalidated foreign keys and the migration ledger. `export-erasure-ledger.sh` writes the tombstone ledger before staging so a restore cannot resurrect erased users. `replay-erasure-ledger.sh` applies the ledger transactionally with `ON_ERROR_STOP=1`. Four systemd timers cover backup and weekly maintenance, alerts fire at 30 h and 48 h staleness, and `disaster-recovery.md` gives an RPO of 24 h, an RTO of 4 h, a decision tree, and an explicit rule against reopening a restored database before erasure replay.

**Gaps:** the only off-site destination is the owner's MacBook, which the runbook itself acknowledges "is not always awake" and is "encrypted but not immutable". The strict 30-day retention from ADR 0013 supersedes ADR 0010's tiered scheme but has not been evidenced running. The spare Mac mini has never been configured or tested as a recovery host. The full drill that matters most — restore an *old* snapshot, obtain the *newest* ledger independently, replay, prove absence — is a launch gate that has not been run.

**On the NAS:** treat it exactly as the brief states — an additional local layer that improves RTO, never a substitute for the encrypted off-site copy. Adding it should not change retention or the replay ordering rule.

**Next action:** run the old-snapshot + latest-ledger drill end to end and record snapshot IDs, hashes, and operator; confirm the 30-day prune has actually executed.

### Area 15 — Monitoring, logging, and observability
**Status: Implemented but verification incomplete · Confidence: Medium-High · Criticality: High**

Comprehensive for the host: Prometheus with 15 s scrape, Node Exporter, cAdvisor, PostgreSQL Exporter, and provisioned Grafana with three dashboards on an `internal: true` network with Grafana bound loopback-only. Application instrumentation uses bounded labels (fixed method set, normalized routes, an `unmatched` bucket) so cardinality cannot explode, plus release and environment identity. Logging is Pino with redaction of cookies, authorization headers, tokens, emails, and bodies; request IDs propagate from the BFF into the API and back out via `x-request-id`; the BFF normalizes IDs out of paths and drops query strings.

**The structural gap:** every component of the monitoring stack runs on the machine it monitors. A host power loss, kernel panic, disk failure, network outage, or Cloudflare Tunnel failure produces **no alert at all** — Alertmanager is down too. For a home-server deployment this is the single most likely outage class. There is no external uptime probe; `ops/monitoring/README.md:126` acknowledges public uptime monitoring as later work.

**Also missing:** metrics for the flows that actually matter to a beta — signup attempts and failures, invitation issuance and consumption, email send outcomes, cleanup-job success, and erasure-ledger export. Log rotation and retention are handled by scripts in `ops/logging/` but the retention period is not evidenced.

**Next action:** add one external uptime check against `https://app.gymtrack.ch` from outside the house with independent alerting — this is cheap and closes the largest observability hole.

### Area 16 — Alerting
**Status: Implemented but verification incomplete · Confidence: Medium-High · Criticality: High**

24 rules across availability, host capacity, containers, application, PostgreSQL, and backups. Thresholds are sensible and mostly duration-qualified (2 m for target-down, 15 m for capacity, 10 m for latency), warning and critical are separated with a matching inhibit rule so a critical suppresses same-component warnings, and the latency alert is correctly gated on a minimum request volume so it cannot fire on noise. Every rule carries a `first_action` annotation naming the exact script to run — this is materially better than most production alerting I see. Telegram credentials are file-backed Docker secrets on a dedicated egress network. The Stage 10 report claims both a synthetic rule and a real `GymTrackerNodeExporterDown` firing and resolving were confirmed.

**Gaps:** the host-local blind spot from Area 15 applies fully. Nothing alerts on application-lifecycle failures — the hourly cleanup failing, mail delivery failing, or the erasure-ledger export failing all only appear as log lines. No alert covers certificate or tunnel state. Alert delivery was verified in July; it has not been re-verified since.

**Next action:** add alerts for cleanup-job and email-delivery failure (both already log, so a counter is a small change); re-run one delivery test as part of the launch gate.

### Area 17 — Incident response
**Status: Partially implemented · Confidence: Medium · Criticality: High**

What exists is good: a DR decision tree branching by failure class with explicit "do not restore the database to fix an application process" guidance, rollout stop rules naming six specific stop conditions and requiring documented cause plus owner approval to resume, a static status-page template with a hardened CSP intended for independent hosting, and a clear statement that the owner is incident lead and credential custodian.

**Missing:** no maintenance mode (nothing can put the app into a user-visible "we're down" state — the closest is `REGISTRATION_MODE=DISABLED`, which only stops signups); no user-communication templates; no post-incident review process; no compromised-credential procedure; no abusive-user procedure, which is unactionable anyway without suspension tooling (Area 23); and `status.gymtrack.ch` is not deployed.

**Next action:** decide and document what "maintenance mode" means operationally (even if it is just Caddy serving a static page), and write two short templates — service-degradation notice and post-incident note.

### Area 18 — Deployment, migration, release, and rollback safety
**Status: Partially implemented · Confidence: Medium-High · Criticality: Blocker**

CI is solid: whitespace, foundation-doc presence, scaffolding guard, then `pnpm check` (type-check, lint, test, build), performance regression tests, a real PostgreSQL integration job that runs migrations, and a Playwright smoke job that builds and runs the whole Compose stack across Chromium and Firefox. The Compose `migrate` service gates the API on `service_completed_successfully`.

**Gaps:**
- **The production deployment definition is not in Git.** No Caddyfile, no Cloudflare Tunnel config, no production Compose overlay — the alert rules' reference to a `proxy` service that `compose.yaml` does not define proves the running stack differs from the repository. These files are backed up but not version-controlled, so there is no diff, no review, and no history.
- **No release identity in practice.** `APP_RELEASE` defaults to `"unknown"` (`env.ts:13`); nothing in the repository sets it to a deployed SHA.
- **No backup-before-migration** automation.
- **No production smoke test** after deploy.
- **Rollback is documented but unrehearsed**, and rolling back across the public-beta migration would be destructive (its Down section drops `beta_settings`, `beta_access_requests`, `campaigns`, `message_deliveries`, and 18 `users` columns).
- **Two competing deployment definitions** — `render.yaml` is actively maintained (updated 2026-08-05 with `INVITE_ONLY` and all the `NEXT_PUBLIC_*` keys) while ADR 0009 names the home server as the active target.
- **CI never runs on the current work**, because it triggers on push/PR to `main` and the entire public-beta web surface is uncommitted.

**Next action:** commit the production Compose/Caddy/Tunnel definitions (with secrets externalized); wire `APP_RELEASE` to the deployed SHA; make a verified backup a hard precondition of migration; rehearse one rollback.

### Area 19 — Staging and pre-production
**Status: Missing · Confidence: High · Criticality: Blocker**

There is no staging environment. No second domain, no second database, no separate credentials, no separate cookie scope, no email sandbox, no separate secrets, and no separate Cloudflare configuration. `render.yaml:1-2` sets `previews: generation: manual`, which is the closest thing and is unused.

Consequences: migrations are validated against ephemeral CI databases and then run against the only database holding real user data. Release verification against a production-like edge (Cloudflare + Caddy + Tunnel + real cookies + real HTTPS) is impossible, which is precisely where the `APP_ENV`, CSP, `cf-connecting-ip`, and static-prerender issues in this report would surface.

**Next action:** stand up a minimal staging — a second Compose project on the same host, a separate database, its own hostname behind Cloudflare Access, `REGISTRATION_MODE=ENABLED`, and no Resend key (log transport). That is proportionate and would have caught several findings here.

### Area 20 — Performance and capacity
**Status: Partially implemented · Confidence: Medium · Criticality: High**

Pagination is real (limit 1–100, default 20, offset-based) and analytics queries go through purpose-built repositories. Indexes exist on the query paths that matter. CI enforces pure-function performance ceilings, and the README is admirably honest that these "are not browser page-load targets or a substitute for real-user monitoring."

**Gaps:** the web bundle carries `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, and `recharts` — a heavy payload for a mobile-first app used on gym Wi-Fi, and its size and mid-range-device GPU behavior are unmeasured. No load test exists; the launch gate calls for 20 concurrent loggers and 2× measured peak, but there is no measured peak. No container has CPU or memory limits, so one runaway process can take the host down (and `GymTrackerHostOomKill` would then be the notification). The DB pool defaults to 10 connections with no timeouts. Disk-growth projection for Prometheus plus PostgreSQL plus backups is documented only as an alert threshold, not a forecast.

**Next action:** measure the mobile bundle and first-load on a real mid-range device over mobile data; set container memory limits; define the capacity assumption explicitly (e.g. "50 accounts, ≤10 concurrent loggers, ≤2 workouts/user/day").

### Area 21 — Home-server resilience
**Status: Implemented but verification incomplete · Confidence: Low-Medium · Criticality: High**

Documented and partly automated: `restart: unless-stopped` on every service, systemd units and timers for backup and maintenance, a dedicated `gym-tracker-stage11-post-reboot.service` and check script, and a Stage 10 report claiming host-reboot verification passed. T2-kernel constraints are documented in the Wave A host-baseline material.

**Unverified or missing:** no UPS (a Swiss home power blip mid-write is a real risk with no battery); the spare Mac mini is explicitly untested as a recovery host; Cloudflare Tunnel reconnection after a network or power event is not evidenced; disk SMART monitoring, cooling, and thermal behavior are not covered by any alert rule; the OS/T2-kernel update procedure and cadence are not defined; and physical/remote recovery when the tunnel is down depends on the unresolved remote-access question in Area 34.

**Next action:** add a UPS (highest value per franc for this deployment class); prove one full power-cycle recovery to a working external URL, timed against the 4 h RTO.

### Area 22 — Third-party dependency management
**Status: Partially implemented · Confidence: Medium · Criticality: Medium**

`docs/public-beta/data-processing-inventory.md` enumerates processors from a data-protection angle, and `launch-gates.md` requires every processor/region/transfer/retention to be recorded. Operational dependencies visible in the repository: domain registrar for `gymtrack.ch` (unnamed), DNS and edge via Cloudflare (Access, Tunnel), Resend for email, Telegram for alerts, GitHub for source and CI, npm/pnpm registry plus Docker Hub/ghcr/quay for images, the owner's MacBook as backup destination, and the Free Exercise DB catalog (Unlicense, pinned revision `b0eed06`) as an external asset.

**Missing:** a single register recording, per dependency, the account owner, credentials location, MFA state, quota/plan, billing and renewal date, blast radius if it fails, and what data it processes. Outage impact is nowhere modelled — for example, a Cloudflare Tunnel outage takes the whole service offline with no fallback path, and a Resend outage silently breaks every invitation and password reset.

**Next action:** write the register once, in one table, and keep it private.

### Area 23 — Administrative and operational tooling
**Status: Partially implemented · Confidence: High · Criticality: Blocker**

Implemented: list waitlist requests (500 most recent), list users with status and cohort, read and update the five runtime settings, approve/resend/block/return-to-waitlist, create and pause/end campaigns, and cancel a pending deletion on a user's behalf — all `ADMIN`-gated server-side and audited into `admin_audit_events`, with a web admin screen at `/admin`.

**Missing, and these are the ones incidents need:**
- **Suspend an account.** No endpoint. `SUSPENDED` exists in the schema and is honoured by login, but only raw SQL can set it.
- **Revoke another user's sessions.** Only raw SQL (`13-operator-guide.md:118-119`).
- **Manually verify an email** or **unlock a locked account.** Raw SQL (`13-operator-guide.md:110-116`).
- **Inspect failed registrations.** Nothing surfaces invalid-invitation attempts.
- **Service health view.** Grafana is loopback-only; there is no consolidated operator health page.

**So: yes, direct database editing is currently required** for account suspension, session revocation, manual verification, and unlocking. For a beta with external users, "the only way to stop an abusive account is to SSH in and write UPDATE statements" is not an acceptable steady state.

**Next action:** add two admin endpoints — suspend/unsuspend (with audit) and revoke-all-sessions-for-user. Both are small given the existing `requireAdmin` helper and audit table.

### Area 24 — Beta-user onboarding
**Status: Implemented but verification incomplete · Confidence: Medium · Criticality: Medium**

Present: a `/beta` page with the waitlist form, `/help`, a synced onboarding overlay and checklist persisted server-side (`onboarding_version`, `onboarding_steps` merged with a jsonb `||` so client and server states converge), a repeatable tour, a non-persistent practice workout, contextual info popovers, and `/support` with account-deletion and export instructions reachable from Settings.

**Uncertain:** the whole first-run experience is uncommitted and untested on a device. **Missing:** a stated supported-device/browser matrix visible to testers, an explicit list of known limitations in-product (it exists in the handoff doc, not in the app), and any feedback prompt at the moment it matters (after a first completed workout) — the campaign system could do this but no campaign is defined.

**Next action:** walk the entire first-run path on a phone as a brand-new invited user, from the invite email to a completed first workout.

### Area 25 — Feedback, support, and bug reporting
**Status: Partially implemented · Confidence: Medium · Criticality: Medium**

Channels: `/support` with support, privacy, and security addresses; an in-app campaign inbox supporting acknowledgement, rating, single-choice, and free-text responses with a 1,000-character server-validated cap, plain text only, HTTPS-only action URLs, opt-out, and active-workout suppression — a thoughtful design that avoids interrupting a set. `client-diagnostics.ts` exists but is gated behind `NEXT_PUBLIC_CLIENT_DIAGNOSTICS=1`.

**Missing:** a structured bug-report path that captures release, browser, device, viewport, and the `x-request-id` of the failing call — all of which the system already produces but never collects together. No screenshot handling, no severity classification, no ticket tracking, and no defined "we fixed your issue" communication path (campaigns could serve this).

**Next action:** add a "report a problem" action that pre-fills release + device + last request ID into a mailto or an in-app form; without it, beta reports will be "it didn't work" with no correlation handle.

### Area 26 — Beta analytics and success metrics
**Status: Partially implemented · Confidence: High · Criticality: Medium**

Existing: a first-party `EventTracker` writing `app_events` server-side with no client ingest endpoint and no third-party tracker — privacy-conscious and non-blocking by construction (fire-and-forget with a `.catch` that only warns, `events.ts:19-33`). Events tracked include `user_signed_up`, `user_logged_in`, `email_verified`, `password_reset_completed`. Durable counters `login_count` and `completed_workout_count` live on `users`. Infrastructure metrics are rich.

**The structural problem:** `analytics_enabled` defaults to **false** (`20260805120000000:11`) and the tracker returns early for any user who has not opted in. So registrations, verification, first workouts, repeat usage, and active users will be measurable only for the subset who opt in — which for a 50-person beta is likely to be a handful. The privacy posture is correct; the measurement consequence appears unacknowledged. Note that the `users` counters are *not* consent-gated and give a usable non-event-based signal.

**Missing:** workout-failure and application-error rates as product metrics (5xx is monitored, but a failed set save that returns 4xx is not), support burden, and device distribution. No dashboard for product metrics.

**Next action:** decide explicitly which beta metrics come from consent-free aggregates (account counts, workout counts, the `users` counters) versus opt-in events, and build the handful of aggregate queries you actually need — this also feeds Area 37.

### Area 27 — Documentation
**Status: Partially implemented · Confidence: High · Criticality: Medium**

Volume is large: ~36 directories under `docs/`, 13 ADRs, 11 Wave A–C stage reports averaging ~20 KB each, four usability audits, two design-iteration sets with screenshots, and the public-beta set.

Classification:
- **Current and authoritative:** `docs/public-beta/*` (all five), ADRs 0009–0013, `docs/18-public-beta-handoff.md`, `docs/server/disaster-recovery.md`, `ops/*/README.md`, `ENGINEERING.md`, `ARCHITECTURE.md`.
- **Useful but outdated:** `README.md` (pre-beta, names Render), `AGENTS.md` (describes "first implementation foundation"), `docs/deployment-runbook.md` (Render-centric), `docs/13-operator-guide.md` (no public-beta admin coverage), usability audits v1–v3.
- **Duplicate / superseded:** `docs/99-current-project-state.md` — actively misleading; describes the Render target and omits the entire public beta. ADR 0005 (Render) versus ADR 0009 (home server). ADR 0010 partially superseded by 0013.
- **Speculative:** `docs/design/stitch-redesign-v1` and `v2`, `docs/UI_Redesign`.
- **Implementation history:** `docs/server/reports/*` (11), `docs/status/*`, `docs/beta-process/private-beta-1/*`.
- **Operationally sensitive — must stay private:** all of `docs/server/**` (LAN addresses `192.168.1.57`/`192.168.86.178`, SSH policy and port decisions, firewall rules, filesystem layout, monitoring credentials procedure), `docs/status/production-readiness/*`, `docs/13-operator-guide.md`.
- **Safe for public release after edit:** `README.md`, `ARCHITECTURE.md`, `ENGINEERING.md`, `CONTRIBUTING.md`, ADRs 0001–0008 and 0012–0013 (0009/0011 need redaction).

**Can this set realistically be used to operate the system?** Partly. The runbooks are genuinely operational. But there is no index, no authority ranking, and at least one document (`99-current-project-state.md`) that a newcomer would read first and be actively misled by. Three empty placeholder directories (`docs/beta-process/private-beta-2`, `public-beta-1`, `public-production-1`) add noise.

**Next action:** delete or clearly mark `99-current-project-state.md`; add a one-page `docs/README.md` index with an authority ranking.

### Area 28 — Recurring maintenance
**Status: Partially implemented · Confidence: Medium · Criticality: Medium**

Automated: four-daily backups and weekly backup maintenance with 10% repository verification, both as systemd timers; hourly in-process cleanup of expired auth records, invitations, deletions, and retention windows.

**No defined procedure or schedule for:** reviewing alerts (who looks, how often), dependency updates (no Dependabot, no `pnpm audit` in CI), OS and T2-kernel updates, container image updates (images are version-pinned, which is good, but nothing drives bumping them), PostgreSQL maintenance beyond autovacuum defaults, disk-growth review, credential review, periodic restore tests (the script exists; the cadence does not), secret rotation (`BFF_CLIENT_IP_SECRET`, Resend key, Telegram token, Grafana password, Restic password), domain renewal, provider quota review, or unresolved-incident tracking.

**Next action:** write one short recurring-maintenance table (weekly / monthly / quarterly) and put the quarterly restore test and the domain renewal date in a calendar with reminders.

### Area 29 — Account ownership, billing, renewals, and recovery
**Status: Insufficient evidence · Confidence: Low · Criticality: High**

The repository contains almost nothing here — by design, since this is credential territory. The only signal is `disaster-recovery.md:38-48`, which lists what recovery requires (MacBook access, Restic password from a protected copy or password manager, admin access to a replacement host, the production SSH/deploy key) and correctly warns "Do not store the Restic password only inside the repository it decrypts."

**Unknown and materially risky for a single-operator service:** who owns the `gymtrack.ch` registration and when it expires; whether registrar, Cloudflare, Resend, GitHub, and Telegram accounts have MFA with stored backup codes; whether recovery email addresses point at an account that is itself recoverable; whether any subscription can lapse on an expired card; whether project accounts are separated from personal ones; and what happens if the primary device or primary email account is lost — which would plausibly lock the operator out of the domain, the edge, email delivery, and the alert channel simultaneously.

**Next action:** produce a private account register (owner, MFA, backup-code location, recovery email, renewal date, payment method expiry) and store the backup codes somewhere that survives losing the phone. Domain expiry with auto-renew off is the classic way a service of this shape dies.

### Area 30 — Formal pre-launch security and privacy test
**Status: Partially implemented · Confidence: High · Criticality: High**

`docs/public-beta/security-review.md` is a genuinely good artifact: 17 threat rows, each naming the implemented boundary with code evidence and the specific remaining launch evidence, and a conclusion that correctly states the system is not approved for public traffic. `launch-gates.md` lists the required tests.

**But there is no repeatable test *suite* or checklist artifact.** The review is a point-in-time narrative dated 2026-08-05; nothing re-runs it, nothing records pass/fail per item, and it is explicitly "not a penetration test or deployed-infrastructure attestation." The specific coverage the brief asks about — token reuse, rate limits, exports, account deletion, monitoring protection, secret leakage, log redaction, public network exposure — is described as intended, not evidenced as executed.

**Next action:** turn `launch-gates.md` into a checklist file with a result, date, and evidence link per line, and run it once end to end. Several items (cross-user isolation, invite reuse, token expiry) can become automated integration tests rather than manual steps.

### Area 31 — Public-beta launch gates
**Status: Implemented but verification incomplete · Confidence: High · Criticality: High**

The gate document already exists and is better than what I would otherwise recommend: 30 gates across external/legal, production systems, data lifecycle and recovery, and security/quality/capacity, most objectively verifiable, plus concrete rollout stop rules (start with 10, observe 72 hours, never more than 10 per rolling 24 hours).

**Every gate is unchecked**, and no evidence is linked. Two gaps in the gate list itself, given this audit: nothing covers the `APP_ENV` production-assertion bypass, and nothing covers verifying the *rendered* legal pages in production HTML (the gate says "final rendered … pages match production behavior", which would catch it only if read strictly).

My recommended condensed set is in Section 9.

### Area 32 — Operational-completeness definition
**Status: Partially implemented · Confidence: Medium · Criticality: Low**

`launch-gates.md` plus the rollout paragraph in `18-public-beta-handoff.md:28` define *launch*-ready thoroughly. Neither defines *operationally complete* — the steady state where the service can be run and maintained sustainably by one person while development continues. There is no statement of what routine operation costs in time per week, what is automated versus manual, or what conditions would mean the beta has succeeded and should end.

**Next action:** write half a page. Suggested shape: alerts are actionable and rare; backups verified on a schedule with a tested restore; every routine operator action available without raw SQL; a defined recurring-maintenance cadence; documentation trustworthy enough that a six-month gap is recoverable; and a written trigger for ending the beta.

### Area 33 — Environment architecture
**Status: Partially implemented · Confidence: High · Criticality: High**

Development (Compose or `dev:api`/`dev:web`), automated test (CI-provisioned PostgreSQL plus ephemeral Compose for Playwright), and production (the home server) exist and are separated. Operations is correctly treated as tooling — `ops/` holds scripts and configuration, not a separate environment, which matches the brief's preference.

**Weaknesses:** staging is absent (Area 19). The `APP_ENV` value space (`local`, `private-lan`, production label) carries real security semantics but is documented only in a comment in `.env.example` — it appears in no ADR and in no architecture document, despite being the switch that enables or disables every production assertion. Two deployment definitions coexist (`render.yaml` and the home server) with no statement of which is authoritative in the README. Production database naming diverges from the repository default (`gym_tracker` in `ops/backup/scripts/*` versus `gym_progress_tracker` in `compose.yaml`), which is fine but undocumented and will surprise someone under pressure.

**Next action:** document the environment model and the `APP_ENV` contract in one place, and state which deployment target is authoritative.

### Area 34 — Secure remote administrative access
**Status: Insufficient evidence · Confidence: Low · Criticality: High**

From the repository: ADR 0011 commits to "no new public application, database, or monitoring ports"; the Wave A hardening document describes SSH key authentication restricted to two LAN ranges on port 22 with the application entry point bound to a single Ethernet address; Cloudflare Access plus Tunnel front the application (not SSH); Grafana is loopback-only. `ops/monitoring/README.md:126` states that "private remote-access provisioning remain later work."

So the current model appears to be: **application access is remote and zero-trust; administrative access is LAN-only.** That is safe, and it means the operator cannot administer the server away from home — including during an incident, which is exactly when it is needed. Whether a VPN or Cloudflare Tunnel SSH path has since been configured is not observable from the repository.

Recommended shape, proportionate to the deployment: Cloudflare Tunnel with an SSH application behind Access (reusing the existing Cloudflare relationship, no new open ports), enforcing MFA on the identity provider, with key-only authentication on the host, Access logs retained, a documented revocation step, and a written emergency fallback for when Cloudflare itself is unavailable — which is where the untested spare hardware and physical access become the real recovery path.

**Next action:** decide and document the remote-admin model, then test it from outside the home network before the beta opens.

### Area 35 — Standard operating procedures
**Status: Partially implemented · Confidence: Medium · Criticality: High**

Exist and are good: PostgreSQL restore, full-service restore, disaster recovery, backup operation and maintenance, monitoring and Grafana operation, logging and alerting, retention and erasure, and a post-reboot check.

**Missing:** deployment (the actual steps to ship a release to `gym-prod`), rollback, migration execution in production, planned maintenance with user notice, user administration (suspend, unlock, verify, revoke), update procedures (OS, containers, dependencies), incident handling beyond DR, and credential rotation. Notably, deployment — the most frequent operation — has no runbook for the active target; `docs/deployment-runbook.md` is Render-oriented.

**Next action:** write the deployment and rollback SOPs first. They are the ones you will need at 22:00 on a weeknight.

### Area 36 — User-data lifecycle
**Status: Implemented but verification incomplete · Confidence: High · Criticality: High**

The most complete lifecycle implementation in the project. Collection is minimal (email, username, password hash, workout data) with consent versions and adult attestation captured. Validation is Zod at every boundary. Storage uses typed columns with check constraints. Access is scoped per user. Export is password-confirmed and covers eleven data categories with an explicit note that device-local data is not included (`user-account.repository.ts:128-142`) — an honest touch. Deletion locks immediately, revokes sessions, waits seven days with a single-use hashed cancellation token, then hard-deletes in one transaction with a row lock, nulls creator identity on referenced shared exercises, removes unreferenced ones, and writes a 30-day tombstone. Retention cutoffs are typed and automated. Backup retention is capped at 30 days with an erasure-replay rule that prevents a restore from resurrecting deleted accounts.

**Gaps:** **correction has no path** — there is no way to change an email address or username, so a user who mistypes their email at signup is stuck (and, on an invite-bound signup, may be locked out entirely). Repair procedures for corrupted user data are undefined. Anonymization applies only to shared exercises. And none of the deletion, export, or replay flows has been exercised against production.

**Next action:** add email correction (with re-verification) or, at minimum, document the operator procedure; run one full export → deletion → grace → finalize → verify-absence cycle on staging.

### Area 37 — Operational and public statistics page
**Status: Partially implemented · Confidence: High · Criticality: Low**

**Private operational dashboard:** effectively exists — three provisioned Grafana dashboards (service overview, host/containers, PostgreSQL) with a 10 KB usage guide. Gap: loopback-only, so it requires SSH port-forwarding, and it shows infrastructure rather than product state.

**Public portfolio statistics page:** not implemented. `ops/status/public/` is an incident status template, not statistics, and is itself unpublished. No aggregate-statistics endpoint exists.

**Feasibility is high.** The counts you named are all cheap aggregates over existing tables — registered users (`users`), workouts logged (`workout_sessions` where `ended_at IS NOT NULL`), exercises and sets logged (`session_exercises`, `sets`), total workout time (sum of `ended_at - started_at`), and current release (`APP_RELEASE`). Uptime would come from Prometheus. All are consent-free aggregates, which sidesteps the opt-in analytics limitation in Area 26.

**Design constraints:** serve rounded/bucketed values from a cached endpoint (recomputed every few minutes, not per request), never expose per-user or per-day granularity that could deanonymize a 50-person cohort, apply a minimum-threshold rule (suppress a figure below ~5), and keep it unauthenticated but rate-limited and cached so it cannot become a cheap load amplifier.

**Next action:** post-launch. One cached `GET /api/v1/public/stats` plus a small page. Do not build it before the blockers.

### Area 38 — GitHub linking
**Status: Missing · Confidence: High · Criticality: Low**

No repository link appears anywhere — not in `README.md`, not in the app shell or footer, not on `/support` or `/help`, and there is no public project page.

Recommended placement once the repository is public and safe (Area 39): the app footer or `/help` (a quiet "source" link), the README top with badges, `/support` alongside the security-reporting address, a portfolio page linking both the live app and the repository, and the CV linking the portfolio page rather than the repository directly. Keep the live-app link and the repository link visually distinct so beta testers are not sent to GitHub for support.

### Area 39 — Public GitHub readiness
**Status: Partially implemented · Confidence: High · Criticality: High (before publishing; not a beta blocker)**

**Good news first.** I searched all 899 commits for added `.env`, `*.pem`, `*.key`, `id_*`, and secret-named files: the only match is `.env.example`. `.gitignore` is thorough (env files, SSH keys including a specific `gym_prod_ed25519*` rule, secrets, dumps, certificates), `.dockerignore` matches it, no `.DS_Store` is tracked, and no personal email addresses appear in tracked application source. Third-party licensing is handled properly — the exercise catalog records its upstream, its Unlicense terms, and a pinned revision.

**Risks that must be addressed before publishing:**
1. **`docs/server/**` is an operational-security disclosure.** It contains internal LAN addresses (`192.168.1.57`, `192.168.86.178`, and both subnets), SSH policy and port decisions, firewall configuration, host filesystem layout under `/srv/gym-tracker`, monitoring role creation, and detailed hardening steps — a map of the deployment for anyone who finds the public origin. Roughly 25 files.
2. **Same for** `docs/status/production-readiness/*` and `docs/13-operator-guide.md` (which includes the raw-SQL escape hatches).
3. **`192.168.1.57` also appears in shipped configuration** — `compose.yaml:80-81` and `.env.example:29-30` default `APP_ALLOWED_HOSTS`/`APP_ALLOWED_ORIGINS` to the production server's LAN address. Replace with a generic placeholder.
4. **No LICENSE file.** Without one, the default is all-rights-reserved, which undercuts the portfolio purpose. Choose deliberately (MIT/Apache-2.0 for a portfolio piece; note Apache-2.0 adds a patent grant).
5. **No SECURITY.md** and no security-reporting path in the README.
6. **Commit-author variety** — six identities including `janva@MacBook-Pro.local`, `janva@Mac.net`, a `stud.unibas.ch` address, and a `Gym Tracker Deployment Snapshot <deployment-snapshot@localhost.invalid>` bot. Not a leak, but it advertises machine names and an institutional affiliation. Note this is history-wide.
7. **Branch and tag names** encode deployment timestamps (`gym-prod-public-beta-20260806T071732Z` and six similar). Harmless but noisy, and they signal the operational schedule.
8. **`_legacy-reference/`** is tracked dead code — 20+ files of a superseded UI. Not a security risk; it is confusing in a portfolio repository.

**Recommended actions (report only — I made no changes):** move `docs/server/**`, `docs/status/production-readiness/**`, and the operator guide into a separate private repository or a `private/` path excluded before publishing; genericize the LAN defaults in shipped config; add LICENSE and SECURITY.md; decide whether to publish from a fresh initial commit (avoiding the author-identity and branch-name history) or to accept the existing history. **Do not rewrite history** — publishing a clean squashed snapshot to a new public repository while keeping this one private is the lower-risk option and preserves your working history intact.

### Area 40 — README and public project documentation
**Status: Partially implemented · Confidence: High · Criticality: Medium**

The current README is competent for a developer but describes a project state that no longer exists: "past the planning stage and into V1 release verification," a "Current Status" section listing account deletion/export as *not* done (both are implemented), Render presented as a deployment path, and no mention of the public beta, invitations, legal pages, admin tooling, or the home-server target as primary. It links `docs/99-current-project-state.md` — the most outdated document in the repository — as the place to "understand the current state quickly."

Recommended public structure: purpose (one paragraph, what and for whom); screenshots (2–4, mobile-first, from `docs/Usability_Audit/Screenshots` or fresh); functionality; architecture (a diagram of browser → Cloudflare → Caddy → Next BFF → Fastify → PostgreSQL, which is the genuinely interesting part); technology stack; setup (the existing content, which is good); testing (also good); deployment overview (self-hosted, no host specifics); beta status and how to request access; known limitations (English-only, 18+, invitation-only, no native app, no offline mode); roadmap; security reporting; and license.

**Next action:** rewrite the README against the actual current state, and drop the pointer to `99-current-project-state.md`.

### Area 41 — Documentation separation
**Status: Missing · Confidence: High · Criticality: Medium**

Everything sits flat under `docs/`, mixing public architecture, developer guidance, operational secrets, legal drafts, design iterations, and historical reports. Publishing the repository today would publish the server topology alongside the README.

Recommended structure:
- **Public project documentation** — README, ARCHITECTURE (redacted), a stack overview, screenshots, license, SECURITY.md.
- **Developer documentation** — ENGINEERING, CONTRIBUTING, AGENTS, implementation pattern, API contract, schema notes, ADRs (0009 and 0011 redacted).
- **User documentation** — the in-app `/help`, `/support`, and legal pages, plus a short beta guide.
- **Private operational documentation** — `docs/server/**`, `docs/status/production-readiness/**`, `docs/13-operator-guide.md`, `docs/public-beta/security-review.md`, `launch-gates.md`, the account register, and the recurring-maintenance schedule. Separate repository or an excluded path.
- **Historical implementation reports** — `docs/server/reports/**`, `docs/beta-process/**`, usability audits v1–v3, design iterations. Archive under a clearly marked `archive/` and stop treating as current.

---

## 5. Contradictions and outdated claims

1. **The audit brief says "Prisma and PostgreSQL." There is no Prisma.** Data access is Kysely with `node-pg-migrate` SQL migrations — as `CLAUDE.md` itself warns and ADR 0003/0004 record. This matters: any plan assuming a Prisma schema, Prisma migrations, or Prisma Studio for operator access is built on a wrong premise.

2. **`docs/99-current-project-state.md` describes a project that no longer exists.** It names "Render Blueprint" as the deployment target, lists no beta, admin, deletion, export, campaign, or legal functionality, and states "No actionable TODO or FIXME comments were found." It is linked from the README as the fastest way to understand current state. It is the single most misleading document in the repository.

3. **`README.md` contradicts the code.** "What still needs work: Account settings and account deletion/export workflows" — all three are implemented (`/settings`, `POST /api/v1/users/me/deletion`, `POST /api/v1/users/me/export`).

4. **`AGENTS.md` describes the "first implementation foundation."** The project is many stages past that.

5. **ADR 0005 (Render) versus ADR 0009 (home server)**, with `render.yaml` still actively maintained (updated 2026-08-05 with `INVITE_ONLY` and the full `NEXT_PUBLIC_*` set). Neither ADR supersedes the other; the README calls Render "a documented deployment alternative" while ARCHITECTURE calls the home server "active." Two live deployment definitions with no authority statement.

6. **ADR 0010 versus ADR 0013 on retention.** 0013 supersedes 0010 "only for snapshot retention duration and restore ordering" — correctly scoped, but `docs/server/disaster-recovery.md:33` is the only place that says so, and `ops/backup/README.md` was modified in the working tree, so the committed version may still describe the tiered scheme.

7. **`docs/public-beta/security-review.md` states "Bootstrap is an explicit audited operator CLI, never email inference."** True — `promote-admin.mjs` exists and is audited. But `launch-gates.md:17` lists "First real user has `role=ADMIN` through a controlled migration/operator procedure" as an unchecked gate, so the mechanism exists and has not been used. The review's confident phrasing reads as done; the gate says not yet.

8. **The security review's "Token/log/metric leakage" row asserts the BFF "excludes query strings."** Accurate for the app's own logs — but the invitation email embeds the raw token and the invitee's email *in* the query string (`beta.service.ts:30`), so the token is exposed to the edge, browser history, and any intermediary that logs URLs. The claim is true and the risk still exists.

9. **`private-beta-1-remediation.md:6` cites a tested baseline commit that does not exist in this repository.** `1ba15973df255d2e5bd3b94def03e25b050e870a` is not a valid object on any ref. The real-device evidence cannot be tied to inspectable code.

10. **Private-beta assumptions persist in supposedly public-beta-ready components.** `APP_ENV=private-lan` disables every production assertion in both tiers (`env.ts:44-48`, `request-security.ts:31-33`) and, in the web tier, re-admits `localhost` origins. Alert rules and Grafana guides describe a "private-LAN proxy" and loopback-only Grafana. ADR 0011 is titled "secure single-owner external access" and remains the authoritative external-access ADR even though ADR 0012 opens the system to 50 users.

11. **Configuration-name inconsistency.** Production uses database `gym_tracker` (`ops/backup/scripts/backup-postgres.sh:11`, `replay-erasure-ledger.sh`); the repository defaults to `gym_progress_tracker` (`compose.yaml:7`). The alert rules reference a Compose service `proxy` that `compose.yaml` does not define. Both are consequences of the production stack living outside Git.

12. **`docs/18-public-beta-handoff.md` presents a long list of implemented capabilities as an accomplished "repository foundation."** Most of the web half of that list is **uncommitted** — `apps/web/src/app/admin/`, `apps/web/src/features/beta/`, `features/legal/`, `features/messages/`, `features/onboarding/`, `features/privacy/`, `features/settings/`, and the deletion/export/onboarding BFF routes are all untracked. They have never run through CI.

13. **The web test glob silently excludes a test file.** `apps/web/package.json` runs `node --test "src/**/*.test.ts"`, which does not match `registration-disabled-screen.test.tsx`. That test never executes in `pnpm check` or CI. A small thing, but it means "tests pass" is quietly weaker than it reads.

---

## 6. Public-beta blockers

### B1 — Production security assertions may be disabled by `APP_ENV`
- **Why it blocks:** if production runs `APP_ENV=private-lan`, the app will start with an HTTP base URL, a non-secure session cookie, no BFF secret (disabling both the `BFF_REQUIRED` gate and signed rate-limit attribution), and no support email — and will report no error. Every other security control in this report is conditional on this value.
- **Evidence:** `apps/api/src/shared/env.ts:44-48`; `apps/web/src/request-security.ts:31-33`; `.env.example:13-14` documents `private-lan` as the current deployment's value.
- **Impact:** session cookies transmissible over plaintext on any non-HTTPS path; unauthenticated direct API access if the API hostname is reachable; rate limiting degraded to per-peer-IP (the BFF's own address).
- **Minimum resolution:** production sets a production `APP_ENV` label and boots successfully, which by construction requires HTTPS `APP_BASE_URL`, `AUTH_COOKIE_SECURE=true`, a 32+ character `BFF_CLIENT_IP_SECRET`, and a valid `SUPPORT_EMAIL`.
- **Verify by:** capturing the API's startup log and the effective config; confirming `Set-Cookie` on login carries `Secure; HttpOnly; SameSite=Lax`; confirming a direct request to the API hostname (non-health, non-metrics) returns `BFF_REQUIRED`.

### B2 — Client-IP attribution trusts a browser-supplied header
- **Why it blocks:** all abuse protection for external users is per-IP. If `cf-connecting-ip` is attacker-controlled, credential brute force, invite-token guessing, and waitlist flooding are all effectively unlimited.
- **Evidence:** `apps/web/src/shared/bff-client-attribution.ts:18-24` reads `cf-connecting-ip` (then the last `x-forwarded-for` entry, then `x-real-ip`) from the incoming request and HMAC-signs it; `apps/api/src/shared/client-attribution.ts:9-20` accepts any correctly signed value. `docs/public-beta/security-review.md` row 16 lists edge-header verification as outstanding.
- **Impact:** the 10-per-15-minutes credential limit and 5-per-hour waitlist limit become decorative.
- **Minimum resolution:** the edge (Caddy and/or the Tunnel) unconditionally overwrites `cf-connecting-ip`, `x-forwarded-for`, `x-real-ip`, and `x-gym-client-*` on ingress; ideally the BFF reads only a header the edge is known to set and rejects the request rather than falling back.
- **Verify by:** sending `cf-connecting-ip: 203.0.113.7` from a normal browser session and confirming the API does not attribute the request to that address (observable through rate-limit behavior across rotated values, or a temporary debug log on staging).

### B3 — Legal pages will publish placeholder controller and contact text
- **Why it blocks:** the beta is 18+, invitation-only, processes health-adjacent personal data, and targets users worldwide. Publishing a privacy notice that reads `[controller configuration required]` under a red `PUBLICATION_BLOCKED` banner is both a legal exposure and an immediate credibility failure with testers.
- **Evidence:** `apps/web/src/features/legal/legal-page.tsx:9-18` reads `process.env.NEXT_PUBLIC_*` in server components with no `export const dynamic` anywhere in `apps/web/src/app`, and `Dockerfile` passes no build args. Next.js will statically prerender `/privacy`, `/terms`, `/cookies`, `/support`. Same issue for `NEXT_PUBLIC_SUPPORT_URL` in `help-support-panel.tsx:6`.
- **Impact:** runtime configuration in `compose.yaml:89-94` has no effect on the rendered pages.
- **Minimum resolution:** force dynamic rendering on the legal routes, or pass the values as Docker build args; plus the underlying requirement that real controller name, address, and dedicated privacy/support/security mailboxes exist.
- **Verify by:** `curl https://app.gymtrack.ch/privacy` on the built production image and confirming real values and no `PUBLICATION_BLOCKED` string.

### B4 — No operator ability to suspend an account or revoke sessions
- **Why it blocks:** with 10–50 external users you must be able to stop a specific account quickly — abuse, a compromised credential, or a support request. Today that requires SSH plus raw SQL, which is slow, error-prone under pressure, unaudited, and unavailable if remote admin access is LAN-only (Area 34).
- **Evidence:** no suspend or session-revocation route exists in `apps/api/src/features/**`; `SUSPENDED` is a valid state (`20260805120000000:22-23`) honoured by `auth.service.ts:122` and counted in the seat cap, but nothing sets it; `docs/13-operator-guide.md:103-127` documents raw SQL as the mechanism.
- **Impact:** incident response time measured in "can I get to a laptop on the home network."
- **Minimum resolution:** `POST /api/v1/admin/users/:userId/suspend` (and unsuspend) plus `POST /api/v1/admin/users/:userId/sessions/revoke`, both `ADMIN`-gated and audited, surfaced in the existing `/admin` screen. Both are small additions given `requireAdmin` and `admin_audit_events` already exist.
- **Verify by:** suspending a test account and confirming its next request returns `ACCOUNT_UNAVAILABLE` and its session is gone; confirming the audit rows.

### B5 — Email delivery has no retry, no bounce handling, and a cleanup-loop defect
- **Why it blocks:** email is the sole channel for invitation, verification, password reset, and deletion cancellation. A silent failure means an invited tester simply never arrives, and you have no record to diagnose it. The cleanup defect additionally stalls the deletion pipeline, which is a data-protection commitment.
- **Evidence:** `mailer.ts:69-96` sends once with no retry and persists nothing; `user-account.service.ts:76-88` awaits `mailer.send` inside the due-deletions loop with no `try/catch`, so one failure aborts the pass *and* skips `cleanupRetention`; `beta.service.ts:22-32` commits the invitation before sending. SPF/DKIM/DMARC unverifiable from the repository.
- **Impact:** invitations lost with no trace; deletions past their promised deadline; retention cutoffs not applied.
- **Minimum resolution:** wrap per-user sends in the cleanup loop so one failure cannot block the rest; add one retry with backoff; verify SPF, DKIM, and DMARC pass; assign a bounce/complaint monitoring owner.
- **Verify by:** black-box tests of invite, verification, reset, deletion, and cancellation emails against a real inbox, checking authentication results in the received headers; a deliberate send failure that does not stall the queue.

### B6 — No verified cross-user isolation test against a production build
- **Why it blocks:** the moment there is a second user, an isolation defect stops being theoretical. The code reads correct everywhere I traced it, but "reads correct" is not evidence, and the largest surface (the entire uncommitted web layer, plus export and admin routes) has never been exercised by any test with two accounts.
- **Evidence:** one cross-user integration test exists (`workout-flow.integration-test.ts`); no test exercises a `USER`-role account against any of the nine `/api/v1/admin/*` routes; `security-review.md` row 1 lists the multi-account matrix as outstanding.
- **Impact:** a single missed `where user_id` would expose one tester's workout history to another — the failure most damaging to trust.
- **Minimum resolution:** an automated two-account matrix over every user-owned resource (workouts, session exercises, sets, templates, exercises, analytics, export, deletion, messages, onboarding, privacy preferences) plus a `USER`-role probe of every admin route.
- **Verify by:** every cross-account request returns 401/403/404 and never leaks another account's data; exports contain only the requesting user's rows.

### B7 — No staging, and rollback is unrehearsed
- **Why it blocks:** the first production migration with real user data, executed with no backup precondition and no rehearsed rollback, is the highest-consequence single action in the project — and the public-beta migration's Down section drops five tables and 18 `users` columns.
- **Evidence:** no staging environment anywhere; `.github/workflows/repo-checks.yml` runs `migrate:up` but never `down`; the Compose `migrate` service runs unconditionally with no backup gate; `launch-gates.md:44` lists rollback rehearsal as unchecked; production Compose/Caddy/Tunnel are not in Git.
- **Impact:** a bad migration or a bad release could require a full DR restore, spending the 24-hour RPO and losing tester data.
- **Minimum resolution:** a minimal staging environment (second Compose project, separate database, own hostname, log-only mail) that receives every release first; a verified backup as a hard precondition of production migration; one rehearsed rollback.
- **Verify by:** a release deployed to staging, migrated, smoke-tested, rolled back, and re-applied, with the steps written down as they were actually performed.

### B8 — The beta implementation is uncommitted and has never passed CI
- **Why it blocks:** you cannot deploy, tag, roll back to, or reason about a release that exists only in a working tree. CI runs on push/PR to `main`; none of this code has been type-checked, linted, tested, or built by the pipeline.
- **Evidence:** `git status` shows 123 entries, including ~40 untracked directories covering the admin UI, beta waitlist UI, legal pages, messages, onboarding, privacy, settings, and the deletion/export/onboarding BFF routes.
- **Impact:** no release identity, no rollback target, no proof the whole thing compiles together.
- **Minimum resolution:** commit the work (your call entirely — I changed nothing), let CI run green, and tag the release candidate. If CI cannot pass, that is itself the finding.
- **Verify by:** a green CI run on the release commit and a tag referenced in `APP_RELEASE`.

---

## 7. High-priority non-blockers

Important, but a tightly controlled first cohort of ~10 invited testers can start without them.

1. **Authenticated password change and "sign out everywhere."** Users expect both; today password change is only possible via the emailed reset flow.
2. **External uptime monitoring.** All alerting is host-local, so the most likely outage class — host, power, network, tunnel — is silent. One external probe with independent alerting closes it cheaply.
3. **Fix `refetchOnWindowFocus` for session queries** and add an offline indicator. Phones lock mid-workout constantly; stale session state is a realistic bug report.
4. **Account-status enumeration leak** (`auth.service.ts:122-124`) — move the status check after password verification.
5. **Container hardening** — add `USER node`, prune dev dependencies from runtime images, and set memory limits. Currently `api` and `web` run as root with `g++`/`make`/`python3` present.
6. **Idempotency key on set creation.** A lost response on a flaky connection currently produces a duplicate set — visible, annoying, and it corrupts volume analytics.
7. **Focus trap in `ConfirmDialog`.** Small change; it is the app's only modal primitive and it wraps destructive actions.
8. **Dependency scanning in CI** (`pnpm audit` or Dependabot) plus a documented update cadence.
9. **Database pool hardening** — explicit `max`, `statement_timeout`, and connection timeout.
10. **Structured bug reporting** capturing release, device, viewport, and the failing `x-request-id`. Without it, beta reports will not be actionable.
11. **Alerts for application-lifecycle failures** — cleanup job, email send, ledger export. All three already log; they need counters and rules.
12. **Down-migration test in CI** (up → down → up).
13. **Fix the web test glob** so `*.test.tsx` runs.
14. **Decide the beta measurement plan** given `analytics_enabled` defaults false — lean on consent-free aggregates rather than opt-in events.
15. **Private account and dependency register** (owner, MFA, backup codes, renewal dates, quotas, blast radius). Cheap to write, existential if missing.
16. **A UPS for the Mac mini.**

---

## 8. Verification plan

No destructive tests. Steps are ordered so that cheap checks fail fast.

### 8.1 Repository-only checks
1. Confirm `git status` is clean after committing the beta work, and that the tag matches `APP_RELEASE`.
2. Grep the tracked tree for private IPs and internal hostnames outside `docs/server/**` — expect hits only in `compose.yaml:80-81` and `.env.example:29-30`; genericize both.
3. Confirm no `export const dynamic` is needed anywhere else: list every server component reading `process.env` and cross-check against routes expected to be dynamic.
4. Verify every `/api/v1/admin/*` route in `apps/api/src/features/**` calls `requireAdmin` — currently 9 routes across `beta.routes.ts`, `message.routes.ts`, `user-account.routes.ts`.
5. Confirm `.gitignore`/`.dockerignore` still cover every secret path after adding staging config.
6. Re-check that `pnpm test` globs match every test file in both apps.

### 8.2 Local automated tests
1. `pnpm check` (type-check, lint, test, build) — must be green on the release commit.
2. `pnpm test:integration` against a fresh migrated database.
3. `pnpm test:performance`.
4. `pnpm smoke:web` on Chromium and Firefox.
5. Migration reversibility: `migrate:up` → `migrate:down` → `migrate:up` on a scratch database.
6. New tests to add before launch:
   - two-account authorization matrix (Section 6, B6);
   - `USER`-role probe of all nine admin routes;
   - invitation reuse, expiry, and wrong-email rejection (partially covered — extend to expiry);
   - deletion cancellation with a reused, expired, and foreign token;
   - export completeness plus cross-user absence.

### 8.3 Staging checks (once staging exists)
1. Boot with a production `APP_ENV` and deliberately omit each of `APP_BASE_URL`, `AUTH_COOKIE_SECURE`, `BFF_CLIENT_IP_SECRET`, `SUPPORT_EMAIL` in turn — confirm the app refuses to start each time.
2. `curl -I` the staging origin: confirm CSP, HSTS (when enabled), `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
3. Confirm `/privacy`, `/terms`, `/cookies`, `/support` render real controller values and no `PUBLICATION_BLOCKED`.
4. Direct-to-API request on the staging API hostname → expect `BFF_REQUIRED`; `/health` and `/metrics` reachability is the deliberate exception — confirm that is acceptable given the network path.
5. Forged-header test: send `cf-connecting-ip`, `x-forwarded-for`, `x-real-ip`, and `x-gym-client-ip`/`x-gym-client-signature` from a browser and confirm none influences attribution.
6. Cross-site POST from a foreign origin → expect `CSRF_ORIGIN_MISMATCH`; `Host:` header spoof → expect `UNTRUSTED_HOST`.
7. Full invite lifecycle on staging: waitlist → approve → email → signup → auto-verified → first workout. Then reuse the token (expect rejection) and let one expire.
8. Cap and kill-switch rehearsal: set cap to current+1, approve two in parallel, confirm exactly one succeeds; toggle each of the three runtime switches and `REGISTRATION_MODE=DISABLED`.
9. Full data-lifecycle cycle: export → verify contents → schedule deletion → confirm immediate lockout → cancel by link → re-schedule → advance to finalization → verify absence across all tables.
10. Migration rehearsal against a production-shaped dataset, then a rollback, then re-apply.

### 8.4 Production-safe checks (read-only, non-destructive)
1. Record the effective production configuration: `APP_ENV`, `REGISTRATION_MODE`, `AUTH_COOKIE_SECURE`, `HSTS_ENABLED`, `APP_RELEASE`, `METRICS_ENABLED`, and whether `BFF_CLIENT_IP_SECRET` and `RESEND_API_KEY` are set (**record presence, never values**).
2. `curl -I https://app.gymtrack.ch` — headers and TLS.
3. Confirm from outside the network that the API port, PostgreSQL port, Grafana, Prometheus, and Alertmanager are all unreachable.
4. Confirm the API metrics endpoint is not publicly reachable.
5. Read `GET /api/v1/admin/beta/settings` as admin and record cap and daily limit.
6. Confirm `admin_audit_events` contains exactly one `ADMIN_BOOTSTRAPPED_BY_OPERATOR` row and that exactly one account has `role='ADMIN'`.
7. Run `backup-status.sh`; confirm the last successful snapshot age and that `gym_backup_last_run_success` is present in Prometheus.
8. Confirm `status.gymtrack.ch` resolves, serves TLS, and is hosted independently of the Mac mini.
9. Verify SPF, DKIM, and DMARC records for the sending domain; check the Resend dashboard for domain verification and sending limits.
10. Trigger one harmless alert and confirm Telegram delivery and resolution.

### 8.5 Manual mobile field tests
On a Samsung S22 Plus (Firefox) plus one iOS Safari device, over mobile data, at 390 px / 430 px / 1440 px:
1. Invite email → signup → first workout, start to finish.
2. Log 8–10 sets across 3 exercises with the keyboard opening and closing; verify no first-tap stepper mutation and no layout jumps.
3. Lock the phone mid-workout for 5 minutes, unlock, resume — verify state, then verify against History.
4. Airplane mode mid-set → save (expect a clear failure and a preserved draft) → restore → retry → confirm exactly one set exists.
5. Rotate the device during an active set; scroll with the browser toolbar hiding and showing.
6. Force-quit the browser mid-workout; reopen; confirm the workout and draft survive.
7. Two tabs on the same workout; log in each; confirm no duplication or lost writes.
8. Finish the workout; confirm the completion summary, then History, Progress, and Volume all agree.
9. Exercise the picker with `RDL`, `dumbell`, a partial name, and nonsense; open both muscle overlays with the keyboard up.
10. Navigate every legal, help, and support page and confirm no placeholder or technical error strings.

### 8.6 Multi-user authorization tests
With accounts A (`USER`), B (`USER`), and C (`ADMIN`), plus a raw HTTP client (no browser), for each of workouts, session exercises, sets, templates, exercises, analytics, messages, onboarding, privacy preferences, export, and deletion:
1. A requests B's resource by ID → expect denial with no data.
2. A mutates B's resource by ID → expect denial and confirm B's data is unchanged.
3. A submits a reorder payload containing B's session-exercise IDs → expect rejection.
4. A calls every `/api/v1/admin/*` route → expect 403 on all nine.
5. A exports; confirm zero rows belonging to B.
6. A attempts to consume an invitation issued to B's email → expect rejection.
7. A attempts to cancel B's deletion with a guessed or captured token → expect rejection.
8. Guessed random UUIDs against every parameterized route → expect 404/403, never 500 and never a data leak.
9. Repeat the highest-value cases through the browser BFF as well as directly against the API.

### 8.7 Disaster-recovery tests
Non-destructive; run entirely in isolation.
1. Restore the newest snapshot into an isolated container; compare row-count hashes against production (`restore-test-postgres.sh` already does this).
2. **The launch-gate drill:** restore a snapshot *older* than a completed erasure; obtain the newest `current.csv` ledger independently; apply target-schema migrations while isolated; run `replay-erasure-ledger.sh`; query every ledger user ID across `users`, sessions, workouts, templates, events, messages, targets, and access requests; confirm absence; confirm shared exercises survive only with `created_by_user_id IS NULL`. Record operator, snapshot IDs, ledger source, hashes, and time. **Destroy the isolated restore; do not promote it.**
3. Confirm the strict 30-day forget-and-prune has actually run, with output recorded.
4. Configuration restore test (`restore-test-config.sh`) into an isolated directory.
5. Full-host recovery rehearsal onto the spare Mac mini, timed against the 4 h RTO — the largest untested assumption in the DR plan.
6. Credential-recovery walkthrough: confirm the Restic password is retrievable from a location independent of both the MacBook and this repository.
7. Power-cut simulation: pull power, restore it, and time until the external URL serves traffic again without manual intervention.

---

## 9. Recommended launch gates

Go/no-go for the **first 10 invitations**. Every gate is objectively verifiable; each maps to a check in Section 8. These are additive to `docs/public-beta/launch-gates.md`, not a replacement — but if you only run these, you close the highest-risk gaps.

**Configuration and identity**
1. Production boots with a production `APP_ENV` label; the startup log shows HTTPS `APP_BASE_URL`, `AUTH_COOKIE_SECURE=true`, `BFF_CLIENT_IP_SECRET` present, `SUPPORT_EMAIL` present. *(B1)*
2. `REGISTRATION_MODE=INVITE_ONLY` confirmed live; `DISABLED` rehearsed and reverted. *(Area 1)*
3. `APP_RELEASE` equals the deployed commit SHA and appears in `/api/v1/metrics` and logs. *(Area 18)*
4. Exactly one `role='ADMIN'` account exists, created via `admin:promote`, with one `ADMIN_BOOTSTRAPPED_BY_OPERATOR` audit row. *(Area 2)*

**Security**
5. A browser-supplied `cf-connecting-ip` does not change API attribution; direct non-health API requests return `BFF_REQUIRED`. *(B2)*
6. From outside the network: PostgreSQL, Fastify, Grafana, Prometheus, and Alertmanager are unreachable; `/api/v1/metrics` is not publicly reachable. *(Area 10)*
7. The two-account authorization matrix passes with zero cross-user leakage, and a `USER` account is denied on all nine admin routes. *(B6)*
8. Invitation reuse and expiry both fail closed; cap race allows exactly one of two concurrent approvals. *(Area 3)*

**Legal and privacy**
9. `curl https://app.gymtrack.ch/privacy` (and `/terms`, `/cookies`, `/support`) returns real controller name, address, and contacts, with no `PUBLICATION_BLOCKED` and no `[... required]` placeholder. *(B3)*
10. Export → deletion → grace → cancel → re-schedule → finalize → verify-absence completes on staging. *(Area 36)*

**Operations**
11. Admin can suspend an account and revoke its sessions through the API/UI, with audit rows, without touching SQL. *(B4)*
12. Invite, verification, reset, deletion, and cancellation emails all arrive at a real inbox with SPF, DKIM, and DMARC passing; a deliberate send failure does not stall the deletion queue. *(B5)*
13. One external uptime probe alerts independently of the Mac mini; verified by a deliberate outage of the external path. *(Area 15)*
14. Telegram alert delivery and resolution re-verified within the last 7 days. *(Area 16)*
15. `gym_backup_last_run_success == 1` with a snapshot under 24 hours old, and the old-snapshot + latest-ledger erasure-replay drill recorded. *(Area 14, 8.7)*
16. `status.gymtrack.ch` is live on independent hosting with TLS, and one incident-publication rehearsal is recorded. *(Area 17)*

**Release integrity**
17. The release commit is committed, tagged, and green in CI (`check`, performance, DB integration, Playwright Chromium + Firefox). *(B8)*
18. The release passed through staging, including a migration and a rehearsed rollback. *(B7)*
19. The full mobile field test (8.5) passed on the release candidate, with the commit SHA recorded. *(Area 8)*
20. A private register exists for provider accounts, MFA state, backup codes, and renewal dates. *(Area 29)*

**Stop rules for the cohort:** adopt `launch-gates.md:46-48` verbatim — 10 invitations, 72-hour observation, never more than 10 per rolling 24 hours, immediate stop on any isolation failure, deletion failure, backup failure, unexplained workout writes, or unavailable recovery email.

---

## 10. Recommended environment model

Sized for one operator, ~50 users, one home server. Deliberately not enterprise.

**Development (laptop).** `pnpm dev:api` + `pnpm dev:web` against Compose PostgreSQL, or the full Compose stack for a production-like run. `APP_ENV=local`, `REGISTRATION_MODE=ENABLED`, no Resend key (log transport prints action links), analytics off. Seed data lives here; never real user data.

**Automated test (CI + local).** Already correct: ephemeral PostgreSQL for integration tests, an ephemeral Compose stack for Playwright, no persistent state, no external side effects. Add: down-migration testing, dependency scanning, and the two-account authorization matrix.

**Staging (new — the significant gap).** A second Compose project on the same Mac mini: separate database (`gym_tracker_staging`), separate volume, separate cookie name (`gym_staging_session`), its own hostname (`staging.gymtrack.ch`) behind Cloudflare Access restricted to the operator, its own `BFF_CLIENT_IP_SECRET`, no Resend key, and synthetic data only. Purpose: validate every release and every migration against a production-shaped edge before production sees them. Cost is one Compose file and modest RAM — the cheapest risk reduction available.

*If the Mac mini cannot spare the resources,* the fallback is a laptop-local staging with a Cloudflare Tunnel for edge behavior. Less faithful, still far better than nothing.

**Production.** The Mac mini as today: Compose with PostgreSQL 17, one-shot migrations, Fastify, Next.js, Caddy, Cloudflare Tunnel and Access. `APP_ENV` set to a production label, `REGISTRATION_MODE=INVITE_ONLY`, `HSTS_ENABLED=true` once the hostname is stable, real Resend key, metrics on, monitoring overlay running. **Bring the production Compose, Caddyfile, and Tunnel config into version control** with secrets externalized — this is the largest structural improvement available and directly enables rollback and review.

**Operations (tooling, not an environment).** `ops/` scripts, systemd timers, the monitoring overlay, and the runbooks. Add: a private ops repository (or excluded path) for the server documentation, the account register, and the maintenance schedule.

**Promotion path:** laptop → CI (on push) → staging (tagged candidate, migrate, smoke, mobile spot-check) → production (backup, migrate, deploy, smoke, monitor 24 h). One direction only; production never receives an untagged build.

**Retire the ambiguity:** either delete `render.yaml` or add a one-line header stating it is an unmaintained alternative. Two live deployment definitions will eventually cause someone to configure the wrong one.

---

## 11. Recommended documentation structure

**Retain as-is (authoritative):** `docs/public-beta/*` (all five), ADRs 0009–0013, `docs/server/disaster-recovery.md`, `docs/server/restore-*.md`, `ops/*/README.md`, `ENGINEERING.md`, `CONTRIBUTING.md`, `docs/repository-structure.md`.

**Consolidate:**
- The four usability audits plus the private-beta-1 set → one "verified UX findings" document with an explicit precedence rule; archive the rest.
- `docs/15/16/17-production-operations-stage-*.md` plus `docs/status/production-readiness/*` → one current operations state document; archive the stage narratives.
- `docs/server/wave-a/b/c` plus the 11 `docs/server/reports/*` → keep the runbook-shaped content; archive the report narratives.

**Rewrite:**
- `README.md` — against actual current state, per Area 40.
- `AGENTS.md` and `CLAUDE.md` — the project-context paragraphs are two phases stale.
- `docs/13-operator-guide.md` — split. The developer half stays public; the SQL escape hatches and production values move to private ops, and the public-beta admin operations (approve, suspend, revoke, pause) need writing.
- `docs/deployment-runbook.md` — currently Render-oriented; rewrite for the home server, with rollback.
- `ARCHITECTURE.md` — the "Current State" paragraph is one enormous sentence listing everything ever built; replace with a current architecture description.

**Archive (move under `docs/archive/`, clearly marked historical):** `docs/server/reports/**`, `docs/status/SWE-Reports/**`, `docs/beta-process/private-beta-1/**`, usability audits v1–v3, `docs/design/stitch-redesign-v1` and `v2`, `docs/UI_Redesign`, `docs/06-implementation-start.md`, `docs/10-frontend-rework-brief.md`, `docs/11-phase0-frontend-inventory.md`. Delete the three empty placeholder directories.

**Delete or hard-flag:** `docs/99-current-project-state.md`. It is wrong in ways that would mislead a future you, and it is currently linked from the README as the fastest path to understanding the project.

**Keep private (never publish):** `docs/server/**` in full, `docs/status/production-readiness/**`, the operator-guide operations half, `docs/public-beta/security-review.md` and `launch-gates.md` (they enumerate your controls and your unverified gaps), the account register, and the maintenance schedule.

**Publish (after edit):** `README.md`, `ARCHITECTURE.md` (redact the private-LAN topology), `ENGINEERING.md`, `CONTRIBUTING.md`, ADRs 0001–0008 and 0012–0013 (0009 and 0011 need redaction — they name the host and network model), `docs/01-requirements.md`, `docs/05-api-contract.md`, plus new `LICENSE` and `SECURITY.md`.

---

## 12. Prioritized next phases

Grouped, not sequenced into an implementation plan.

**Phase A — Verification and audit (before anything is built).** Establish the production configuration facts: `APP_ENV`, registration mode, cookie flags, BFF secret presence, deployed commit, edge header handling. Nearly every judgement in this report is conditional on these, and several findings may already be resolved on the host. Also: commit the beta work and get a green CI run so there is a release to reason about.

**Phase B — Public-beta blockers.** The eight items in Section 6. Roughly ordered by effort-to-risk: fix the legal-page rendering (small), fix the email cleanup loop (small), add suspend and session-revocation endpoints (small), fix or verify client-IP attribution (depends on edge access), resolve `APP_ENV` (configuration plus a boot test), build the two-account authorization matrix (moderate), stand up staging (moderate), rehearse rollback (moderate).

**Phase C — Staging.** A second Compose project with its own database, hostname, and secrets. Everything in Phase D and beyond is verified here first. Doing this early makes every later phase cheaper and safer.

**Phase D — Operations procedures.** Deployment and rollback SOPs, user administration, credential rotation, the recurring-maintenance schedule, the account and dependency register, incident templates, maintenance mode, and external uptime monitoring. This is what converts "it works" into "it can be run."

**Phase E — Data lifecycle proof.** Run the full export → deletion → finalize → verify cycle and the old-snapshot + latest-ledger erasure-replay drill. The implementation is strong; the evidence is missing. Add the correction path (email change) while you are in this code.

**Phase F — Documentation.** Delete the misleading, consolidate the duplicated, archive the historical, and split public from private. Do this before Phase G, because publishing a repository whose documentation you have not separated is how server topology ends up on the internet.

**Phase G — Public repository preparation.** LICENSE, SECURITY.md, README rewrite, genericized LAN defaults, removal or relocation of `_legacy-reference/`, and a decision on publishing from a fresh snapshot versus existing history. Then the GitHub links from app, portfolio, and CV.

**Phase H — Portfolio statistics.** The cached public aggregate-stats endpoint and page. Genuinely nice for a portfolio and technically small — but it produces zero risk reduction, so it belongs after the beta is running.

**Phase I — Post-launch hardening.** Container hardening, dependency scanning and update cadence, CSP tightening once Next's production requirements are measured, offline handling and idempotency keys, accessibility focus management, capacity measurement and resource limits, and the UPS.

---

## 13. Open questions

Only questions I cannot answer from the available evidence and that materially change the assessment.

1. **What is `APP_ENV` in production right now?** If it is `private-lan`, blocker B1 is live and several other controls are inactive. If it is already a production label, B1 collapses to a verification step. This single value changes the security posture of the entire assessment.

2. **Does the edge (Caddy or Cloudflare Tunnel) strip or overwrite `cf-connecting-ip`, `x-forwarded-for`, and `x-real-ip` on ingress?** If yes, B2 is a hardening improvement. If no, all per-IP rate limiting is bypassable today.

3. **What commit is actually deployed to `gym-prod`, and does it include the public-beta work?** The uncommitted state makes this unanswerable from here, and it determines whether production currently has invite-only registration at all or is still running the earlier single-owner build.

4. **Is Cloudflare Access still gating the entire application?** `launch-gates.md:19` says the private gate "remains until unauthenticated direct API signup cannot bypass invite admission." Whether it is still on determines how much residual exposure exists during the first cohort.

5. **Does a Resend account exist with a verified domain, and do SPF/DKIM/DMARC pass for the sending domain?** Every invitation, verification, reset, and deletion-cancellation path depends on it, and nothing in the repository can confirm it.

6. **When does `gymtrack.ch` expire, is auto-renew on, and is the payment method current?** Combined with the absence of any account register, an expired domain is a plausible silent-death scenario for the service.

7. **Is there a working remote administrative path from outside the home network today?** `ops/monitoring/README.md:126` implies not. If not, incident response during the beta depends on being physically home.

8. **Has a restore ever been promoted to production, or have all restore tests been isolated?** The scripts and reports describe isolated tests only. The full-host recovery path onto the untested spare Mac mini is the largest unproven assumption in the DR plan.

9. **What is the intended answer to "a tester emails saying they mistyped their email at signup"?** There is no correction path and no admin tooling for it, and on an invite-bound signup the account may be unrecoverable. This will happen within the first ten users.

10. **Is the `1ba15973...` commit recoverable from anywhere** (the production host, another clone)? If not, the only real-device test evidence in the project is untraceable, and the mobile field test must be treated as entirely un-run rather than stale.
