# UI Polish & Ops Round 2

**For:** Claude, run via Claude Code
**Follows:** `10-frontend-rework-brief.md`, `11-phase0-frontend-inventory.md` (Phase 0–2 output, reviewed),
`12-saas-hardening.md` (backend hardening pass)
**Status:** Owner review of the Phase 2 build complete. This is not a redesign — it's a punch list against
the existing implementation, plus one deliberately-reopened item from doc 12's "not done" list.

## How to use this doc

Five batches, ordered by priority. Work batch by batch, not screen by screen — batches group work by
*kind* (isolated fix vs. shared asset vs. new backend surface), which is how risk and sequencing actually
work here. Some batches have an explicit open decision flagged before implementation — resolve or ask
before writing code for those items.

**Order: A → C → B → D → E is the default**

One standing decision confirmed by the owner: **the persistent desktop sidebar stays as-is.** Do not
revisit nav paradigm; primary usage is mobile.

---

## Batch A — Isolated frontend polish *mostly done*
No new assets, no backend, no dependencies on other batches. Do these first.

- [ ] **Dashboard:** data cards react to cursor/touch — subtle 3D tilt-on-hover, the "hover tilt card"
      effect (perspective transform following pointer position), not a static card.
- [ ] **Progress chart:** X-axis must be time-proportional, not index-proportional. Currently equal
      pixel-gaps can represent very different day spans (e.g. a 3-day gap rendered the same width as a
      3-week gap). Fix the scale, not the data.
- [ ] **Progress chart:** point styling should communicate "did the value change since the last point."
      New/changed weight → larger, filled dot. Repeated weight (no change) → smaller, hollow/outline dot.
      Do **not** distort the Y-axis to exaggerate small deltas — this is a marker-styling fix only.
- [ ] **Progress chart:** add a visually heavier separator line at year boundaries when a chart spans
      multiple years.
- [ ] **Progress chart:** Y-axis labels/gridline should stay pinned/visible regardless of horizontal
      scroll position (currently only visible when scrolled fully left). *Comment: the Y axis labels are successfully pinned, but the left side is covered by the data in the chart, and not visible per standart view*
- [ ] **Progress chart (mobile):** the exercise selector list should be collapsible/expandable — a long
      list (8–9+ exercises) currently pushes the chart too far down the viewport.
- [ ] **Active Workout Logger:** move the reorder controls (up/down arrows) from inside individual sets to
      the exercise-block level. Reordering exercises, not sets, is the actual use case; current placement
      is confusing. *partially done, I will order you directly when I wan this in a later phase*
- [ ] **Cross-cutting:** email-verification banner should not be a persistent top-of-app banner. Move it
      into the menu; surface only as a small pending-action badge/indicator on the menu icon.

**Note:** owner review found most of Batch A solid, with some rough edges remaining. Rather than reopening
A, residual polish is expected to surface naturally during Batch B (same screens, same files) — do not
treat Batch A as reopened unless the owner explicitly flags a specific regression.

## Batch C — Shared 3D environment & Volume interaction
Do this before Batch B's chart-rendering item and before deeper Volume work — it's the foundation both
Dashboard and Volume avatars sit in, and solving it once avoids solving it twice.

**Known constraint — confirm during Part 1, don't rediscover it:** the existing avatar asset has the
pedestal fused into the same mesh/object as the figure itself, rather than as a separate piece (this
happened unintentionally during Phase 1 asset generation). Any interaction that moves or reframes "the
figure" currently moves the pedestal along with it unless the mesh is split apart later. This is not a
blocker for this batch — just a real limitation to design around in Part 3 rather than hit by surprise.

Part 1's base build ran on Opus 4.8 and mostly worked, but the full-viewport/glass-panel rework (see
REWORK note below) surfaced real composition and performance problems that need frontier-level judgment
to solve well — that piece moves to Fable 5, same as Part 2. Stop for owner review after Part 1's rework,
and again after Part 2, before proceeding.

