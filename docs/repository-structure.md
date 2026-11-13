# Repository Structure

This file is the map for where things live in the Gym Progress Tracker repo. Keep existing paths stable unless a cleanup explicitly updates every reference.

## Root
Tracked folders, up to three levels deep (generated 2026-11-09; `docs/archive` collapsed, see its README):

```text
.
├── apps
│   ├── api
│   │   ├── catalog
│   │   ├── db
│   │   ├── scripts
│   │   └── src
│   └── web
│       ├── e2e
│       ├── public
│       └── src
├── docs
│   ├── archive
│   ├── audit-2026-11
│   ├── beta-process
│   │   └── public-beta
│   ├── decisions
│   ├── design
│   │   └── mockups
│   ├── design-refs
│   └── server
├── ops
│   ├── backup
│   │   ├── deploy
│   │   ├── macos
│   │   ├── scripts
│   │   └── systemd
│   ├── logging
│   │   ├── scripts
│   │   └── systemd
│   ├── monitoring
│   │   ├── alertmanager
│   │   ├── grafana
│   │   ├── postgres
│   │   └── prometheus
│   ├── production
│   ├── staging
│   │   ├── caddy
│   │   └── postgres
│   └── status
│       ├── public
│       └── scripts
└── scripts
```

- `README.md` is the human starting point.
- `AGENTS.md` is the working rulebook for coding agents.
- `ARCHITECTURE.md` defines module boundaries and dependency direction.
- `ENGINEERING.md` defines TypeScript, PostgreSQL, structure, and testing rules.
- `CONTRIBUTING.md` defines the implementation and review workflow.
- `Dockerfile` owns local production-like API, web, and migration image targets. Long-running API
  and standalone Next.js targets are minimal, health-checked and run as the unprivileged Node
  user; the migration target is a short-lived deployment image.
- `Dockerfile.render-api` and `Dockerfile.render-web` own Render service images because Render Blueprints build from Dockerfile paths instead of Compose targets.
- `compose.yaml` owns local infrastructure and app orchestration for PostgreSQL, migrations, API, and web.
- `compose.monitoring.yaml` is the opt-in Stage 1 overlay for the private Prometheus, Grafana, and exporter stack.
- `render.yaml` owns Render Blueprint configuration for the small-batch deployment target.
- Root TypeScript, ESLint, Playwright, package, and pnpm files own shared tooling.
- `.github/workflows/repo-checks.yml` owns project CI checks, sequential performance regression tests, API database integration tests, and web smoke tests.
- `.github/workflows/status-page.yml` publishes the independently hosted page after a successful
  main workflow, generating coverage/build evidence and non-secret Better Stack runtime config.

## Applications

```text
apps/
|-- api/
|   |-- catalog/
|   |-- db/
|   |   |-- migrate.json
|   |   `-- migrations/
|   |-- scripts/
|   |-- tsconfig.build.json
|   `-- src/
|       |-- db/
|       |-- features/
|       |   |-- admin/
|       |   |-- analytics/
|       |   |-- auth/
|       |   |-- beta/
|       |   |-- exercises/
|       |   |-- health/
|       |   |-- lifecycle/
|       |   |-- messages/
|       |   |-- status/
|       |   |-- templates/
|       |   |-- users/
|       |   `-- workouts/
|       |-- shared/
|       |-- main.ts
|       `-- server.ts
`-- web/
    |-- e2e/
    `-- src/
        |-- app/
        |-- features/
        |   |-- admin/
        |   |-- analytics/
        |   |-- auth/
        |   |-- avatar/
        |   |-- dashboard/
        |   |-- exercises/
        |   |-- history/
        |   |-- launch/
        |   |-- legal/
        |   |-- messages/
        |   |-- onboarding/
        |   |-- privacy/
        |   |-- progress/
        |   |-- session/
        |   |-- settings/
        |   |-- shell/
        |   |-- status/
        |   |-- templates/
        |   |-- volume/
        |   `-- workouts/
        `-- shared/
            `-- ui/
