# Next Implementation Plan

## Purpose

Use this file to start the next fresh implementation session without replanning the project. This is a handoff plan only; do not implement these blocks unless the user explicitly asks for the next slice.

## Current Status

Implemented:

- pnpm workspace, root TypeScript tooling, ESLint, and root `pnpm check`.
- Docker Compose PostgreSQL and `.env.example`.
- SQL migrations with `node-pg-migrate`.
- Core schema and muscle group seed migrations.
- Fastify API startup, environment validation, Kysely database connection, and `GET /api/v1/health`.
- API auth foundation: signup, login, logout, current user, Argon2 password hashing, DB-backed opaque sessions, and HttpOnly cookies.
- Workout Sessions API: create, list, detail, and end authenticated workout sessions.
- Exercise Library API: list selectable exercises and create or restore shared global exercises.
- First web auth UI slice: `/signup`, `/login`, logout, authenticated home state, and same-origin Next auth proxy routes.
- Repository structure documentation and implementation pattern documentation.

Not implemented:

- Session exercise and set logging endpoints.
- Workout logging UI.
- Workout history/detail UI.
- Analytics API and UI.
- Full application CI, deployment, monitoring, backups, email verification, and password reset.

## Recommended Next Slice

Start with **Workout Logging API**.

Reason: auth, workout sessions, and exercise selection now exist through the API. Session exercise and set logging are the next dependency before a real workout logging UI can work.

Do not start with analytics or a broader UI pass before workout logging child records can be created through the API.

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

Status: recommended next slice.

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

Goal: make the app safer to change and prepare it for small-batch users.

Implement later:

- GitHub Actions workflow that installs pnpm dependencies and runs `pnpm check`.
- Broader API/database integration tests.
- UI smoke tests for auth and workout logging.
- Deployment target decision and ADR.
- Production environment, secure cookie defaults, backup plan, and basic monitoring.

Rules:

- Do not add deployment config without an ADR.
- Do not use local `.env.example` credentials for real hosted infrastructure.

## Fresh Session Prompt

Use this prompt when starting the next implementation session:

```md
We are continuing the Gym Progress Tracker after the Exercise Library API slice.

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

Implement the next recommended slice only: Workout Logging API.

Do not implement UI screens, analytics, CI, deployment, or schema changes unless the docs prove they are required for the workout logging API.

Before handoff, run relevant checks, confirm `git diff --check`, keep the diff focused, commit, and push.
```
