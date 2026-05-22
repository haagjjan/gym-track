# Repository Structure

This file is the map for where things live in the Gym Progress Tracker repo. Keep existing paths stable unless a cleanup explicitly updates every reference.

## Root

```text
.
|-- .env.example
|-- .dockerignore
|-- .github/
|-- AGENTS.md
|-- ARCHITECTURE.md
|-- CONTRIBUTING.md
|-- Dockerfile
|-- ENGINEERING.md
|-- README.md
|-- apps/
|-- compose.yaml
|-- docs/
|-- eslint.config.mjs
|-- package.json
|-- pnpm-lock.yaml
|-- pnpm-workspace.yaml
|-- tsconfig.base.json
`-- tsconfig.json
```

- `README.md` is the human starting point.
- `AGENTS.md` is the working rulebook for coding agents.
- `ARCHITECTURE.md` defines module boundaries and dependency direction.
- `ENGINEERING.md` defines TypeScript, PostgreSQL, structure, and testing rules.
- `CONTRIBUTING.md` defines the implementation and review workflow.
- `Dockerfile` owns local production-like API, web, and migration image targets.
- `compose.yaml` owns local infrastructure and app orchestration for PostgreSQL, migrations, API, and web.
- Root TypeScript, ESLint, package, and pnpm files own shared tooling.

## Applications

```text
apps/
|-- api/
|   |-- db/
|   |   |-- migrate.json
|   |   `-- migrations/
|   |-- tsconfig.build.json
|   `-- src/
|       |-- db/
|       |-- features/
|       |   |-- analytics/
|       |   |-- auth/
|       |   |-- exercises/
|       |   |-- health/
|       |   `-- workouts/
|       |-- shared/
|       |-- main.ts
|       `-- server.ts
`-- web/
    `-- src/
        |-- app/
        |-- features/
        |   |-- analytics/
        |   |-- auth/
        |   `-- workouts/
        `-- shared/
```

- `apps/api` owns the Fastify API, Kysely database access, migrations, API feature slices, and API tests.
- `apps/api/tsconfig.build.json` owns the compiled API runtime build used by Docker.
- `apps/api/src/features/<feature>` owns each API vertical slice. Current features are `analytics`, `auth`, `exercises`, `health`, and `workouts`.
- `apps/api/src/db` owns database connection and database health helpers.
- `apps/api/src/shared` owns API-only shared boundaries such as environment validation.
- `apps/web` owns the Next.js App Router app plus the first auth, workout logging, workout history/detail, and analytics UI slices.
- `apps/web/src/features/analytics` owns the analytics UI, browser analytics API helpers, and same-origin analytics API proxy helpers.
- `apps/web/src/features/auth` owns web auth forms, server auth helpers, and auth proxy helpers.
- `apps/web/src/features/workouts` owns the workout logging and history/detail UI, browser workout API helpers, and same-origin workout API proxy helpers.
- `apps/web/src/shared` owns web-only helpers with at least two feature consumers, currently API base URL resolution.

## Documentation

```text
docs/
|-- 00-workflow.md
|-- 01-requirements.md
|-- 02-query-list.md
|-- 03-data-model-notes.md
|-- 04-schema-draft.md
|-- 05-api-contract.md
|-- 06-implementation-start.md
|-- 07-implementation-pattern.md
|-- 08-next-implementation-plan.md
|-- git-pipeline.md
|-- repository-structure.md
`-- decisions/
```

- `docs/00-workflow.md` tracks the roadmap and current phase progress.
- `docs/01-requirements.md` through `docs/05-api-contract.md` are product, query, data, schema, and API source-of-truth docs.
- `docs/06-implementation-start.md` records the original staged implementation handoff.
- `docs/07-implementation-pattern.md` records the feature-slice pattern used by API and web work.
- `docs/08-next-implementation-plan.md` records the current fresh-session handoff and remaining implementation blocks.
- `docs/git-pipeline.md` records Git, PR, and check workflow.
- `docs/decisions` contains ADRs. Add or update an ADR before changing stack, auth strategy, schema policy, API style, or deployment direction.

## Local-Only Files

These files may exist locally but should not be committed:

- `.env`
- `.DS_Store`
- `cookies.txt`
- `node_modules/`
- `apps/*/node_modules/`
- `apps/web/.next/`
- `apps/api/dist/`
- `*.tsbuildinfo`
- log files, coverage output, caches, and temporary runtime files

Use `.env.example` for shared environment variable documentation. Do not commit secrets, cookie jars, database dumps, or generated build output.

## Future Growth

- Add `apps/web/src/features/<feature>` when a real web workflow exists.
- Add new `apps/api/src/features/<feature>` folders only for implemented API behavior.
- Add `packages/shared` only after at least two real consumers need shared contracts or utilities.
- Do not create empty app, package, feature, or infrastructure folders.
