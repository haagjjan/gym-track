# Goal 1 Repository Remediation Report

Date: 2026-08-06  
Baseline: `ee537d9`  
Scope: repository-level public-beta hardening only

## Outcome boundary

Goal 1 changes are kept unstaged and uncommitted for the user's later batch commit. They use
no SSH, production access, provider credential, or production data. Repository implementation
and automated tests do **not** establish staging success or public-launch readiness, and no
checkbox in [launch-gates.md](launch-gates.md) is changed by this report.

## Remediation and repository evidence

| Area | Implemented repository control | Automated evidence |
| --- | --- | --- |
| Zoom and modal behavior | Browser zoom restrictions removed. Shared modal behavior provides initial focus, Tab/Shift-Tab trapping, Escape close, inert background, body-scroll lock, and focus restoration; informational popovers remain non-modal. | `apps/web/e2e/accessibility-assertions.ts`, `apps/web/e2e/auth-workout-smoke.spec.ts`, and `apps/web/e2e/workout-templates.spec.ts` exercise zoom, focus, trapping, Escape/restoration and representative axe scans. |
| Active-set recovery | Versioned user/workout/exercise-scoped `localStorage` envelope contains `savedAt`, `clientMutationId`, and draft for less than 24 hours after last edit. Malformed/legacy/expired values are removed, and the mutation ID survives failed retries. | `apps/web/src/features/session/set-draft-storage.test.ts` covers round-trip, the exact expiry boundary, malformed/legacy cleanup, retry identity and scoped clearing helpers. |
| CSV export | Papa Parse formula escaping protects user-authored exported cells; the downloadable sample contains only fixed canonical content. | `apps/api/src/features/workouts/workout-csv.test.ts` asserts formula-prefix escaping. |
| Idempotent workout creates | Required `clientMutationId` on exercise/set creates; nullable parent-scoped UUID columns and partial unique indexes preserve historical rows. Equivalent replay returns `200`; mismatched reuse returns `409 IDEMPOTENCY_CONFLICT`. | `apps/api/src/features/workouts/workout-logging.routes.test.ts`, `workout-logging.service.test.ts`, and `workout-flow.integration-test.ts`; migration `20260806120000000_add_workout_mutation_safety.sql`; ADR 0014. |
| Serialized ordering | Owned workout/session-exercise locks contain validation, count/order calculation, shifts, compaction and insert/delete/reorder transactions. Update/reorder remains last-write-wins with authoritative refetch. | `workout-flow.integration-test.ts` runs identical/distinct concurrent adds, cross-user ID reuse and mixed add/reorder/delete races, then asserts compact order and no `500`. |
| Synchronous email | Public-production configuration fails closed without provider/sender/support reply-to. Mail kinds/outcomes/provider status/message ID/duration are bounded; recipient/body/link/token are excluded. No outbox or raw-token persistence was added. | `apps/api/src/shared/env.test.ts`, `shared/mailer.test.ts`, `shared/metrics.test.ts`, `features/auth/auth.service.test.ts`, and `features/auth/auth-action.repository.integration-test.ts`; PostgreSQL integration proves unused verification/reset rotation while retaining consumed records. |
| Invitation and deletion outcomes | Invite delivery exposes `SENT`/`FAILED` without rolling back `INVITED`; reissue supersedes the earlier link. Required deletion email failure compensates to `ACTIVE`; cancellation survives notification failure; finalization continues after completion-mail failure. | `apps/api/src/features/beta/beta.service.test.ts`, `features/beta/public-beta-flow.integration-test.ts` (including superseded invitation rejection), and `features/users/user-account.service.test.ts`. |
| Lifecycle scheduler | API-owned single-flight runner executes at startup and hourly, isolates bounded phases, continues due deletions, and exports start/success/duration/failure/backlog/finalized metrics. Alert rules cover two-hour staleness, four-hour critical failure/backlog and repeated email failures. | `apps/api/src/features/lifecycle/lifecycle-scheduler.test.ts` covers startup, the configured interval path, overlap prevention and phase isolation; `apps/api/src/shared/metrics.test.ts` covers bounded metrics; rules live in `ops/monitoring/prometheus/rules/alerts.yaml`. |
| Administrator containment | Canonical API/UI lists users, suspends/reactivates ordinary users, revokes sessions and pages recent bounded audit events. Administrator/self/deletion-pending targets are protected; suspension and revocation are audited transactions. Deprecated `/api/v1/admin/beta/users` remains read-only and returns `Deprecation`/successor `Link` headers. | Route/service tests cover authorization, stable errors, response shapes, cursor validation and detail allowlisting. `apps/api/src/features/admin/admin.repository.integration-test.ts` passed 3/3 on PostgreSQL 17 for atomic suspension/revocation/audit, reactivation/target denial, and idempotent revocation. |
| Rate-limit envelope | Acceptance testing found that the custom global-limit payload could be emitted as HTTP `500` after the real threshold. A shared response helper now attaches Fastify's transport status as a non-enumerable property while serializing only the canonical `{ error: { code: "RATE_LIMITED", message } }` body. | `apps/api/src/shared/rate-limit-response.test.ts` crosses a live Fastify limit and proves HTTP `429` plus the exact public envelope; `apps/api/src/server.ts` uses the helper for the real 300-request/minute ceiling. |
| Contracts and privacy wording | API/query/data-model contracts, inventory, Cookie/Privacy pages, operator/security/handoff guidance and ADR 0014 describe the implemented boundary and exact 24-hour retention. | Contract review, stale-path/link scan and `git diff --check`; this report links code-level evidence without changing launch gates or the dated audit snapshots. |

