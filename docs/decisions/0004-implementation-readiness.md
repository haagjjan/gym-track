# ADR 0004 - Implementation Readiness

## Status

Accepted

## Context

ADR 0002 selected TypeScript and PostgreSQL. ADR 0003 selected Next.js App Router, Fastify, pnpm workspaces, Kysely, Zod, and owned email/password authentication.

Before application folders are created, the project needs a few implementation-enabling decisions that affect the first workspace, database, and auth files. These choices should stay boring, explicit, and compatible with the existing schema draft and API contract.

## Decision

Use `node-pg-migrate` as the PostgreSQL migration runner.

- Keep SQL and schema intent explicit and code-reviewed.
- Do not make manual production schema edits.
- Place future migration files in the API-owned database area, planned as `apps/api/db/migrations`.
- Keep SQL migrations as the durable schema source of truth.

Use `argon2` for password hashing.

- Store password hashes only, never plaintext passwords.
- Keep hashing and verification inside the API auth boundary.
- Tune Argon2 parameters during implementation against the local runtime.

Use DB-backed opaque sessions for browser authentication.

- Store sessions in the planned `user_sessions` table.
- Store only `session_token_hash` in the database.
- Put the raw opaque session token only in a secure HttpOnly browser cookie.
- Revoke sessions by setting `revoked_at`.
- Treat expired or revoked sessions as unauthenticated.

Use Docker Compose with the official PostgreSQL image for local development.

- Add Compose configuration when implementation begins, not as empty setup now.
- Add `.env.example` during implementation for required local variables.
- Continue ignoring real `.env*` files.
- Keep local setup reproducible enough that a fresh clone can start the database and app with a short documented command sequence.

Defer the deployment target until the deployment phase. Add application build, lint, type-check, and test CI jobs only after the TypeScript workspace exists.

## Consequences

Implementation can now start without making ad hoc choices about migrations, password storage, sessions, or local PostgreSQL setup.

The first implementation work should scaffold the pnpm workspace and local tooling in small commits, then add database migration setup and API/web foundations.

Deployment-specific configuration remains intentionally open. Full CI for application code also remains open until there is real TypeScript code to install, lint, type-check, test, and build.
