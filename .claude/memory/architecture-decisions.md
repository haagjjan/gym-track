# Memory: Architecture Decisions

This file captures durable technical decisions so future sessions do not reopen them
without cause.

## Accepted Stack

- TypeScript throughout.
- PostgreSQL database.
- SQL migrations as durable schema source of truth.
- `node-pg-migrate` for migration execution.
- Kysely for type-safe database queries.
- Fastify for the API.
- Next.js App Router for the web app.
- React 19 and TanStack Query on the frontend.
- Zod at runtime boundaries.
- pnpm workspaces.
- Argon2 password hashing.
- API-owned email/password auth.
- DB-backed opaque sessions stored hashed in `user_sessions`.
- Secure HttpOnly cookies for browser auth transport.

There is no Prisma in the current architecture.

## Boundaries

- `apps/web` owns UI, route rendering, same-origin proxy route handlers, and browser
  API helpers.
- `apps/api` owns auth, authorization, business rules, persistence workflows, and
  stable API contracts.
- `apps/api/db/migrations` owns schema changes.
- Feature folders own vertical slices.
- Shared code moves to shared locations only after real reuse exists.
- Web code must not import Kysely, DB clients, or server-only API internals.
- API route handlers should stay thin; services own business logic; repositories own
  Kysely/database access.

## API And Auth

- Fastify routes live under `/api/v1/*`.
- Next.js route handlers under `apps/web/src/app/api/*` proxy same-origin browser
  requests to Fastify and forward cookies.
- The browser should call `/api/*`, not the Fastify host directly.
- Error payloads use `{ error: { code, message, fields, details } }`.
- Cookies are HttpOnly, sameSite lax, and secure in production.
- Session tokens are raw only in cookies and hashed in the database.
- Login lockout/rate limits are part of the auth hardening posture.

## Data Rules

- One open workout per user.
- Workout sessions, session exercises, sets, and exercises use soft delete.
- Weights are stored in kg.
- Sets are ordered by `set_order`; exercises inside a session by `position`.
- Weekly volume counts working sets only.
- MVP weekly volume uses the exercise primary muscle group.
- Estimated 1RM and aggregate analytics are computed on read.
- Exercise names are globally unique case-insensitively and pass the name quality
  review/block flow.

## Deployment

- Render is the first small-batch deployment target.
- Web and API are separate Docker-backed Render Web Services.
- Render PostgreSQL is the first managed database target.
- API migrations run before API deploys through the Render pre-deploy command.
- Production secrets belong in Render environment variables, never in the repo.

## 3D Avatar Asset — Pedestal Fusion (confirmed, docs/14 Batch C Part 1)

Inspected during the Batch C Part 1 environment build and **confirmed true**: the avatar
asset `apps/web/public/models/avatar/avatar-base.fbx` is a single merged mesh in which the
sci-fi **pedestal is fused into the same geometry as the figure** — it is not a separate
object/sub-mesh and cannot be isolated without re-exporting the asset. Evidence:

- The FBX is one merged mesh (~150K verts); every consumer applies one material to all
  meshes via `traverse` and there is no separate pedestal node to target.
- `statue-core.ts` cannot center on the figure by bounding box because the fused pedestal
  slab skews it — it uses `boundsAboveHeight` (vertices above a height cut) to recover the
  figure axis. The volume heatmap likewise excludes the pedestal heuristically in
  `heatmap.ts` (`measureFigureFrame`), further confirming there is no clean mesh split.

Consequences for later Batch C work:

- Any interaction that moves/reframes "the figure" moves the pedestal with it. Part 3's
  muscle-focus interaction should therefore prefer **camera movement** (push-in / focus)
  over moving the figure, which sidesteps the fusion entirely.
- The shared `HologramBay` environment (`features/avatar/hologram-bay.tsx`) deliberately
  adds **no platform under the figure** — the fused pedestal remains the only platform.
  Its room floor is an environment surround for depth/reflection only.

## 3D Environment Architecture — Bounded Canvas + Static Ambience (docs/14 Batch C Part 1 rework)

The full-viewport live-canvas approach was tried and rejected (doc 14 REWORK note: broke
camera framing, thermal spike). The accepted architecture, which Parts 2/3 must respect:

- **Bounded render region.** Each screen renders the 3D scene in a layout-owned container;
  camera framing is tuned per container and must be re-verified if container dimensions
  change. The canvas is wrapped in an `absolute inset-0` div because R3F writes an inline
  pixel width onto the canvas that otherwise becomes the grid track's min-content and blocks
  the layout from shrinking (rotate/resize deadlock).
- **Static environment continuation.** `features/avatar/bay-ambience.tsx` (`BayAmbience` +
  `CanvasEdgeFade`) extends the bay across the page with static CSS gradients and melts the
  canvas edges. These layers must stay static — glass panels backdrop-blur over them.
- **Hard rule: no live `backdrop-filter` over animating pixels.** Panels keep real blur only
  because nothing animated sits under them. Elements overlapping the canvas (status pill,
  FRONT/BACK buttons) use solid tint, no blur.
- **No render-target passes in the scene.** No MeshReflectorMaterial (reflection is faked
  with static additive floor streaks), no bloom postprocessing (glow is faked with emissive
  materials + additive sprites). DPR capped at 1.5.
- **Scene lifecycle reuses the doc-09 Home-avatar mechanism** via
  `features/avatar/use-avatar-scene.ts`: WebGL gate → static fallback, live
  `prefers-reduced-motion`, IntersectionObserver → frameloop "always"/"demand" pause.

## ADR Gate

Create or update an ADR before changing:

- frontend framework or major UI library,
- backend framework or runtime,
- database engine or migration tool,
- auth/session strategy,
- API style,
- deployment target,
- major schema policy,
- module boundaries or dependency direction.
