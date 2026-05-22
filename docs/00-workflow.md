# Gym Progress Tracker – Full Workflow Roadmap

## Current Progress

- Phases 0-7 are implemented for the current foundation: repository setup, MVP docs, query/data/schema planning, stack decisions, local tooling, Docker Compose local app orchestration, and SQL migrations.
- Phase 8 is in progress: the API contract exists, health, auth, workout session, exercise library, muscle group lookup, workout logging, and set routes are implemented, and analytics endpoints remain.
- Phase 9 has started with a minimal Next.js shell, the first auth UI slice, the first workout logging UI slice, and workout history/detail UI. Analytics screens remain.
- Phase 10 has started with unit tests and `pnpm check`; broader integration/UI coverage and full CI are still future work.
- Phases 11-12 are not started.

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
- Use short commits often.

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
- In progress. Health, auth, workout session, exercise library, muscle group lookup, workout logging, and set editing foundations are implemented. Analytics endpoints remain.

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
- Started with signup, login, logout, authenticated home state, first workout logging UI, and workout history/detail UI. Analytics screens remain.

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
- Started. API health/auth/workout/exercise/logging unit tests and root `pnpm check` exist. Broader API/database integration tests, UI tests, and full CI remain.

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

---

## Phase 12 — Iteration & v1 Improvements

### Likely next upgrades
- Better muscle attribution (secondary muscles + weighting)
- Templates (saved workouts)
- PR detection (rep PR, weight PR)
- 1RM estimation options
- Import/export (CSV)
- RPE support (if desired)
- Better analytics + dashboards