```

- `apps/api` owns the Fastify API, Kysely database access, migrations, API feature slices, and API tests.
- `apps/api/catalog` owns the reviewed exercise source manifest, legacy-name input, pinned-source review/exclusion record, and generation metadata. `apps/api/scripts/build-system-exercise-catalog.mjs` reproducibly rebuilds the generated runtime manifest and SQL migration from the pinned upstream revision.
- `apps/api/scripts/beta-capacity.ts` owns the guarded synthetic active-logger workload used for
  Goal 4 capacity evidence; `capacity-metrics.ts` owns its bounded result summary. The workload
  requires explicit isolated-data and target approval and must never be aimed at real user data.
- `apps/api/tsconfig.build.json` owns the compiled API runtime build used by Docker.
- `apps/api/src/features/<feature>` owns each API vertical slice. Current features: `admin`, `analytics`, `auth`, `exercises`, `health`, `lifecycle`, `messages`, `status`, `templates`, `users`, and `workouts`.
- `apps/api/src/features/admin` owns canonical administrator user containment and bounded audit-read interfaces; `apps/api/src/features/lifecycle` owns the single-process startup-and-hourly cleanup scheduler.
- `apps/api/src/db` owns database connection and database health helpers.
- `apps/api/src/shared` owns API-only shared boundaries such as environment validation, logger configuration, and common HTTP validation responses.
- `apps/api/src/features/auth/authenticate-request.ts` owns shared Fastify session-cookie authentication for protected feature routes.
- `apps/web` owns the Next.js App Router app, the BFF route handlers, all product UI, and the Playwright specs.
- `apps/web/src/middleware.ts` and `apps/web/src/request-security.ts` own the Next.js
  host allowlist, same-origin state-change guard, and browser-facing security headers.
- `apps/web/public/models/body/body.glb` is the shared rigged figure. `tools/body-model/` holds the build scripts and structural validator.
- `apps/web/src/features/avatar` owns the dashboard avatar scene, hologram bay, and runtime figure/pedestal separation and materials.
- `apps/web/src/features/volume` owns the interactive muscle-volume figure view, which reuses the shared GLB, colours each named muscle mesh and picks by raycast.
- `/weekly-volume?debugRegions=1` colours each named muscle region for inspection. The old SVG projection maps are retired.
- `apps/web/src/shared/ui` owns design-system primitives (Button, Sheet, ConfirmDialog, Stepper, icons). `shared/` must not import from `features/`.
- `apps/web/e2e` owns browser smoke tests for core UI flows that run against the local app stack.
- `apps/web/src/features/analytics` owns the same-origin analytics API proxy helper. The Progress and Volume screens live in `features/progress` and `features/volume`.
- `apps/web/src/features/auth` owns web auth forms, server auth helpers, and auth proxy helpers.
- `apps/web/src/features/dashboard` owns the logged-in dashboard/home screen, real active-workout presentation, avatar composition, and dashboard-only styles.
- `apps/web/src/features/navigation` owns the logged-in `Gym Progress Tracker` app shell, route navigation, settings cog, and truthful global state labels.
- `apps/web/src/features/workouts` owns workout logging/history-detail API helpers, CSV import/export proxy helpers, and the versioned user/surface-scoped `sessionStorage` filter-state helper shared by the three Workouts tabs.
- `apps/web/src/features/exercises` owns the shared searchable/faceted exercise catalog, ownership/editability filtering, and ordered staged multi-selection used by sessions and templates.
- `apps/web/src/features/templates` owns template management, compact ordered exercise rows, staged picker commits, and completed-workout template decisions.
- `apps/web/src/features/session` owns the mobile-first live workout, exercise/set modes, staged multi-exercise adding, local unfinished-set drafts, exercise order, the mobile set-editor bottom sheet, rest-timer dock, and authoritative live header timer. Desktop editors/timer remain inline.
- `apps/web/src/features/history` owns History presentation, use of the shared tab-session facet/sort state, CSV import/export controls, and the canonical CSV format/sample guide.
- `apps/web/src/features/progress`, `volume`, and `settings` own V1 range-aware Progress summaries, the five-stage heatmap/touch gesture boundary, and preference/maintenance surfaces.
- `apps/web/src/features/avatar/body-model.ts` clones the shared skinned GLB; `scene-kit.tsx` provides lighting and a simple disc pedestal. `statue-core.tsx` only builds Home's rim material.
- `apps/web/src/shared` owns web-only helpers with at least two feature consumers, currently API base URL resolution.
- `apps/web/src/shared/ui` owns reusable web UI primitives that are shared across multiple feature surfaces.

## Operations

```text
ops/
|-- backup/
|   |-- README.md
|   |-- deploy/
|   |-- macos/
|   |-- scripts/
|   `-- systemd/
|-- logging/
|   |-- README.md
|   `-- scripts/
|-- production/
|   |-- compose.yaml
|   |-- Caddyfile
|   |-- production.env.example
|   `-- README.md
|-- staging/
|   |-- compose.yaml
|   |-- Caddyfile
|   |-- postgres/
|   `-- README.md
`-- monitoring/
|   |-- README.md
|   |-- alertmanager/
|   |   `-- alertmanager.yaml
|   |-- grafana/
|   |   |-- dashboards/
|   |   `-- provisioning/
|   |       |-- dashboards/
|   |       `-- datasources/
|   |-- postgres/
|   |   `-- create-monitoring-role.sql
|   `-- prometheus/
|       |-- prometheus.yaml
|       `-- rules/
|           `-- alerts.yaml
```

- `ops/backup` owns encrypted Restic backup scripts, isolated restore tests, systemd scheduling,
  recovery deployment, the restricted macOS SFTP destination and its persistent reverse-tunnel
  launch agent.
- `ops/logging` owns bounded production log-review, secret-audit and strict weekly Docker-log
  retention automation; it does not own a separate log store.
- `ops/production` owns the reviewed non-secret public-beta Compose/Caddy definition, host-only
  environment template and controlled cutover/rollback order. Live production values and secrets
  remain under `/srv/gym-tracker` outside Git.
- `ops/staging` owns the non-secret, production-shaped Goal 3 staging Compose/Caddy definition,
  PostgreSQL role initialization and operator deployment/rollback runbook. Live staging
  environment values and secrets remain only under `/srv/gym-tracker-staging`.
- `ops/monitoring/alertmanager` owns private notification routing without notification credentials.
- `ops/monitoring/prometheus` owns the private scrape topology and intervals.
- `ops/monitoring/prometheus/rules` owns bounded-label production alert conditions and operator first actions.
- `ops/monitoring/grafana/provisioning` owns the immutable Prometheus data source and dashboard provider.
- `ops/monitoring/grafana/dashboards` owns the service, host/container, and PostgreSQL operations dashboards.
- `ops/monitoring/postgres` owns idempotent deployment-level creation of the least-privilege `pg_monitor` login; it is not an application-schema migration.
- `ops/monitoring/secrets/` is ignored and local-only. It includes Grafana, PostgreSQL exporter, and Telegram Alertmanager secret files and must never be committed.

## Documentation

```text
docs/
|-- 01-requirements.md
|-- 02-query-list.md
|-- 03-data-model-notes.md
|-- 04-schema-draft.md
|-- 05-api-contract.md
|-- 07-implementation-pattern.md
|-- 09-observability-and-data-structures.md
|-- 13-operator-guide.md
|-- 99-current-project-state.md
|-- DESIGN.md
|-- audit-2026-11.md
|-- audit-2026-11/
|-- current-system-analysis.md
|-- deployment-runbook.md
|-- repository-structure.md
|-- archive/
|-- beta-process/public-beta/   (live privacy documents)
|-- decisions/
|-- design/mockups/
|-- design-refs/
`-- server/
```

