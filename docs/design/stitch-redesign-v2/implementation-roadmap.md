# Implementation Roadmap v1 — Body Cockpit UI Redesign

## Current project situation

Backend/auth/database foundation works well enough to keep.

Keep:

- Docker backend setup
- User cookie/session logic
- Database
- Existing API contracts where possible
- Existing workout/session/set behavior where it works
- Existing checks/tests as guardrails

Problem area:

- UI is ugly, generic, hard to use, and has no personality.
- Workout logging is not usable enough.
- History/progress/volume screens need real information architecture.
- Current UI can be heavily replaced.

Main strategy:

> Rewrite the UI surface, not the whole app.

---

## Development rules

1. Do not rewrite backend unless a UI slice absolutely requires a small API adjustment.
2. Do not blindly paste Stitch export code.
3. Build a reusable design system first.
4. Replace screens one at a time.
5. Keep old behavior working until the new screen is ready.
6. Mobile usability is mandatory.
7. No 3D in active workout logging.
8. Every slice must end with:
   - type-check
   - lint
   - tests if available
   - manual mobile viewport check
   - git diff review

---

## Phase 0 — Design freeze and documentation

Goal:

Convert Stitch screens into implementation references.

Tasks:

- Use `docs/design/stitch-redesign-v2/` as the source folder for the redesign.
- Treat `DESIGN.md` as the visual design-system reference:
  - colors
  - typography
  - spacing
  - glow/elevation
  - component appearance
- Treat `design-notes.md` as the screen behavior and UX reference:
  - screen purpose
  - visible elements
  - functional requirements
  - states
  - UX risks
- Treat `implementation-roadmap.md` as the execution plan:
  - build order
  - non-goals
  - acceptance criteria
  - Codex slice boundaries
- Use each screen folder as visual/code reference only:
  - `00.0-login/`
  - `00.1-create-profile/`
  - `01-home/`
  - `02-start-workout/`
  - `03-active-workout/`
  - `05-history/`
  - `06-progress/`
  - `07-weekly-volume/`
- Do not paste `code.html` directly into production code.
- Use `code.html` only to understand layout, spacing, typography, colors, and visual hierarchy.
- Decide final route mapping before implementing each screen.
- Decide final naming language before implementing each screen.

Acceptance criteria:

- `DESIGN.md`, `design-notes.md`, and `implementation-roadmap.md` have clearly separated responsibilities.
- Codex has a clear visual target and a clear execution target.
- Stitch `code.html` files are explicitly treated as reference only.
- No implementation begins before the first slice is defined.

---

## Phase 1 — UI foundation / design system

Goal:

Create the reusable cockpit UI foundation.

Tasks:

- Define theme tokens:
  - background
  - panel
  - panel elevated
  - border
  - cyan primary
  - purple secondary
  - green success
  - red danger
  - muted text
- Define typography styles:
  - page title
  - section eyebrow
  - metric label
  - metric value
  - terminal button label
  - body text
- Build base components:
  - `AppShell`
  - `Sidebar`
  - `TopBar`
  - `ScreenContainer`
  - `CockpitPanel`
  - `MetricCard`
  - `PrimaryButton`
  - `SecondaryButton`
  - `DangerButton`
  - `IconButton`
  - `TextInput`
  - `NumberInput`
  - `SearchInput`
  - `Checkbox`
  - `SegmentedControl`
  - `ConfirmDialog`
  - `EmptyState`
  - `LoadingState`
  - `ErrorState`

Non-goals:

- No page redesign yet.
- No backend changes.
- No new workout behavior.
- No 3D.

Acceptance criteria:

- Basic app layout matches dark/cyan cockpit direction.
- Components are reusable and not page-specific.
- Mobile sidebar/drawer strategy exists.
- Existing pages still compile.

---

## Phase 2 — Auth screens redesign

Goal:

Replace generic auth pages with cockpit login/register screens.

Screens:

- Login / `OPERATOR_LOGIN`
- Register / `CREATE_OPERATOR_PROFILE`

Tasks:

- Rebuild login page using the new components.
- Rebuild register page using the new components.
- Preserve current auth/cookie behavior.
- Add proper loading/error states.
- Keep real field names clear.
- Add password visibility toggle if easy.

Important:

- Avoid fake security promises.
- Do not let theme wording confuse the actual auth flow.
- Consider using `LOGIN` or `AUTHENTICATE` instead of `INITIATE_SESSION` for login to avoid confusion with workout sessions.

Acceptance criteria:

- Existing login/register behavior still works.
- Errors are readable.
- Mobile layout works.
- Visual style matches screenshots.

