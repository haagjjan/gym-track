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
  health/
    health.routes.ts
    health.service.ts
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