- `docs/01-requirements.md` through `docs/05-api-contract.md` are product, query, data, schema, and API source-of-truth docs.
- `docs/07-implementation-pattern.md` records the feature-slice pattern used by API and web work.
- `docs/99-current-project-state.md` is the short handoff: where things stand and what is next.
- `docs/13-operator-guide.md` is the day-to-day operations guide.
- `docs/09-observability-and-data-structures.md` records implemented data structures and the planned logging/diagnostics approach for client and API failures.
- `docs/beta-process/public-beta/` keeps the live privacy documents: data-processing inventory and retention/erasure runbook (`goal-1/`), DPIA, processor inventory and the 3D model licence evidence (`goal-2/`). The beta goal reports and launch gates moved to `docs/archive/beta-process/`.
- `docs/deployment-runbook.md` covers the Render alternative target. The live release procedure is `ops/production/README.md`.
- `docs/DESIGN.md` is the design system (tokens, navigation, components, copy voice); `docs/design/mockups/` holds its signed-off phone mockup.
- `docs/audit-2026-11.md` and `docs/audit-2026-11/` are the UX, copy, code and docs audit behind the UX rework.
- `docs/archive/` holds finished plans, reports, design concepts and the old UI reference; its `README.md` is the index.
- `scripts/mobile-preview.sh` opens the dev server in Capacitor shells on the iOS Simulator and Android emulator; the shell itself lives outside the repo.
- `docs/decisions` contains ADRs, including the accepted Render deployment target. Add or update an ADR before changing stack, auth strategy, schema policy, API style, or deployment direction.

