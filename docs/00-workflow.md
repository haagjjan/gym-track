# Gym Progress Tracker – Full Workflow Roadmap

## Current Progress

- Phases 0-7 are implemented for the current foundation: repository setup, MVP docs, query/data/schema planning, stack decisions, local tooling, Docker Compose local app orchestration, and SQL migrations.
- Phase 8 is implemented for the current MVP API foundation: health, auth, workout session, exercise library, muscle group lookup, workout logging, set, and analytics routes exist.
- Phase 9 has started with a minimal Next.js shell, the first auth UI slice, the first workout logging UI slice, workout history/detail UI, and analytics UI.
- Phase 10 is implemented for the current foundation with unit tests, pure-function performance regression suites, an API database integration flow, a Playwright web smoke flow, and GitHub Actions jobs that run project and performance checks.
- Phase 11 is implemented for the active private `gym-prod` environment: the deployment target ADRs, Render alternative, home-server Compose deployment, private Caddy boundary, structured logs, Prometheus metrics and alerts, private Grafana dashboards, Telegram notifications, encrypted off-machine Restic backups, isolated restore tests, and recovery runbooks are in place. Custom domains, public HTTPS, hosted production credentials, and first public tester launch execution remain future work.
- Phase 12 now includes normalized multi-muscle exercise classification, the shared exercise picker, and ordered exercise-only workout templates with explicit session copy/update semantics.
- Phase 13 implements the usability-audit-v2 remediation plus the audit-v3 refinements: aligned list actions, app-dialog exercise-name review, one plotted Progress set per local day, proportional Volume bars with inspectable ranges, staged multi-exercise adding, and separate live exercise/set modes.
- Phase 14 implements the audit-v4 beta refinements: honest `Gym Progress Tracker` chrome and semantic colors, tab-session facet persistence, an in-app canonical CSV guide, staged catalog selection for sessions/templates, exercise editability filtering, range-aware Progress totals/tonnage, mobile-safe Volume gestures, and live-session bottom-sheet/timer/header discovery refinements. Broader import/export, exercise naming, and history-reset rework remains post-beta.
- Phase 15 implements the Private Beta 1 remediation: previous-performance context/prefill, keyboard-safe set entry and complete set editing, fixed paginated exercise picking, a reviewed 820-exercise system catalog with alias/trigram search, corrected set colors/navigation/tab stability, and a focused completion summary. Final device QA and the capped public-beta workstreams remain.
- Stage 1 repository readiness implements fail-closed production registration, the
  `https://app.gymtrack.ch` canonical origin, secure-cookie enforcement, and same-origin
  host/CSRF protection. DNS, Cloudflare Access/Tunnel, server configuration, deployment,
  and external verification remain operator work.
- Goal 3 is complete. The exact green release `4a4fccdae263126ceda164a792059514123f957f`
  runs in a separate production-shaped owner-only staging Compose/Caddy topology with synthetic
  data, real Cloudflare Access/Tunnel and Resend delivery, strict recipient containment, verified
  migrations/restoration/rollback, black-box edge checks and a complete admission/product flow.
  Production remained healthy throughout. This is staging evidence, not production-launch proof;
  Goal 4 and later production gates remain next.
- Goal 4 pre-deployment verification is in progress. Dependency and runtime-image hardening,
  fresh migrations/integration, hardened-image Chromium/Firefox flows, monitoring syntax and a
  guarded 20/40-concurrent-logger preflight pass locally. Production backup transport now runs as
  a persistent, loopback-bound macOS launch agent; strict 30-day maintenance, fresh backup,
  newest-snapshot restores and the older-snapshot/newest-ledger replay all passed. The application
  hardening and restore batch is committed as
  `16d013347e577df7f3d0d017358cbc86f91a27f0`; its focused staging revalidation remains open.
  Provider/legal values, FBX rights/removal, production black-box, status and physical-device
  gates also remain. See
  `docs/beta-process/public-beta/goal-4/goal-4-production-verification.md`.

## Phase 0 — Project Setup & Working Style

