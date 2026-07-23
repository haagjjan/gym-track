# ADR 0007 - Canonical Exercise Classifications and Volume Preferences

## Status

Accepted

## Context

Exercise equipment and type were previously free-form text. That made filtering inconsistent and allowed visually identical classifications to be stored under different spellings. The V1 volume heatmap also needs a user-adjustable ceiling that follows the account instead of one browser.

## Decision

- Exercise equipment is nullable or one of: `barbell`, `dumbbell`, `kettlebell`, `cable`, `machine`, `plate-loaded machine`, `Smith machine`, `resistance band`, `bodyweight`, `other`.
- Exercise type is nullable or one of: `compound`, `isolation`, `isometric`, `other`.
- Recognized legacy values are normalized. Every remaining non-null legacy value becomes `other`. PostgreSQL checks enforce the canonical sets.
- `users.volume_heat_ceiling` stores an integer from 5 through 50 and defaults to 20.
- Canonical options and the authenticated preference are exposed through API endpoints; clients do not maintain competing option lists.

## Consequences

Exercise facets and creation selects have stable values. New classifications require an intentional migration and contract change. The heat ceiling is account-synced, while unfinished set drafts and display preferences remain device-local by design.
