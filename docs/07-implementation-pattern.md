# Implementation Pattern

## Status

Working pattern for the first prototype and MVP implementation. This does not change the accepted stack; it defines how code should be shaped inside the existing Next.js, Fastify, Kysely, Zod, and PostgreSQL boundaries.

## Pattern

Use feature-owned vertical slices.

Each feature owns its route handlers, validation, use-case logic, persistence calls, and tests. Shared code is introduced only when at least two features need the same boundary or helper.

## API Shape

Fastify owns HTTP transport only.

Inside `apps/api/src`:

```text
db/
  database.ts
features/
  auth/
  exercises/
  health/
    health.routes.ts
    health.service.ts
  workouts/
shared/
  env.ts
server.ts
```

Route modules:

- Register Fastify routes for one feature.
- Validate request and response boundaries with Zod when payloads exist.
- Translate feature errors into HTTP responses.
- Avoid direct SQL or multi-step business workflows.

Feature services:

- Own business decisions and orchestration.
- Use plain functions and explicit input/output types.
- Stay independent of Fastify request/reply objects.
- Depend on narrow interfaces for external boundaries that need focused tests.

Repositories/query modules:

- Own Kysely or SQL access.
- Return domain-shaped data instead of raw driver results when practical.
- Stay inside `apps/api`; database code must not leak into `apps/web`.

## Web Shape

Next.js owns routing, layouts, rendering mode, and browser interaction.

Inside `apps/web/src`:

```text
app/
features/
  auth/
  workouts/
  exercises/
  analytics/
shared/
```

Feature UI stays near the feature that owns the workflow. Shared UI or API clients move to `shared` only after real reuse exists.

## Boundary Rules

- Web code talks to the API contract, never to PostgreSQL or Kysely.
- API routes call feature services; feature services call repositories/query modules.
- Environment variables are validated once at startup.
- Database migrations remain SQL files under `apps/api/db/migrations`.
- Cross-app contracts move to `packages/shared` only after both apps need them.

## First Prototype Slice

Start with a health slice:

- API server startup.
- Environment validation.
- Kysely database connection.
- `GET /api/v1/health` returning API and database status.
- Minimal web app shell that can be run independently.

This proves the local stack without introducing auth, workouts, analytics, or placeholder feature systems.

Status: implemented as the first runnable slice.

## Auth Foundation Slice

The auth API follows the same feature-owned pattern:

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Auth route modules own HTTP validation and cookie transport, auth services own business flow, and auth repositories own Kysely persistence.

Status: implemented for API signup, login, logout, and current-user lookup.

## Web Auth Slice

The first web auth slice uses Next.js route handlers as same-origin proxies to the Fastify API:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Browser code calls the Next route handlers to keep cookies same-origin and avoid adding CORS policy in the API. Route handlers forward cookies and status codes to the Fastify `/api/v1/auth/*` endpoints.

Status: implemented for signup, login, logout, and authenticated home state.

## Workout Sessions API Slice

The workout sessions API follows the same feature-owned pattern:

- `POST /api/v1/workouts`
- `GET /api/v1/workouts`
- `GET /api/v1/workouts/:workoutId`
- `POST /api/v1/workouts/:workoutId/end`

Workout routes own auth checks, request validation, and HTTP response mapping. Workout services own business decisions such as default timestamps, one-open-session conflicts, ownership/not-found handling, and end-time validation. Workout repositories own Kysely persistence and user-scoped workout queries.

Status: implemented for creating, listing, viewing, and ending authenticated workout sessions.

## Exercise Library API Slice

The exercise library API follows the same feature-owned pattern:

- `GET /api/v1/exercises`
- `POST /api/v1/exercises`
- `GET /api/v1/muscle-groups`

Exercise routes own auth checks, request validation, and HTTP response mapping. Exercise services own business decisions such as name conflicts, muscle group validation, and soft-deleted exercise restoration. Exercise repositories own Kysely persistence and selectable exercise queries.

Status: implemented for listing selectable exercises, creating or restoring shared global exercises, and listing seeded muscle groups.

## Workout Logging API Slice

The workout logging API stays inside the `workouts` feature because every mutation is owned through a workout session:

- `POST /api/v1/workouts/:workoutId/exercises`
- `PATCH /api/v1/workouts/:workoutId/exercises/reorder`
- `DELETE /api/v1/workouts/:workoutId/exercises/:sessionExerciseId`
- `POST /api/v1/workouts/:workoutId/exercises/:sessionExerciseId/sets`
- `PATCH /api/v1/sets/:setId`
- `DELETE /api/v1/sets/:setId`

Workout logging routes own auth checks, request validation, and HTTP response mapping. Workout logging services own ordering decisions, ownership/not-found handling, and set mutation decisions. Workout logging repositories own Kysely transactions for position shifting, reordering, soft deletes, and set-order compaction.

Status: implemented for adding, reordering, and removing session exercises, plus adding, updating, and removing sets.

## Web Workout Logging Slice

The first workout logging UI follows the same web feature-slice pattern:

