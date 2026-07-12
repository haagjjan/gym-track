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

**PARTIALLY SUPERSEDED (2026-07-11): the fusion is now separable at runtime.**
`statue-core.tsx#getStatueParts` splits the merged mesh into figure/pedestal
BufferGeometries per TRIANGLE using the mesh-audit predicate (below the tier plate,
far-out/up-facing at sole level, high side console) — no re-export/DCC needed. The
dashboard spins the FIGURE part alone (pedestal static, +4mm figure lift against
sole/plate z-fighting); `<Statue part="figure"|"pedestal">`, omit `part` for the legacy
fused render. The pedestal is now an independently replaceable mesh (owner wants a more
metallic version like the mood refs eventually). The volume screen still uses the fused
mesh + shader discard — untouched.

**REPLACED ON THE DASHBOARD (2026-07-12, owner-directed optimization round):** the FBX
pedestal part is no longer rendered anywhere on the dashboard. Its split geometry carried
sole slices of the feet (yn<0.033 triangles) that stayed static while the figure spun —
visible ghosting the owner flagged. `HologramBay` now owns a **procedural pedestal**
(`PedestalTiers` in `hologram-bay.tsx`, modeled on `docs/design-refs/hologram-bay-mood*.png`):
low concentric metal tiers + recessed cyan LED bands + glowing projector pad, top face at
`PEDESTAL_TOP_Y = 0.5` so the figure part's audited sole line (y≈0.4994 + 4mm turntable
lift) lands inside the pad glow, which also hides the open sole cut. The readiness ring
(avatar-stage) rides the pad top at r 0.545–0.615. Do not reintroduce `<Statue
part="pedestal">` on the dashboard; the FBX pedestal remains available for the legacy
fused render and the volume screen's shader-discard path. Bay lighting rules from the same
round: no visible light sources — the pilaster strips and ceiling bars are gone; light =
overhead spotlight (source above frame), pedestal LED bands/uplight, and a one-shot PMREM
env map (bars exist only as floor/drum reflections; no per-frame reflection passes).

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

## Volume Muscle Regions — Projected ID Maps (docs/14 Batch C Part 2, built)

Muscle-group regions on the 3D body come from hand-authored front/back SVG maps
(`apps/web/public/volume/muscle-regions-{front,back}.svg`), rasterized once by
`features/volume/region-map.ts` and consumed by BOTH the projection shader
(`muscle-mask-material.ts`, per-fragment planar projection, front/back chosen by the
surface normal) and click-picking (raycast hit point → the same ImageData). One pixel
source: rendering and selection cannot disagree, and region precision equals the
authored art — refine the SVGs, not code. Constraints that must hold:

- **Region-id colors must be NON-COLLINEAR** (`REGION_PALETTE` + nearest-entry decode
  with a distance cutoff). Rasterization anti-aliasing blends border texels between two
  palette colors; with collinear palettes those blends land exactly ON other ids and
  every boundary sparkles with foreign regions (this happened — first encoding was
  R=id·18 with an R+G=255 checksum, which is a line in RGB space).
- **Pedestal hiding keeps the FEET** (owner request, 2026-07-11; supersedes the earlier
  ankle-line cut). The discard combines height, radius, and the surface normal: everything
  below the tier plate (`yn < 0.033`), plus far-out or up-facing fragments at sole level
  (`yn < 0.047 && (radial > 0.6 || normal.y > 0.55)`), plus the old high side-console
  clause. Mesh-audit facts backing it: all pedestal geometry beyond radial 0.6 tops out at
  yn 0.044, the plate the feet stand on is up-facing at yn 0.032–0.044, and above yn 0.046
  only feet/ankles exist. Soles clip against the plate (invisible in practice); material
  stays DoubleSide so cuts read solid; the cyan projector pad remains under the figure.
