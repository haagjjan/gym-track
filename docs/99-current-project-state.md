# Current Project State

This note is a compact handoff for a model that cannot inspect the repository directly. It summarizes the repository as it exists now, not the original MVP plan.

## 1. Current Stack And Repo Structure

- Monorepo uses `pnpm` workspaces and strict TypeScript.
- API stack: Fastify, Kysely, PostgreSQL, Zod, `node-pg-migrate`, and Argon2.
- Web stack: Next.js App Router, React, and feature-owned UI modules.
- Local orchestration: Docker Compose for PostgreSQL, migrations, API, and web.
- Deployment target: Render Blueprint with Docker-backed web/API services and Render PostgreSQL.

Repo layout:

- `apps/api` owns the Fastify API, database access, migrations, and API tests.
- `apps/web` owns the Next.js app, route handlers, feature UI, and Playwright smoke coverage.
- `docs` owns requirements, schema/API docs, implementation notes, deployment notes, and ADRs.
- Root files own workspace/tooling/CI: `package.json`, `pnpm-workspace.yaml`, `compose.yaml`, `render.yaml`, `playwright.config.ts`.

## 2. What Is Already Implemented

- Core documentation and architecture decisions are in place.
- Local dev foundation exists: workspace tooling, Docker Compose PostgreSQL/API/web orchestration, `.env.example`, and migration commands.
- API foundation exists: health check, environment validation, database connectivity, logging, and server bootstrap.
- Auth is implemented: signup, login, logout, current-user lookup, Argon2 hashing, DB-backed opaque sessions, secure cookie support.
- Workout sessions are implemented: create, list, detail, and end.
- Exercise library is implemented: list selectable exercises, create or restore shared exercises, and list seeded muscle groups.
- Workout logging is implemented: add/reorder/delete session exercises, add/update/delete sets.
- Analytics is implemented: completed-exercise navigation, exercise progress, exercise summary, and weekly muscle volume.
- CSV workout import/export is implemented on the API and wired into the web UI.
- Web UI exists for signup/login/logout, authenticated home state, workout logging, workout history/detail, Progress, Weekly Volume, and CSV import/export controls.
- Quality gates exist: unit tests, API database integration tests, Playwright smoke tests, and GitHub Actions checks.
- Deployment and operations support exist: Render config, deployment runbook, backup/restore checklist, monitoring checklist, and structured API logging.

## 3. Important Files And What They Do

- `README.md`: high-level project overview, local run commands, and current status summary.
- `docs/00-workflow.md`: phase roadmap and what is considered implemented.
- `docs/01-requirements.md`: MVP scope and user flows.
- `docs/02-query-list.md`: DB-driven query requirements that shaped the schema.
- `docs/03-data-model-notes.md`: business rules such as soft deletes, ordering, metric units, and set rules.
- `docs/04-schema-draft.md`: PostgreSQL schema draft and query mapping.
- `docs/05-api-contract.md`: REST contract for auth, workouts, exercise library, and analytics.
- `docs/07-implementation-pattern.md`: feature-slice pattern for API and web code.
- `docs/08-next-implementation-plan.md`: short fresh-session handoff; the old UX slice plan is superseded by the Stitch-based redesign docs.
- `docs/design/stitch-redesign-v2/DESIGN.md`: visual design-system reference for the Body Cockpit redesign.
- `docs/design/stitch-redesign-v2/design-notes.md`: screen behavior and UX reference for the Body Cockpit redesign.
- `docs/design/stitch-redesign-v2/implementation-roadmap.md`: current source of truth for UI redesign execution order and Codex slice boundaries.
- `docs/deployment-runbook.md`: Render deployment, migration, backup, restore, and monitoring checklist.
- `docs/decisions/`: architecture decision records for stack and deployment direction.
- `apps/api/src/server.ts`: wires Fastify plugins, repositories, and feature routes together.
- `apps/api/src/main.ts`: process startup, env loading, DB connection, and graceful shutdown.
- `apps/api/src/features/*`: feature-owned API slices for auth, workouts, exercises, analytics, and health.
- `apps/web/src/app/*`: Next.js routes for home, auth, workouts, progress, weekly-volume, and proxy endpoints.
- `apps/web/src/app/api/*`: same-origin proxy routes for auth, workouts, analytics, and CSV flows.
- `apps/web/src/features/*`: feature-owned browser logic and UI for auth, workouts, and analytics.
- `apps/web/e2e/auth-workout-smoke.spec.ts`: browser smoke flow for the local stack.
- `apps/api/db/migrations/*`: SQL migrations for the core schema and muscle-group seed data.

