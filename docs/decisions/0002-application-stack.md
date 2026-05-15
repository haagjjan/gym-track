# ADR 0002 - Application Stack

## Status

Accepted

## Context

The project needs a browser-based gym progress tracker with authentication, workout logging, exercise history, charts, weekly muscle volume analytics, and durable relational data. The stack should stay small enough for an MVP while still supporting professional structure, shared contracts, tests, and future deployment.

The repo also needs engineering rules that are specific enough to prevent messy generated code. Those rules depend on the application language, database, and repo shape.

## Decision

Use a full-stack TypeScript and PostgreSQL direction:

- TypeScript for frontend, backend/API, shared contracts, scripts, and tests.
- Separate app boundaries for `apps/web` and `apps/api`.
- `packages/shared` for shared types and utilities only after there are real consumers.
- PostgreSQL as the planned relational database.
- SQL migrations as the durable schema source of truth.
- Markdown for requirements, architecture, workflow, and decision records.

Do not create empty application folders yet. Create `apps/`, `packages/`, and `infra/` only when implementation work starts and each folder has real files to own.

## Consequences

The project can share TypeScript types across UI and API boundaries, use one main tooling ecosystem, and keep frontend/backend responsibilities separate. PostgreSQL gives strong relational modeling and query support for workout history and analytics.

Later ADRs selected the framework, API, migration, validation, auth, session, and local development tooling details. The deployment target remains open until the deployment phase.
