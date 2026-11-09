# Technical Review — Gym Progress Tracker

**Type:** Technical / codebase audit (engineering technical due-diligence + production-readiness review)
**Date:** 2026-07-22
**Scope:** Whole product — backend (`apps/api`), frontend (`apps/web`), monorepo tooling, CI/CD, infra/ops, documentation.
**Method:** Evidence-backed read of all three tiers. Every claim below cites a real file path.
**Status:** Snapshot of the working tree on 2026-07-22. **Caveat:** a large fraction of the work
described here exists only in the local working tree and is **not yet committed to `main`** — see §11.

---

## 1. What this document is

This is a **technical audit**: a holistic, evidence-based assessment of where the product stands
today. The same artifact goes by a few names depending on who commissions it:

- **Technical due-diligence report** — what an acquirer or investor asks for before putting money in.
- **Production-readiness review (PRR)** — what an engineering org runs before promoting a service to production.
- **Codebase / architecture audit** — the general internal-facing version.

All three answer the same question — *is this product technically sound, and what's the risk?* —
and this document is written to serve all three. It is not a bug hunt; it evaluates architecture,
quality, security, testing, operations, documentation, and delivery risk, and ends with a
prioritized action backlog.

---

## 2. Executive summary

The Gym Progress Tracker is a **technically impressive, security-conscious, exceptionally
well-documented product that reads far above typical solo/hobby work** — closer to a small
team's output run with real engineering discipline. The backend is a cleanly layered
Fastify + Postgres service with a mature schema and strong observability; the frontend is a
modern Next.js 15 app mid-way through an ambitious ground-up redesign; the ops story (monitoring,
encrypted backups, DR runbooks) is genuinely production-grade.

The single dominant liability is **not the code** — it is the **gap between the polished local
working tree and what is actually committed**. Roughly two-thirds of the "shipped" product (most
of the frontend rework, the entire `ops/` tree, half the ADRs) lives only in one uncommitted
working copy. Fixing that is cheap and is the top priority.

### Maturity scorecard

| Dimension | Rating | One-line justification |
|---|---|---|
| Architecture | **Strong** | Clean two-tier BFF + hexagonal backend; strict shared TS config; sensible boundaries. |
| Backend | **Strong** | Feature-sliced layering, mature schema, Result-type domain, breadth beyond MVP. |
| Frontend | **Solid (in flux)** | Modern stack, clean slices; ambitious redesign largely uncommitted; thin UI tests. |
| Security | **Strong** | Hashed opaque sessions, argon2, lockout, rate limits, helmet, log redaction, clean secrets. |
| Testing | **Developing** | ~193 backend tests + e2e, but no coverage measurement, thin SQL/component coverage. |
| DevOps / Ops | **Strong** | CI that truly gates; hardened monitoring; encrypted backups with tested restores. |
| Documentation | **Strong (with drift)** | ~27k lines, ADR discipline; several docs have drifted from code. |
| Repo hygiene | **Weak** | 35 modified + 198 untracked files; most of the product isn't on `main`. |

---

## 3. Product & architecture overview

A gym progress tracker: users log workouts (exercises, sets, reps, weight, RIR, rest, notes),
manage an exercise library and workout templates, and view analytics (per-exercise progress,
estimated 1RM, weekly training volume by muscle group with a 3D body heatmap).

**Two-tier architecture:**

- **Web (`apps/web`)** — Next.js 15.2.4 App Router (React 19, TypeScript, Tailwind v4). Acts as a
  presentation tier **and a same-origin Backend-for-Frontend (BFF) proxy**: 36 `route.ts` handlers
  under `apps/web/src/app/api/**` forward method/headers/cookies/body to the backend and normalize
  failures to a `502 API_UNAVAILABLE` envelope (e.g. `apps/web/src/features/workouts/workout-api-proxy.ts`).
  The backend origin is never exposed to the browser. Auth is enforced server-side via
  `getCurrentUser()` (`apps/web/src/features/auth/server-auth.ts`) hitting `/auth/me`.
- **API (`apps/api`)** — Fastify 5 + Kysely (typed SQL, no ORM) + Postgres 17 + Zod + argon2.
  Composition root at `apps/api/src/main.ts`; dependency wiring (hexagonal-ish, ports injected) at
  `apps/api/src/server.ts`.

**Monorepo:** pnpm workspaces (`pnpm-workspace.yaml`, pnpm 10.11, Node ≥22), no Nx/Turbo. A shared
strict `tsconfig.base.json` governs both apps. `packages/*` is declared but intentionally empty —
the shared-package boundary is deferred by design. The web and API share no code; they communicate
only over HTTP through the BFF.

