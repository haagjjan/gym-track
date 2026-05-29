# Current Project State

This note is a compact handoff for a model that cannot inspect the repository directly. It summarizes the current codebase as it exists now, not the original MVP plan.

## 1. Current Stack And Repo Structure

- Monorepo uses `pnpm` workspaces and strict TypeScript.
- API: Fastify + Kysely + PostgreSQL + Zod + `node-pg-migrate` + Argon2.
- Web: Next.js App Router + React + Recharts + Zod.
- Local orchestration: Docker Compose for PostgreSQL, migrations, API, and web.
- Deployment target: Render Blueprint with Docker-backed web/API services and Render PostgreSQL.

Repo layout:

- `apps/api` owns the Fastify API, database access, migrations, and API tests.
- `apps/web` owns the Next.js app, route handlers, feature UI, and Playwright smoke coverage.
- `docs` owns requirements, schema/API docs, implementation notes, deployment notes, and ADRs.
- Root files own workspace/tooling/CI: `package.json`, `pnpm-workspace.yaml`, `compose.yaml`, `render.yaml`, `playwright.config.ts`.

## 2. What Is Already Implemented

- Core documentation and architecture decisions are in place.
- Local dev foundation exists: workspace tooling, Docker Compose, PostgreSQL migrations, and `.env.example`.
- API foundation exists: health check, environment validation, database connectivity, logging, and server bootstrap.
- Auth is implemented: signup, login, logout, current-user lookup, Argon2 hashing, DB-backed opaque sessions, secure cookie support.
- Workout sessions are implemented: create, list, detail, end.
- Exercise library is implemented: list selectable exercises, create or restore shared exercises, list seeded muscle groups.
- Workout logging is implemented: add/reorder/delete session exercises, add/update/delete sets.
- Analytics is implemented: completed-exercise navigation, exercise progress, exercise summary, weekly muscle volume.
- CSV workout import/export is implemented on the API and wired into the web UI.
- Web UI exists for signup/login/logout, authenticated home state, workout logging, workout history/detail, Progress, Weekly Volume, and CSV import/export controls.
- Quality gates exist: unit tests, API database integration tests, Playwright smoke tests, GitHub Actions checks.
- Deployment and operations support exist: Render config, runbook, and structured API logging.

## 3. Important Files And What They Do

- `README.md`: high-level project overview, local run commands, and current status summary.
- `docs/00-workflow.md`: phase roadmap and what is considered implemented.
- `docs/01-requirements.md`: MVP scope and user flows.
- `docs/02-query-list.md`: DB-driven query requirements that shaped the schema.
- `docs/03-data-model-notes.md`: business rules such as soft deletes, ordering, metric units, and set rules.
- `docs/04-schema-draft.md`: PostgreSQL schema draft and query mapping.
- `docs/05-api-contract.md`: draft REST contract for auth, workouts, exercise library, and analytics.
- `docs/07-implementation-pattern.md`: feature-slice pattern for API and web code.
- `docs/08-next-implementation-plan.md`: fresh-session handoff; currently recommends small-batch launch execution.
- `docs/deployment-runbook.md`: Render deployment, migration, backup, restore, and monitoring checklist.
- `apps/api/src/server.ts`: wires Fastify plugins, repositories, and feature routes together.
- `apps/api/src/main.ts`: process startup, env loading, DB connection, and graceful shutdown.
- `apps/api/src/features/*`: feature-owned API slices for auth, workouts, exercises, analytics, health, and CSV import/export.
- `apps/web/src/app/*`: Next.js routes for home, auth, workouts, progress, weekly-volume, and proxy endpoints.
- `apps/web/src/features/*`: feature-owned browser logic and UI for auth, workouts, and analytics.
- `apps/web/e2e/auth-workout-smoke.spec.ts`: browser smoke flow for the local stack.
- `apps/api/db/migrations/*`: SQL migrations for the core schema and muscle-group seed data.

## 4. Existing Docs And Notes That Matter

- `AGENTS.md`, `ARCHITECTURE.md`, `ENGINEERING.md`, and `CONTRIBUTING.md` define the working rules for agents and contributors.
- `docs/repository-structure.md` is the source of truth for where files belong.
- `docs/decisions/0002-application-stack.md` through `0005-deployment-target.md` record the accepted stack and deployment direction.
- `docs/Statusupdate-Whiteboxtesting.md` is a loose testing/status note and appears less authoritative than the roadmap docs.
- The roadmap docs still describe the project in phase language; `docs/08-next-implementation-plan.md` is the freshest implementation handoff.
- `README.md` has been updated to reflect the more recent implemented slices, including CSV import/export and the split Progress/Weekly Volume screens.

## 5. Current Tests And Commands

Root scripts in `package.json`:

- `pnpm check` runs type-check, lint, tests, and build.
- `pnpm test` runs package tests.
- `pnpm test:integration` runs API database integration tests.
- `pnpm smoke:web` runs Playwright smoke tests.
- `pnpm start` launches the full Docker Compose stack.
- `pnpm dev:api` and `pnpm dev:web` run the two apps in development mode.
- `pnpm migrate:up`, `pnpm migrate:down`, `pnpm migrate:redo`, `pnpm migrate:create` manage migrations.

Relevant repo checks:

- `git diff --check`
- `git status --short`
- GitHub Actions runs project checks, API integration tests, and web smoke tests.

## 6. Open TODO / FIXME / NOTE Comments

- No actionable `TODO` or `FIXME` comments were found in tracked app source or docs.
- The only tracked-source `NOTE` found was in `apps/web/next-env.d.ts`: it says the generated file should not be edited.
- `TODO` comments also exist in `.git/hooks/sendemail-validate.sample`, but that file is a Git sample hook, not application code.

## 7. Next Sensible Implementation Steps

- Follow `docs/08-next-implementation-plan.md`; the recommended next slice is small-batch launch execution.
- That means: get the current feature set ready for a first tester batch, validate the Render setup, and use the runbook to smoke-test the deployed stack.
- After launch, the obvious follow-up work is shaped by tester feedback and the open operational items: custom domain strategy, monitoring thresholds, and backup/restore cadence.

## 8. Known Risks Or Unclear Parts

- Some roadmap docs lag the code. For example, the older workflow docs do not fully mention CSV import/export or the split Progress/Weekly Volume UI, while `README.md` and `docs/08-next-implementation-plan.md` are more current.
- `docs/01-requirements.md` still reads like an early draft in places, so treat it as requirement history plus current MVP intent, not a perfect implementation ledger.
- The app now includes more implemented slices than the original MVP docs initially described, so the safest source for “what next” is `docs/08-next-implementation-plan.md` plus the current code tree.
- Hosted credentials, custom domains, email verification, password reset, and tester launch execution are still not implemented.