## Local-Only Files

These files may exist locally but should not be committed:

- `.env`
- `.DS_Store`
- `cookies.txt`
- `node_modules/`
- `apps/*/node_modules/`
- `apps/web/.next/`
- `apps/api/dist/`
- `ops/monitoring/secrets/`
- `ops/monitoring/textfile/`
- `*.tsbuildinfo`
- log files, coverage output, caches, and temporary runtime files
- Playwright reports and test results

`ops/status/public/` is committed static source intended for an independently hosted `status.gymtrack.ch`; it is not generated runtime output.
Its `status.js` entry owns fetch/poll lifecycle, `status-data.js` owns validation and history parsing,
`status-state.js` owns independent evidence state and request generations, and `status-view.js` owns
safe DOM rendering. `status-metrics.js` validates additive aggregate activity independently of
legacy totals, and `status-activity.js` renders the metrics, weekly chart and accessible table.
`ops/status/public/images/` owns the three committed sample-data WebP screenshots; capture provenance
and recapture steps live in `ops/status/showcase-captures.md`. `ops/status/playwright.config.ts` and
`status.browser.spec.ts` own independent browser checks, invoked with `pnpm test:status:browser`.
The API status feature's `status-window.ts` owns the shared UTC reporting-window calculation.
`ops/status/*.test.mjs` and `status-fixtures.mjs` own isolated status tests.
`ops/status/scripts/preview.mjs` serves local browser fixtures; it and its fixtures remain outside
the published `public/` directory. Generated `config.json`, `quality.json`, and raw review screenshots
are local or CI artifacts, not committed source. The three curated example captures under
`public/images/` are intentional committed product assets, with provenance recorded above.

Use `.env.example` for shared environment variable documentation. Do not commit secrets, cookie jars, database dumps, or generated build output.

## Future Growth

- Add `apps/web/src/features/<feature>` when a real web workflow exists.
- Add new `apps/api/src/features/<feature>` folders only for implemented API behavior.
- Add `packages/shared` only after at least two real consumers need shared contracts or utilities.
- Do not create empty app, package, feature, or infrastructure folders.

## Hands-on example ownership

- `apps/web/src/features/onboarding` owns the Home invitation card, versioned lesson flags, the in-memory
  example controller, catalog-backed sample data, demo analytics, and explicit template copy.
- `apps/web/src/app/help/demo` owns the authenticated persistent demo layout and bounded
  route family. A new layout mount starts fresh; no demo drafts are stored on the device.
- Existing session, launch, History, Progress and Volume feature folders continue to own
  their reusable presentation controls. Live API hooks stay in live containers.
- `apps/web/e2e/onboarding-demo.spec.ts` covers the complete example and its isolation boundary.
  Captures, traces and disposable local verification data remain ignored in `test-results/`
  and `.cache/onboarding-review/`.