---

## 4. Backend assessment (`apps/api`)

**Strengths**

- **Consistent layering.** Every domain follows `routes → service → repository → schemas` with
  colocated tests (`apps/api/src/features/<domain>/`). Cross-cutting concerns live in
  `apps/api/src/shared/` (env, logger, mailer, metrics, events, request-logging, http-validation).
- **Disciplined API design.** ~40 versioned REST endpoints under `/api/v1`, consistent envelopes
  (`{ data }` on success, `{ error: { code, message, fields? } }` on failure). Zod `safeParse`
  per route with a shared 422 helper (`apps/api/src/shared/http-validation.ts`). The domain layer
  returns **Result types** (`{ ok, reason }`) rather than throwing — testable and explicit
  (`apps/api/src/features/workouts/workout.routes.ts`).
- **Mature Postgres schema** (`apps/api/db/migrations/`, 6 raw-SQL migrations; 13 tables typed in
  `apps/api/src/db/database.ts`). Rich CHECK constraints, partial unique indexes that encode real
  invariants (e.g. *one open workout per user*), case-insensitive functional indexes, soft deletes,
  and — notably — **deferred constraint triggers** plus a **legacy dual-write trigger** for a
  zero-downtime schema migration (`20260714120000000_add_exercise_muscles_and_workout_templates.sql`).
  This is careful migration engineering, not a beginner's schema.
- **Feature breadth beyond MVP** — 7 domains (`analytics, auth, exercises, health, templates,
  users, workouts`): full auth suite, workout logging, CSV import/export with abuse guards,
  exercise **merge** + a 468-line name-quality catalog subsystem, weekly-volume analytics.
- **Quality signals:** zero `TODO/FIXME`, zero `@ts-ignore`, zero `as any` in source; very strict
  TS; atomic multi-step writes via transactions.

**Gaps → roadmap**

- **No global error / 404 handler.** Unexpected exceptions and unmatched routes fall back to
  Fastify's default shape, breaking the `{ error: { code, message } }` contract. *→ Add
  `setErrorHandler` + `setNotFoundHandler` (P1).*
- **Per-handler auth guard.** Each protected route calls `authenticateRequest(...)` individually;
  a new route that forgets it is silently public ("default-open"). *→ Move to a default-deny
  preHandler/plugin (P1).*
- **Transitional DB duplication.** The in-flight muscle-schema migration leaves legacy
  `exercise_secondary_muscles` + `primary_muscle_group_id` alongside the new `exercise_muscle_groups`.
  *→ Finish the migration and drop the legacy columns (P2).*
- Minor: mild login timing oracle (missing-user path skips argon2 verify); no CSRF token (relies on
  `SameSite=lax` + JSON API — acceptable, worth noting).

---

## 5. Frontend assessment (`apps/web`)

**Strengths**

- **Modern, disciplined stack.** Next 15 App Router + React 19 + strict TS; Tailwind v4 CSS-first
  design tokens in `apps/web/src/app/globals.css`; TanStack Query v5 as the single client-state
  layer over a typed fetch wrapper (`apps/web/src/shared/api/client.ts`). ESLint sets
  `no-explicit-any: error` and the codebase honors it.
- **Clean feature-slice architecture** — 14 slices, each separating proxy / hooks / pure logic / UI.
  Server-component auth guard applied uniformly; consistent loading/empty/error states via a shared
  primitive library (`apps/web/src/shared/ui/ui.tsx`).
- **Ambitious, real redesign.** The "Aether" design system (HUD/cockpit aesthetic) is implemented
  and wired in, including a sidebar app shell (`apps/web/src/features/shell/app-shell.tsx`) and a
  3D/WebGL volume heatmap + avatar (~4,700 LOC Three.js) loaded via `dynamic(ssr:false)` with
  graceful non-WebGL fallbacks.

**Gaps → roadmap**

- **The redesign is largely uncommitted** (see §11) — the biggest risk on this tier is delivery,
  not design. *→ Commit it (P0).*
- `reactStrictMode: false` (`apps/web/next.config.ts`) suppresses React's double-invoke effect
  checks — worth revisiting given the WebGL lifecycles. *→ Re-enable and fix fallout (P2).*
- **WebGL cost** is the top runtime risk on gym phones (bundle size + mobile GPU); mitigated by
  dynamic import + fallbacks but unproven on real devices.
- **Two design systems in-tree** (archived `cockpit` vs live Aether) pending the planned cleanup;
  a couple of intentional placeholders (unwired PR-celebration pulse, synthetic "biometrics" panel).
- **Thin UI test coverage:** no component/DOM tests on a from-scratch UI; e2e is Chromium-only.

