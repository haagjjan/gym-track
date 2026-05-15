# ADR 0003 - Framework And Tooling

## Status

Accepted

## Context

ADR 0002 selected TypeScript and PostgreSQL as the stack direction. The next step is to choose concrete tools before scaffolding app folders, so future implementation can follow one clear structure instead of mixing framework patterns.

The MVP needs a browser UI, a separate API, runtime validation, relational queries, SQL migrations, and email/password authentication.

## Decision

Use this framework and tooling direction:

- Next.js App Router for `apps/web`.
- Fastify for `apps/api`.
- pnpm workspaces for monorepo dependency management.
- Kysely for type-safe PostgreSQL queries.
- SQL migrations as the schema source of truth.
- Zod for runtime validation and shared contract schemas.
- Owned email/password authentication for the MVP, with the API managing users, password hashing, sessions, and cookies.

Do not create empty `apps/`, `packages/`, or `infra/` folders yet. Create each folder only when implementation begins and there are real files to own.

## Consequences

The project keeps one TypeScript ecosystem across web, API, shared contracts, scripts, and tests. Next.js owns frontend routing and UI conventions, while Fastify keeps the API boundary explicit. Kysely keeps database access close to SQL while still giving TypeScript help, and Zod provides runtime safety for user input, API payloads, environment variables, and shared contracts.

The exact migration runner, session storage details, password hashing library, deployment target, and CI pipeline remain open decisions.