## Repository acceptance record

These results exercise repository behavior only:

| Check | Current Goal 1 record |
| --- | --- |
| `pnpm check` | Passed on the final current worktree: 204 API tests, 51 web tests, type-checks, zero-warning lint, API build and Next production build. |
| `pnpm test:performance` | Passed 4/4 sequential API/web performance guards. |
| `pnpm test:integration` | Passed 16/16 on PostgreSQL 17, including workout concurrency, public-beta invitation/deletion flow, auth-token rotation and administrator transactions. |
| Focused production-mode Playwright | Green: Chromium auth/workout 1/1 (8.5 s), Firefox auth/workout 1/1 (12.0 s), Chromium template 1/1 (5.0 s), Firefox template 1/1 (4.7 s), and Chromium mobile gesture 1/1 (3.5 s). The anatomy spec remains intentionally feature-gated and skipped. |
| Migration fresh and representative-legacy up/down/up | Passed: all nine migrations apply on fresh PostgreSQL 17; representative pre-Goal-1 up/down/up preserved historical rows with `NULL` mutation IDs. |
| Alert-rule validation | Passed: `promtool check rules` accepted all 31 rules with the existing Prometheus v3.5.2 image. This does not prove deployed loading or firing. |
| `git diff --check` and worktree review | `git diff --check` passed after documentation reconciliation; the final intended-file, secret/artifact and engineering-size review is recorded in the handoff. |

The heavy production browser specs were run in separate focused invocations because the tested
build keeps the real 300-request/minute local limiter enabled. Sharing one rate-limit window
across all heavy specs would make unrelated scenarios consume each other's budget. The focused
runs retained that production control; they did not disable or replace it.

The browser flow exercises draft clearing through workout completion, workout deletion and
active-workout discard. Account deletion and explicit device-data clearing remain covered by
scoped helper/call-site unit tests rather than destructive browser flows.

## Engineering size review

No new production source file exceeds the 250-line target, and no production source file in
the Goal 1 diff exceeds 400 lines. Three new production functions exceed the 50-line target:
the 63-line serialized exercise insertion keeps its lock, replay comparison, order allocation
and insert in one auditable transaction; the 81-line administrator repository factory keeps
the transaction-bound methods behind one dependency boundary; and the 62-line administrator
user panel keeps one table's status/session actions together. Splitting those narrow units
would separate state that must be reviewed together, so they are retained as documented
exceptions.

The touched production files above 250 lines all predate Goal 1 and received narrow changes:
`workout-csv.ts`, `auth.repository.ts`, `database.ts`,
`workout-logging.repository.helpers.ts`, and the explicit `server.ts` composition root. The
files above 400 lines are test matrices: the existing workout integration harness, exercise
route tests, workout-logging route tests, and auth-service tests. Goal 1 keeps its required
concurrency and delivery scenarios beside their shared fixtures rather than performing an
unrelated production/test refactor.

## Blocked and external verification

These are deliberately outside Goal 1 and remain open:

- qualified legal review, final controller/contact/processor facts, full DPIA, and rendered
  policy approval;
- real Resend credentials, sender-domain SPF/DKIM/DMARC, provider acceptance/bounce/complaint
  behavior, suppression ownership, and black-box invite/auth/deletion email links;
- staging deployment, SSH/Mac mini operations, production configuration/data, administrator
  bootstrap evidence, Telegram, Cloudflare/BFF, status hosting, and alert loading/firing;
- penetration-style authorization/IDOR/CSRF/enumeration testing and dependency/container/CSP
  hardening;
- real-device, mobile-data, VoiceOver/NVDA, contrast, touch, reduced-motion and responsive QA;
- capacity/overload testing, one-process topology validation, backup/prune, old-snapshot plus
  newest-erasure-ledger restore, rollback, incident, email-outage and launch-pause rehearsals;
- every deployed go/no-go check in [launch-gates.md](launch-gates.md).

The dated operational-readiness audits remain preserved snapshots and are not rewritten by
this remediation report.