- Authenticated home action to start or resume an open workout.
- `/workouts/:workoutId` logging page.
- Same-origin Next route handlers for workout, exercise, muscle group, and set API calls.
- Exercise picker backed by the exercise library API.
- Inline exercise creation backed by the exercise library API and seeded muscle group lookup.
- Set add, edit, and delete controls backed by workout logging API endpoints.

Browser code continues to call Next route handlers first so auth cookies stay same-origin and the API does not need CORS.

Status: implemented for starting/resuming workouts, adding or creating exercises, editing sets, reordering exercise blocks, and ending workouts.

## Web Workout History Slice

The workout history UI follows the same web feature-slice pattern:

- Authenticated `/workouts` history page.
- History list backed by the existing same-origin workout API proxy.
- Rows link to the editable `/workouts/:workoutId` detail page.
- Empty, loading, error, and pagination states stay inside the workouts web feature.

Browser code continues to call Next route handlers first so auth cookies stay same-origin and the API does not need CORS.

Status: implemented for viewing workout history and opening workout detail.

## Analytics API Slice

The analytics API follows the same feature-owned pattern:

- `GET /api/v1/analytics/exercises/:exerciseId/progress`
- `GET /api/v1/analytics/exercises/:exerciseId/summary`
- `GET /api/v1/analytics/weekly-volume`

Analytics routes own auth checks, query validation, and response mapping. Analytics services compute estimated one-rep max, exercise summaries, and weekly volume from raw set rows. Analytics repositories own user-scoped Kysely reads and exclude soft-deleted workout data.

Status: implemented for exercise progress, exercise summary, and weekly muscle volume.

## Web Analytics Slice

The analytics UI follows the same web feature-slice pattern:

- Authenticated `/analytics` page.
- Same-origin Next route handlers for analytics API calls.
- Exercise selector backed by the exercise library API.
- Exercise progress chart/table, exercise summary metrics, and weekly muscle volume bars.

Browser code continues to call Next route handlers first so auth cookies stay same-origin and the API does not need CORS.

Status: implemented for viewing exercise progress and weekly volume analytics.

## Quality, CI, And Deployment Readiness Slice

The quality slice keeps checks close to the existing app boundaries:

- GitHub Actions installs pnpm dependencies with the lockfile and runs `pnpm check`.
- API database integration tests use the real Fastify server, Kysely repositories, migrations, and PostgreSQL.
- Web smoke tests use Playwright against the production-like Docker Compose app stack.
- Production auth cookies default to secure when `NODE_ENV=production`, while local Compose can keep `AUTH_COOKIE_SECURE=false`.
- Deployment target decisions live in ADRs before deployment config is added.

Status: implemented for full project CI checks, one core API/database flow, one core browser smoke flow, secure production cookie defaulting, and the first deployment target ADR.

## Deployment Configuration And Small-Batch Operations Slice

The first deployment configuration follows ADR 0005 and keeps hosted setup explicit:

- `render.yaml` owns the Render Blueprint for web, API, and PostgreSQL.
- Render-specific Dockerfiles mirror the local API and web Docker targets because the Blueprint builds Dockerfile paths directly.
- API migrations run with `node-pg-migrate` as an API pre-deploy command.
- The web service reaches the API over Render private networking through `API_INTERNAL_HOSTPORT`.
- `docs/deployment-runbook.md` records the first deploy checklist, production environment values, release order, backup/restore checks, and monitoring review.

Status: implemented for Render configuration and small-batch operations documentation.

## Logging Infrastructure Slice

The logging slice configures Fastify's existing Pino logger instead of adding a separate logger stack:

- `LOG_LEVEL` controls runtime verbosity and defaults to `info`.
- Local development uses `pino-pretty`; production uses structured JSON logs.
- Test logging should be disabled or reduced.
- Sensitive values such as cookies, authorization headers, and session tokens must be redacted.
- Route code should use request-scoped logs only where the event helps debug auth, workout, analytics, import/export, or deployment issues.

Status: implemented for API startup logging configuration, safe redaction, local pretty logs, production JSON logs, and quiet default tests.

## UI And Analytics Rework Slice

The UI rework should polish the existing app screens without introducing a full design system:

- Keep feature UI in the existing auth, workouts, and analytics feature folders unless reuse is real.
- Improve logged-in Home, workout logging/detail, workout history, and analytics flows.
- Replace the progress bar list with a `recharts` time-series chart.
- Use best working set per workout session as the default chart mode, while keeping the all-sets table.
- Keep weekly volume readable as a chart/table pair.

Status: recommended after logging.

## CSV Workout Import/Export Slice

The CSV slice should add one canonical workout-history CSV format:

- API endpoints are `GET /api/v1/workouts/export.csv` and `POST /api/v1/workouts/import.csv`.
- Web route handlers proxy those endpoints through the existing same-origin pattern.
- Use `papaparse` for CSV parsing and unparsing.
- Validate the whole file before writing and reject malformed files with row-level errors.
- Create or reuse global exercises by case-insensitive name and require known primary muscle group slugs.
- Do not partially import on validation failure.

Status: planned after UI and analytics rework.