---

## Phase 3 — App shell and navigation

Goal:

Make the logged-in app feel like one coherent cockpit.

Tasks:

- Implement persistent sidebar on desktop.
- Implement top bar.
- Implement mobile drawer.
- Add nav items:
  - Dashboard
  - Workout
  - History
  - Progress
  - Volume
- Add persistent `START_SESSION` action.
- Add operator/status block.
- Add active nav state.
- Remove generic layout styling.

Acceptance criteria:

- All main routes share the same shell.
- Navigation works on desktop and mobile.
- Current route is clearly highlighted.
- No content is hidden behind layout elements.

---

## Phase 4 — Dashboard / Home rebuild

Goal:

The dashboard should immediately tell the user what to do next.

Tasks:

- Build cockpit dashboard layout.
- Add primary action:
  - `RESUME_SESSION` if active workout exists
  - `START_SESSION` if no active workout exists
- Add performance PB cards:
  - bench
  - squat
  - deadlift
- Add weekly volume preview.
- Add simple biometric/status summary if data exists.
- Add recent logs strip/list.
- Add empty state for new users.
- Use background image/decorative scene only as static/lazy visual.

Non-goals:

- No full analytics engine.
- No 3D.
- No fake metrics if not in database.

Acceptance criteria:

- User knows next action in under 10 seconds.
- Dashboard does not look like placeholder UI.
- Mobile version is usable.
- Missing data looks intentional, not broken.

---

## Phase 5 — Workout start / protocol selection

Goal:

Create a clean start/resume workout flow.

Tasks:

- Rebuild workout route as `SELECT_OPERATION_ARCHETYPE`.
- Show active workout/resume card if one exists.
- Show protocol groups:
  - Push / Frontal
  - Pull / Rear Guard
  - Legs / Foundation
  - Custom
- Add search for exercises/protocols if supported.
- Allow start empty workout.
- Allow start from previous workout structure if current data supports it.
- After start/resume, navigate to active workout logging.

Non-goals:

- No complex template builder yet.
- No AI workout generation.
- No advanced scheduling.

Acceptance criteria:

- Starting a workout is simple.
- Resuming is obvious.
- User is not forced into a template system.
- Mobile works.

---

## Phase 6 — Active workout logging rebuild

Goal:

Make the core workout flow actually usable.

This phase has highest priority.

Tasks:

- Rebuild active workout screen with:
  - active exercise header
  - muscle group
  - session timer
  - set input panel
  - previous/saved set rows
  - insert exercise action
  - complete session action
  - session metrics panel
- Only one exercise active/expanded at a time.
- Preserve draft input per active exercise where useful.
- Saving a set should clearly mark it saved and prepare the next set cleanly.
- Editing a saved set must be separate from creating a new set.
- Delete set requires confirmation.
- Delete/scrub session requires confirmation.
- Complete session requires confirmation.
- Add clear failed-save states.

Important UX rules:

- No Excel-like grids.
- No tiny controls.
- No accidental destructive actions.
- No confusing auto-new-set behavior.
- No 3D.
- No heavy decorative background.

Acceptance criteria:

- User can log a normal workout on phone without frustration.
- Multiple sets can be saved quickly.
- Mistakes can be corrected safely.
- Switching exercises does not lose important draft state unexpectedly.
- Works at 390px width.

---

## Phase 7 — Insert exercise flow

Goal:

Separate exercise selection from the active logging UI.

Tasks:

- Create insert exercise drawer/modal/screen.
- Add search-first exercise picker.
- Add recent exercises.
- Add muscle/category filter if already available.
- Add compact exercise rows.
- Add create-custom-exercise as secondary action.
- After selection, add exercise to current session and focus it.

Non-goals:

- No full exercise database overhaul.
- No recommendation system.
- No huge grid on active workout screen.

Acceptance criteria:

- Adding an exercise is fast.
- Active workout screen stays clean.
- Search empty state is clear.
- Custom exercise creation is not the primary path.

---

## Phase 8 — History rebuild

Goal:

Make previous workouts readable and useful.

Tasks:

- Rebuild history page using session-history screenshot.
- Add summary metric cards:
  - total sessions
  - cumulative tonnage
  - average duration
  - completion rate
- Add exercise filter/search.
- Add workout log cards.
- Add expandable details.
- Add load more.
- Add empty state and filter-no-results state.
- Keep export raw data secondary.

Acceptance criteria:

- Past workouts are scannable.
- History does not feel like raw database output.
- Expanded details are readable.
- Mobile version does not become a dense table.