- The Volume screen is **body-only** (owner override of Part 1's "same environment on
  both screens"): no HologramBay/fog there; Dashboard keeps the bay.
- The same SVGs render directly as the 2D body-map view (`body-map-2d.tsx`, 3D|2D
  toggle) — art edits update both views and picking simultaneously.
- Legacy per-vertex classification (`classifyVertex`/`classifyFigure`/`paintHeat`) and
  the red HEAT_STOPS ramp are deleted; the display ramp is cyan→VIOLET (`#a852ff`) at
  `TARGET_WEEKLY_SETS` (owner request 2026-07-11, replacing cyan→green; heatmap.ts
  `volumeRampCss`, single-sourced with the shader's `uViolet`).
- **Region art is owner-editable by design**: `apps/web/public/volume/README.md` documents
  the SVG coordinate system, palette/stroke/draw-order rules, and the `/muscle-spike`
  live-reload loop (`__muscleSpikeTemplate` / `__muscleSpikeReloadMaps`). Refine shapes
  there — never in code.

## 3D Interaction — Who Moves: Figure vs Camera (docs/14 Batch C, owner-confirmed)

- **Dashboard (has the HologramBay environment): drag spins the FIGURE, never the
  camera.** Orbiting the camera made the whole bay (light strips, floor streaks) appear
  to rotate with the statue — owner flagged this as a bug (2026-07-11). `AvatarStage`
  therefore has no OrbitControls: pointer drag feeds the turntable group's yaw with
  release inertia that decays back into the idle spin (doc 14: "the environment stays
  ambient, not reactive"). The fused pedestal rotating with the figure is correct — it
  belongs to the statue.
- **Volume (body-only, no environment): the CAMERA moves.** OrbitControls stays, and the
  Part 3 muscle-focus is a camera ease (`CameraDirector` in `volume-body-map.tsx`):
  selection eases target height / azimuth side / push-in distance; deselect eases back;
  FRONT/BACK snaps stay instant; a user drag cancels any ease in flight. Camera movement
  sidesteps the pedestal fusion and keeps picking coordinates stable.

## Dashboard Connector Lines — Split at the Canvas Boundary (docs/14 Batch B, built)

Leader lines from data cards to body landmarks are TWO cooperating pieces: an SVG stub
from the card edge across the page gap to the canvas edge (static content beneath —
legal overlay), and **real 3D geometry inside the scene** (`ConnectorBeams` in
`avatar-stage.tsx`): world-space landmark nodes (emissive sphere + additive halo) with
beams to the canvas edge, unprojected at the landmark's depth. `ConnectorLayer` measures
cards vs the `[data-connector-id="avatar-stage"]` element and feeds `{landmarkId, side,
ndcY}` to the stage. Landmarks are FIXED in world space — they do not ride the spinning
figure (calm scan-points, no swaying lines). Desktop-only, like the old overlay.

## Progress Chart — Interaction + Rendering Rules (docs/14 Batches A/B, built)

- **Pinned axes**: never `hide` a Recharts axis whose layout slot must exist — `hide`
  skips BOTH rendering and layout reservation. Use invisible-but-present axes
  (`tick/axisLine/tickLine={false}` + explicit width/height) in the scrollable chart AND
  the two overlay strips, or every pinned label drifts from its true value row.
- **Zoom within a window** (owner delegated the interaction choice): pinch on touch +
  ctrl/cmd-wheel on desktop (trackpad pinch emits ctrl+wheel), focal-point anchored via
  an RTL-normalized scroll offset; pan = the existing swipe/drag scroll; window chips
  reset zoom; ZOOM ×N — RESET chip appears when ≠1. Zoom compounding writes the zoom ref
  IMMEDIATELY (events outpace renders).
- **Draw-in animation is a feature** (owner): left→right, 900ms, restart-proofed by
  `scrollbar-gutter: stable` on the scroll container (the doc-14 "MAX glitch" was the
  scrollbar appearing mid-draw and remeasuring). Paused during zoom gestures; disabled
  under prefers-reduced-motion.
- **FOOTGUN**: the chart component's prop is named `window` and SHADOWS the global —
  always use `globalThis` for timers/matchMedia inside it (a `window.setTimeout` there
  shipped a runtime crash caught by the error boundary).

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
