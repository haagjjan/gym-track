# Gym Progress Tracker

Gym Progress Tracker is a planned web app for logging strength workouts, tracking exercise progress, and reviewing weekly training volume.

The repository is in the first implementation foundation phase. It contains the project documentation, workflow rules, architecture decisions, pnpm workspace metadata, shared TypeScript tooling, local PostgreSQL setup, initial PostgreSQL migrations, a first runnable API/web slice, API auth foundation, workout session API foundation, and exercise library API foundation. Workout logging child endpoints and workout UI screens are still deferred to later focused implementation commits.

## Current Status

- GitHub remote is connected.
- Repository hygiene checks run through GitHub Actions.
- MVP requirements, query needs, data model notes, schema draft, and API contract are documented.
- The accepted stack is TypeScript, PostgreSQL, Next.js App Router, Fastify, pnpm workspaces, Kysely, Zod, `node-pg-migrate`, Argon2, DB-backed sessions, and Docker Compose Postgres.
- The root pnpm workspace, TypeScript config, lint config, Docker Compose Postgres service, and `.env.example` are present.
- `apps/api` and `apps/web` exist with minimal runnable foundations.
- Initial database schema and muscle group seed migrations are present under `apps/api/db/migrations`.
- `apps/api` exposes `GET /api/v1/health` with a database connectivity check.
- `apps/api` exposes signup, login, logout, and current-user auth endpoints with Argon2 password hashing and DB-backed opaque sessions.
- `apps/api` exposes authenticated workout session create, list, detail, and end endpoints.
- `apps/api` exposes authenticated exercise library list and create endpoints.
- `apps/web` has a minimal App Router shell with signup, login, logout, and authenticated home state.
- Workout logging child endpoints, analytics endpoints, and workout UI screens are not implemented yet.

## Key Documents

- `AGENTS.md` - working rules for Codex and coding agents
- `ARCHITECTURE.md` - architecture boundaries and dependency rules
- `ENGINEERING.md` - TypeScript/PostgreSQL engineering standards
- `CONTRIBUTING.md` - contribution workflow and review gates
- `docs/repository-structure.md` - current repo map and local-only file rules
- `docs/git-pipeline.md` - Git branch, PR, and repository check workflow
- `docs/00-workflow.md` - project roadmap
- `docs/01-requirements.md` - MVP requirements and user flows
- `docs/02-query-list.md` - DB-driven query requirements
- `docs/03-data-model-notes.md` - accepted data modeling rules
- `docs/04-schema-draft.md` - MVP PostgreSQL schema draft
- `docs/05-api-contract.md` - MVP REST API contract
- `docs/06-implementation-start.md` - next-chat implementation prompt and staged rollout
- `docs/07-implementation-pattern.md` - implementation pattern for API/web feature slices
- `docs/08-next-implementation-plan.md` - fresh-session pickup plan for remaining MVP work
- `docs/decisions/` - architecture decision records

## Repository Map

Use `docs/repository-structure.md` when you need to understand where files belong. In short:

- `apps/api` owns Fastify routes, auth, health, database access, migrations, and API tests.
- `apps/web` owns the Next.js app. It is currently a minimal shell.
- `docs` owns requirements, API contracts, workflow, implementation pattern, and ADRs.
- Root config files own workspace tooling, TypeScript, linting, Compose, and local setup.

## Next Implementation Slices

The remaining work is structured in `docs/08-next-implementation-plan.md`. The recommended next slice is the Workout Logging API.

Remaining implementation blocks:

- Workout Logging API
- First Workout Logging UI
- Workout History/Detail UI
- Analytics API/UI
- Quality, CI, and deployment readiness

Remaining larger decisions:

- deployment target
- full application build, lint, type-check, and test CI jobs

## Local Checks

After installing Node.js and pnpm, install workspace dependencies:

```sh
pnpm install
```

For the current API/web foundation, run:

```sh
pnpm check
pnpm test
git diff --check
git status --short
```

Start local PostgreSQL with:

```sh
cp .env.example .env
pnpm db:start
```

Run pending database migrations with:

```sh
pnpm migrate:up
```

Roll back one migration with:

```sh
pnpm migrate:down
```

Start the API in development mode with:

```sh
pnpm dev:api
```

With the API running, check auth manually with:

```sh
curl -i http://localhost:4000/api/v1/auth/signup \
  -H "content-type: application/json" \
  -d '{"email":"jan@example.com","username":"jan","password":"secret"}'
```

After signup or login, keep the session cookie and smoke-test workout sessions with:

```sh
COOKIE_JAR=/tmp/gym-progress-cookies.txt
USER_TAG=$(date +%s)

curl -i -c "$COOKIE_JAR" http://localhost:4000/api/v1/auth/signup \
  -H "content-type: application/json" \
  -d "{\"email\":\"jan+$USER_TAG@example.com\",\"username\":\"jan_$USER_TAG\",\"password\":\"secret\"}"

curl -s -b "$COOKIE_JAR" http://localhost:4000/api/v1/workouts \
  -H "content-type: application/json" \
  -d '{"workoutType":"upper","title":"Upper A","notes":null}'
```

Start the web app in development mode with:

```sh
pnpm dev:web
```

With both the API and web app running, open:

```text
http://localhost:3000/signup
```

Create an account, refresh the home page, log out, then log in again from `/login`.

Stop local PostgreSQL with:

```sh
pnpm db:stop
```
