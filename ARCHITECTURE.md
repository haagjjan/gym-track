# Architecture

## Current State

The repository currently contains product and data-planning documentation for a gym progress tracker plus the local development, database migration, first runnable app foundation, and deployment readiness path. The pnpm workspace, shared TypeScript tooling, Docker Compose local app orchestration, initial PostgreSQL migrations, Fastify health endpoint, database connectivity check, API auth foundation, workout session API foundation, exercise library and muscle group lookup API foundation, workout logging API foundation, analytics API foundation, canonical CSV workout import/export, first Next.js auth UI slice, first workout logging UI slice, workout history/detail screens, Progress and Weekly Volume screens, full project CI checks, API database integration coverage, web smoke test, Render deployment Blueprint, small-batch operations runbook, structured API logging, Prometheus API metrics, and a private provisioned Grafana monitoring overlay have been introduced.

The source-of-truth documents are:

- `docs/00-workflow.md` for roadmap phases
- `docs/01-requirements.md` for MVP scope and user flows
- `docs/02-query-list.md` for query-driven database requirements
- `docs/03-data-model-notes.md` for data rules and modeling decisions
- `docs/04-schema-draft.md` for the MVP database schema draft
- `docs/05-api-contract.md` for the MVP REST API contract
- `docs/07-implementation-pattern.md` for the API/web implementation pattern
- `docs/repository-structure.md` for the current repo map and local-only file rules
- `ENGINEERING.md` for TypeScript/PostgreSQL engineering standards
- `docs/git-pipeline.md` for Git and repository check workflow
- `docs/decisions/` for architecture decision records

## Accepted Stack Direction

ADR 0002 records the current stack direction:

- TypeScript for frontend, backend/API, shared contracts, scripts, and tests
- PostgreSQL as the planned relational database
- SQL migrations as the durable schema source of truth
- Separate app boundaries for web and API code
- Markdown for project documentation and decision records

ADR 0003 records the framework and tooling direction:

- Next.js App Router for `apps/web`
- Fastify for `apps/api`
- pnpm workspaces for monorepo dependency management
- Kysely for type-safe PostgreSQL queries
- Zod for runtime validation and shared contract schemas
- Owned email/password auth for the MVP, with API-managed users, sessions, and cookies

ADR 0004 records the implementation-readiness direction:

- `node-pg-migrate` for PostgreSQL migrations
- Argon2 for password hashing
- DB-backed opaque sessions through `user_sessions`
- Secure HttpOnly cookies for auth transport
- Docker Compose with the official PostgreSQL image for local development
- Docker Compose local orchestration for production-like API/web startup

ADR 0005 records the first deployment target:

- Render Web Services for the Docker-backed web and API services
- Render PostgreSQL for the first managed database
- API pre-deploy migrations using `node-pg-migrate`
- Secure production environment variables, managed backups, and basic health/log monitoring before inviting testers

ADR 0008 records the first private observability topology:

- An opt-in Compose overlay rather than a replacement for local development or Render configuration
- Prometheus plus Grafana with version-controlled data source and dashboard provisioning
- Node, container, and PostgreSQL exporters on an internal Docker network
- A disabled-by-default internal Fastify metrics endpoint with bounded labels and release identity
- Loopback-only Grafana access until the owner configures a reviewed private access path

CSV workout import/export uses one canonical format first, with arbitrary legacy CSV mapping deferred until there is real need.

API logging stays on Fastify's Pino foundation. `LOG_LEVEL` controls verbosity, local development uses `pino-pretty`, production emits structured JSON logs, tests default to disabled logging, and sensitive request values such as cookies, authorization headers, and session tokens are redacted.

## Architecture Principles

- Build from user flows and query needs, not from speculative infrastructure.
- Keep modules small and separated by responsibility.
- Prefer explicit data contracts over hidden coupling.
- Choose boring, well-supported tools unless an ADR records a stronger reason.
- Design for a fresh clone to become runnable with a short documented setup.

## Planned Boundaries

These boundaries apply as implementation grows:

- UI owns user interaction, display state, form validation feedback, and navigation.
- API/backend owns authentication, authorization, business rules, persistence workflows, and stable contracts for the UI.
- Database owns durable data, relationships, constraints, indexes, and migrations.
- Analytics/query layer owns derived workout statistics such as exercise progress, weekly working sets, and estimated one-rep-max calculations.
- Documentation owns requirements, workflow rules, architecture decisions, and setup instructions.
- Shared packages own cross-app contracts only after both web and API need them.

## Current Repo Shape

Create folders only when each folder has real files to own. Do not add empty scaffolding.

Current shape:

```text
apps/
  web/
  api/
docs/
  decisions/
ops/
  monitoring/
```

Root tooling, local infrastructure overlays, and documentation live at the repository root. Versioned Prometheus, Grafana, exporter, and PostgreSQL monitoring-role assets live under `ops/monitoring`. The current repo map is documented in `docs/repository-structure.md`.

Within each app, organize by feature/domain first, then by technical role. Current API features are `auth`, `health`, `workouts`, `exercises`, and `analytics`. Expected future domains include `users`.

Avoid broad folders such as `misc`, oversized `utils`, unrelated `services`, or global feature-specific `components`. Shared code should move to `packages/shared` only after at least two real consumers exist.

Current and expected app-internal shape:

```text
apps/web/src/
  app/
  features/
    auth/
    workouts/
    exercises/
    analytics/
  shared/

apps/api/src/
  db/
  features/
    auth/
    health/
    workouts/
    exercises/
    analytics/
  shared/
```

`apps/web` should follow Next.js App Router conventions for route files and layouts. Feature-specific UI stays near the feature; only reusable primitives move to shared UI folders.

`apps/api` should expose Fastify routes through feature-owned modules. Database queries should flow through feature repositories or query modules using Kysely, not direct SQL strings scattered through route handlers.

## Dependency Rules

- UI may depend on documented API contracts, not direct database access.
- Backend may depend on database migrations and query definitions, not UI implementation details.
- Database migrations must be backward-readable from the docs and tied to query requirements.
- Analytics must define whether values are stored or computed.
- Shared types or contracts should be introduced only when they reduce real duplication.
- Cross-app types must live in `packages/shared` only when both apps actually need them.
- Zod schemas should validate runtime boundaries such as API requests, forms, environment variables, and external inputs.
- Kysely query code should stay inside API/database boundaries and must not leak into the web app.

## Decision Rules

Create an ADR in `docs/decisions/` before changing or introducing:

- Frontend framework or major UI library
- Backend framework or runtime
- Database engine or migration tool
- Authentication/session strategy
- API style and contract format
- Deployment or hosting architecture
- Major schema rules, such as soft delete policy, unit policy, or muscle attribution logic

Small implementation choices inside an already approved stack can be documented in code, tests, or the relevant feature docs instead of an ADR.

## Current Open Decisions

- Custom domain strategy
- Production monitoring alert thresholds beyond the small-batch checklist
- Backup retention and restore-test cadence after the first tester batch
