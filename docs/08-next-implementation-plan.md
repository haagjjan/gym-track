# Next Implementation Plan

## Purpose

Use this file to start the next fresh implementation session without replanning the project. This is a handoff plan only; do not implement these blocks unless the user explicitly asks for the next slice.

This document is intentionally product-first. The next work is not about adding more feature categories. The next work is about making the existing app feel usable, focused, and trustworthy during real gym usage.

## Current Status

Implemented foundation:

- Core MVP API routes exist for auth, workout sessions, exercises, muscle groups, workout logging, set editing, history, analytics, and CSV import/export.
- Core web screens exist for auth, home, workout logging, history/detail, progress, weekly volume, and CSV controls.
- Project quality gates, tests, CI, Render deployment configuration, deployment runbook, backup/restore checklist, and structured API logging exist.

Not implemented / not ready:

- Hosted production credentials, custom domains, first tester launch execution, email verification, and password reset.
- Product/UX hardening after screenshot audit: focused workout logging, separated add-exercise flow, faster set input flow, active workout save/recovery state, workout naming/session-type V1, repeated-session preload, dashboard rebuild, history cleanup, progress chart simplification, stronger empty/error/loading states, mobile pass, CSV import cleanup, and weekly volume refinement.

## Product Audit Conclusion

The app is technically broad enough for an MVP, but it is not yet good enough for tester launch.

The main issue is not missing backend functionality. The main issue is that the core gym flow still feels too much like a developer-built database UI. A real user in the gym needs a focused, fast, mobile-first flow:

- Start or resume workout quickly.
- See only the exercise they are currently doing.
- Log a set with large, obvious controls.
- Correct mistakes without losing context.
- Add exercises without being overwhelmed by a giant library grid.
- End the workout and later understand history/progress without decoding messy screens.

Do not continue toward launch until the tester-launch blockers in this file are resolved.

## Recommended Next Slice

Start with **UX Slice 1: Active Workout Logging Redesign**.

Reason: the screenshot/product audit showed that the app has the right technical feature categories, but the core gym-use flow is not yet good enough for testers. The workout screen currently feels too implementation-driven and shows too much at once. Before launch execution, make the active workout experience usable in a real gym: one active exercise expanded, inactive exercises collapsed, large mobile-friendly set inputs, fast correction of previous sets, and clear save behavior.

After UX Slice 1, continue through the UX hardening slices below. Do not proceed to Small-Batch Launch Execution until the tester-launch blockers are resolved.

## UX Hardening Sequence From Product Audit

Recommended implementation order:

1. Active Workout Logging Redesign.
2. Separate Add-Exercise Flow.
3. Improve Current Set Input Flow.
4. Active Workout Recovery / Save Status.
5. Workout Names / Session Type V1.
6. Reuse Last Workout Structure.
7. Dashboard Rebuild.
8. History Cleanup.
9. Progress Chart Simplification.
10. Empty/Error/Loading States.
11. Mobile Pass.
12. CSV Import Cleanup.
13. Weekly Volume Refinement.
14. Small-Batch Launch Execution.
15. Auth Hardening Follow-Up.

Tester-launch blockers:

- Active workout logging must be usable on mobile.
- Exercise selection must not clutter the logging screen.
- Users must be able to resume/recover open workouts safely.
- Home must clearly show Start/Resume as the primary action.
- Workout names/session types must make history scannable.
- Progress charts must not show cluttered duplicate legends.
- Empty, loading, and error states must exist for the main flows.
- CSV import must not silently pollute the UI with broken data if testers will import old workouts.

Features to avoid until after tester feedback:

- Infinite wheel input pickers.
- Advanced template editor.
- Complex analytics and PR prediction.
- Social/sharing features.
- Integrations.
- AI workout suggestions.
- Full offline-first architecture.
- Detailed muscle-science model beyond what is needed for useful volume/progress views.
- Dashboard customization.
- Gamification.

## Implementation Slices

The detailed slice blocks follow in later commits to keep each doc change small and reviewable.

### UX Slice 1. Active Workout Logging Redesign

Status: recommended next slice.

Goal: redesign only the workout logging/detail screen so one session exercise is expanded at a time. Keep existing workout, exercise, set, reorder, delete, and edit API behavior unchanged. The active exercise is local UI state only.

Product quality target:

- The screen should feel like a focused gym logging tool, not a database form.
- A tired user should immediately see what exercise they are currently logging.
- The user should not have to visually parse all exercises and all inputs at once.
- The active exercise should be visually dominant and calm.
- Inactive exercises should stay accessible for corrections but should not compete for attention.

