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
