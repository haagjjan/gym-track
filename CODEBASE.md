# Codebase Map

This document is a factual map of the current repository for future agent
sessions. It reflects the live tree inspected on 2026-07-04, including the
frontend rework and SaaS hardening files currently present in the worktree.

## Current Shape

- Monorepo managed by `pnpm` workspaces.
- Root scripts and shared tooling live in `package.json`, `pnpm-workspace.yaml`,
  `tsconfig.base.json`, `eslint.config.mjs`, and `playwright.config.ts`.
- `apps/api` owns the Fastify API, Kysely data access, SQL migrations, and API tests.
- `apps/web` owns the Next.js App Router app, same-origin proxy routes, feature UI,
  shared browser API helpers, and Playwright smoke tests.
- `docs` owns requirements, query/schema/API contracts, implementation plans, ADRs,
  design references, operations docs, and status notes.
- `_legacy-reference` contains archived frontend reference code from the UI rebuild.
- `.claude` stores agent-local context, skills, memory, and local Claude settings.

There is no `prisma/` directory, `schema.prisma`, or Prisma client in this repo.
The database source of truth is SQL migrations plus Kysely table typings.

## Product State

Gym Progress Tracker is a TypeScript/PostgreSQL web app for logging strength
workouts, tracking exercise progress, and reviewing weekly muscle-group volume.
The backend/auth/database foundation is intentionally kept. The active product
surface is the Body Cockpit UI redesign and polish.

Implemented or present in the current tree:

- Email/password signup, login, logout, and current-user lookup.
- Email verification, resend verification, forgot password, and reset password flows.
- Argon2 password hashing, hashed opaque DB-backed sessions, secure cookies, rate
  limiting, lockout, security headers, and log redaction.
- Workout create/list/detail/end flows.
- Active workout logging with exercises, ordered exercise blocks, sets, RIR, rest
  time, notes, editing, deletion, and completion.
- Shared exercise library, muscle group lookup, exercise-name review/block behavior.
- Exercise progress, exercise summaries, completed-exercise navigation, and weekly
  volume analytics.
- Canonical workout CSV export/import with preview and exercise-name review.
- First-party server-side app events in `app_events`.
- Next.js UI for auth, dashboard, launch/start workout, active session, history,
  progress, weekly volume, settings, and account recovery flows.
- 3D avatar/statue work with React Three Fiber under `apps/web/src/features/avatar`.

## Backend

Entry points:

- `apps/api/src/main.ts`: loads env, creates Kysely DB, builds server, starts Fastify,
  and handles graceful shutdown.
- `apps/api/src/server.ts`: wires Fastify, helmet, rate limiting, cookies, repositories,
  services, feature routes, mailer, app events, and auth cleanup.
- `apps/api/src/db/database.ts`: Kysely `AppDatabase` table typings and Postgres pool.
- `apps/api/src/shared/env.ts`: Zod environment validation.
- `apps/api/src/shared/logger.ts`: Pino/Fastify logging setup and redaction.
- `apps/api/src/shared/mailer.ts`: Resend/log email transport abstraction.
- `apps/api/src/shared/events.ts`: fire-and-forget first-party app event tracking.

Feature folders:

- `features/auth`: signup/login/logout/me, verification, password reset, sessions,
  password hashing, token generation, repository, service, schemas, tests.
- `features/workouts`: session create/list/detail/end, session exercise mutations,
  set mutations, CSV import/export, repositories, services, schemas, tests, integration flow.
- `features/exercises`: exercise and muscle-group routes, exercise creation/restoration,
  name quality review, repositories, services, schemas, tests.
- `features/analytics`: completed exercises, exercise progress, exercise summaries,
  weekly volume, repositories, services, schemas, tests.
- `features/health`: health and database health checks.

API routes are mounted under `/api/v1/*`. Route handlers authenticate, validate with
Zod, and translate service results into the repo error envelope:

```json
{ "error": { "code": "...", "message": "...", "fields": {}, "details": {} } }
```