## 4. Existing Docs And Notes That Matter

- `AGENTS.md`, `ARCHITECTURE.md`, `ENGINEERING.md`, and `CONTRIBUTING.md` define the working rules for agents and contributors.
- `docs/repository-structure.md` is the source of truth for where files belong.
- `docs/decisions/0002-application-stack.md` through `0005-deployment-target.md` record the accepted stack and deployment direction.
- `docs/Statusupdate-Whiteboxtesting.md` is a loose testing/status note and appears less authoritative than the roadmap docs.
- The old roadmap docs still describe the project in phase language; `docs/08-next-implementation-plan.md` is now a short handoff pointer to `docs/design/stitch-redesign-v2/implementation-roadmap.md`.
- `README.md` reflects the current implementation more directly than the older phase docs, including CSV import/export and the split Progress/Weekly Volume UI.

## 5. Current Tests And Commands

Root scripts in `package.json`:

- `pnpm check` runs type-check, lint, tests, and build.
- `pnpm test` runs package tests.
- `pnpm test:integration` runs API database integration tests.
- `pnpm smoke:web` runs Playwright smoke tests.
- `pnpm start` launches the full Docker Compose stack.
- `pnpm dev:api` and `pnpm dev:web` run the two apps in development mode.
- `pnpm migrate:up`, `pnpm migrate:down`, `pnpm migrate:redo`, and `pnpm migrate:create` manage migrations.

Relevant repo checks:

- `git diff --check`
- `git status --short`
- GitHub Actions runs project checks, API integration tests, and web smoke tests.

## 6. Open TODO / FIXME / NOTE Comments

- No actionable `TODO` or `FIXME` comments were found in tracked app source or docs.
- The only tracked-source `NOTE` found was in `apps/web/next-env.d.ts`: it says the generated file should not be edited.
- `TODO` comments also exist in `.git/hooks/sendemail-validate.sample`, but that file is a Git sample hook, not application code.

## 7. Next Sensible Implementation Steps

- Follow `docs/design/stitch-redesign-v2/implementation-roadmap.md`; it is now the source of truth for the UI redesign.
- The backend/auth/database foundation should be kept. The UI surface is the main thing being rebuilt.
- Current redesign status: foundation/auth/app shell work has started, but the logged-in home screen is still structurally wrong. It currently behaves like a card-grid dashboard instead of the intended cinematic cockpit home composition.
- Next sensible slice: redo the home screen as a focused composition pass before moving to workout/start/active-logging screens.
- The home rewrite should prioritize structure over perfect data integration:
  - compact navigation shell stays
  - central body/avatar/platform scene becomes the dominant visual anchor
  - operator/body stats sit as overlays/side annotations
  - previous sessions appear as a bottom strip/list
  - one primary start/resume session CTA is integrated into the composition
  - equal-weight dashboard cards and duplicate navigation blocks should be removed
- Do not proceed to tester launch until the core mobile workout flow and main surfaces are redesigned and usable.

## 8. Known Risks Or Unclear Parts

- Some roadmap docs lag the code. For current UI redesign work, prefer `docs/design/stitch-redesign-v2/implementation-roadmap.md` over older workflow docs and older UX slice notes.
- `docs/01-requirements.md` still reads like an early draft in places, so treat it as requirement history plus current MVP intent, not a perfect implementation ledger.
- The app now includes more implemented slices than the original MVP docs initially described, so the safest source for “what next” is `docs/08-next-implementation-plan.md` plus the current code tree.
- Hosted credentials, custom domains, email verification, password reset, UX hardening follow-ups, and tester launch execution are still not implemented.
- The current home screen implementation should not be incrementally polished as a card grid. It should be replaced with a composition-first home screen. If a file-size or line-count limit is used, split the implementation into small components rather than creating one large page file.
