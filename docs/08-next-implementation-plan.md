# Next Implementation Plan

## Current status

The backend/auth/database foundation is good enough to keep.

Keep:

- Docker/local development setup.
- User cookie/session logic.
- Database and existing API contracts where possible.
- Existing workout/session/set behavior where it works.
- Existing checks/tests as guardrails.

The V1 usability-audit-v2/v3 remediation, audit-v4 refinements, and Private Beta 1 remediation are implemented across the workout flow, exercise catalog/search, list surfaces, analytics, settings, API contracts, and schema foundation. The cleanup baseline also removes the obsolete avatar spike, restores shared web/API boundaries, and adds sequential pure-function performance gates. Existing uncommitted work remains authoritative and must be preserved.

Stage 1 repository readiness includes the fail-closed production registration mode, canonical
HTTPS origin validation, secure-cookie enforcement, and Next.js host/Origin request guards
recorded by ADR 0011. The private production host and secure remote administration exist;
public-production black-box evidence remains unexecuted.

Goal 0 is captured by clean baseline `ee537d9`. Goal 1 public-beta hardening and its repository
acceptance run are complete: accessible modal/zoom behavior, 24-hour user-scoped active-set
drafts, spreadsheet-safe CSV export, idempotent serialized workout creates, synchronous
observable email outcomes, startup-and-hourly lifecycle cleanup, and administrator containment
and audit UI. This is repository evidence only; it does not establish staging or public-launch
readiness. See
`docs/beta-process/public-beta/goal-1/goal-1-remediation-report.md`.

Goal 2 decisions are recorded. The DPIA and bounded legal-risk self-assessment were approved by
the controller on 2026-08-10 without counsel review. A 2026-08-19 correction records Cloudflare's
actual application-content processing at its TLS edge; the controller reaffirmed that corrected
scope and accepted the recorded residual risk on the same date. Asset evidence is complete:
contemporaneous archived Tripo 3D pricing applies
`CC BY 4.0` to the
Free-tier FBX models, and NOTICE plus the public Support page carry the required attribution and
modification notice. Provider retention and costs are recorded; Infomaniak is CHF 9/year for the
domain with no other reported cost, so no paid-tier mailbox recovery is assumed. Staging Resend
and Cloudflare configuration is complete, and a separate sending-only production Resend key has
been created and installed as a protected host secret; the reviewed production definition wires
it for the controlled cutover.

Goal 3 is complete. The isolated staging environment runs exact green release
`4a4fccdae263126ceda164a792059514123f957f`; migrations, dump restoration, previous-image
rollback, fail-closed configuration, Cloudflare edge behavior, real controlled email,
administrator bootstrap, admission controls and the complete invited-user workout flow passed.
See `docs/beta-process/public-beta/goal-3/goal-3-staging-report.md`.

Goal 4 pre-deployment verification is active. Application baseline
`6b31f98981da266304484fb14c3a18904e279e4c` has a controller-reported fully green CI run
and runs in the isolated staging topology.
Dependency/image hardening, fresh PostgreSQL integration, hardened-image Chromium/Firefox,
monitoring syntax, fail-closed configuration, focused edge/cookie/rate-limit/email containment,
20/40-active-logger capacity and previous/candidate restore checks passed. The controller-
authenticated public staging browser pass also created and completed a synthetic workout and
verified History, Progress and Weekly Volume without console errors. Production backup transport
is a persistent, loopback-bound macOS launch agent; strict 30-day maintenance, a fresh backup,
newest-snapshot restores and the older-snapshot/newest-ledger replay passed. The exact committed
restore scripts and recovery runbook are installed, captured in a new backup and reverified; the
live production fingerprint was unchanged and no disposable restore resources remained.
Provider/legal values are recorded and reaffirmed, the production Resend key is protected on the
host, the production BFF secret is protected on the host, and a reviewed non-secret production
Compose/Caddy definition plus CI invariants now replace the host-only setup gap. Independent
status, production black-box checks and physical-device QA remain open. Later policy/configuration
changes do not reopen unchanged application evidence, but the final commit needs green CI and a
focused rendered-policy staging pass. See
`docs/beta-process/public-beta/goal-4/goal-4-production-verification.md`.