Business logic belongs in feature services. Kysely access belongs in repositories.
Web code must not import database clients or Kysely.

## Database

Schema files:

- `apps/api/db/migrations/20260515120000000_create_core_schema.sql`
- `apps/api/db/migrations/20260515121000000_seed_muscle_groups.sql`
- `apps/api/db/migrations/20260703120000000_add_auth_hardening_and_events.sql`
- `apps/api/db/migrate.json`

Core tables:

- `users`
- `user_sessions`
- `auth_action_tokens`
- `app_events`
- `muscle_groups`
- `exercises`
- `exercise_secondary_muscles`
- `workout_sessions`
- `session_exercises`
- `sets`

Important rules:

- One open workout per user through a partial unique index on `workout_sessions`.
- Workout data uses soft deletes with `deleted_at`.
- Exercise names are globally unique case-insensitively.
- Weights are stored in kg.
- Weekly volume counts working sets only and uses primary muscle groups.
- Aggregates such as estimated 1RM and weekly volume are computed on read.

## Frontend

Entry points:

- `apps/web/src/app/layout.tsx`: global fonts, metadata, viewport, diagnostics listener,
  TanStack Query provider, and global CSS.
- `apps/web/src/app/page.tsx`: authenticated dashboard.
- `apps/web/src/app/workout/page.tsx`: workout launch/start screen.
- `apps/web/src/app/workouts/page.tsx`: history screen.
- `apps/web/src/app/workouts/[workoutId]/page.tsx`: active/completed session screen.
- `apps/web/src/app/progress/page.tsx`: progress analytics.
- `apps/web/src/app/weekly-volume/page.tsx`: volume analytics.
- `apps/web/src/app/settings/page.tsx`: local biometrics and favorite lifts.
- `apps/web/src/app/login`, `signup`, `forgot-password`, `reset-password`,
  and `verify-email`: auth and account flows.

Web feature folders:

- `features/auth`: auth screens, account recovery screens, auth proxy helpers,
  server auth, user types.
- `features/shell`: app shell, desktop sidebar, mobile top/tab navigation, icons.
- `features/dashboard`: Body Cockpit dashboard, connector layer, local biometrics,
  favorite lift preferences.
- `features/launch`: start/resume/clone workout flow.
- `features/session`: fullscreen active workout logger, exercise sheet, rest timer,
  numeric stepper, confirm-tap helper, start-session helper.
- `features/history`: history list/detail expansion and CSV panel.
- `features/progress`: progress screen and Recharts-based progress chart.
- `features/volume`: weekly volume screen, heatmap logic, 3D body map.
- `features/avatar`: reusable avatar/stage/statue scene and avatar spike.
- `features/settings`: settings screen for local-only biometrics/favorite lifts.
- `components/ui.tsx`: reusable HUD panel/button/metric/empty/loading/error primitives.
- `shared/api`: browser API client, hooks, types, and CSV helpers.
- `shared/api-base-url.ts`: API base URL resolution for server-side calls.
- `shared/client-diagnostics.ts`: local/client diagnostics buffer.
- `shared/query-provider.tsx`: TanStack Query client.

Browser components call same-origin `/api/*` Next route handlers. Those route
handlers forward requests and cookies to the Fastify `/api/v1/*` API. This keeps
browser auth same-origin and avoids a CORS surface.

## UI Direction

The current design direction is the Aether / Body Cockpit system:

- Dark obsidian surfaces.
- Electric cyan primary accent.
- Soft lavender secondary accent.
- Neon green success/performance accent.
- Space Grotesk for headings/labels.
- JetBrains Mono for data and functional text.
- Glassmorphism/HUD panels, thin borders, subtle glows, dense but legible layouts.
- Mobile gym use is mandatory; active logging must be fast and one-handed.
- Do not paste Stitch `code.html` into production. Use it only as visual reference.
- Do not add 3D to active workout logging.

Relevant design docs:

- `docs/DESIGN.md`
- `docs/10-frontend-rework-brief.md`
- `docs/11-phase0-frontend-inventory.md`
- `docs/14-ui-polish-and-ops-round-2.md`
- `docs/design/stitch-redesign-v2/design-notes.md`
- `docs/design/stitch-redesign-v2/implementation-roadmap.md`

## Docs And Decisions

Primary source docs:

- `AGENTS.md`: agent working rules.
- `README.md`: current high-level project overview and commands.
- `docs/repository-structure.md`: current repo map and local-only file rules.
- `docs/00-workflow.md`: phase roadmap and implementation status.
- `docs/01-requirements.md`: MVP product requirements and user flows.
- `docs/02-query-list.md`: DB-driven query requirements.
- `docs/03-data-model-notes.md`: business/data rules.
- `docs/04-schema-draft.md`: schema draft and query mapping.
- `docs/05-api-contract.md`: REST API contract.
- `docs/07-implementation-pattern.md`: feature-slice implementation pattern.
- `docs/08-next-implementation-plan.md`: current fresh-session handoff.
- `docs/12-saas-hardening.md`: recent auth/security/ops hardening summary.
- `docs/13-operator-guide.md`: day-to-day running, users, analytics, CSV, env notes.
- `docs/deployment-runbook.md`: Render deployment and operations runbook.
- `ARCHITECTURE.md`, `ENGINEERING.md`, `CONTRIBUTING.md`: boundaries, code standards,
  and workflow gates.

ADRs:

- `0001`: documentation workflow guardrails.
- `0002`: TypeScript/PostgreSQL monorepo direction.
- `0003`: Next.js, Fastify, pnpm, Kysely, Zod, owned auth.
- `0004`: `node-pg-migrate`, Argon2, DB-backed opaque sessions, Docker Compose Postgres.
- `0005`: Render web/API services plus Render PostgreSQL.

## Scripts

Root scripts from `package.json`:

- `pnpm start`: Docker Compose full stack: Postgres, migrations, API, web.
- `pnpm stop`: stop Compose stack.
- `pnpm db:start`: start only Postgres.
- `pnpm db:stop`: stop Compose stack.
- `pnpm db:logs`: follow Postgres logs.
- `pnpm dev:api`: Fastify dev server via `tsx watch`.
- `pnpm dev:web`: Next.js dev server.
- `pnpm migrate:*`: run `node-pg-migrate` through the API package.
- `pnpm type-check`: recursive package type checks.
- `pnpm lint`: root ESLint.
- `pnpm test`: recursive package tests.
- `pnpm build`: recursive package builds.
- `pnpm check`: `type-check`, `lint`, `test`, then `build`.
- `pnpm test:integration`: API database integration test suite.
- `pnpm smoke:web`: Playwright smoke test against a running web app.

See `.claude/skills/how-to-run-checks.md` before running expensive checks.

## Local And Deployment

Local:

- Node 22+, pnpm 10+, Docker.
- `.env.example` documents public local variables. Do not read or commit real `.env`.
- `pnpm start` runs the production-like Compose stack.
- For hot reload, run Postgres/migrations, then `pnpm dev:api` and `pnpm dev:web`.

Deployment:

- `render.yaml` defines Docker-backed web/API services and Render PostgreSQL.
- API migrations run as the API pre-deploy command.
- Web reaches API over private networking via `API_INTERNAL_HOSTPORT`.
- Production secrets and email provider keys belong in host environment variables only.

## Known Gaps And Cautions

- The worktree may be dirty. Inspect `git status --short` before editing and do not
  revert unrelated user changes.
- Some older docs lag current code; prefer `README.md`, `docs/11`, `docs/12`,
  `docs/13`, `docs/14`, and the actual source tree for recent UI/auth hardening state.
- Settings biometrics and favorite lifts are local-device preferences, not API-backed.
- Saved workout templates/protocols are not a backend feature yet.
- There is no admin/roles model yet. Internal analytics dashboard access control is an
  open decision in `docs/14-ui-polish-and-ops-round-2.md`.
- Hosted production credentials, custom domains, and real email delivery are operational
  setup tasks, not checked-in repo state.
