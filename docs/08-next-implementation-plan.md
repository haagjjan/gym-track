# Next Implementation Plan

## Purpose

Use this file to start the next fresh implementation session without replanning the project. This is a handoff plan only; do not implement these blocks unless the user explicitly asks for the next slice.

## Current Status

Implemented:

- pnpm workspace, root TypeScript tooling, ESLint, and root `pnpm check`.
- Docker Compose local app runner for PostgreSQL, migrations, API, and web, plus `.env.example`.
- SQL migrations with `node-pg-migrate`.
- Core schema and muscle group seed migrations.
- Fastify API startup, environment validation, Kysely database connection, and `GET /api/v1/health`.
- API auth foundation: signup, login, logout, current user, Argon2 password hashing, DB-backed opaque sessions, and HttpOnly cookies.
- Workout Sessions API: create, list, detail, and end authenticated workout sessions.
- Exercise Library API: list selectable exercises, create or restore shared global exercises, and list seeded muscle groups.
- Workout Logging API: add, reorder, and remove session exercises, plus add, update, and remove sets.
- First web auth UI slice: `/signup`, `/login`, logout, authenticated home state, and same-origin Next auth proxy routes.
- First Workout Logging UI: start/resume workout entry point, workout logging page, exercise picker/create flow, set editing controls, exercise reorder, and end workout action.
- Workout History And Detail UI: authenticated `/workouts` history list, linked workout detail view, pagination, and empty/loading/error states.
- Analytics API And UI: exercise progress endpoint and view, exercise summary endpoint and view, and weekly muscle volume endpoint and view.
- Quality, CI, And Deployment Readiness: GitHub Actions runs real project checks, API database integration tests, Playwright web smoke tests, production auth cookies default secure, and ADR 0005 records the deployment target.
- Deployment Configuration And Small-Batch Operations: Render Blueprint, Render API/web Dockerfiles, API pre-deploy migrations, production environment checklist, backup/restore checklist, and monitoring checklist.
- Logging Infrastructure: Fastify/Pino logger configuration, `LOG_LEVEL`, local pretty logs, production JSON logs, test log suppression, and redaction for cookies, authorization headers, and session token fields.
- UI And Analytics Rework: separate Progress and Weekly Volume routes, completed-exercise progress navigation, `recharts` weight/reps progress chart, and a first 2D weekly muscle-map view.
- Repository structure documentation and implementation pattern documentation.

Not implemented:

- CSV workout import/export, hosted production credentials, custom domains, first tester launch execution, email verification, and password reset.

## Recommended Next Slice

Start with **CSV Workout Import/Export**.

Reason: the repo now has core MVP flows, quality gates, Render configuration, safer API logs, and clearer Progress/Weekly Volume screens. Users still need a way to import old workout history and export their logged data before tester launch.

After CSV workout import/export, resume hosted launch execution.

## Implementation Blocks

### 1. Workout Sessions API

Status: implemented.

Goal: let an authenticated user create, list, view, and end their own workout sessions.

Implement:

- `POST /api/v1/workouts`
- `GET /api/v1/workouts`
- `GET /api/v1/workouts/:workoutId`
- `POST /api/v1/workouts/:workoutId/end`

Rules:

- Every workout query must be scoped to the authenticated user.
- A user may have only one open workout at a time.
- Open workouts use `ended_at IS NULL`.
- Soft-deleted workouts must be excluded from normal reads.
- Reuse the API feature-slice pattern from `docs/07-implementation-pattern.md`.

Tests/checks:

- Unit-test service decisions and route response mapping.
- Add API/database coverage when persistence behavior is introduced.
- Run `pnpm check` and `git diff --check`.

Non-goals:

- Do not implement exercise library, sets, analytics, or workout UI in this block.

### 2. Exercise Library API

Status: implemented.

Goal: let authenticated users list selectable exercises and add globally unique exercises.

Implement:

- `GET /api/v1/exercises`
- `POST /api/v1/exercises`
- `GET /api/v1/muscle-groups`

Rules:

- Exercise names are globally unique case-insensitively.
- Only non-deleted exercises are selectable.
- User-created exercises should set `created_by_user_id`.
- Muscle group references must come from seeded `muscle_groups`.

Tests/checks:

- Cover search/list behavior, unique-name conflicts, and invalid muscle group IDs.
- Run `pnpm check` and `git diff --check`.

Non-goals:

- Do not implement workout logging UI or analytics in this block.

### 3. Workout Logging API

Status: implemented.

Goal: let authenticated users add exercises and sets to their own workout sessions.

Implement:

- `POST /api/v1/workouts/:workoutId/exercises`
- `PATCH /api/v1/workouts/:workoutId/exercises/reorder`
- `DELETE /api/v1/workouts/:workoutId/exercises/:sessionExerciseId`
- `POST /api/v1/workouts/:workoutId/exercises/:sessionExerciseId/sets`
- `PATCH /api/v1/sets/:setId`
- `DELETE /api/v1/sets/:setId`

Rules:

- All mutations must prove ownership through the workout session's `user_id`.
- Exercise positions and set order must stay compact and positive.
- Deleted session exercises and sets use soft delete.
- Set values must follow the schema rules: warmup/working, positive weight, positive reps, RIR 0-10.

Tests/checks:

- Cover ownership, ordering, validation, soft delete, and conflict behavior.
- Run `pnpm check` and `git diff --check`.

Non-goals:

- Do not implement charts or weekly volume in this block.

### 4. First Workout Logging UI

Status: implemented.

Goal: let a signed-in user start a workout and log real exercise/set data through the API.

Implement:

- Start/resume workout entry point from authenticated home.
- Workout logging page for the active session.
- Exercise picker backed by the exercise library API.
- Set entry/edit/delete controls backed by the logging API.

Rules:

- Keep feature UI under `apps/web/src/features/workouts` or another clearly owned feature folder.
- Browser code should continue using same-origin Next route handlers if direct API calls would require CORS.
- Do not add broad shared UI folders until reuse is real.

Tests/checks:

- Run `pnpm check`, `git diff --check`, and a local browser smoke flow.

Non-goals:

- Do not implement analytics charts or deployment in this block.

### 5. Workout History And Detail UI

Status: implemented.

Goal: let a signed-in user inspect past workouts.

Implement:

- History list backed by `GET /api/v1/workouts`.
- Workout detail view backed by `GET /api/v1/workouts/:workoutId`.
- Basic empty/loading/error states.

Rules:

- History must show only the current user's workouts.
- Detail views must not leak another user's data.

Tests/checks:

- Run `pnpm check`, `git diff --check`, and a local browser smoke flow.

Non-goals:

- Do not implement analytics summaries in this block unless already available through the API.

### 6. Analytics API And UI

Status: implemented.

Goal: compute progress and weekly volume from raw workout data.

Implement after workout logging works:

- Exercise progress endpoint and view.
- Exercise summary endpoint and view.
- Weekly muscle volume endpoint and view.

Rules:

- Compute analytics on read for the MVP.
- Count working sets only for weekly muscle volume.
- Exclude soft-deleted workouts, session exercises, and sets.
- Use primary muscle group for MVP volume attribution.

Tests/checks:

- Add focused tests for calculations.
- Run `pnpm check` and `git diff --check`.

Non-goals:

- Do not add aggregate tables unless performance testing proves they are needed.

### 7. Quality, CI, And Deployment Readiness

Status: implemented.

Goal: make the app safer to change and prepare it for small-batch users.

Implemented:

- GitHub Actions workflow that installs pnpm dependencies and runs `pnpm check`.
- Broader API/database integration tests.
- UI smoke tests for auth and workout logging.
- Deployment target decision and ADR.
- Secure production cookie defaulting.

Still future:

- Deployment configuration.
- Production environment values.
- Backup restore verification.
- Basic monitoring thresholds and alerts.

Rules:

- Do not add deployment config without an ADR.
- Do not use local `.env.example` credentials for real hosted infrastructure.