Implement:

- Track `activeSessionExerciseId` in the workout logging UI.
- Default the active exercise to the first exercise on load.
- After adding an exercise, focus the newest exercise.
- After deleting the active exercise, focus the next available exercise.
- Render one expanded active exercise with set logging controls.
- Render inactive exercises as collapsed summary cards.
- Collapsed cards must show exercise name, completed set count, last logged set summary, and a clear indication if there is unsaved/partial current input.
- Collapsed cards must keep Open/Edit, reorder, and remove controls available.
- Previous sets inside the active exercise must show compact readable summaries by default, with an Edit action for corrections.
- The active exercise should show the previous set history clearly enough that a user can scan all completed sets without opening each one.
- The current set primary action should be named `Save set` or equivalent and should create a new set from the current input row.
- After saving a set, prepare the next input row with sensible defaults from the previous set.
- Increase current-set input and action ergonomics for mobile.
- Keep visual changes scoped to the workout logging/detail screen and its child components.

UI/UX requirements:

- The active exercise card must have a clear title, current set input area, previous sets area, and obvious primary action.
- Previous set rows should be compact but readable, for example: `Set 1 · 80 kg × 8 · RIR 2 · Edit`.
- Collapsed exercise cards should be visually quieter than the active card.
- Reorder/remove/open controls on collapsed cards must not crowd the exercise name on mobile.
- Empty exercises may exist, but they must not visually dominate the page unless selected.
- Closed/past workouts may use the same collapsed UI, but must not look like an active live workout.

Rules:

- No backend route changes.
- No API payload changes.
- No database field or migration changes.
- No persisted workout data shape changes.
- Do not modify dashboard, history, progress charts, CSV import/export, auth, deployment config, or app-wide styling in this slice.
- Do not introduce a new UI framework.

Acceptance criteria:

- At 390px width, there is no horizontal scrolling.
- The active exercise is readable and visually dominant.
- Main logging tap targets are roughly 44px or larger.
- Inactive exercises are compact but still editable.
- User can log a set, edit a previous set, delete a set, switch active exercise, and reorder exercises.
- Empty exercises remain editable but do not dominate the page unless selected.
- Existing smoke coverage is updated for add exercise, save set, add second exercise, switch active exercise, edit previous set, delete set, and reorder exercises.

Tests/checks:

- `pnpm type-check`
- `pnpm lint`
- `pnpm test`
- `pnpm smoke:web` if the local app stack is available
- `git diff --check`
- Manual browser check at 390px and 1440px.

### UX Slice 2. Separate Add-Exercise Flow

Status: planned after UX Slice 1.

Goal: remove the giant exercise selection grid from the active workout screen. Exercise selection should be a focused add flow, not mixed into the active logging area.

Product quality target:

- The active workout screen should stay focused on logging.
- Adding an exercise should feel like opening a short task, completing it, and returning to the workout.
- The exercise library should be scannable on mobile and not look like a wall of giant boxes.

Implement:

- Add a clear `Add exercise` entry point from the active workout screen.
- Open a modal, drawer, or dedicated add section for exercise selection.
- Make the add flow search-first.
- Show recent exercises first when data is available.
- Render exercise results as compact readable rows, not giant boxes.
- Show useful metadata in result rows where available: primary muscle, equipment, and last used if already known.
- Keep custom exercise creation available but visually secondary.
- Selecting an exercise adds it to the workout and returns the user to the logging context.
- If the search has no results, show a useful empty state and a clear custom-exercise option.

UI/UX requirements:

- Search input must be the dominant element in the add flow.
- Exercise rows should have enough vertical height for touch use.
- Primary action should be obvious: select/add exercise.
- Custom exercise creation should not distract from selecting an existing exercise.
- Add flow should close or return to active logging after successful selection.

Rules:

- Preserve existing ability to add existing exercises.
- Preserve existing ability to create and add new exercises.
- Do not implement workout templates in this slice.
- Do not change progress, history, dashboard, CSV, auth, or backend contracts.

Acceptance criteria:

- Full exercise library grid is no longer visible by default on the active workout screen.
- User can search and add an exercise quickly.
- Search/add flow works at 390px without horizontal scrolling.
- Empty search state explains what to do.
- After adding, the newly added exercise becomes the active exercise.

Tests/checks:

- `pnpm type-check`
- `pnpm lint`
- `pnpm test`
- `pnpm smoke:web` if available
- Manual mobile check at 390px.

