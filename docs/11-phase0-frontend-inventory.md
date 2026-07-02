# Phase 0 — Frontend Inventory & Tech Stack (Functionality Contract)

**Status:** Confirmed 2026-07-02. This is the functionality contract for the frontend rework
(see `10-frontend-rework-brief.md`). Nothing on this list may be lost in the rebuild.

## Confirmed decisions

- **Branch:** all rework happens on `frontend-rework` (the `frontend-rework-fable5` name from the brief is dropped).
- **Navigation paradigm:** persistent **sidebar** on desktop (drawer on mobile), per the fused concept.
- **Design refs:** `docs/design-refs/design-ref.png` is the canonical fused-concept target
  (the brief's `dashboard-fused-concept.png`). The other two images named in the brief do not exist on disk.
- **3D asset:** already renamed to `futuristic-humanoid-3d-model.fbx`; Phase 1 relocates it to
  `apps/web/public/models/avatar/avatar-base.fbx`.
- **Tech stack:** see bottom of this document.

## Data the API does not provide (flagged, not blocked)

Rendered with placeholders/derived data unless backend additions are approved later:

1. **Biometrics** (age/height/weight/BFP/FFMI) — fused concept shows a biometric panel; no endpoint exists.
2. **User-pinned PB lifts** — dashboard PBs are derived from the 3 most recently trained exercises,
   not user-chosen like the concept's Bench/Squat/Deadlift.
3. **Saved workout protocols/templates** — start screen shows static placeholder protocol groups.

## API surface consumed (contract — do not change)

All via Next.js `/api/*` proxy routes forwarding the session cookie to Fastify (`API_BASE_URL`).

- Auth: `POST /auth/login`, `POST /auth/signup`, `POST /auth/logout`, `GET /auth/me`
- Workouts: `GET /workouts?limit&offset[&startDate&endDate]`, `POST /workouts`,
  `GET /workouts/:id`, `POST /workouts/:id/end`
- Session exercises: `POST /workouts/:id/exercises`, `DELETE /workouts/:id/exercises/:sessionExerciseId`,
  `PATCH /workouts/:id/exercises/reorder`
- Sets: `POST /workouts/:id/exercises/:sessionExerciseId/sets`, `PATCH /sets/:setId`, `DELETE /sets/:setId`
- Exercises: `GET /exercises?search&limit&offset`, `POST /exercises` (name-review flow:
  `EXERCISE_NAME_REVIEW_REQUIRED` / `EXERCISE_NAME_BLOCKED` with suggestions + `confirmNameWarning`)
- Muscle groups: `GET /muscle-groups`
- Analytics: `GET /analytics/exercises` (completed), `GET /analytics/exercises/:id/progress`,
  `GET /analytics/exercises/:id/summary`, `GET /analytics/weekly-volume?startDate&endDate`
- CSV: `GET /workouts/export.csv`, `POST /workouts/import.csv[/preview][?confirmNameWarnings=true]`
- Error envelope: `{ error: { code?, message?, fields?, details? } }`; notable code `OPEN_WORKOUT_EXISTS`.

---

## Screen specs

### App Shell (wraps every authed screen)
Screen purpose: Persistent navigation and identity frame.
Primary user actions: Navigate (Dashboard, Workout, History, Progress, Volume); start session; logout.
Displayed data: Username, email, auth status badge; app title/status bar.
Interactions: Desktop = persistent sidebar; mobile = hamburger → drawer overlay (closes on route change). "Start session" creates-or-resumes a workout.
Empty state: n/a.
Loading state: n/a.
Mobile constraints: Drawer nav with backdrop; top bar retains menu button.
Implementation notes: Server-side auth gate on every page (`getCurrentUser` → redirect `/login`).

### Login (`/login`)
Screen purpose: Authenticate an existing user.
Primary user actions: Submit username + password; switch to signup.
Displayed data: Static brand/status copy only.
Interactions: Zod client validation → per-field errors; API error → form-level banner; success → redirect `/`.
Empty state: n/a.
Loading state: Submit button pending label.
Mobile constraints: Two-column intro/panel collapses to single column.
Implementation notes: `POST /api/auth/login`; session cookie set by API.

### Signup (`/signup`)
Screen purpose: Create an account.
Primary user actions: Submit email + username + password; switch to login.
Displayed data: Static brand/status copy only.
Interactions: Same validation/error pattern as Login; duplicate email/username surfaces as field/form errors.
Empty state: n/a.
Loading state: Submit button pending label.
Mobile constraints: Same as Login.
Implementation notes: `POST /api/auth/signup`.

### Dashboard (`/`)
Screen purpose: At-a-glance status hub; entry point to a session.
Primary user actions: Start or resume session; jump to a previous session.
Displayed data: Top-3 recently trained lifts with best top set / est. 1RM (fallback: total sets); weekly volume bars aggregated to 6 regions (Chest, Back, Shoulders, Arms, Core, Legs); biometrics panel (placeholders — see flags); previous-sessions strip (last 6 workouts); active-session banner with start timestamp; central body visual (Phase 1/2: 3D avatar).
Interactions: CTA switches START_SESSION ↔ RESUME_SESSION based on an open workout.
Empty state: Per-panel empty titles (no PB lifts / no weekly volume / biometrics not configured); first-run copy on zero sessions.
Loading state: Per-panel skeletons; partial-failure error banner (loaded data still renders).
Mobile constraints: Panels stack vertically; avatar pinned to upper third (DESIGN.md).
Implementation notes: Fans out to workouts list, completed exercises, top-3 exercise summaries, weekly volume (7-day range).

### Workout Start (`/workout`)
Screen purpose: Choose how to begin: resume, empty, or clone a previous structure.
Primary user actions: Resume active session; start empty session; reuse a recent session's exercise list; search/filter.
Displayed data: Active session card (title, exercise chips, elapsed time); last 5 completed sessions with exercises/sets/duration; 4 static "protocol group" cards (placeholders).
Interactions: Search filters protocols and sessions; reuse = create workout + re-add each exercise sequentially; launch actions blocked while a session is open; `OPEN_WORKOUT_EXISTS` → auto-redirect into the open session; partial clone failure → link to partial session.
Empty state: No active mission; no previous protocols; no search match.
Loading state: Full-screen loading state; per-button pending labels.
Mobile constraints: Two-panel layout stacks.
Implementation notes: Protocol groups are cosmetic — Phase 3 decision: keep, cut, or back with a real feature.

### Active Workout Logger (`/workouts/[workoutId]`)
Screen purpose: Live set-by-set logging console; read-only view of a completed session.
Primary user actions: Add exercise (search / create new); log set (type working|warmup, kg, reps, RIR, rest seconds, note); edit/delete set; reorder (up/down) and remove exercises; switch active exercise; complete session.
Displayed data: Active exercise focus (name, muscle group, last set); per-exercise set list; live session timer (1s tick); totals — exercises, sets, working sets, volume kg; exercise queue navigator; LIVE/CLOSED badge.
Interactions: Modal exercise picker (debounced search, inline create with muscle group/equipment/type, name-review flow with suggestions / CREATE_ANYWAY / blocked names); per-exercise set drafts persist while switching exercises; confirm dialogs for end-session, remove-exercise, delete-set; after save, focus returns to weight input.
Empty state: No exercises → insert-first-exercise CTA; empty set buffer message.
Loading state: Page-level loading; per-action pending states.
Mobile constraints: Logger deck + telemetry sidebar stack; set form is the critical touch target (gym use, one-handed).
Implementation notes: Heaviest interaction surface in the app. Completed sessions render fully read-only.

### Workout History (`/workouts`)
Screen purpose: Browse and inspect all past sessions; data portability.
Primary user actions: Expand a session to see per-exercise sets; open full log; search by exercise/title/type/date; load more (pages of 20); CSV export; CSV import (preview → confirm).
Displayed data: Summary metrics — total sessions, cumulative tonnage, average duration, completion rate; per-card: date, title, exercise names, duration, tonnage, set count; expanded: per-exercise set pills (order, kg × reps, warmup-flagged).
Interactions: One card expanded at a time; CSV preview reports warnings (confirmable) vs blocked names (must fix); import success refreshes list.
Empty state: No history → CTA to start; no search match → clear-filter action.
Loading state: List loading; per-card detail syncing; load-more pending.
Mobile constraints: Metric grid 2×2; cards stack.
Implementation notes: Details fetched lazily per page of summaries; tonnage computed client-side.

### Progress Analytics (`/progress`; `/analytics` redirects here)
Screen purpose: Single-exercise strength trend analysis.
Primary user actions: Select exercise (search + muscle-group filter); switch time window (1W/1M/3M/MAX); toggle chart mode (LOAD_REPS vs EST_1RM); toggle weight/reps series.
Displayed data: Summary deck — total sets, average reps, best set, estimated 1RM; time-series chart (scrollable when dense); recent set logs (set, RIR, est. 1RM).
Interactions: Auto-selects most recently trained exercise on load; chart scrolls horizontally for long histories.
Empty state: No completed exercises; no exercise selected; no telemetry in window.
Loading state: Selector list loading; metric deck skeleton; chart loading.
Mobile constraints: Selector panel stacks above analysis stack.
Implementation notes: Working sets only drive the signal.

### Weekly Volume (`/weekly-volume`)
Screen purpose: Muscle-group load distribution — where the training week landed.
Primary user actions: Select time window (1W/1M/3M); tap muscle region on body map or row in distribution matrix.
Displayed data: Front/back SVG body map, regions banded by avg weekly sets (High 12+, Active 6–11, Maintenance 1–5, none); metric deck — window sets, active muscles, latest week, target average; per-muscle intelligence panel — working sets, weekly average, latest week, recovery status, contributing exercises, recent sessions; distribution matrix of all groups.
Interactions: Map and matrix are linked selections; window change re-fetches and re-bands.
Empty state: Zero sets in window; per-panel empties for exercises/sessions.
Loading state: "Scanning" states on map and deck.
Mobile constraints: Map stacks above side panels; regions need touch-sized hit areas.
Implementation notes: Single weekly-volume fetch; all aggregation client-side. Body-map region system is a natural sibling of the avatar treatment.

### Global error boundary
Screen purpose: Generic failure recovery (`error.tsx`) with retry.
Implementation notes: Client diagnostics listener records API/chart events; keep equivalent behavior.

---

## Tech stack (confirmed)

| Piece | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 — keep |
| 3D | react-three-fiber + @react-three/drei (+ postprocessing for bloom) |
| Styling | Tailwind CSS v4 — `DESIGN.md` tokens as CSS-first `@theme` variables |
| Charts | Recharts, restyled to the token system |
| Data fetching | TanStack Query |
| Fonts | Space Grotesk + JetBrains Mono via `next/font` |
| Validation | zod — keep |

Rationale: the frontend has a real BFF layer (~25 proxy routes doing cookie forwarding to Fastify) plus
server-side auth gating, and the pnpm workspace, Dockerfile, and Render config all build Next.js today —
switching frameworks rebuilds that proxy/deploy story for zero user-visible gain. react-three-fiber is the
idiomatic React 3D approach; SSR-safety via client-component `dynamic(…, { ssr: false })` is already proven
in this codebase. Tailwind v4 fits because `DESIGN.md` is literally a token sheet mapping 1:1 onto `@theme`
variables, and glass/glow composes as a few custom utilities. TanStack Query replaces the hand-rolled
loading/error/abort plumbing in every current page, protecting the no-regressions bar in the rebuilt logger.