### 8. Deployment Configuration And Small-Batch Operations

Status: implemented.

Goal: make the accepted Render target runnable for a small tester batch.

Implemented:

- Render service configuration or documented manual setup for web, API, migration job, and PostgreSQL.
- Production environment variable checklist using real secrets, `AUTH_COOKIE_SECURE=true`, and deployed service URLs.
- Migration/deploy order runbook.
- Backup policy and first restore-test procedure.
- Basic monitoring/log review checklist for API, web, and database health.

Rules:

- Follow ADR 0005.
- Do not commit hosted credentials, production database URLs, or local `.env` files.
- Do not change the application stack or deployment target without a new ADR.

### 9. Small-Batch Launch Execution

Status: deferred until CSV import/export is implemented.

Goal: perform the first hosted launch using the checked-in Render configuration and document any launch-specific follow-ups.

Implement later:

- Create the Render Blueprint from `render.yaml`.
- Confirm hosted API health and web smoke flow.
- Perform the first backup export and restore test into a non-production database.
- Configure Render notifications for deploy failures, health failures, service restarts, database storage, and database connections.
- Record only non-secret launch notes or follow-up docs in the repo.

Rules:

- Do not commit hosted credentials, production database URLs, tester personal data, or backup artifacts.
- Do not change Render service names in `render.yaml` after launch unless references are updated together and the migration is documented.
- Do not invite testers until the restore test and health checks pass.

### 10. Logging Infrastructure

Status: implemented.

Goal: make API logs cleaner, safer, and more useful before hosted tester debugging starts.

Implement:

- Use Fastify's existing Pino logger foundation; do not introduce a separate logger stack.
- Add structured logger configuration with:
  - `LOG_LEVEL`, default `info`.
  - local pretty logging via `pino-pretty`.
  - production JSON logs.
  - test logging disabled or reduced.
  - redaction for cookies, authorization headers, and session tokens.
- Replace ad hoc server logging patterns with request-scoped structured logs where useful.
- Document logging behavior in `README.md`, `ARCHITECTURE.md`, and `docs/07-implementation-pattern.md`.

Tests/checks:

- Unit-test environment parsing for logger config.
- Add a route/server test confirming redacted request logging config is wired.
- Run `pnpm check` and `git diff --check`.

Non-goals:

- Do not add external log shipping, observability SaaS, metrics, or tracing in this slice.

### 11. UI And Analytics Rework

Status: implemented.

Goal: make the app feel ready for testers and make progress analytics visually useful.

Implement:

- Rework the existing app UI without adding a full design system or broad UI framework.
- Focus on logged-in app screens: Home, workout logging/detail, workout history, Progress, and Weekly Volume.
- Improve navigation, spacing, hierarchy, mobile behavior, form ergonomics, empty states, and error states.
- Split the current combined analytics screen into two clearly different logged-in destinations:
  - Progress: exercise-first progress tracking. Target route: `/progress`.
  - Weekly Volume: muscle-map weekly training volume. Target route: `/weekly-volume`.
  - Keep any shared analytics helpers behind those views, but do not keep Progress and Weekly Volume as one mixed `/analytics` screen.
- Progress must start with the list of exercises the user has actually done, not an empty chart-first screen.
- Progress exercise list rules:
  - Default sort/filter is last done, newest first.
  - The list must be filterable by muscle group.
  - When filtering by muscle group, start collapsed by muscle-group headings.
  - Expanding a muscle group first lists exercises where the selected muscle group is primary.
  - Below primary exercises, list exercises where the selected muscle group is secondary.
- Clicking an exercise opens that exercise's progress graph.
- Progress graph rules:
  - X axis is date.
  - Y axis shows both weight and reps.
  - Weight is drawn as a solid line.
  - Reps are drawn as a dotted, non-continuous line.
  - Whenever weight changes, the reps line should visually jump or restart and change color.
  - The graph should horizontally scroll left to inspect older history.
  - Users must not be able to scroll earlier than the first logged entry for that exercise.
  - Supported time windows: 1 week, 2 weeks, 4 weeks, 3 months, 1 year, and all entries.
  - Default time window is 2 weeks.
