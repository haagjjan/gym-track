# Implementation Pattern

## Status

Working pattern for the first prototype and MVP implementation. This does not change the accepted stack; it defines how code should be shaped inside the existing Next.js, Fastify, Kysely, Zod, and PostgreSQL boundaries.

## Pattern

Use feature-owned vertical slices.

Each feature owns its route handlers, validation, use-case logic, persistence calls, and tests. Shared code is introduced only when at least two features need the same boundary or helper.

## API Shape

Fastify owns HTTP transport only.

Inside `apps/api/src`:

```text
db/
  database.ts
features/
  auth/
  exercises/
  health/
    health.routes.ts
    health.service.ts
  workouts/
shared/
  env.ts
server.ts
```

Route modules:

- Register Fastify routes for one feature.
- Validate request and response boundaries with Zod when payloads exist.
- Translate feature errors into HTTP responses.
- Avoid direct SQL or multi-step business workflows.

Feature services:

- Own business decisions and orchestration.
- Use plain functions and explicit input/output types.
- Stay independent of Fastify request/reply objects.
- Depend on narrow interfaces for external boundaries that need focused tests.

Repositories/query modules:

- Own Kysely or SQL access.
- Return domain-shaped data instead of raw driver results when practical.
- Stay inside `apps/api`; database code must not leak into `apps/web`.

## Web Shape

Next.js owns routing, layouts, rendering mode, and browser interaction.

Inside `apps/web/src`:

```text
app/
features/
  auth/
  workouts/
  exercises/
  analytics/
shared/
```

Feature UI stays near the feature that owns the workflow. Shared UI or API clients move to `shared` only after real reuse exists.

## Boundary Rules

- Web code talks to the API contract, never to PostgreSQL or Kysely.
- API routes call feature services; feature services call repositories/query modules.
- Environment variables are validated once at startup.
- Database migrations remain SQL files under `apps/api/db/migrations`.
- Cross-app contracts move to `packages/shared` only after both apps need them.

## First Prototype Slice

Start with a health slice:

- API server startup.
- Environment validation.
- Kysely database connection.
- `GET /api/v1/health` returning API and database status.
- Minimal web app shell that can be run independently.

This proves the local stack without introducing auth, workouts, analytics, or placeholder feature systems.

Status: implemented as the first runnable slice.

## Auth Foundation Slice

The auth API follows the same feature-owned pattern:

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Auth route modules own HTTP validation and cookie transport, auth services own business flow, and auth repositories own Kysely persistence.

Status: implemented for API signup, login, logout, and current-user lookup.

## Web Auth Slice

The first web auth slice uses Next.js route handlers as same-origin proxies to the Fastify API:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Browser code calls the Next route handlers to keep cookies same-origin and avoid adding CORS policy in the API. Route handlers forward cookies and status codes to the Fastify `/api/v1/auth/*` endpoints.

Status: implemented for signup, login, logout, and authenticated home state.

For Stage 1 production, `REGISTRATION_MODE=DISABLED` closes both the Next.js signup route
and the authoritative Fastify endpoint. Production defaults closed when the value is
missing; local Compose explicitly enables registration for disposable development and test
accounts.

## Workout Sessions API Slice

The workout sessions API follows the same feature-owned pattern:

- `POST /api/v1/workouts`
- `GET /api/v1/workouts`
- `GET /api/v1/workouts/:workoutId`
- `POST /api/v1/workouts/:workoutId/end`

Workout routes own auth checks, request validation, and HTTP response mapping. Workout services own business decisions such as default timestamps, one-open-session conflicts, ownership/not-found handling, and end-time validation. Workout repositories own Kysely persistence and user-scoped workout queries.

Status: implemented for creating, listing, viewing, and ending authenticated workout sessions.

## Exercise Library API Slice

The exercise library API follows the same feature-owned pattern:

- `GET /api/v1/exercises`
- `POST /api/v1/exercises`
- `GET /api/v1/muscle-groups`