## Source of truth for V1 UI behavior

Use these sources in order:

1. `docs/beta-process/private-beta-1/private-beta-1-report.md` for observed Private Beta 1 behavior and expectations.
2. `docs/beta-process/private-beta-1/private-beta-1-remediation.md` for the implementation/evidence map.
3. `docs/Usability_Audit/usability-audit-v4.md` for behavior not superseded by Private Beta 1.
4. Audit v3, then v2, for behavior not superseded by newer sources.
5. The implemented screens and API contract for exact current interaction/data shapes.
6. Stitch redesign documents for visual direction only where they do not conflict with newer evidence.

Private Beta 1, followed by audit v4, v3, and v2 only where not superseded, replaces conflicting behavior in:

- `docs/design/stitch-redesign-v2/DESIGN.md`
- `docs/design/stitch-redesign-v2/design-notes.md`
- `docs/design/stitch-redesign-v2/implementation-roadmap.md`

The older redesign files remain useful for styling and atmosphere, but no longer own launch, live-session, list-filter, Progress, Volume, or Settings behavior.

## Implemented V1 remediation

- One responsive Dashboard workout action and navigation-only shell workout controls.
- Two-choice launch with optional blur/Enter-saved names.
- Vertical four-row live exercise list, staged multi-exercise adding, separate exercise/set modes with previous/next navigation, desktop-inline/mobile-bottom-sheet set editing, versioned user/workout/exercise-scoped drafts with a 24-hour maximum, normal page scrolling, and header overflow discard.
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
- Previous-performance context and first-set prefilling, no automatic workout-editor/picker keyboard, first-tap keyboard-dismissal stepping, full set-type/note edits, and long-name wrapping.
- Fixed-region paginated exercise picking, bounded muscle overlays, local alias/trigram ranking, and the deterministic reviewed 820-exercise system catalog.
- Lavender working sets, muted-green warmups, fixed opaque mobile tabs, `History` primary navigation, and a focused completion summary.

## Recommended next slice

Do not extend staging beyond the remaining release gates unless the candidate changes. Continue
the production-readiness goal:

1. Commit the final policy/provider/production-definition batch, require green exact-SHA CI and focused staging
   verification of the rendered policy/support pages; retain `6b31f98...` as the unchanged
   functional evidence baseline.
2. Capture both verified production secrets in a fresh backup, validate/install the exact
   committed production definition and preserve the verified rollback point.
3. Execute the Goal 4 production deployment,
   post-migration restore and black-box verification gates without inferring production behavior
   from staging success. Keep rollback and production health stop rules.
4. Continue through the remaining device/accessibility/status/operational gates and Goals 5–6
   until the first real capped cohort
   is invited; avoid unrelated post-beta feature work.

Keep the audit-v4 “Features up for rework” list post-beta. The catalog and local smart matching are included; broad import/export redesign and complete workout-history reset remain outside this gate.

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
We are continuing Founding Beta launch verification for the Gym Progress Tracker.

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
- docs/18-public-beta-handoff.md
- docs/beta-process/public-beta/goal-1/goal-1-remediation-report.md
- docs/beta-process/public-beta/goal-1/launch-gates.md
- docs/beta-process/public-beta/goal-3/goal-3-staging-report.md

Important:
- Audit v4 supersedes audit v3/v2 where they conflict; v3 then v2 define only behavior not superseded by newer audits.
- Preserve all existing uncommitted work.
- Treat the completed Goal 3 exact-SHA staging report as the production-candidate baseline; do not restart staging or the redesign unless the candidate changes.
- Resolve the remaining production, provider, asset, recovery, capacity and device launch gates instead of extending owner-only staging.
- Do not claim launch readiness without external legal, provider, restore, security, capacity and device evidence.
- Keep broad import/export redesign, intelligent naming, and full-history reset in the post-beta backlog.

Acceptance criteria:
- migrations apply to fresh and representative legacy data
- concurrent add/replay/conflict/order and administrator containment database tests pass
- lifecycle/email failure-isolation, redaction, compensation, and alert syntax checks pass
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