### Part 1 — Shared environment (built procedurally in code, no external mesh)
No external environment asset should be generated or imported. Given the constraints below, the required
effect (a dark industrial "hologram bay" the avatar stands inside) is achievable with primitives,
materials, fog, and lighting authored directly in code — this is materially cheaper than generating and
integrating a full environment mesh, and lower-risk.

- [ ] No gym equipment or detailed background props of any kind.
- [ ] No pedestal or floor platform of its own — one already exists fused to the avatar object (see
      constraint above); the environment surrounds it, never duplicates it.
- [ ] Not navigable. This is a fixed-camera backdrop, not a walkable space — do not model geometry or
      detail that would only be visible from angles the camera never reaches.
- [ ] Reference images `docs/design-refs/hologram-bay-mood.png` and `hologram-bay-mood-2.png` (confirm
      actual filenames on disk before starting) are mood/material/lighting reference **only** —
      obsidian/dark metal, cyan accent lighting, a reflective floor giving a sense of depth. Do **not**
      attempt to reproduce their composition, background equipment/detail, depth-of-field blur, or
      path-traced-style reflections. Where photoreal fidelity and mobile performance conflict,
      performance wins — a cheap faked/blurred floor reflection is preferable to an expensive real one.
- [ ] Give the environment a small amount of ambient life: cheap, continuous, non-interactive loops only
      (e.g. a slow sine-driven pulse on accent lighting, subtle drifting fog/particles). This should not
      be a scripted or triggered animation system — just a low-cost loop running underneath everything
      else. The only thing that should ever move in response to user interaction is the figure itself
      (see Part 3) — the environment stays ambient, not reactive.
- [ ] Use the same environment component on both the Dashboard and Volume screens.
- [ ] **REWORK — first attempt (full-viewport canvas + live `backdrop-filter: blur()` on all panels)
      failed both visually and on performance; do not repeat that approach as-is.** Observed failures:
      avatar composition broke (cropped/off-center — camera framing wasn't recomputed for the new canvas
      aspect ratio), and CPU/GPU thermal spiked noticeably on the owner's machine during testing, which
      will be worse on mobile. Root cause: full-viewport WebGL plus live backdrop-filter blur over an
      *animating* canvas is one of the most expensive combinations in browser rendering, since the blur
      has to be recomputed every frame.
- [ ] **Outcome bar, not a mandated implementation:** the environment should *feel* like one continuous
      space with no visible canvas boundary, and panels should *feel* like glass — but how that's achieved
      is open. A cheap, faked approach (tinted semi-transparent panel fill + subtle texture/gradient +
      glow border, no live backdrop-filter over the canvas; a color-matched background extending past a
      smaller, cheaper real-time render region) is explicitly preferred over a literal one-giant-canvas
      implementation if it gets the same feel for a fraction of the cost.
- [ ] **Camera framing/composition must be locked and verified at whatever final canvas dimensions are
      used** — don't assume framing that worked at one aspect ratio carries over to another.
- [ ] **Check the existing avatar state before building new fallback logic.** Doc 09 documents a `Home
      avatar state` already handling "static fallback, 3D scene readiness, and reduced-motion handling"
      for the Dashboard avatar — reuse/extend this rather than inventing a parallel mechanism.
