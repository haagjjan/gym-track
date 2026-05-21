# Implementation Start Handoff

## Purpose

This is the historical implementation handoff for the foundation batches. Use `docs/08-next-implementation-plan.md` for current fresh-session implementation planning.

This document records the staged implementation handoff that started the app foundation. The first batches have now moved beyond planning: Phase 6 tooling, Phase 7 migrations, the production-like local Compose runner, the API health foundation, the API auth foundation, the first auth UI slice, the Workout Sessions API slice, the Exercise Library API slice, and the Workout Logging API slice are implemented. Future work should continue from the current status in `README.md`, `docs/00-workflow.md`, `docs/repository-structure.md`, and `docs/08-next-implementation-plan.md`.

## Historical Copy-Paste Prompt

The prompt below is preserved for context only. Do not use it for current implementation work; use `docs/08-next-implementation-plan.md` instead.

```md
We are starting implementation for the Gym Progress Tracker.

First, read these docs before changing files:
- AGENTS.md
- README.md
- ARCHITECTURE.md
- ENGINEERING.md
- CONTRIBUTING.md
- docs/git-pipeline.md
- docs/00-workflow.md
- docs/01-requirements.md
- docs/02-query-list.md
- docs/03-data-model-notes.md
- docs/04-schema-draft.md
- docs/05-api-contract.md
- docs/06-implementation-start.md
- docs/decisions/0002-application-stack.md
- docs/decisions/0003-framework-tooling.md
- docs/decisions/0004-implementation-readiness.md

Please implement Phase 6 only: local dev environment and root tooling foundation.

Scope:
- Create the pnpm workspace root.
- Add root TypeScript/tooling config.
- Add Docker Compose PostgreSQL setup.
- Add `.env.example` but do not create or commit real `.env` files.
- Add the initial `apps/api` and `apps/web` folders only with real minimal scaffold files needed for tooling.
- Add basic install/build/type-check/lint scripts if practical.
- Do not implement database schema migrations yet.
- Do not implement auth, API endpoints, UI screens, business logic, or generated placeholder systems.
- Keep commits small and specific.
- Run relevant checks before handoff.
- Push commits to `origin/main` after successful verification.

Expected commit shape:
1. `Scaffold pnpm workspace`
2. `Add local Postgres development setup`
3. `Add initial app tooling foundations`

Before final handoff, confirm:
- `git diff --check` passes.
- install/check commands were run or any skipped checks are explained.
- no unrelated files were changed.
```

## Step-By-Step Implementation Strategy

1. First implementation batch: Phase 6 only
   - Status: implemented.
   - Root `package.json`, `pnpm-workspace.yaml`, and base TypeScript config.
   - Minimal `apps/api` and `apps/web` folders only with real tool-owned files.
   - Docker Compose Postgres and `.env.example`; later expanded into full local API/web orchestration.
   - No migrations, endpoints, auth, UI, or business logic yet.

2. Second implementation batch: database migration foundation
   - Status: implemented in `apps/api/db/migrations`.
   - Configure `node-pg-migrate`.
   - Add migration commands.
   - Add first schema migration based on `docs/04-schema-draft.md`.
   - Add seed migration/data for muscle groups.
   - Verify migrate up/down locally.

3. Third implementation batch: API foundation
   - Status: implemented for server startup, environment validation, Kysely database connection, and health.
   - Fastify server skeleton.
   - Environment validation with Zod.
   - Database connection boundary.
   - Health route only.
   - No full auth or workout routes yet.

4. Fourth implementation batch: auth foundation
   - Status: API foundation implemented for signup, login, logout, and current-user lookup.
   - User signup, login, logout, and current-user routes.
   - Argon2 password hashing.
   - DB-backed opaque sessions with HttpOnly cookies.
   - Integration tests for auth/session behavior.

5. Fifth implementation batch: workout MVP API
   - Status: started. Workout Sessions API, Exercise Library API, and Workout Logging API are implemented; analytics remain.
   - Workout sessions, session exercises, sets, and exercise library.
   - Soft delete behavior.
   - Ordering behavior.
   - Query-backed analytics endpoints after core logging works.

6. Sixth implementation batch: web MVP
   - Status: started with signup, login, logout, and authenticated home state.
   - Next.js app shell.
   - Auth screens.
   - Workout logging screen.
   - History/detail views.
   - Progress and weekly volume views.

## Avoid In The First Implementation Chat

- Do not ask Codex to build the whole app at once.
- Do not combine workspace scaffold, full schema, API routes, and UI in one batch.
- Do not create broad empty folders just to match the future structure.
- Do not accept placeholder services, fake abstractions, or unused generated code.
- Do not add deployment config yet.

## Done Criteria For The First Implementation Chat

- A fresh clone can install dependencies and start local infrastructure.
- The repo has a real pnpm workspace foundation.
- Local Postgres setup is documented through `.env.example` and Compose config.
- Basic tooling commands exist and pass, or skipped checks are clearly explained.
- Commits are small, specific, and pushed.

Status: completed by the foundation implementation batches.
