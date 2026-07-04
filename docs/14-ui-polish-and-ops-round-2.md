# UI Polish & Ops Round 2

**For:** Claude Fable 5, run via Claude Code
**Follows:** `10-frontend-rework-brief.md`, `11-phase0-frontend-inventory.md` (Phase 0–2 output, reviewed),
`12-saas-hardening.md` (backend hardening pass)
**Status:** Owner review of the Phase 2 build complete. This is not a redesign — it's a punch list against
the existing implementation, plus one deliberately-reopened item from doc 12's "not done" list.

## How to use this doc

Five batches, ordered by priority. Work batch by batch, not screen by screen — batches group work by
*kind* (isolated fix vs. shared asset vs. new backend surface), which is how risk and sequencing actually
work here. Some batches have an explicit open decision flagged before implementation — resolve or ask
before writing code for those items.

**Order: A → C → B → D → E is the default. But do E in parallel with A if convenient — see note in E.**

One standing decision confirmed by the owner: **the persistent desktop sidebar stays as-is.** Do not
revisit nav paradigm; primary usage is mobile.

---

## Batch A — Isolated frontend polish
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
      scroll position (currently only visible when scrolled fully left).
- [ ] **Progress chart (mobile):** the exercise selector list should be collapsible/expandable — a long
      list (8–9+ exercises) currently pushes the chart too far down the viewport.
- [ ] **Active Workout Logger:** move the reorder controls (up/down arrows) from inside individual sets to
      the exercise-block level. Reordering exercises, not sets, is the actual use case; current placement
      is confusing.
- [ ] **Cross-cutting:** email-verification banner should not be a persistent top-of-app banner. Move it
      into the menu; surface only as a small pending-action badge/indicator on the menu icon.

## Batch C — Shared 3D environment & asset work
Do this before Batch B's chart-rendering item and before deeper Volume work — it's the foundation both
Dashboard and Volume avatars sit in, and solving it once avoids solving it twice.

- [ ] **Build one shared "hologram bay" 3D environment** (obsidian/carbon-fiber materials, ambient
      lighting, floor reflection/fog) that both the Dashboard and Volume avatars render inside. The goal:
      the avatar should read as a hologram standing inside a real environment, not a 3D model sitting in a
      bounded canvas on a flat page. Currently both screens show a visible rectangular render boundary
      around the model — that boundary needs to disappear into a continuous scene.
  - Reuse the same environment asset/component on both screens.
- [ ] **Volume screen — muscle-group highlighting spike** (do in isolation before wiring it into the real
      screen, same spirit as the original avatar spike in doc 10 Phase 1):
  - Current state: color overlay doesn't align to actual muscle boundaries (e.g. a "chest" highlight
    bleeds into the abdomen), and uses colors outside the design system.
  - Needed: precise per-muscle-group masking with a defined edge, styled as a glow/outline highlight
    consistent with the hologram look (not a paint-fill look). Palette must come from the existing
    cyan/lavender/green accent system in `DESIGN.md` — no new colors.
  - **Open decision, resolve before building:** does this need the FBX re-exported with real
    muscle-group vertex groups/sub-meshes, or can it be done with a UV mask/shader approach on the
    existing mesh? Spike both quickly if unclear; report back before committing.
- [ ] **Volume screen:** replace the current "click a muscle group → recolor it beige" interaction with a
      camera move — smoothly orbit/reframe the camera to center on the selected muscle region instead of
      changing its color. Reference feel: clean product-page camera transitions (e.g. Apple-style),
      **not** a scroll-driven camera rig — just a programmatic move-to-target on click.

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
