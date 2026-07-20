# Next Implementation Plan

## Current status

The backend/auth/database foundation is good enough to keep.

Keep:

- Docker/local development setup.
- User cookie/session logic.
- Database and existing API contracts where possible.
- Existing workout/session/set behavior where it works.
- Existing checks/tests as guardrails.

The V1 usability-audit-v2/v3 remediation and audit-v4 beta refinements are now implemented across the workout flow, list surfaces, analytics, settings, API contracts, and schema foundation. The cleanup baseline also removes the obsolete avatar spike, restores shared web/API boundaries, and adds sequential pure-function performance gates. Existing uncommitted work remains authoritative and must be preserved.

## Source of truth for V1 UI behavior

Use these sources in order:

1. `docs/Usability_Audit/usability-audit-v4.md` for the latest V1 beta refinements.
2. `docs/Usability_Audit/usability-audit-v3.md` for V1 interaction behavior not superseded by v4.
3. `docs/Usability_Audit/usability-audit-v2.md` for V1 gym-use behavior not superseded by v4/v3.
4. The implemented screens and API contract for exact current interaction/data shapes.
5. The Stitch redesign documents for visual direction only where they do not conflict with the audits.

Audit v4, followed by v3 and v2 only where not superseded, replaces conflicting behavior in:

- `docs/design/stitch-redesign-v2/DESIGN.md`
- `docs/design/stitch-redesign-v2/design-notes.md`
- `docs/design/stitch-redesign-v2/implementation-roadmap.md`

The older redesign files remain useful for styling and atmosphere, but no longer own launch, live-session, list-filter, Progress, Volume, or Settings behavior.

## Implemented V1 remediation

- One responsive Dashboard workout action and navigation-only shell workout controls.
- Two-choice launch with optional blur/Enter-saved names.
- Vertical four-row live exercise list, staged multi-exercise adding, separate exercise/set modes with previous/next navigation, desktop-inline/mobile-bottom-sheet set editing, device-local drafts, normal page scrolling, and header overflow discard.
- Server-backed workout/template/exercise search, AND facets, entity-specific sorting, all-time history summaries, and optimistic deletion feedback.
- Canonical equipment/type options, exercise suggestions, ownership explanations, exact template multiset last use, and template-aware merging.
- One best Progress set per local calendar day, plotted-day selector counts, and persistent in-screen chart preferences.
- Five-stage volume heat with proportional distribution bars, inspectable ranges, an account-synced ceiling, and mobile-first layout.
- Reorganized Settings sections and shared app-styled confirmations.
- Honest `Gym Progress Tracker` chrome, semantic action/state colors, and removal of fake readiness/connectivity labels.
- Versioned user/surface-scoped tab-session filter/sort persistence, transient search, and an in-app canonical CSV guide/sample.
- Shared fully faceted staged exercise selection for sessions/templates, compact template rows without Replace, and server-backed exercise editability filtering.
- Selected-window Progress set/tonnage summaries, contained EST 1RM help, and touch-safe mobile Volume scrolling/orbit behavior.
- Mobile set-editor bottom sheets and rest-timer dock, explicit set types, one authoritative live header timer, protected Finish, and discoverable reduced-motion-safe exercise/set navigation.

## Recommended next slice

Run the V1 release verification against a migrated local database and real mobile browsers:

1. Apply all migrations in a fresh database and a representative legacy-data copy.
2. Run the full unit, performance, integration, Playwright, build, and diff checks.
3. Perform interaction QA at 390px, 430px, and 1440px, including keyboard-open bottom-sheet set entry, timer/editor priority, reduced motion, 3D vertical scrolling/horizontal orbit, persistent facets, CSV guidance, and accessibility focus/dialog behavior.
4. Fix only observed V1 regressions; do not reopen the superseded redesign roadmap.

Keep the audit-v4 “Features up for rework” list post-beta. CSV format guidance is included in V1, but broad import/export redesign, intelligent exercise naming, and complete workout-history reset are not part of release verification.

Responsibilities of the older visual documents:

- `DESIGN.md` is the visual design-system reference.
- `design-notes.md` is the screen behavior and UX reference.
- `implementation-roadmap.md` is the execution plan and Codex slice order.

The old UX Slice 1–15 plan has been intentionally removed from this file to avoid conflicting instructions.

## Historical redesign strategy

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
We are continuing V1 release verification for the Gym Progress Tracker.

First read:
- AGENTS.md
- docs/Usability_Audit/usability-audit-v4.md
- docs/Usability_Audit/usability-audit-v3.md
- docs/Usability_Audit/usability-audit-v2.md
- docs/repository-structure.md
- docs/01-requirements.md
- docs/02-query-list.md
- docs/03-data-model-notes.md
- docs/04-schema-draft.md
- docs/05-api-contract.md
- docs/07-implementation-pattern.md
- docs/08-next-implementation-plan.md

Important:
- Audit v4 supersedes audit v3/v2 where they conflict; v3 then v2 define only behavior not superseded by newer audits.
- Preserve all existing uncommitted work.
- Verify the implemented remediation; do not restart the redesign.
- Keep broad import/export redesign, intelligent naming, and full-history reset in the post-beta backlog.

Acceptance criteria:
- migrations apply to fresh and representative legacy data
- unit, integration, browser smoke, type, lint, and build checks pass
- 390px, 430px, and 1440px have no horizontal overflow or covered controls
- 44px targets, keyboard-open bottom sheets, editor/timer priority, 3D touch scrolling/orbit, focus, dialogs, tooltips, and reduced motion pass manual QA

Run:
- pnpm type-check
- pnpm lint
- pnpm test
- pnpm test:performance
- pnpm test:integration
- pnpm smoke:web
- pnpm build
- git diff --check

Before handoff:
- list checks run and results
- list only observed remaining V1 risks
- do not commit or push; I will do that myself
```