- Weekly Volume should not look like the Progress view.
- Weekly Volume should center on an anatomical human body visualization:
  - Show separated muscle regions on a front/back body figure.
  - Prefer an interactive 3D body if it can be implemented cleanly in the slice; otherwise use an inspectable 2D front/back muscle map as the first pass.
  - Muscles trained during the selected week gain color.
  - Color intensity increases with working-set count.
  - Color scale starts light yellow, moves through red, and ends at deep violet for high volume.
  - Clicking a muscle selects it.
  - The selected muscle's weekly volume stats appear beside the body figure, on the right on desktop and below/on a dedicated panel on narrow screens.
- Weekly Volume stats should include at least weekly working sets, related exercises, and recent sessions contributing to that muscle.
- Add charting/visualization dependencies only where needed for the chosen implementation. Use `recharts` for conventional time-series charts; use Three.js only if the weekly body map is implemented as a real 3D scene.

Tests/checks:

- Update Playwright smoke coverage for core navigation plus Progress and Weekly Volume rendering.
- Run `pnpm check`, `pnpm smoke:web`, and `git diff --check`.
- Browser-check Progress and Weekly Volume on desktop and mobile viewports.

Non-goals:

- Do not rebuild the whole app around a new UI framework.
- Do not add stored aggregate analytics tables.
- Do not implement CSV import/export in this slice.

### 12. CSV Workout Import/Export

Status: recommended next slice.

Goal: let users import old workout history and export their logged workout data using one canonical CSV format.

Implement:

- Add authenticated CSV export/import for workout history.
- Add API endpoints:
  - `GET /api/v1/workouts/export.csv`
  - `POST /api/v1/workouts/import.csv`
- Add same-origin web proxy routes for both endpoints.
- Use `papaparse` for CSV parsing and unparsing.
- Document the canonical CSV columns:
  - `workout_started_at`
  - `workout_ended_at`
  - `workout_type`
  - `workout_title`
  - `workout_notes`
  - `exercise_name`
  - `primary_muscle_group_slug`
  - `equipment`
  - `exercise_type`
  - `exercise_position`
  - `set_order`
  - `set_type`
  - `weight_kg`
  - `reps`
  - `rir`
  - `rest_time_seconds`
  - `set_note`

Import rules:

- Parse and validate the whole file before writing.
- Create or reuse global exercises by case-insensitive name.
- Require known `primary_muscle_group_slug`.
- Create closed workout sessions from CSV rows.
- Reject malformed files with row-level validation errors.
- Do not partially import on validation failure.

Tests/checks:

- Add API unit tests for CSV validation and grouping.
- Add API database integration test for import then export round trip.
- Add web smoke test for downloading export/template and uploading import.
- Run `pnpm check`, `pnpm test:integration`, `pnpm smoke:web`, and `git diff --check`.

Non-goals:

- Do not support arbitrary legacy CSV shapes in the first CSV slice.
- Do not add database schema changes unless implementation proves they are required.

## Fresh Session Prompt

Use this prompt when starting the next implementation session:

```md
We are continuing the Gym Progress Tracker after the UI And Analytics Rework slice.

First read:
- AGENTS.md
- README.md
- ARCHITECTURE.md
- ENGINEERING.md
- CONTRIBUTING.md
- docs/repository-structure.md
- docs/00-workflow.md
- docs/02-query-list.md
- docs/03-data-model-notes.md
- docs/04-schema-draft.md
- docs/05-api-contract.md
- docs/07-implementation-pattern.md
- docs/08-next-implementation-plan.md

Implement the next recommended slice only: CSV Workout Import/Export.

Do not add hosted launch execution, monitoring infrastructure, external observability services, schema changes unless proven necessary, or arbitrary legacy CSV mapping in this slice.

Before handoff, run relevant checks, confirm `git diff --check`, keep the diff focused, commit, and push.
```