- [ ] Reconsider whether the bloom postprocessing (per doc 11's stack) is a significant thermal
      contributor — a cheaper faked-glow (emissive material, no real bloom pass) may look nearly identical
      at a fraction of the cost.
- [ ] **Definition of done for this item is a real performance check, not a screenshot.** Test with CPU/
      GPU throttling (e.g. Chrome DevTools mobile/low-tier throttling profile) at minimum; flag clearly if
      you cannot verify real device thermals so the owner can spot-check on an actual phone before this is
      considered closed.
- [ ] Legibility over the background remains the bar for panel treatment — check text contrast, adjust
      tint/opacity as needed, whatever technique is used.
- [ ] While inspecting the existing avatar setup, confirm (or correct, if untrue) the pedestal-fusion
      detail above and log it in `.claude/memory/architecture-decisions.md` — Part 3 depends on knowing
      which is actually the case.

Screenshot both screens with the new environment. Self-check against `DESIGN.md` and the mood references
— specifically judge whether it feels alive without feeling heavy or busy. **Then stop and show the
owner for review before starting Part 2.**

### Part 2 — Muscle-group highlighting spike
Do in isolation before wiring into the real screen — same spirit as the original avatar spike in doc 10
Phase 1.

- [ ] Current state: color overlay doesn't align to actual muscle boundaries (e.g. a "chest" highlight
      bleeds into the abdomen), and uses colors outside the design system.
- [ ] Needed: precise per-muscle-group masking with a defined edge, styled as a glow/outline highlight
      consistent with the hologram look (not a paint-fill look). Palette must come from the existing
      cyan/lavender/green accent system in `DESIGN.md` — no new colors.
- [ ] **Open decision, resolve before building the real implementation:** does accurate masking need the
      mesh re-exported with real muscle-group vertex groups/sub-meshes, or can it be done with a UV
      mask/shader approach on the existing mesh? Check what 3D tooling is actually available in this
      environment before assuming either option is off the table. Time-box this as a real spike — get
      each viable approach to a rough proof-of-concept, not a finished feature, enough to judge edge
      accuracy and how well it can carry a glow/outline treatment. Report a recommendation and reasoning.
      **Then stop and wait for owner go-ahead before building the real implementation into the Volume
      screen.**

### Part 3 — Muscle-select interaction (only after Part 2 is approved)
Replace the current "click a muscle group → recolor it beige" interaction. It should feel like a
deliberate cinematic zoom/focus onto the selected muscle region — a camera pushing in and bringing that
area into focus — and must **not** look like an object being snapped or dragged to a new spot, the way it
would look mid-edit in 3D modeling software.

- [ ] Mechanism is flexible: camera movement, movement of the figure itself, or a combination — pick
      whichever reads best and is cheapest to implement well, given the pedestal-fusion constraint logged
      in Part 1. Camera movement is the likely simplest default since it sidesteps that constraint
      entirely, but use judgment.
- [ ] Ease the transition — no instant snaps.
- [ ] Screenshot or short recording, self-check against `DESIGN.md`.

## Batch B — Frontend engineering, needs more investigation
Not simple styling fixes — each needs either a root-cause dig or an interaction decision first.

- [ ] **Progress chart:** fix the MAX/all-time view animation — it currently starts drawing points in,
      then visibly skips/glitches instead of completing smoothly. This is likely related to the chart
      render-lifecycle risk area already flagged in `09-observability-and-data-structures.md` (state
      changes replacing chart data mid-measurement/remount). Use the console diagnostics already
      implemented from doc 09 to get an actual stack trace before patching symptoms.
- [ ] **Progress chart:** add horizontal scroll/zoom *within* a selected time range (e.g. inside "1M",
      scroll to inspect a narrower sub-window in more detail) — not just viewing the whole selected range
      compressed to fit.
  - **Open decision, resolve before building:** interaction model — drag-to-pan, pinch-zoom, or a
    secondary range slider? Pick one and state the choice before implementing.
- [ ] **Dashboard:** connector lines (data card → body landmark) should be real 3D geometry anchored in
      the scene, not an HTML/SVG overlay layer floating on top of the canvas. This depends on Batch C's
      environment work landing first, or at minimum the same coordinate space being available.

## Batch D — Backend-touching feature work
Reopens the API surface. Needs explicit guardrail decisions before code — don't build permissive versions
of these and tighten later; decide the safeguard first.

