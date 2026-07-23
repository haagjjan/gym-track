# Repository Structure

This file is the map for where things live in the Gym Progress Tracker repo. Keep existing paths stable unless a cleanup explicitly updates every reference.

## Root
*IN: Repos only, up to 3 lvl deep*

```text
.
├── _legacy-reference
│   └── web
│       ├── app
│       ├── features
│       └── shared
├── apps
│   ├── api
│   │   ├── db
│   │   ├── dist
│   │   ├── node_modules
│   │   └── src
│   └── web
│       ├── e2e
│       ├── node_modules
│       ├── public
│       └── src
├── docs
│   ├── Source_Pictures
│   │   └── Home Screen 
│   ├── UI_Redesign
│   │   └── GeneralOverview
│   ├── Usability_Audit
│   │   └── Screenshots
│   ├── decisions
│   ├── design
│   │   ├── stitch-redesign-v1
│   │   └── stitch-redesign-v2
│   ├── design-refs
│   │   └── volume-regions-pre-anatomy-rework
│   ├── server
│   │   ├── reports
│   │   ├── wave-a-host-fundation
│   │   ├── wave-b-application-platform
│   │   └── wave-c-operations-dashboard
│   └── status
│       ├── SWE-Reports
│       └── production-readiness
├── node_modules
│   ├── @eslint
│   │   ├── eslintrc -> ../.pnpm/@eslint+eslintrc@3.3.5/node_modules/@eslint/eslintrc
│   │   └── js -> ../.pnpm/@eslint+js@9.39.4/node_modules/@eslint/js
│   ├── @playwright
│   │   └── test -> ../.pnpm/@playwright+test@1.61.0/node_modules/@playwright/test
│   ├── eslint -> .pnpm/eslint@9.39.4_jiti@2.7.0/node_modules/eslint
│   ├── eslint-config-next -> .pnpm/eslint-config-next@15.5.19_eslint@9.39.4_jiti@2.7.0__typescript@5.9.3/node_modules/eslint-config-next
│   ├── typescript -> .pnpm/typescript@5.9.3/node_modules/typescript
│   └── typescript-eslint -> .pnpm/typescript-eslint@8.61.1_eslint@9.39.4_jiti@2.7.0__typescript@5.9.3/node_modules/typescript-eslint
├── ops
│   ├── backup
│   │   ├── deploy
│   │   ├── macos
│   │   ├── scripts
│   │   └── systemd
│   ├── logging
│   │   └── scripts
│   └── monitoring
│       ├── alertmanager
│       ├── grafana
│       ├── postgres
│       ├── prometheus
│       └── textfile
└── test-results
```

- `README.md` is the human starting point.
- `AGENTS.md` is the working rulebook for coding agents.
- `ARCHITECTURE.md` defines module boundaries and dependency direction.
- `ENGINEERING.md` defines TypeScript, PostgreSQL, structure, and testing rules.
- `CONTRIBUTING.md` defines the implementation and review workflow.
- `Dockerfile` owns local production-like API, web, and migration image targets.
- `Dockerfile.render-api` and `Dockerfile.render-web` own Render service images because Render Blueprints build from Dockerfile paths instead of Compose targets.
- `compose.yaml` owns local infrastructure and app orchestration for PostgreSQL, migrations, API, and web.
- `compose.monitoring.yaml` is the opt-in Stage 1 overlay for the private Prometheus, Grafana, and exporter stack.
- `render.yaml` owns Render Blueprint configuration for the small-batch deployment target.
- Root TypeScript, ESLint, Playwright, package, and pnpm files own shared tooling.
- `.github/workflows/repo-checks.yml` owns project CI checks, sequential performance regression tests, API database integration tests, and web smoke tests.

## Applications

```text
apps/
|-- api/
|   |-- db/
|   |   |-- migrate.json
|   |   `-- migrations/
|   |-- tsconfig.build.json
|   `-- src/
|       |-- db/
|       |-- features/
|       |   |-- analytics/
|       |   |-- auth/
|       |   |-- exercises/
|       |   |-- health/
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
        |   |-- analytics/
        |   |-- auth/
        |   |-- dashboard/
        |   |-- navigation/
        |   |-- history/
        |   |-- launch/
        |   |-- progress/
        |   |-- session/
        |   |-- settings/
        |   |-- templates/
        |   |-- volume/
        |   `-- workouts/
        `-- shared/
            `-- ui/
