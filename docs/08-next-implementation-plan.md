# Next Implementation Plan

## Current status

The backend/auth/database foundation is good enough to keep.

Keep:

- Docker/local development setup.
- User cookie/session logic.
- Database and existing API contracts where possible.
- Existing workout/session/set behavior where it works.
- Existing checks/tests as guardrails.

The current blocker is the product surface:

- The UI is generic, visually weak, and not usable enough.
- The workout logging flow is not yet good enough for real gym usage.
- The old UX hardening plan in this file has been superseded by the Stitch-based redesign plan.

## Source of truth for the UI redesign

Use the new redesign documentation instead of the old UX slice plan:

- `docs/design/stitch-redesign-v2/DESIGN.md`
- `docs/design/stitch-redesign-v2/design-notes.md`
- `docs/design/stitch-redesign-v2/implementation-roadmap.md`

Responsibilities:

- `DESIGN.md` is the visual design-system reference.
- `design-notes.md` is the screen behavior and UX reference.
- `implementation-roadmap.md` is the execution plan and Codex slice order.

The old UX Slice 1–15 plan has been intentionally removed from this file to avoid conflicting instructions.

## Main strategy

Rewrite the UI surface, not the whole app.

Do not throw away the backend, auth, database, API contracts, or working project infrastructure just because the current UI is bad.

Implement the redesign one slice at a time:

1. UI foundation / design system.
2. Auth screens.
3. App shell and navigation.
4. Dashboard.
5. Workout start / protocol selection.
6. Active workout logging.
7. Insert exercise flow.
8. History.
9. Progress.
10. Volume heatmap.
11. App-wide polish and states.
12. Mobile QA and deployment readiness.

## Implementation rules

- Do not paste Stitch `code.html` directly into production code.
- Use Stitch exports only as visual/layout reference.
- Keep each slice small and reviewable.
- Preserve backend/API/auth behavior unless a slice explicitly requires a small change.
- Do not add 3D to active workout logging.
- Do not introduce a new UI framework unless explicitly justified.
- Mobile usability is mandatory for every gym-use flow.
- After each slice, run the relevant checks and review the diff.

## Fresh Session Prompt

Use this prompt when starting the next implementation session:

```md
We are continuing the Gym Progress Tracker from the current MVP foundation.

First read:
- AGENTS.md
- README.md
- ARCHITECTURE.md
- ENGINEERING.md
- CONTRIBUTING.md
- docs/deployment-runbook.md
- docs/repository-structure.md
- docs/00-workflow.md
- docs/02-query-list.md
- docs/03-data-model-notes.md
- docs/04-schema-draft.md
- docs/05-api-contract.md
- docs/07-implementation-pattern.md
- docs/08-next-implementation-plan.md
- docs/design/stitch-redesign-v2/DESIGN.md
- docs/design/stitch-redesign-v2/design-notes.md
- docs/design/stitch-redesign-v2/implementation-roadmap.md

Important:
- `docs/08-next-implementation-plan.md` is now only a short handoff file.
- The current redesign source of truth is `docs/design/stitch-redesign-v2/implementation-roadmap.md`.
- Treat old UX slice planning as superseded.

Implement the next recommended redesign slice only: Phase 1 — UI foundation / design system.

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

Before handoff:
- summarize changed files
- list checks run and results
- list anything intentionally not changed
- do not commit or push; I will do that myself
```