### Goal
Have a repo that feels like a real project from day 1: versioned, documented, reproducible.

### Deliverables
- Local folder + Git initialized
- Basic repo structure (`docs/`, `README.md`, `.gitignore`)
- First commits exist (`git log` shows history)

### Commands (typical)
- `mkdir`, `cd`, `git init`, `git add`, `git commit`

### Notes

---

## Phase 1 — Product Spec (MVP Definition)

### Goal
Define what users can do in the first version without bloating the scope.

### Deliverables (docs)
- `docs/01-requirements.md`
  - MVP features (must-have)
  - Later features (nice-to-have)
  - Non-goals (what we explicitly skip for now)
  - A short list of user flows:
    - Create account/login
    - Log workout session
    - Add exercises + sets
    - View past sessions
    - View exercise progress chart
    - View weekly sets per muscle group

### “Done” check
- You can describe the app in 5–10 bullet points and it’s unambiguous.

---

## Phase 2 — DB-Driven Spec (Query List)

### Goal
Design the database like a real app: start from what the UI needs to query.

### Deliverables (docs)
- `docs/02-query-list.md`
  - Dashboard queries (recent sessions)
  - History queries (date ranges)
  - Session detail (ordered exercises/sets)
  - Logging actions (insert/update/delete/reorder)
  - Exercise library (defaults + custom)
  - Analytics (progress per exercise + weekly sets per muscle)

### “Done” check
- Each screen/feature maps to an explicit query (inputs, outputs, filters, sorting).

---

## Phase 3 — Data Model Notes (Rules & Decisions)

### Goal
Capture business rules + tricky decisions so schema doesn’t drift.

### Deliverables (docs)
- `docs/03-data-model-notes.md`
  - Ordering rules (exercise position, set order)
  - What is computed vs stored (e.g., “difference to last set” computed)
  - Units policy (store kg internally; UI converts)
  - Soft delete policy (`deleted_at` vs hard delete)
  - Muscle attribution rules (MVP: primary muscle only; later: secondary)

### “Done” check
- You can answer “why is the schema designed this way?” without guessing.

---

## Phase 4 — Schema Draft (ERD-level)

### Goal
Turn queries into tables, relationships, constraints, and indexes.

### Deliverables (docs)
- `docs/04-schema-draft.md`
  - Tables: `users`, `sessions`, `session_exercises`, `sets`, `exercises`, `muscle_groups` (+ optional)
  - Primary keys, foreign keys
  - Constraints (`NOT NULL`, `CHECK`s, `UNIQUE`)
  - Index strategy tied to queries
  - Notes on future extensions

### “Done” check
- Schema supports every query in `02-query-list.md` cleanly.

---

## Phase 5 — Tech Stack Decision (Minimum)

### Goal
Pick a stack that you can implement and ship.

### Decisions
- Database: PostgreSQL
- Backend/API: Fastify on TypeScript
- Frontend: Next.js App Router
- Workspace/tooling: pnpm workspaces, strict TypeScript, ESLint
- Database access/migrations: Kysely and `node-pg-migrate`
- Auth: owned email/password auth with Argon2 and DB-backed opaque sessions

### “Done” check
- You can run a server locally, connect to DB, and build API endpoints.

---

## Phase 6 — Local Dev Environment & Tooling

### Goal
Make it reproducible like a real team project.

### Deliverables
- DB running locally (often via Docker)
- Environment variables (`.env`, never committed)
- Migrations tool configured (important!)
- Seed script for defaults (muscle groups, base exercises)

### “Done” check
- A fresh clone can be set up with 3–5 commands.

### Status
- Implemented with pnpm workspace tooling, Docker Compose PostgreSQL/API/web orchestration, `.env.example`, and migration commands.

---

## Phase 7 — Implement DB Migrations (Schema in SQL)

### Goal
Create real tables using migration files (not manual DB editing).

### Deliverables
- Migration 001: core tables + constraints
- Migration 002: seeds / default data
- Optional migrations for later features

