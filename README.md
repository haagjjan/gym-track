# Gym Progress Tracker

Gym Progress Tracker is a planned web app for logging strength workouts, tracking exercise progress, and reviewing weekly training volume.

The repository is in the first implementation foundation phase. It contains the project documentation, workflow rules, architecture decisions, pnpm workspace metadata, shared TypeScript tooling, local PostgreSQL setup, a production-like Docker Compose local runner, initial PostgreSQL migrations, a first runnable API/web slice, API auth foundation, workout session API foundation, exercise library API foundation, workout logging API foundation, analytics API foundation, the first workout logging UI, workout history/detail UI, analytics UI, full project CI checks, API database integration coverage, web smoke coverage, a recorded deployment target, Render deployment configuration, and a small-batch operations runbook.

## Current Status

- GitHub remote is connected.
- Full project checks, API database integration tests, and a web smoke test run through GitHub Actions.
- MVP requirements, query needs, data model notes, schema draft, and API contract are documented.
- The accepted stack is TypeScript, PostgreSQL, Next.js App Router, Fastify, pnpm workspaces, Kysely, Zod, `node-pg-migrate`, Argon2, DB-backed sessions, and Docker Compose for local orchestration.
- The root pnpm workspace, TypeScript config, lint config, production-like Docker Compose app stack, and `.env.example` are present.
- `apps/api` and `apps/web` exist with minimal runnable foundations.
- Initial database schema and muscle group seed migrations are present under `apps/api/db/migrations`.
- `apps/api` exposes `GET /api/v1/health` with a database connectivity check.
- `apps/api` exposes signup, login, logout, and current-user auth endpoints with Argon2 password hashing and DB-backed opaque sessions.
- `apps/api` exposes authenticated workout session create, list, detail, and end endpoints.
- `apps/api` exposes authenticated exercise library list and create endpoints.
- `apps/api` exposes authenticated seeded muscle group lookup for exercise creation.
- `apps/api` exposes authenticated workout logging child endpoints for session exercises and sets.
- `apps/api` exposes authenticated analytics endpoints for exercise progress, exercise summaries, and weekly muscle volume.
- `apps/web` has signup, login, logout, authenticated home state, a first workout logging flow for starting/resuming workouts, picking or creating exercises, editing sets, reordering exercises, and ending workouts, plus workout history/detail and analytics screens.
- Structured logging configuration, UI/analytics polish, CSV workout import/export, hosted production credentials, custom domains, email verification, and password reset are not implemented yet.

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
- `docs/deployment-runbook.md` - Render deployment and small-batch operations checklist
- `docs/decisions/` - architecture decision records

## Repository Map

Use `docs/repository-structure.md` when you need to understand where files belong. In short:

- `apps/api` owns Fastify routes, auth, health, database access, migrations, and API tests.
- `apps/web` owns the Next.js app, including auth, workout logging, workout history/detail, and analytics UI slices.
- `docs` owns requirements, API contracts, workflow, implementation pattern, and ADRs.
- Root config files own workspace tooling, TypeScript, linting, Docker, Compose, CI, Playwright smoke-test configuration, Render Blueprint configuration, and local setup.

## Next Implementation Slices

The remaining work is structured in `docs/08-next-implementation-plan.md`. The recommended next slice is logging infrastructure.

Remaining implementation blocks:

- Logging infrastructure
- UI and analytics rework
- CSV workout import/export
- Small-batch launch execution

Remaining larger decisions:

- custom domain strategy
- monitoring alert thresholds beyond the small-batch checklist
- backup retention and restore-test cadence after the first tester batch

Planned pre-launch improvements:

- API logs should use Fastify/Pino structured logging with safe redaction, local pretty output, and production JSON logs.
- Analytics should move from the current progress bar list to a real time-series chart, with focused polish across the existing app UI.
- Workout history import/export should use one canonical CSV format before supporting arbitrary legacy CSV layouts.

## Deploy To Render

ADR 0005 records Render as the first small-batch deployment target. The checked-in `render.yaml` defines Docker-backed Render services for web and API plus a Render PostgreSQL database.

Before deploying real tester data, read:

```text
docs/deployment-runbook.md
```

Never use `.env.example` credentials for hosted infrastructure, and do not commit production database URLs or secrets.

## Run Locally

With Docker running, start the full local app stack with:

```sh
pnpm start
```

