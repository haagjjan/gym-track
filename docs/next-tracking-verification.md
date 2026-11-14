# Time and cardio batch: review and verification

Workspace: `/Users/janva/Projects/gym-progress-tracker-set-types`.
Branch: `next/c-set-types`, based on `next/a-ui`, independent of the body branch.
All new changes are uncommitted. No production migration, deployment or push ran.

## Behavior

`ENABLE_EXTENDED_TRACKING` defaults to false on both servers. When enabled:

- Time and cardio exercises are ordinary exercises: created in the Exercises menu
  ("Logged by"), picked from the same list, ordered in the workout and allowed in
  templates. Their "Add set" / "Add entry" sheet has a minutes-and-seconds
  duration, a timer and optional added weight for holds, and distance, calories
  and heart rate for cardio. Revision checks and soft deletion are unchanged.
- Progress switches between strength and time/cardio. Time compares duration or
  added load; cardio compares duration or distance. A table and entry picker
  expose every value. History quick views show both new record kinds.
- Timed working sets count toward muscle volume; timed warmups and cardio do not.
  Tonnage and estimated 1RM remain repetition-only.
- History exports/imports a separate time/cardio CSV. It preserves workout
  dates/title/type/notes, entry recording order, optional metrics and text that
  needs spreadsheet protection. Imports create completed workouts, not merges.
  The legacy CSV importer refuses time-exercise names.
- Help has a local practice form that never writes account data.

ADRs 0025 and 0026 are proposed. The offline database, outbox, token auth and
native client are not implemented. The entry tables prepare client IDs,
revisions and tombstones only. Existing online strength writes retain ADR 0014.

## Local verification environment

The session used the disposable local database `gym_next_tracking_20261110` on
the existing loopback PostgreSQL server. API :4001 and web :3001 use that database
and the flag is enabled there. The original :3000/:4000 pair and its database
remain the body-branch preview. No real env file was copied into this worktree.
Local dependency symlinks are ignored through the repository's private exclude.

Verified locally on 2026-11-10: type-check, lint, production build, 230 API unit
tests, 96 web unit tests, 42 status tests and all 27 integration tests passed.
The extended flow passed in Chromium and Firefox, including a lost-response retry
without duplicate creation; the existing Chromium workout loop passed. Migration
guards passed both standalone and with the body schema. The built preview is
served on :3001; its own dev server was stopped before building.

General gates:

```bash
cd /Users/janva/Projects/gym-progress-tracker-set-types
pnpm type-check
pnpm lint
pnpm test
WEB_BASE_URL=http://localhost:3001 TEST_EXTENDED_TRACKING=true pnpm smoke:web extended-tracking.spec.ts --project=chromium
```

For integration, use an isolated migrated local database via
`INTEGRATION_DATABASE_URL`. The full suite is `pnpm test:integration`; do not run
it against production. The new contract regression covers create/replay after
edit/delete, concurrent revision conflicts, account ownership, volume exclusion,
CSV round trip, flag-off behavior and shared-exercise creator erasure.

The migration guard check creates and deletes only its own disposable database
and refuses non-loopback URLs. It needs the same local database-creation access
used during this session. Load the existing local env without printing secrets:

```bash
cd /Users/janva/Projects/gym-progress-tracker-set-types
pnpm --filter @gym-progress-tracker/api exec node --env-file=/Users/janva/Projects/gym-progress-tracker/.env --import tsx scripts/check-tracking-migrations.ts /Users/janva/Projects/gym-progress-tracker/apps/api/db/migrations/20261110120000000_add_muscle_regions.sql
```

This verifies collision rollback, changed-seed preservation, the time-mode FK,
logged-data rollback refusal, and actual group/region totals with the body schema.
Omit the last argument to check Batch C alone. Logged entries or a changed seed
make down migration refuse; disabling the flag is the ordinary rollback.

## Combining with the body batch

Do not merge branches or rewrite history without the owner's explicit request.
When resolving the analytics-service overlap, retain the body branch's regional
query and Batch C's timed adapter:

```ts
const [rows, regionRows, timedRegions] = await Promise.all([
  repository.findWeeklyVolumeSets(filters),
  repository.findWeeklyVolumeRegionSets(filters),
  repository.findTimedVolumeRegions?.(filters) ?? []
]);
return addTimedRegionVolume(toWeeklyVolume(rows, regionRows), timedRegions);
```

Group rows already include timed sets while enabled. The body branch's region
query covers repetition sets; the adapter adds timed facts using each primary
group's accepted default region. Do not also add timed facts to that regional
query, which would count them twice. Without the body schema/payload the adapter
leaves the legacy group-only output intact. The compatibility check exercises
both actual aggregators with a time exercise assigned to multiple primary groups.
Keep all database table interfaces and both sets of documentation when resolving
other overlaps. The combined tree has thirteen migrations.

## Review and remaining gates

Independent source reviews found and resolved creator-erasure and reversible-CSV
issues, plus seed collision/down-preservation issues. The bounded peer-review
CLI exited 1 without a report; its configured peer's weekly quota is exhausted.
No approval report was produced. Native-device heat, gesture feel and final look
remain owner checks. This batch does not change deployment or native settings.

The existing session coordinator remains above its target component size; it
only gains the gated query/totals/render hooks. New forms, reads and mutations
live in the tracking feature. Transaction/import factories keep their cohesive
short operations together rather than splitting solely to reduce line counts.