### “Done” check
- `migrate up` creates schema from scratch; `migrate down` can rollback.

### Status
- Implemented for the core schema and muscle group seed migrations under `apps/api/db/migrations`.

---

## Phase 8 — API Contract & Endpoints

### Goal
Define a stable interface between UI and DB.

### Deliverables
- `docs/05-api-contract.md` (or OpenAPI)
- Endpoints:
  - Auth (signup/login)
  - Sessions (create/list/detail)
  - Session exercises (add/reorder)
  - Sets (add/edit/delete)
  - Exercises (list/create custom)
  - Analytics (exercise progress, weekly sets per muscle)

### “Done” check
- Each endpoint maps to a query from Phase 2.

### Status
- Implemented for the current MVP foundation. Health, auth, workout session, exercise library, muscle group lookup, workout logging, set editing, and analytics endpoints exist.

---

## Phase 9 — UI MVP

### Goal
A clean, usable web app that covers core flows.

### Screens
- Login/Signup
- Dashboard (recent workouts)
- Workout logging screen (session + exercises + sets)
- Workout history list + detail view
- Exercise progress page (chart + table)
- Weekly muscle group volume (simple chart)

### “Done” check
- A user can complete the full workflow without using admin tools.

### Status
- Started with signup, login, logout, authenticated home state, first workout logging UI, workout history/detail UI, and analytics UI.

---

## Phase 10 — Testing & Quality Basics

### Goal
Stop regressions and build confidence.

### Deliverables
- Minimal unit tests (e.g., API validation)
- Integration tests for key flows (optional)
- DB constraints catch invalid input

### “Done” check
- Core flows are tested and breakages are caught early.

### Status
- Implemented for the current foundation. API health/auth/workout/exercise/logging/analytics unit tests, API/web performance regression suites, an API database integration test, a Playwright web smoke test, root `pnpm check`, root `pnpm test:performance`, and GitHub Actions jobs exist.

---

## Phase 11 — Deployment (Small Batch Users)

### Goal
Run it online for a small set of testers.

### Deliverables
- Hosting (Render/Fly.io/Vercel/etc. depending on stack)
- Managed DB (or hosted Postgres/MySQL)
- Basic monitoring/logging
- Backup plan for DB

### “Done” check
- A user can sign up and use the app remotely.

### Status
- Implemented for private production. ADR 0005 retains Render as an alternative; ADRs 0008 through 0010 record private observability, the active `gym-prod` target, and encrypted Restic backups. The home server has a private-LAN proxy, structured logs, six healthy Prometheus targets, 27 alert rules, provisioned Grafana dashboards, tested Telegram delivery, encrypted off-machine snapshots, isolated PostgreSQL and configuration restores, and reboot-verified backup timers. Hosted credentials, custom domains, public HTTPS, and the first public tester launch remain.

---

## Phase 12 — Iteration & v1 Improvements

### Likely next upgrades
- Broader data import/export UX beyond the implemented canonical CSV flow and format guide
- Intelligent exercise-name conventions and spelling suggestions beyond the current quality gate
- User-controlled complete workout-history reset
- Better muscle attribution (secondary muscles + weighting)
- Advanced template planning, folders, or sharing beyond ordered exercise-only templates
- PR detection (rep PR, weight PR)
- 1RM estimation options
- RPE support (if desired)
- Better analytics + dashboards

---

## Phase 13 — Curated Founding Beta

### Goal

Admit at most 50 Switzerland-resident, English-speaking adult founding members through an owner-curated invitation flow with transparent data handling and reversible grace-period deletion.

### Status

Repository foundation implemented: invite-only access and runtime controls, explicit admin authorization/audit, waitlist and PII-free alerts, export/deletion/erasure ledger, privacy/device controls, onboarding/help, in-app campaigns, public policy/support routes, external status source, signed client attribution, strict backup retention, ADRs and test coverage. Launch remains blocked on every unchecked item in `docs/public-beta/launch-gates.md`, especially qualified legal/DPIA approval and deployed operational evidence.