---

## Phase 9 — Progress / Evolution Analysis rebuild

Goal:

Make progress analysis clear for one selected exercise.

Tasks:

- Build exercise selector panel.
- Add time range selector.
- Add metric cards:
  - total sets
  - average reps
  - best set
  - estimated 1RM
- Add chart panel.
- Add recent set logs table/card list.
- Add low-data state.
- Add export raw data action if already supported.

Implementation note:

- Use existing chart library if already installed.
- Do not introduce a heavy new chart system unless necessary.
- Chart should answer one clear question.

Acceptance criteria:

- User can select an exercise and understand progress.
- Chart labels/legend are clear.
- Low-data state is useful.
- Mobile layout is not broken.

---

## Phase 10 — Volume / Heatmap rebuild

Goal:

Show weekly muscle volume in a readable way.

Tasks:

- Start with 2D front/back body silhouettes or simplified SVG.
- Highlight muscle groups using real volume data.
- Add week/time range selector.
- Add legend.
- Add right-side volume intelligence panel:
  - target muscle
  - working sets
  - intensity label
  - contributing exercises
  - weekly total volume
  - recovery status
- Add empty state.

Non-goals:

- No 3D body model in v1.
- No fake precision.
- No complicated physiology model unless backed by data.

Acceptance criteria:

- User sees which muscles were trained.
- Clicking/tapping a muscle explains the data.
- Contributing exercises are visible.
- Works on mobile.

---

## Phase 11 — App-wide polish and states

Goal:

Make the app feel reliable.

Tasks:

- Add consistent empty states.
- Add consistent loading states.
- Add consistent error states.
- Add confirmation dialogs for destructive actions.
- Add toast/feedback system if missing.
- Improve keyboard and focus behavior.
- Check dark-mode contrast.
- Check mobile tap targets.
- Check reduced motion if animations exist.

Acceptance criteria:

- No screen looks broken when data is missing.
- User always gets feedback after actions.
- Destructive actions are safe.
- App feels stable.

---

## Phase 12 — Mobile QA and deployment readiness

Goal:

Prepare for real usage on phone.

Tasks:

- Test manually at:
  - 390px width
  - 430px width
  - desktop 1440px
- Test flows:
  - register
  - login
  - start workout
  - log sets
  - edit set
  - delete set
  - complete session
  - view history
  - view progress
  - view volume
- Fix overflow.
- Fix keyboard/input issues.
- Fix tap target issues.
- Run production build.
- Deploy only after active workout is usable.

Acceptance criteria:

- App is usable in the gym from phone.
- No critical flow breaks.
- UI feels coherent.
- Ready for small personal beta.

---

## Suggested Codex execution sequence

Use one Codex task per slice.

1. Add design docs only.
2. Add design tokens and base components.
3. Rebuild auth screens.
4. Rebuild app shell/navigation.
5. Rebuild dashboard.
6. Rebuild workout start.
7. Rebuild active workout logging.
8. Rebuild insert exercise flow.
9. Rebuild history.
10. Rebuild progress.
11. Rebuild volume.
12. Polish states and mobile QA.

Each task prompt should include:

- exact files to read
- exact screen screenshot reference
- non-goals
- acceptance criteria
- required checks

---

## First Codex prompt

```md
Read:
- docs/design/stitch-redesign-v2/DESIGN.md
- docs/design/stitch-redesign-v2/design-notes.md
- docs/design/stitch-redesign-v2/implementation-roadmap.md
- docs/PROJECT_STATE.md or the current project-state document if named differently
- docs/08-next-implementation-plan.md if it still exists, but treat it as historical context only
- the current app layout/component files before editing

Task:
Create the first UI foundation slice only. This is not a page redesign yet.

Implement:
- design tokens/theme variables based on `DESIGN.md`
- reusable cockpit base components
- app shell primitives only if they can be added without breaking existing routes
- a clear place for future cockpit UI components

Do not:
- redesign all pages
- implement login/register/dashboard/workout screens yet
- change backend/API behavior
- change auth/cookie behavior
- change workout/session/set logic
- add 3D
- paste Stitch `code.html` directly into the app
- introduce a new UI framework unless absolutely necessary and explicitly justified

Acceptance criteria:
- app still compiles
- existing pages still work
- new reusable UI primitives exist
- dark/cyan cockpit visual direction is available for later slices
- no production page is replaced by raw Stitch export HTML
- the diff is small enough to review safely

Run:
- pnpm type-check
- pnpm lint
- pnpm test if available
- git diff --check
```