---

## 6. Security posture

Consistently strong and above what the project's scale requires:

- **Sessions:** opaque 32-byte tokens; only a SHA-256 **hash** is stored in `user_sessions`, the raw
  token lives solely in an httpOnly, `SameSite=lax`, prod-secure cookie. DB compromise yields no
  usable tokens.
- **Passwords:** argon2 hashing; signup requires ≥10 chars.
- **Brute-force:** failed-attempt counter with lockout (10 attempts / 15 min).
- **Account tokens:** email verification + password reset use hashed, single-use, expiring tokens;
  reset revokes all sessions and clears failures.
- **No user enumeration:** forgot-password and signup return generic responses.
- **Perimeter:** global + strict per-route rate limits; `@fastify/helmet`; `trustProxy` derived from env.
- **Secrets hygiene (a clear strength):** no secrets tracked; layered `.gitignore`/`.dockerignore`/
  `.claudeignore`; thorough pino **log redaction** (cookies, auth, password, token, email,
  `DATABASE_URL`); docker-secrets-from-files; hardened + digest-pinned monitoring containers;
  loopback-bound Postgres/API.

Residual low-severity items: the login timing oracle and absent CSRF token (§4).

---

## 7. Testing & quality

- **Runners:** native `node:test` + tsx on both apps; Playwright for web e2e.
- **Backend:** ~24 test files, ~193 tests, ~5,671 test LOC vs ~9,630 source LOC (~0.59 ratio);
  routes and services covered per feature.
- **Frontend:** Playwright e2e (4 specs, incl. a thorough templates journey) + 8 pure-logic unit tests.
- **Zero-tolerance lint** (`--max-warnings=0`) and a clean marker profile (no `any`/`@ts-ignore`/TODO).

**Gaps → roadmap**

- **No coverage measurement anywhere** — testing is present but its extent is unquantified. *→ Add
  coverage reporting as a visible floor, not yet a hard gate (P1).*
- Backend has **only 1 integration + 1 performance test**; repositories (the trickiest SQL layer:
  partial indexes, triggers, transactions) are thinly tested directly. *→ Add a few
  repository/integration SQL tests (P2).*
- **No component/DOM tests** on a from-scratch UI; e2e is single-browser. *→ Add a handful of
  component tests; broaden e2e beyond Chromium (P2).*

---

## 8. DevOps, infrastructure & operations

**Strong for a solo project.**

- **CI that genuinely gates** (`.github/workflows/repo-checks.yml`, 3 jobs): `git diff --check`,
  type-check, lint (0 warnings), unit tests, performance regression, a Postgres **integration** job,
  and a **browser smoke** job — plus doc-presence and scaffolding guards. This is a real gate, not a
  token lint job.
- **Local orchestration:** `compose.yaml` (Postgres 17, one-shot migrate, api, web; loopback-bound
  data services) from a multi-stage `Dockerfile`.
- **Hardened monitoring overlay** (`compose.monitoring.yaml`, opt-in): Prometheus/Grafana/
  Alertmanager/exporters on an `internal: true` network, **27 alert rules**, docker-secrets-from-files,
  read-only + `cap_drop: ALL` + digest-pinned containers, loopback-bound Grafana.
- **Backups / DR:** encrypted Restic backups with isolated restore-test scripts, systemd timers, and
  DR runbooks under `docs/server/` (claimed 24h RPO / 4h RTO, reboot-verified).

**Gaps → roadmap**

