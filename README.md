# Gym Progress Tracker

Gym Progress Tracker is a planned web app for logging strength workouts, tracking exercise progress, and reviewing weekly training volume.

The repository is in the first implementation foundation phase. It contains the project documentation, workflow rules, architecture decisions, pnpm workspace metadata, shared TypeScript tooling, local PostgreSQL setup, and minimal app-owned tooling files. Database migrations, API endpoints, auth, and UI screens are still deferred to later focused implementation commits.

## Current Status

- GitHub remote is connected.
- Repository hygiene checks run through GitHub Actions.
- MVP requirements, query needs, data model notes, schema draft, and API contract are documented.
- The accepted stack is TypeScript, PostgreSQL, Next.js App Router, Fastify, pnpm workspaces, Kysely, Zod, `node-pg-migrate`, Argon2, DB-backed sessions, and Docker Compose Postgres.
- The root pnpm workspace, TypeScript config, lint config, Docker Compose Postgres service, and `.env.example` are present.
- `apps/api` and `apps/web` exist with package and TypeScript tooling foundations only.
- No database migrations, auth, API endpoints, or UI screens have been implemented yet.

## Key Documents

- `AGENTS.md` - working rules for Codex and coding agents
- `ARCHITECTURE.md` - architecture boundaries and future repo shape
- `ENGINEERING.md` - TypeScript/PostgreSQL engineering standards
- `CONTRIBUTING.md` - contribution workflow and review gates
- `docs/git-pipeline.md` - Git branch, PR, and repository check workflow
- `docs/00-workflow.md` - project roadmap
- `docs/01-requirements.md` - MVP requirements and user flows
- `docs/02-query-list.md` - DB-driven query requirements
- `docs/03-data-model-notes.md` - accepted data modeling rules
- `docs/04-schema-draft.md` - MVP PostgreSQL schema draft
- `docs/05-api-contract.md` - MVP REST API contract
- `docs/06-implementation-start.md` - next-chat implementation prompt and staged rollout
- `docs/decisions/` - architecture decision records

## Implementation Readiness

Use `docs/06-implementation-start.md` to start implementation in a new chat. The remaining work begins with small implementation commits:

- root pnpm workspace and shared TypeScript tooling
- Docker Compose Postgres configuration and `.env.example`
- API migration setup with `node-pg-migrate`
- initial Fastify and Next.js app foundations

Remaining larger decisions:

- deployment target
- application build, lint, type-check, and test CI jobs after app code exists

## Local Checks

After installing Node.js and pnpm, install workspace dependencies:

```sh
pnpm install
```

For the current tooling foundation, run:

```sh
pnpm type-check
pnpm lint
pnpm build
git diff --check
git status --short
```

Start local PostgreSQL with:

```sh
cp .env.example .env
pnpm db:start
```

Stop local PostgreSQL with:

```sh
pnpm db:stop
```