Exercise routes own auth checks, request validation, and HTTP response mapping. Exercise services own business decisions such as name conflicts, muscle group validation, soft-deleted exercise restoration, and shared exercise-name quality review/block decisions. Exercise repositories own Kysely persistence and selectable exercise queries.

Status: implemented for listing selectable exercises, creating or restoring shared global exercises, name review/block responses, and listing seeded muscle groups.

## Workout Logging API Slice

The workout logging API stays inside the `workouts` feature because every mutation is owned through a workout session:

- `POST /api/v1/workouts/:workoutId/exercises`
- `PATCH /api/v1/workouts/:workoutId/exercises/reorder`
- `DELETE /api/v1/workouts/:workoutId/exercises/:sessionExerciseId`
- `POST /api/v1/workouts/:workoutId/exercises/:sessionExerciseId/sets`
- `PATCH /api/v1/sets/:setId`
- `DELETE /api/v1/sets/:setId`

Workout logging routes own auth checks, request validation, and HTTP response mapping. Workout logging services own ordering decisions, ownership/not-found handling, and set mutation decisions. Workout logging repositories own Kysely transactions for position shifting, reordering, soft deletes, and set-order compaction.

Status: implemented for adding, reordering, and removing session exercises, plus adding, updating, and removing sets.

## Workout Template Slice

The template feature follows the same route/service/repository boundary:

- Fastify endpoints under `/api/v1/workout-templates` own authenticated list/read/create/update/duplicate/delete/start operations.
- `POST /api/v1/workouts/:workoutId/templates` saves a completed session structure, and `POST /api/v1/workout-templates/:templateId/from-workout` explicitly updates a source template.
- Repository transactions preserve ordered duplicate exercise occurrences and copy template rows into normal session exercise rows without sets.
- Next.js route handlers proxy all browser template access through the same-origin BFF.
- TanStack Query owns template server state and invalidation.
- The reusable exercise picker is shared by active-session and template insertion. Both destinations stage multi-selection, preserve click order, and append only when `Add selected exercises (n)` is committed; template rows have remove/reorder but no per-row Replace flow.

Status: implemented for ordered exercise-only templates and explicit completion-time copy/update workflows.

## Web Workout Logging Slice

The first workout logging UI follows the same web feature-slice pattern:

- Authenticated home action to start or resume an open workout.
- `/workouts/:workoutId` logging page.
- Same-origin Next route handlers for workout, exercise, muscle group, and set API calls.
- Exercise picker backed by the exercise library API.
- Inline exercise creation backed by the exercise library API and seeded muscle group lookup.
- Set add, edit, and delete controls backed by workout logging API endpoints.

Browser code continues to call Next route handlers first so auth cookies stay same-origin and the API does not need CORS.

Status: implemented for starting/resuming workouts, adding or creating exercises, editing sets, reordering exercise blocks, and ending workouts.

## Web Workout History Slice

The workout history UI follows the same web feature-slice pattern:

- Authenticated `/workouts` history page.
- History list backed by the existing same-origin workout API proxy.
- Rows link to the editable `/workouts/:workoutId` detail page.
- Empty, loading, error, and pagination states stay inside the workouts web feature.

Browser code continues to call Next route handlers first so auth cookies stay same-origin and the API does not need CORS.

Status: implemented for viewing workout history and opening workout detail.

## V1 gym-use remediation slice

The usability-audit-v2/v3 remediation and audit-v4 beta refinements continue the same feature-owned boundaries:

- `users` owns the authenticated volume heat preference route/service/repository.
- Workout, template, and exercise repositories own complete-list search/facet/sort semantics; the web does not filter only loaded pages. Exercise ownership filtering is API-side and receives the authenticated user ID.
- The shared web facet component owns responsive inline controls and the mobile filter sheet, while each entity supplies its allowed sorts. A small versioned storage helper persists validated filter/sort state under user-and-surface-specific `sessionStorage` keys; search remains transient and Clear deletes that surface's entry.
- The shared exercise catalog owns search, multi-muscle AND facets, equipment/type, sorting, and ordered staged selection for both live workouts and templates.
- Live-session UI is split into header, vertical exercise list, exercise/set mode navigation, active exercise panel, staged multi-add sheet, saved-set editor, new-set composer, draft storage, and timer components. Mobile editor presentation is a viewport-fixed safe-area bottom sheet; the mobile timer is a compact fixed dock hidden while an editor is open. Desktop presentation stays inline.
- The live header is the single elapsed-time authority (`LIVE · hh:mm:ss`) and uses `Finish`/`Confirm finish`. Set rows always include a type label; Exercise Mode includes tap guidance and row chevrons, and directional mode transitions are disabled when reduced motion is requested.
- New-set drafts are the only local workout state persisted between reloads. Server state remains in TanStack Query and incomplete sets are never posted.
- Progress daily best-set selection, range construction, tonnage formatting, and volume heat bucketing/ranges/proportional widths are pure feature helpers with direct tests. Progress keeps an unbounded summary for all-time best metrics and a range-keyed summary for selected-window total sets/tonnage.
- Coarse-pointer Volume controls arbitrate touch direction: vertical movement remains native page scroll, horizontal movement drives orbit, taps keep muscle selection, and touch zoom is disabled. Desktop mouse orbit/zoom remains unchanged.
- The shell/chrome uses honest product/state labels and centralized semantic colors; the five-stage Volume heat scale remains a separate data-visualization palette with non-color cues.
- Audit v4 reuses existing columns and analytics range parameters, so it requires no schema migration or architecture ADR.

Status: implemented for the V1 responsive web remediation described by `docs/Usability_Audit/usability-audit-v4.md`, with v3 and v2 retained only where v4 does not supersede them.

## Analytics API Slice

The analytics API follows the same feature-owned pattern:

- `GET /api/v1/analytics/exercises/:exerciseId/progress`
- `GET /api/v1/analytics/exercises/:exerciseId/summary`
- `GET /api/v1/analytics/weekly-volume`

Analytics routes own auth checks, query validation, and response mapping. Analytics services compute estimated one-rep max, exercise summaries, and weekly volume from raw set rows. Analytics repositories own user-scoped Kysely reads and exclude soft-deleted workout data.

Status: implemented for exercise progress, exercise summary, and weekly muscle volume.

## Web Analytics Slice

The analytics UI follows the same web feature-slice pattern:

- Authenticated `/analytics` page.
- Same-origin Next route handlers for analytics API calls.
- Exercise selector backed by the exercise library API.
- Exercise progress chart/table, exercise summary metrics, and weekly muscle volume bars.

Browser code continues to call Next route handlers first so auth cookies stay same-origin and the API does not need CORS.

Status: implemented for the first combined analytics UI; superseded by the UI rework's separate Progress and Weekly Volume destinations.

## Quality, CI, And Deployment Readiness Slice

The quality slice keeps checks close to the existing app boundaries:

- GitHub Actions installs pnpm dependencies with the lockfile and runs `pnpm check`.
- GitHub Actions runs `pnpm test:performance` after the normal project checks so timing gates do not compete with the unit suite.
- API database integration tests use the real Fastify server, Kysely repositories, migrations, and PostgreSQL.
- Web smoke tests use Playwright against the production-like Docker Compose app stack.
- Production auth cookies default to secure when `NODE_ENV=production`, while local Compose can keep `AUTH_COOKIE_SECURE=false`.
- Production requires an HTTPS `APP_BASE_URL`. The Next.js ingress accepts only configured
  hosts and requires an allowed Origin for state-changing `/api` requests; Fastify remains
  an internal BFF target with no browser CORS and `API_TRUST_PROXY=false`.
- Deployment target decisions live in ADRs before deployment config is added.

Status: implemented for full project and performance CI checks, one core API/database flow, one core browser smoke flow, secure production cookie defaulting, and the first deployment target ADR.

## Deployment Configuration And Small-Batch Operations Slice

The first deployment configuration follows ADR 0005 and keeps hosted setup explicit:

- `render.yaml` owns the Render Blueprint for web, API, and PostgreSQL.
- Render-specific Dockerfiles mirror the local API and web Docker targets because the Blueprint builds Dockerfile paths directly.
- API migrations run with `node-pg-migrate` as an API pre-deploy command.
- The web service reaches the API over Render private networking through `API_INTERNAL_HOSTPORT`.
- `docs/deployment-runbook.md` records the first deploy checklist, production environment values, release order, backup/restore checks, and monitoring review.

Status: implemented for Render configuration and small-batch operations documentation.

## Logging Infrastructure Slice

The logging slice configures Fastify's existing Pino logger instead of adding a separate logger stack:

- `LOG_LEVEL` controls runtime verbosity and defaults to `info`.
- Local development uses `pino-pretty`; production uses structured JSON logs.
- Test logging should be disabled or reduced.
- Sensitive values such as cookies, authorization headers, and session tokens must be redacted.
- Route code should use request-scoped logs only where the event helps debug auth, workout, analytics, import/export, or deployment issues.

Status: implemented for API startup logging configuration, safe redaction, local pretty logs, production JSON logs, and quiet default tests.

## Stage 1 Metrics And Dashboard Slice

The first operations dashboard slice stays outside the product UI:

- `apps/api/src/shared/metrics.ts` owns the optional Prometheus registry, default Node.js metrics, normalized-route HTTP metrics, and the internal metrics route.
- Metrics are disabled unless `METRICS_ENABLED=true`; the home-host monitoring overlay enables them on a private Docker network.
- Labels stay bounded to service, environment, release, HTTP method, normalized route template, and status class. Request/user/session/workout/exercise identifiers are fields for logs, not metric dimensions.
- `compose.monitoring.yaml` extends the existing application stack with Prometheus, Grafana, node/container/PostgreSQL exporters, private networking, and persistent monitoring data.
- `ops/monitoring` owns Prometheus scrape configuration, Grafana data source/dashboard provisioning, the three Stage 1 dashboards, and the idempotent PostgreSQL monitoring-role setup.
- The monitoring overlay extends ADR 0005 without removing the Render configuration or adding monitoring concerns to the user-facing dashboard feature.

Status: implemented for the E2-E4 source and provisioning foundation. Runtime host validation, private remote access, alert delivery, and production screenshots remain owner/deployment verification work.

## UI And Analytics Rework Slice

The UI rework should polish the existing app screens without introducing a full design system:

- Keep feature UI in the existing auth, workouts, and analytics feature folders unless reuse is real.
- Improve logged-in Home, workout logging/detail, workout history, Progress, and Weekly Volume flows.
- Treat Progress and Weekly Volume as distinct app destinations rather than one mixed analytics page; target `/progress` and `/weekly-volume` for the rework unless implementation discovers a stronger existing route constraint.
- Progress is exercise-first: start with completed exercises, support last-done and muscle-group filtering, then open a selected exercise into a time-series view.
- Progress charts use date on the x axis and both weight and reps on the y axis: weight as a solid line, reps as a dotted non-continuous line that restarts or changes color when weight changes.
- Progress supports 1 week, 1 month, 3 months, and all-entry windows; selected-window summary totals accompany the daily strongest-working-set plot.
- Weekly Volume is muscle-map-first: show an anatomical body with separated muscles, use the exact five-stage purple working-set heat scale, and show selected-muscle stats next to the figure.
- Prefer a real interactive 3D body map when it fits the slice; otherwise ship a clear 2D front/back muscle map first and keep the implementation ready to replace with 3D later.
- Use `recharts` for conventional Progress charts. Use Three.js only if the Weekly Volume body map is implemented as a real 3D scene.

Status: implemented for separate `/progress` and `/weekly-volume` destinations, completed-exercise progress navigation, `recharts` weight/reps progress charts, an interactive anatomical 3D weekly muscle map, and an optional device-local 2D front/back view selected in Settings.

## CSV Workout Import/Export Slice

The CSV slice should add one canonical workout-history CSV format:

- API endpoints are `GET /api/v1/workouts/export.csv`, `POST /api/v1/workouts/import.csv`, and `POST /api/v1/workouts/import.csv/preview`.
- Web route handlers proxy those endpoints through the existing same-origin pattern.
- Use `papaparse` for CSV parsing and unparsing.
- Validate the whole file before writing and reject malformed files with row-level errors.
- Create or reuse global exercises by case-insensitive name, require known primary muscle group slugs, and run the shared exercise-name quality evaluator before preview/import.
- Do not partially import on validation failure.
- Workout History provides a responsive `View CSV format` dialog/sheet from the same canonical contract, including all headers, field rules, accepted values, timestamp/order rules, one complete row, and a downloadable sample CSV.

Status: implemented for authenticated canonical CSV workout-history export/import, same-origin web proxy routes, preview-first review, whole-file validation with row-level errors, exercise-name warning/block handling, global exercise reuse/creation by case-insensitive name, no partial import on validation failure, and in-app format/sample guidance.

## Cleanup And Performance Regression Slice

The cleanup keeps public behavior stable while restoring the documented boundaries:

- Shared web primitives live in `apps/web/src/shared/ui`; feature-specific UI stays in its owning feature.
- Auth session behavior remains behind `createAuthService`, while verification and password-reset actions use a focused internal action service. Route registration keeps the public `registerAuthRoutes` entry point and the existing endpoint paths.
- Fastify cookie authentication and Zod error response mapping use shared API helpers where three or more routes need the same boundary behavior.
- Workout and exercise services expose focused operations and delegate database-row response shaping to feature-owned mapping modules.
- CSV grouping and Volume aggregation use indexed maps/sets. Exercise-name suggestions use a bounded two-row Levenshtein calculation because suggestions beyond the accepted distance cannot appear in the response.
- `pnpm test:performance` runs API and web packages sequentially on fixed workloads, after warmups, using the median of three samples. Every gate also checks output counts.

The performance workloads and ceilings are recorded in `docs/Usability_Audit/performance-audit-v1.md`. They detect pure-function algorithmic regressions only; browser page-load NFRs and real-user performance still need separate measurement.

Status: implemented without endpoint, database, public response-shape, or storage-key changes.

## Public Status Evidence Slice

The recruiter-facing status page remains outside the product application while using existing
feature boundaries for its small live-data surface:

- `status` is an API feature with a route, service, and repository. The repository performs a
  filtered active-account count and a deliberately unfiltered workout-session row count; the
  service owns the below-five disclosure rule.
- The public Next.js BFF route forwards no cookies, preserves the API boundary, rejects browser
  origins other than `status.gymtrack.ch`, and disables caching.
- `ops/status/public` is plain HTML, CSS, and one local ES module. Parsing and failure-state logic
  remain testable without a browser or status provider.
- Better Stack owns externally observed availability and incidents. GitHub Actions owns attributable
  `c8 --all` coverage and latest-verified-commit evidence.
- No database migration, public analytics event, counter table, trigger, or scheduled recount is
  introduced. Every live request obtains a fresh database count.

Status: implemented for the repository/API/BFF/static-page foundation. Better Stack monitor and
repository-variable setup remain owner-operated external configuration.

## Current Size-Limit Exceptions

The following source files remain above the normal review targets after cleanup:

- `apps/web/src/features/avatar/avatar-stage.tsx` and `hologram-bay.tsx` exceed 400 lines because they contain one cohesive Three.js scene/shader pipeline. Their rendering math is intentionally unchanged; split them only at a real scene-responsibility boundary.
- `apps/web/src/features/volume/muscle-spike.tsx` and `muscle-spike-scene.tsx` exceed the 250-line target as a development-only anatomy authoring tool. They are not a product route and should be split only if the tool gains another stable responsibility.
- `apps/api/src/features/exercises/exercise-name-catalog.ts` exceeds 400 lines because it is a static, curated name and blocked-term catalog rather than orchestration logic.

Other files between 250 and 400 lines remain visible review triggers under `ENGINEERING.md`; this cleanup does not grant them a permanent exception.
