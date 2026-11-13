# Architecture

This document states the boundaries and rules that hold across the codebase. The file-level map
is in [CODEBASE.md](CODEBASE.md); the full directory map is in
[docs/repository-structure.md](docs/repository-structure.md). Why each choice was made is in
[docs/decisions/](docs/decisions/README.md).

## System shape

GymTrack is a TypeScript monorepo with two apps and one database.

```text
Browser / phone shell
  └─ Next.js web app (apps/web)        UI and a same-origin BFF under /api/*
       └─ Fastify API (apps/api)       auth, business rules, persistence under /api/v1/*
            └─ PostgreSQL 17           durable data, constraints, migrations
```

- The browser only talks to the Next.js origin. Next.js route handlers under
  `apps/web/src/app/api/*` forward requests and cookies to Fastify. Fastify has no browser CORS
  surface.
- The BFF owns Host and Origin checks and edge-derived client attribution. Fastify owns
  authentication, authorization, business transactions and persistence.
- Production is self-hosted behind Cloudflare Tunnel and Caddy (ADR 0009, 0011). Fastify,
  PostgreSQL and the monitoring stack are never published directly. Render configuration stays
  in the repo as an alternative target (ADR 0005), not the live one.
- The phone apps will be Capacitor shells around a bundled build of the same web UI (ADR 0021).
  That is why the UI follows native mobile conventions (tab bar, safe areas, in-app back, sheets);
  see [docs/DESIGN.md](docs/DESIGN.md).

## Stack

| Concern | Choice | ADR |
| --- | --- | --- |
| Language | TypeScript everywhere (strict) | 0002 |
| Web | Next.js 15 App Router, React 19, Tailwind v4 tokens, TanStack Query, Recharts, React Three Fiber | 0003 |
| API | Fastify 5, Zod at runtime boundaries, Kysely for queries | 0003 |
| Database | PostgreSQL 17, SQL migrations with `node-pg-migrate` | 0002, 0004 |
| Auth | Owned email/password: Argon2id, opaque DB-backed sessions, HttpOnly cookies | 0003, 0004 |
| Registration | Open (`REGISTRATION_MODE=ENABLED`), `DISABLED` as the kill switch | 0022 |
| Workout writes | Idempotent and serialized per workout | 0014 |
| Privacy | Export, deletion grace period, hard erasure, consent versioning | 0013 |
| Hosting | Docker Compose on a private home server, staging on the same host | 0009, 0015 |
| Operations | Prometheus, Grafana, Alertmanager, encrypted Restic backups, public status page | 0008, 0010, 0018, 0019 |
| Mobile | Capacitor with a bundled web build, behind a spike gate | 0021 |

There is no Prisma. SQL migrations in `apps/api/db/migrations` are the schema source of truth,
and `apps/api/src/db/database.ts` holds the matching Kysely table types.

## Code organization

Both apps are organized by feature first, then by technical role.

```text
apps/api/src/
  features/<feature>/   routes, schemas, services, repositories, tests
  shared/               env, logging, metrics, mailer, events, rate limits
  db/                   Kysely database types and pool

apps/web/src/
  app/                  Next.js routes, layouts and BFF route handlers
  features/<feature>/   screens and feature-owned hooks and components
  shared/               API client and hooks, formatters, diagnostics
  shared/ui/            design-system primitives (Button, Sheet, ConfirmDialog, icons, ...)
```

API features: `admin`, `analytics`, `auth`, `exercises`, `health`, `lifecycle`, `messages`,
`status`, `templates`, `users`, `workouts`.

Web features: `admin`, `analytics`, `auth`, `avatar`, `dashboard`, `exercises`, `history`,
`launch`, `legal`, `messages`, `onboarding`, `privacy`, `progress`, `session`, `settings`,
`shell`, `status`, `templates`, `volume`, `workouts`.

## Dependency rules

- `apps/web` never imports database clients or Kysely. It depends on the documented API contract
  ([docs/05-api-contract.md](docs/05-api-contract.md)).
- In the API, route handlers authenticate, validate with Zod and call services. Business rules
  live in services. Kysely queries live in feature repositories, not in handlers.
- In the web app, `shared/` never imports from `features/`. A component used by two or more
  features moves to `shared/ui`. Feature code may import other features' public pieces, but
  shell and design primitives belong in `shared/`.
- Route files in `app/` stay thin: metadata, rendering mode and one screen component.
- Derived numbers (estimated 1RM, weekly volume, progress) are computed on read, not stored.
- The optional time/cardio batch (ADR 0026) uses separate tables, client UUIDs and revisions behind an off-by-default flag. It adds no native local store or sync worker; ADR 0025 remains proposed.
- Device-local preferences (body profile, favourite lifts, display, rest timer) go through
  `useScopedLocalStorage`, which scopes keys per user and honours the device-storage choice.
- The 3D scenes (`features/avatar`, `features/volume`) render inside bounded canvases, use
  a shared local GLB, lighting and simple pedestal without post-processing or environment-map
  generation, and fall back to static content when WebGL is missing. Muscle regions are named
  skinned meshes; raycasts and per-region materials share the same geometry (ADR 0027).
- Cross-app shared packages (`packages/shared`) are only added once both apps need the same code.
  None exists today.

## Runtime rules

- Errors use one envelope: `{ "error": { "code", "message", "fields", "details" } }`.
- Logs are structured Pino JSON in production. Cookies, auth headers, tokens, emails and request
  bodies are redacted. The BFF and API share request IDs.
- Metrics are bounded-label Prometheus metrics on an internal endpoint, off by default.
- Workout data is soft-deleted. Only one open workout per user (partial unique index).
  Weights are stored in kg.

## When an ADR is required

Write an ADR in `docs/decisions/` before changing:

- the web or API framework, or adding a major UI library
- the database engine, migration tool or soft-delete and unit policies
- the authentication or session strategy, or registration policy
- the API style or contract format
- hosting, deployment or backup topology
- the mobile shell, token auth, offline sync or native plugins (ADR 0021 gates)
- muscle attribution or other major schema rules

Smaller choices inside the accepted stack go in code, tests or the relevant feature doc.

## Open decisions

- Native file export and share (data export, CSV) inside the Capacitor shell.
- In-app browser handling for external links in the phone apps.
- Token auth and offline sync for the phone apps, if the Capacitor spike shows they are needed.
- Dropping the unused beta tables (`beta_access_requests`, `users.beta_cohort`) and moving
  `campaigns_open` out of `beta_settings`, as planned in ADR 0022.
- Alert-threshold tuning and a second immutable backup destination, once there is more
  production history.