### UX Slice 3. Improve Current Set Input Flow

Status: planned after UX Slice 2.

Goal: make logging repeated sets fast during training.

Product quality target:

- The user should not retype the same weight/reps/RIR over and over.
- The user should be able to log a normal repeated set with minimal taps.
- Mistakes should be easy to clear or correct before saving.

Implement:

- Use previous set values as defaults or suggestions for the next set.
- Add duplicate previous set behavior if it fits the existing component structure.
- Add clear/reset current input behavior.
- Add simple plus/minus steppers if easy and contained.
- Show immediate save feedback after a set is saved.
- Make weight/reps/RIR/rest input labels clear and compact.
- Keep notes optional and visually secondary.

UI/UX requirements:

- Current set inputs should be large enough for mobile use.
- The default/suggested values must not trick the user into accidentally saving wrong data.
- The save action must be visually stronger than secondary actions.
- Clear/reset must be available but not too easy to hit accidentally.

Rules:

- Do not build infinite wheel input yet.
- Do not introduce a large new input framework.
- Keep the slice focused on set input ergonomics.
- Do not change backend data shape.

Acceptance criteria:

- After saving a set, the next set is ready with sensible defaults.
- User can repeat similar sets quickly.
- User can clear or correct current input without confusion.
- Existing edit/delete behavior still works.
- Mobile layout remains usable at 390px.

Tests/checks:

- `pnpm type-check`
- `pnpm lint`
- `pnpm test`
- Manual mobile check while logging multiple sets.

### UX Slice 4. Active Workout Recovery / Save Status

Status: planned after UX Slice 3.

Goal: users must trust that workout data is safe while training.

Product quality target:

- A user should never wonder whether their set was saved.
- Closing or refreshing the browser should not make the app feel fragile.
- Open workouts should be recoverable and obvious.

Implement:

- Show clear save status such as `Saving`, `Saved`, and `Failed to save` where relevant.
- Ensure dashboard detects an open workout and makes `Resume workout` the primary CTA.
- Prevent or clearly handle multiple confusing open workouts.
- Add retry/recovery messaging for failed set or workout saves.
- Ensure reload/resume behavior is understandable.
- If an old open workout exists, show a clear resume/finish/discard decision instead of silently creating confusion.

UI/UX requirements:

- Save status should be visible but not noisy.
- Failed save state must be visually distinct and actionable.
- Resume workout must dominate Start workout when an open workout exists.
- Recovery copy should be plain and direct.

Rules:

- Keep backend changes minimal and only if existing behavior cannot support safe recovery.
- Do not implement full offline-first architecture.
- Do not add external observability or notifications in this slice.

Acceptance criteria:

- Reload does not lose the active workout state.
- Open workout can be resumed from the dashboard.
- Failed save is visible and recoverable.
- User is not left guessing whether data was saved.
- Multiple open workouts are prevented or clearly explained.

Tests/checks:

- `pnpm type-check`
- `pnpm lint`
- `pnpm test`
- Manual reload/resume test.
- Manual failed-request test if practical.

### UX Slice 5. Workout Names / Session Type V1

Status: planned after save/recovery improvements.

Goal: stop generic `Workout` names and make repeated workout types scannable.

Product quality target:

- History should not be a list of indistinguishable `Workout` cards.
- A user should be able to create names that match their real routine, such as `Push A`, `Pull`, `Legs`, `Upper 1`, or `Arms`.
- Naming should be lightweight and not feel like building a full program planner.

Implement:

- Add a workout name/session type field when starting a workout.
- Show previously used names in a dropdown.
- Allow creating a new name from the same flow.
- Render meaningful workout names in history and detail views.
- Preserve fallback behavior for old unnamed workouts.
- Keep the naming copy consistent: choose one vocabulary such as `Workout name` or `Session type` and use it consistently.

UI/UX requirements:

- Name selection should be quick and not block starting an empty workout.
- Dropdown should be readable on mobile.
- Old unnamed workouts should display a sensible fallback based on date or first exercises, not only a confusing generic label if avoidable.

Rules:

- Keep this as V1, not a full template editor.
- Do not break old workout records.
- Avoid broad schema changes unless the current data model cannot support names/session types.

Acceptance criteria:

- User can create workouts named `Push A`, `Pull`, `Legs`, etc.
- Previously used names can be selected again.
- History is more scannable than repeated generic `Workout` cards.
- Old unnamed workouts still render correctly.

Tests/checks:

- `pnpm type-check`
- `pnpm lint`
- `pnpm test`
- Manual create/name/history check.
