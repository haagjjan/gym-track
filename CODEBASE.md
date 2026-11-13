# Codebase map

A factual map of the repository, checked against the tree on 2026-11-09 (branch `ux-rework`,
UX rework Step 12). Rules and boundaries are in [ARCHITECTURE.md](ARCHITECTURE.md); the full
directory listing is in [docs/repository-structure.md](docs/repository-structure.md).

## Shape

- pnpm workspace. Root tooling: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`,
  `eslint.config.mjs`, `playwright.config.ts`, `compose.yaml` (local stack),
  `compose.monitoring.yaml` (local monitoring overlay), `render.yaml` (alternative host).
- `apps/api`: Fastify API, Kysely data access, SQL migrations, API tests.
- `apps/web`: Next.js App Router app, same-origin BFF routes, UI, Playwright specs.
- `ops/`: production and staging Compose definitions, monitoring, logging, backup, status page.
- `docs/`: requirements, data and API contracts, design system, ADRs, live runbooks.
  Finished material is in `docs/archive/`.
- `scripts/mobile-preview.sh`: Capacitor dev shells for the iOS Simulator and Android emulator.

There is no Prisma. The schema lives in SQL migrations plus Kysely types.

## API (`apps/api`)

Entry points:

- `src/main.ts`: loads env, creates the database, builds and starts the server, graceful shutdown.
- `src/server.ts`: Fastify plugins (helmet, rate limits, cookies), repositories, services,
  feature routes, mailer, app events, auth cleanup.
- `src/db/database.ts`: Kysely table types and the pool.
- `src/shared/`: `env.ts` (Zod env), `logger.ts`, `request-logging.ts`, `metrics.ts`,
  `mailer.ts` (Resend or log transport), `events.ts`, `client-attribution.ts`,
  `rate-limit-response.ts`, `http-validation.ts`.

Features (`src/features/`), each with routes, schemas, services, repositories and tests:

| Feature | Owns |
| --- | --- |
| `auth` | signup, login, logout, me, email verification, password reset, sessions, lockout |
| `users` | preferences, onboarding state, data export, account deletion, cancellation and erasure |
| `lifecycle` | scheduler for auth cleanup, due deletions and retention |
| `workouts` | workouts, session exercises, sets, retroactive edits, CSV import/export |
| `templates` | workout templates and starting a workout from one |
| `exercises` | catalog (about 820 system exercises), search, custom exercises, merge, muscle groups |
| `analytics` | completed exercises, exercise progress and summaries, weekly volume |
| `tracking` | gated time sets/cardio, revisions, progress, separate CSV, optional region compatibility |
| `messages` | in-app messages, campaigns, deliveries, responses |
| `admin` | overview, members, deletion support, campaigns, audit log |
| `status` | aggregate numbers for the public status page |
| `health` | health and database health |

Routes are mounted under `/api/v1/*`. Errors use
`{ "error": { "code", "message", "fields", "details" } }`.

Database: 12 migrations (the original 10 plus the optional time/cardio extension) in `db/migrations/` (core schema, muscle seed, auth hardening and
events, exercise muscles and templates, canonical classifications, catalog expansion and search,
public beta foundation, workout mutation safety, onboarding demo). Tables: `users`,
`user_sessions`, `auth_action_tokens`, `account_deletion_tokens`, `erasure_tombstones`,
`app_events`, `admin_audit_events`, `muscle_groups`, `exercises`, `exercise_muscle_groups`,
`exercise_secondary_muscles`, `workout_sessions`, `session_exercises`, `sets`, `timed_sets`, `cardio_entries`,
`workout_templates`, `workout_template_exercises`, `campaigns`, `campaign_targets`,
`message_deliveries`, `beta_settings`, `beta_access_requests`. The last two are left over from
the beta; ADR 0022 plans their cleanup.

## Web (`apps/web`)

Routes (`src/app/`):

| Route | Screen |
| --- | --- |
| `/` | Home: greeting, start card, week totals, personal bests, recent workouts, 3D figure |
| `/workout` | Workout tab: start empty, resume, start from a template or a past workout |
| `/workouts` | History (search, filters, paging, CSV import and export) |
| `/workouts/[workoutId]` | Live set logger, or a finished workout's detail |
| `/workouts/templates`, `/workouts/exercises` | Templates and the exercise catalog (pushed from the Workout tab) |
| `/progress` (alias `/analytics`) | Exercise progress chart |
| `/weekly-volume` | 3D muscle volume map (`?debugRegions=1` paints region ownership) |
| `/settings`, `/messages`, `/help`, `/help/demo/*` | Settings, inbox, help and the guided example |
| `/admin` | Admin console (admins only) |
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/cancel-deletion` | Account flows |
| `/privacy`, `/terms`, `/cookies`, `/support` | Public policy pages |
| `/api/*` | BFF route handlers that forward to the Fastify API |

Shared code (`src/shared/`):

- `ui/`: `Button`, `Sheet` (bottom sheet on phones, dialog on wide screens), `ConfirmDialog`,
  `Stepper`, `StatTile`, `InfoPopover`, sortable list, radio-group keyboard helper,
  `useModalBehavior` (focus trap, Escape, inert background, scroll lock), `icons.tsx`,
  `ui.tsx` (skeleton, error state).
- `api/`: browser API client, TanStack Query hooks, types, CSV helpers.
- `format.ts`: dates, durations, clock and numbers. `workout-edits.ts`, `public-policy.ts`,
  `query-provider.tsx`, client diagnostics and server logging helpers.

Features (`src/features/`):

| Feature | Contents |
| --- | --- |
| `shell` | app shell (tab bar, sidebar, headers, mini bar), `navigation.ts` route table and back contract, `app-history.tsx` in-app history, `theme.ts` |
| `session` | live set logger: header, exercise list, exercise sheet, set composer and editor, rest timer, bottom bar, completion summary |
| `launch` | Workout tab screen |
| `dashboard` | Home screen and panels; device-local body profile, favourite lifts, display settings |
| `history` | History list, rows, CSV panel and format guide |
| `progress` | progress chart (pinned axes, zoom, table view) and controls |
| `volume` | volume screen and panels, 3D body map, region maps, mask shader, camera director, aggregation |
| `avatar` | Home 3D scene: stage, camera, turntable driver, PR burst, hologram bay (textures, environment, motes), pedestal, statue |
| `templates`, `exercises`, `workouts` | template editor and list; exercise picker, editor and form; shared facet filters |
| `settings` | settings screen and its panels (theme, rest timer, favourite lifts, heat ceiling, privacy and data, exercise merge, help) |
| `onboarding` | guided example: lessons, demo data, demo screens, guide card |
| `privacy` | device-storage choice and `useScopedLocalStorage` |
| `auth`, `legal`, `messages`, `admin`, `status`, `analytics` | account flows, policy pages, inbox, admin console, proxy helpers |

3D assets: `public/models/avatar/avatar-base.fbx` (figure) and `base-v-2.fbx` (pedestal).
Muscle regions: `public/volume/muscle-regions-{front,back,side}.svg`, with an editing guide in
`public/volume/README.md`.

Tests: unit tests next to the code (`*.test.ts`, Node test runner). Playwright specs in
`apps/web/e2e/`: `auth-workout-smoke`, `workout-templates`, `onboarding-demo`, `public-status`,
`volume-mobile-gesture`.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm start` / `pnpm stop` | full local stack in Docker Compose (Postgres, migrations, API, web) |
| `pnpm db:start` | Postgres only |
| `pnpm dev:api`, `pnpm dev:web` | hot-reload servers on :4000 and :3000 (load `.env` into the shell first for the API) |
| `pnpm migrate:up` and friends | `node-pg-migrate` through the API package |
| `pnpm check` | type-check, lint, unit tests, build |
| `pnpm test:integration` | API tests against a real database (`INTEGRATION_DATABASE_URL`) |
| `pnpm test:performance` | algorithmic regression ceilings |
| `pnpm smoke:web` | Playwright against a running web app (`WEB_BASE_URL`) |
| `pnpm ops:monitoring:*` | local monitoring overlay |
| `scripts/mobile-preview.sh [all\|ios\|android]` | open the dev server in the phone shells |

CI (`.github/workflows/`): `repo-checks.yml` runs project checks, API integration and web smoke
on every pull request and push to `main`. `status-page.yml` publishes the status page after a
green `main`.

## Where to read next

| Topic | Document |
| --- | --- |
| UI, tokens, navigation, copy | [docs/DESIGN.md](docs/DESIGN.md) |
| Product requirements | [docs/01-requirements.md](docs/01-requirements.md) |
| Queries, data rules, schema | [docs/02-query-list.md](docs/02-query-list.md), [docs/03-data-model-notes.md](docs/03-data-model-notes.md), [docs/04-schema-draft.md](docs/04-schema-draft.md) |
| API contract | [docs/05-api-contract.md](docs/05-api-contract.md) |
| Feature-slice pattern and file-size rules | [docs/07-implementation-pattern.md](docs/07-implementation-pattern.md) |
| Data structures and diagnostics | [docs/09-observability-and-data-structures.md](docs/09-observability-and-data-structures.md) |
| Running the service | [docs/13-operator-guide.md](docs/13-operator-guide.md), [ops/production/README.md](ops/production/README.md) |
| Current state and next steps | [docs/99-current-project-state.md](docs/99-current-project-state.md) |
| Decisions | [docs/decisions/](docs/decisions/README.md) |

## Cautions

- The worktree is often dirty with the owner's uncommitted work. Check `git status --short` and
  leave unrelated changes alone.
- Never run `next build` while `next dev` shares `apps/web/.next`. It corrupts the dev server.
- Local auth and signup share one rate-limit bucket per IP, so parallel e2e runs hit `429`s.
  Run specs one at a time.
- Device-local preferences are not synced to the API.

Optional tracking UI lives in `apps/web/src/features/tracking/`; the BFF is `app/api/tracking/[...path]`. Enable `ENABLE_EXTENDED_TRACKING=true` on both servers to expose it. The migration guard check is `apps/api/scripts/check-tracking-migrations.ts`.
