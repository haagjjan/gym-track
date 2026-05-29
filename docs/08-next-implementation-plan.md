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