This builds and runs PostgreSQL, migrations, the Fastify API, and the Next.js web app through Docker Compose. Open:

```text
http://localhost:3000/signup
```

Stop the stack with:

```sh
pnpm stop
```

This is production-like local startup, not hot reload. Re-run `pnpm start` after code changes that need rebuilding.

If an older local dev server is already listening on port `3000`, stop it before opening the app so the browser reaches the Compose web container.

## Local Checks

After installing Node.js and pnpm, install workspace dependencies:

```sh
pnpm install
```

For the current API/web foundation, run:

```sh
pnpm check
pnpm test:integration
pnpm test
pnpm smoke:web
git diff --check
git status --short
```

`pnpm test:integration` requires `INTEGRATION_DATABASE_URL` to point at a migrated PostgreSQL database. `pnpm smoke:web` requires the local web/API stack to be running and Playwright's Chromium browser to be installed.

## Manual Development

Use the lower-level commands when debugging an individual service or when you want API/web hot reload outside Docker.

Start local PostgreSQL only:

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

After signup or login, keep the session cookie and smoke-test workout sessions plus workout logging with:

```sh
COOKIE_JAR=/tmp/gym-progress-cookies.txt
USER_TAG=$(date +%s)
parse_json='let input = ""; process.stdin.on("data", (chunk) => input += chunk); process.stdin.on("end", () => console.log(JSON.parse(input).data[process.argv[1]][process.argv[2])));'

curl -i -c "$COOKIE_JAR" http://localhost:4000/api/v1/auth/signup \
  -H "content-type: application/json" \
  -d "{\"email\":\"jan+$USER_TAG@example.com\",\"username\":\"jan_$USER_TAG\",\"password\":\"secret\"}"

CHEST_ID=$(docker compose exec -T postgres psql \
  -U gym_progress_tracker \
  -d gym_progress_tracker \
  -tAc "select id from muscle_groups where slug = 'chest';")

WORKOUT_ID=$(curl -s -b "$COOKIE_JAR" http://localhost:4000/api/v1/workouts \
  -H "content-type: application/json" \
  -d '{"workoutType":"upper","title":"Upper A","notes":null}' \
  | node -e "$parse_json" workout id)

EXERCISE_ID=$(curl -s -b "$COOKIE_JAR" http://localhost:4000/api/v1/exercises \
  -H "content-type: application/json" \
  -d "{\"name\":\"Bench Press $USER_TAG\",\"equipment\":\"barbell\",\"exerciseType\":\"compound\",\"primaryMuscleGroupId\":\"$CHEST_ID\"}" \
  | node -e "$parse_json" exercise id)

SESSION_EXERCISE_ID=$(curl -s -b "$COOKIE_JAR" "http://localhost:4000/api/v1/workouts/$WORKOUT_ID/exercises" \
  -H "content-type: application/json" \
  -d "{\"exerciseId\":\"$EXERCISE_ID\"}" \
  | node -e "$parse_json" sessionExercise id)

SET_ID=$(curl -s -b "$COOKIE_JAR" "http://localhost:4000/api/v1/workouts/$WORKOUT_ID/exercises/$SESSION_EXERCISE_ID/sets" \
  -H "content-type: application/json" \
  -d '{"setType":"working","weightKg":"80.00","reps":8,"rir":2,"restTimeSeconds":120}' \
  | node -e "$parse_json" set id)

curl -s -b "$COOKIE_JAR" -X PATCH "http://localhost:4000/api/v1/sets/$SET_ID" \
  -H "content-type: application/json" \
  -d '{"reps":9,"rir":1}'

curl -s -b "$COOKIE_JAR" "http://localhost:4000/api/v1/workouts/$WORKOUT_ID"

curl -s -b "$COOKIE_JAR" -X POST "http://localhost:4000/api/v1/workouts/$WORKOUT_ID/end" \
  -H "content-type: application/json" \
  -d '{}'
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

After signing in, use the home page action to start or resume a workout. The workout logging page lets you add exercises, create a missing exercise with a seeded muscle group, add/edit/delete sets, reorder exercise blocks, and end the workout. Use the History tile or open `/workouts` to review past sessions and open workout detail. Use the Progress or Volume tiles, or open `/analytics`, to review exercise progress and weekly muscle volume.

Stop local PostgreSQL with:

```sh
pnpm db:stop
```