- **No coverage in CI; no CD** (the pipeline validates but doesn't deploy).
- **Three parallel deploy paths** (local compose / Render / home-server waves) + 3 Dockerfiles is a
  lot for one maintainer to keep in sync; the Render path is retained-but-inactive and may bit-rot.
  *→ Pick one primary target, mark the others explicitly secondary (P2).*

---

## 9. Documentation & decision record

- **~27k lines of cross-referenced Markdown**: a numbered `docs/` spine (00–17 + 99), root docs
  (`README`, `ARCHITECTURE`, `ENGINEERING`, `CONTRIBUTING`, `AGENTS`, `CODEBASE`, `CLAUDE`), and a
  full server runbook system under `docs/server/`.
- **10 ADRs** (`docs/decisions/0001`–`0010`) with a consistent Status/Context/Decision/Consequences
  template and an enforced "ADR gate" — genuinely disciplined for a solo project.

**Drift → roadmap** (documentation describes the working tree, not always the code or `main`):

- `docs/git-pipeline.md` is referenced (in `ARCHITECTURE.md` and `docs/repository-structure.md`) but
  **does not exist**.
- `ARCHITECTURE.md` lists 5 API features; there are actually **7** (`templates`, `users` missing) —
  and it disagrees with the (correct) `docs/repository-structure.md`.
- `docs/status/server-status-gym-prod.md` still claims the stack uses **"Turborepo"** and **"Prisma"**
  — neither is true.
- `CODEBASE.md` is an aged snapshot (lists 3 migrations; there are 6).
- Documented but unresolved `PATCH/DELETE /api/v1/workouts/:id` contract drift
  (`docs/status/privat-beta-readiness.md`).

*→ Reconcile these in one pass (P1).*

---

## 10. Where the product stands

Measured against the project's own `docs/status/privat-beta-readiness.md`, this is a
**private-beta candidate, not yet SaaS-ready**. The engineering foundation is strong; the missing
pieces are product-lifecycle, not architecture: account settings / **account deletion & export**
(not built), onboarding, proven production operation, and real mobile-device QA
(390/430/1440px). That is an honest and accurate self-assessment.

---

## 11. Risk register (ranked)

| # | Risk | Severity | Notes |
|---|---|---|---|
| 1 | **Uncommitted reality** | **High** | 35 modified + **198 untracked** files. `main` (HEAD) contains only **5 of 14** web feature slices, only ADRs **0001–0005**, and **no `ops/` tree**. A fresh clone of `origin/main` would not contain the redesign, the ops/monitoring/backup stack, or half the decision record — even though the docs describe them as present. Data-loss exposure, no history, no review trail. |
| 2 | Doc ↔ code drift | Medium | Missing/stale references (§9) erode trust in otherwise excellent docs. |
| 3 | No coverage measurement | Medium | Strong testing, but its extent is unquantified. |
| 4 | Bus factor of one + 3 deploy paths | Medium | Knowledge and delivery concentrated in a single working copy. |
| 5 | WebGL mobile-GPU / bundle cost | Medium | Top runtime risk on target devices; unproven on real phones. |
| 6 | Transitional DB duplication + no global error handler | Low–Med | Latent tech debt; envelope-consistency gap on unexpected errors. |
| 7 | Committed `.DS_Store`, commit-style vs. own guide, direct-to-`main` flow | Low | Hygiene polish. |

---

## 12. Prioritized action backlog

Effort/impact are rough (S/M/L effort; ↑ high / → medium impact).

### P0 — do first
- **Commit the working tree in reviewable chunks** so the repo matches reality and gains history +
  backup: (a) the frontend rework, (b) the entire `ops/` tree, (c) ADRs 0006–0010, (d) the new
  shared backend modules (`apps/api/src/shared/events.ts`, `http-validation.ts`), (e) the new e2e
  spec. **Effort M · Impact ↑** — this single step retires the #1 risk.

### P1 — near-term
- Add a global Fastify **error + 404 handler** to preserve the error envelope. *Effort S · Impact →*
- Add **coverage measurement** (report a floor; don't gate yet). *Effort S · Impact →*
- **Reconcile doc drift** in one pass (create/remove `git-pipeline.md`, fix the API-feature list,
  correct the Turborepo/Prisma claims, refresh `CODEBASE.md`, resolve the workouts contract). *Effort M · Impact →*
- Introduce a **default-deny auth plugin** so new routes are protected by default. *Effort S · Impact ↑*

### P2 — when convenient
- Finish the **muscle-schema migration** and drop legacy columns/triggers. *Effort M · Impact →*
- Add **repository/integration SQL tests** and a **handful of component tests**; broaden e2e beyond
  Chromium. *Effort M · Impact →*
- Re-enable `reactStrictMode` and fix fallout. *Effort S · Impact →*
- Delete `_legacy-reference/` after Phase 3 sign-off; remove committed `.DS_Store` files; pick one
  primary deploy target. *Effort S · Impact →*

---

## Appendix — key evidence paths

- **Backend:** `apps/api/src/server.ts`, `apps/api/src/main.ts`, `apps/api/src/features/**`,
  `apps/api/db/migrations/**`, `apps/api/src/db/database.ts`, `apps/api/src/shared/**`.
- **Frontend:** `apps/web/src/app/api/**/route.ts`, `apps/web/src/features/**`,
  `apps/web/src/shared/ui/ui.tsx`, `apps/web/src/app/globals.css`, `apps/web/next.config.ts`.
- **Repo / ops:** `.github/workflows/repo-checks.yml`, `pnpm-workspace.yaml`, `tsconfig.base.json`,
  `compose.monitoring.yaml`, `ops/**`, `docs/decisions/**`, `docs/status/**`,
  `docs/00-workflow.md`, `docs/99-current-project-state.md`.
