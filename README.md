# Gym Progress Tracker

Gym Progress Tracker is a TypeScript and PostgreSQL web app for logging strength workouts, tracking exercise progress, and reviewing weekly training volume.

The repository is past the planning stage and into V1 release verification. The backend, database, hardened auth, workout logging, analytics, responsive UI, CI, and deployment scaffolding are in place.

## What Is Implemented

- Configurable email/password signup plus verification, login, logout, password reset,
  account lockout, and current-user flows
- Workout session create, list, detail, and end flows
- Workout logging for session exercises and sets
- Shared exercise library and seeded muscle group lookup
- Exercise progress and weekly volume analytics
- Canonical CSV workout import and export
- Next.js web UI for auth, dashboard, workout logging, history/detail, progress, and weekly volume
- Fastify API, Kysely data access, PostgreSQL migrations, and DB-backed opaque sessions
- CI, tests, smoke coverage, Docker Compose local orchestration, and Render deployment config

## Current Status

The backend/auth/database foundation is solid enough to keep.

What is already working well:

- The core workout logging loop exists end to end.
- Analytics and history are wired to real data.
- Local development, type-checking, linting, and tests are available.

What still needs work before this feels like a full product:

- Account settings and account deletion/export workflows
- Production tester rollout and real-world QA
- Final polish for mobile gym usage and edge cases

## Repository Structure

The authoritative repo map lives in [docs/repository-structure.md](docs/repository-structure.md).

In short:

- `apps/api` owns the Fastify API, auth, analytics, workout logic, CSV import/export, migrations, and API tests.
- `apps/web` owns the Next.js UI, feature screens, same-origin proxy routes, and browser smoke tests.
- `docs/` owns product requirements, schema and API contracts, ADRs, implementation plans, and deployment guidance.

## Local Setup

Prerequisites:

- Node.js 22+
- pnpm 10+
- Docker

Install dependencies:

```sh
pnpm install
```

Start the local production-like stack:

```sh
pnpm start
```

This runs PostgreSQL, migrations, the API, and the web app through Docker Compose.

Open:

```text
http://localhost:3000
```

Stop the stack:

```sh
pnpm stop
```

For lower-level development, the common commands are:

```sh
pnpm db:start
pnpm migrate:up
pnpm dev:api
pnpm dev:web
pnpm db:stop
```

The environment template is [`.env.example`](.env.example).

## Checks

Run the main quality gates with:

```sh
pnpm check
```

If you want the individual commands:

```sh
pnpm type-check
pnpm lint
pnpm test
pnpm test:performance
pnpm build
```

`pnpm test:performance` runs the API and web pure-function performance suites sequentially. These timing ceilings are generous algorithmic regression gates; they are not browser page-load targets or a substitute for real-user monitoring.

Database-backed integration coverage:

```sh
pnpm test:integration
```

Browser smoke coverage:

```sh
pnpm smoke:web
```

## Deployment

The active private deployment target is the `gym-prod` home server described by ADR 0009 and the sequential server Wave B runbooks. Render remains a documented deployment alternative; its plan and operational checklist live in [docs/deployment-runbook.md](docs/deployment-runbook.md).

The checked-in Render Blueprint is [render.yaml](render.yaml).

Stage 1 repository configuration prepares `https://app.gymtrack.ch` as the canonical
single-owner production origin. Production registration fails closed, while local Compose
explicitly keeps registration enabled for development and test data. Cloudflare, DNS,
server configuration, and deployment are separate operator steps and are not performed by
repository checks.

## Source Docs

If you want the current project truth, read these in order:

1. [docs/00-workflow.md](docs/00-workflow.md)
2. [docs/01-requirements.md](docs/01-requirements.md)
3. [docs/02-query-list.md](docs/02-query-list.md)
4. [docs/03-data-model-notes.md](docs/03-data-model-notes.md)
5. [docs/04-schema-draft.md](docs/04-schema-draft.md)
6. [docs/05-api-contract.md](docs/05-api-contract.md)
7. [docs/07-implementation-pattern.md](docs/07-implementation-pattern.md)
8. [docs/08-next-implementation-plan.md](docs/08-next-implementation-plan.md)
9. [docs/99-current-project-state.md](docs/99-current-project-state.md)

The architecture and working rules are in:

- [AGENTS.md](AGENTS.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [ENGINEERING.md](ENGINEERING.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)

## Where To Start

If you are trying to understand the current state quickly, start with:

- [docs/99-current-project-state.md](docs/99-current-project-state.md)
- [docs/design/stitch-redesign-v2/implementation-roadmap.md](docs/design/stitch-redesign-v2/implementation-roadmap.md)
- [docs/deployment-runbook.md](docs/deployment-runbook.md)

## Notes For Contributors

- Keep changes small and tied to a documented requirement.
- Preserve user work and unrelated changes.
- Update docs when behavior, API shape, workflow, or architecture changes.
- Do not introduce a new stack or major pattern without an ADR in `docs/decisions/`.