```

- `apps/api` owns the Fastify API, Kysely database access, migrations, API feature slices, and API tests.
- `apps/api/tsconfig.build.json` owns the compiled API runtime build used by Docker.
- `apps/api/src/features/<feature>` owns each API vertical slice. Current features are `analytics`, `auth`, `exercises`, `health`, `templates`, `users`, and `workouts`.
- `apps/api/src/db` owns database connection and database health helpers.
- `apps/api/src/shared` owns API-only shared boundaries such as environment validation, logger configuration, and common HTTP validation responses.
- `apps/api/src/features/auth/authenticate-request.ts` owns shared Fastify session-cookie authentication for protected feature routes.
- `apps/web` owns the Next.js App Router app plus the first auth, workout logging, workout history/detail, CSV import/export, analytics UI slices, and Playwright smoke tests.
- `apps/web/public/models/avatar/avatar-base.fbx` is the shared 3D human figure asset. The pedestal is fused into this FBX rather than stored as a separate model file.
- `apps/web/src/features/avatar` owns the dashboard avatar scene, hologram bay, and runtime figure/pedestal separation and materials.
- `apps/web/src/features/volume` owns the interactive muscle-volume figure view, which reuses the shared avatar FBX and applies the muscle-region visualization.
- `apps/web/src/app/muscle-spike` and its `features/volume/muscle-spike*` modules are a development-only anatomy authoring tool, not a product route. Its Playwright authoring test is opt-in with `MUSCLE_SPIKE_E2E=true` against `next dev`; normal production smoke runs skip it. The obsolete avatar spike has been removed.
- `apps/web/e2e` owns browser smoke tests for core UI flows that run against the local app stack.
- `apps/web/src/features/analytics` owns the Progress and Weekly Volume UI, browser analytics API helpers, and same-origin analytics API proxy helpers.
- `apps/web/src/features/auth` owns web auth forms, server auth helpers, and auth proxy helpers.
- `apps/web/src/features/dashboard` owns the logged-in dashboard/home screen, real active-workout presentation, avatar composition, and dashboard-only styles.
- `apps/web/src/features/navigation` owns the logged-in `Gym Progress Tracker` app shell, route navigation, settings cog, and truthful global state labels.
- `apps/web/src/features/workouts` owns workout logging/history-detail API helpers, CSV import/export proxy helpers, and the versioned user/surface-scoped `sessionStorage` filter-state helper shared by the three Workouts tabs.
- `apps/web/src/features/exercises` owns the shared searchable/faceted exercise catalog, ownership/editability filtering, and ordered staged multi-selection used by sessions and templates.
- `apps/web/src/features/templates` owns template management, compact ordered exercise rows, staged picker commits, and completed-workout template decisions.
- `apps/web/src/features/session` owns the mobile-first live workout, exercise/set modes, staged multi-exercise adding, local unfinished-set drafts, exercise order, the mobile set-editor bottom sheet, rest-timer dock, and authoritative live header timer. Desktop editors/timer remain inline.
- `apps/web/src/features/history` owns History presentation, use of the shared tab-session facet/sort state, CSV import/export controls, and the canonical CSV format/sample guide.
- `apps/web/src/features/progress`, `volume`, and `settings` own V1 range-aware Progress summaries, the five-stage heatmap/touch gesture boundary, and preference/maintenance surfaces.
- `apps/web/src/features/avatar/statue-core.tsx` loads the shared FBX and separates its fused figure and pedestal geometry at runtime; it does not load a second pedestal asset.
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

- `ops/backup` owns encrypted Restic backup scripts, isolated restore tests, systemd scheduling, recovery deployment, and the restricted macOS SFTP destination setup.
- `ops/logging` owns bounded production log-review and secret-audit scripts; it does not own a separate log store.
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
|-- 00-workflow.md
|-- 01-requirements.md
|-- 02-query-list.md
|-- 03-data-model-notes.md
|-- 04-schema-draft.md
|-- 05-api-contract.md
|-- 06-implementation-start.md
|-- 07-implementation-pattern.md
|-- 08-next-implementation-plan.md
|-- 09-observability-and-data-structures.md
|-- Usability_Audit/
|   |-- performance-audit-v1.md
|   |-- usability-audit-v2.md
|   |-- usability-audit-v3.md
|   `-- usability-audit-v4.md
|-- deployment-runbook.md
|-- git-pipeline.md
|-- status/
|   |-- Statusupdate-Whiteboxtesting.md
|   `-- privat-beta-readiness.md
|-- repository-structure.md
`-- decisions/
```

- `docs/00-workflow.md` tracks the roadmap and current phase progress.
- `docs/01-requirements.md` through `docs/05-api-contract.md` are product, query, data, schema, and API source-of-truth docs.
- `docs/06-implementation-start.md` records the original staged implementation handoff.
- `docs/07-implementation-pattern.md` records the feature-slice pattern used by API and web work.
- `docs/08-next-implementation-plan.md` records the current fresh-session handoff and remaining implementation blocks.
- `docs/09-observability-and-data-structures.md` records implemented data structures and the planned logging/diagnostics approach for client and API failures.
- `docs/Usability_Audit/` records V1 responsive-web usability decisions and the pure-function performance regression baseline. Read usability audit v4 first, then v3 and v2 only for behavior not superseded by a newer audit; the audit-v4 rework list remains post-beta.
- `docs/deployment-runbook.md` records Render deployment, migration, backup, restore-test, and monitoring steps for small-batch users.
- `docs/status/` contains short-lived status reviews, audit notes, and private-beta readiness updates.
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

Use `.env.example` for shared environment variable documentation. Do not commit secrets, cookie jars, database dumps, or generated build output.

## Future Growth

- Add `apps/web/src/features/<feature>` when a real web workflow exists.
- Add new `apps/api/src/features/<feature>` folders only for implemented API behavior.
- Add `packages/shared` only after at least two real consumers need shared contracts or utilities.
- Do not create empty app, package, feature, or infrastructure folders.