- [ ] **History — retroactive set edits:** `PATCH /sets/:setId` already exists per doc 11's confirmed API
      surface. The gap is UX guardrails, not the endpoint: add a confirmation step before committing an
      edit to historical data, and consider a visible "edited" indicator on modified sets so silent
      retroactive changes aren't invisible later.
- [ ] **History — retroactive session time edits:** editing a workout's start/end time after the fact
      (e.g. fixing a session that logged as 300+ hours) has **no existing endpoint** — this is new backend
      surface, not a UI-only fix. Same guardrail requirement as above.
- [ ] **Exercise merge:** ability to merge two exercise entries into one, reassigning all historical sets
      from exercise A to exercise B (for duplicates/misnamed exercises). New endpoint required. Location
      in the UI is undecided — could live on the History screen or in the exercise library/picker; propose
      a location as part of implementation rather than guessing silently. Needs a real safeguard (explicit
      confirm dialog naming both exercises and the set count affected, minimum) — this is a destructive,
      hard-to-reverse action on the user's own training history.
- [ ] **Workout naming:** users should be able to name a session. **First check whether a title field
      already exists** on `workout_sessions` — the History screenshots show auto-generated names like
      `ARMS_2026_05_31` and `HOME_2026_05_22`, suggesting a field may already exist but isn't
      user-editable at creation/completion time. If it exists: expose it in the UI. If not: small schema
      addition. (Workout categories like push/pull/legs are a later idea — out of scope for this round,
      don't build it now.)

## Batch E — Operational hardening & visibility
This deliberately reopens two calls `12-saas-hardening.md` made on purpose ("no analytics dashboard UI...
build a viewer when there is someone who needs it weekly" and accepting log-only email as sufficient for
now). That's an intentional reversal, not a contradiction of doc 12's judgment — the owner wants
operational visibility before this goes live to real users, not after. **Can run in parallel with Batch A**
since it touches ops/backend surfaces, not the same files as the UI batches.

- [ ] **Verify the SaaS hardening pass is actually live**, not just implemented locally: confirm migration
      `20260703120000000_add_auth_hardening_and_events.sql` is applied in the real deployment, confirm
      `API_TRUST_PROXY` and other new env vars are actually set on the host, and confirm rate limiting /
      account lockout behave as documented against the live instance.
- [ ] **Turn on real email delivery.** The missing verification email is almost certainly explained by doc
      13: with no `RESEND_API_KEY` set, the verification link only ever prints to the server log — nothing
      is actually sent. Steps: create a Resend account, verify a sending domain, set `RESEND_API_KEY`,
      `EMAIL_FROM`, and `APP_BASE_URL` in production. Then smoke-test the full loop end-to-end: signup →
      email actually arrives in an inbox → click link → `emailVerified` flips true. This is mostly
      configuration/validation, not new code — don't over-build it.
- [ ] **Build an internal analytics dashboard UI** against the existing `app_events` table (event types
      and example queries already defined in `13-operator-guide.md` section 3 — signups/day, DAU, funnel,
      most-active users). This is a real new screen, not a tweak.
  - **Open decision, resolve before building — access control:** there is currently no
    roles/admin concept anywhere in the auth system. Simplest path: a hardcoded allow-list (owner's user
    id/email via env var), no schema change. Alternative: a minimal `is_admin` column. Default
    recommendation is the allow-list for a single-operator dashboard — confirm with owner if going another
    route.
  - **Open decision, resolve before building — location:** this should live outside the normal app
    shell (e.g. a separate `/admin` or `/internal` route), not as another sidebar item next to the
    user-facing screens.

---

## Definition of done for this round

- Every checked item above is implemented and screenshotted/self-reviewed against `DESIGN.md` where visual.
- Every "open decision" was either resolved and stated, or explicitly raised with the owner before coding —
  not silently guessed.
- No regressions against the Phase 0 functionality contract (`11-phase0-frontend-inventory.md`).
- Batch D and E items that touch the database ship with a migration file, following the naming convention
  already used in doc 12.
