# Status showcase implementation and rollout handoff — 2026-10-21

## Implementation

The independent GitHub Pages bundle now combines compact operational state with a product
introduction, admin-inclusive enabled-account disclosure, broad retained workout-record count,
rolling 30-day completed workouts, an eight-week UTC chart with accessible table, and three actual
portrait mobile sample-data captures of the existing app. Coverage remains attributable and inspectable in a native
disclosure. No new framework, analytics service, schema, persisted counter, or collection job was
introduced. Existing beta-account and record-count response semantics remain backward compatible.

New aggregate SQL is covered by real PostgreSQL integration checks. The BFF is unchanged because
local production-build checks establish that its existing route is registered and forwards the new
contract. The independent page accepts legacy responses with explicit non-admin labels and hides
missing/malformed optional activity. Source freshness and fail-closed rules are unchanged.

All implementation modules stay below the 250-line source-file target. The existing renderer and
controller retain their documented cohesive factory-function exception; the new activity renderer,
metric parser and UTC window helper remain bounded feature-owned modules. The existing plain-JS
status bundle remains the ADR 0019 exception to the application TypeScript default.

## Verification

Passed locally:

- `pnpm type-check` and `pnpm lint`.
- `pnpm test`: 226 API, 69 web and 42 status tests.
- `pnpm test:integration`: all 26 tests against a disposable, freshly migrated PostgreSQL 17
  database. Tests include admin/USER status, account inclusion, UTC/rolling cutoff boundaries,
  open/deleted/future sessions, historical imports and physical row removal.
- `pnpm build`: API and production Next.js build, including `/api/public-status`.
- `pnpm test:status:browser`: 24 Chromium/Firefox checks across 390, 768 and 1440px; chart/table
  equality, actual assets, keyboard focus, no page overflow, no-JavaScript content and independent
  unavailable/stale/legacy/malformed/zero evidence. No serious/critical axe findings in checked
  healthy states; this is not an assistive-technology or full WCAG certification.
- Public BFF smoke: both Chromium and Firefox pass `apps/web/e2e/public-status.spec.ts` against
  the local production web build and real API/database. Originless and allowed-origin reads return
  200 aggregate-only JSON with no-store and expected CORS; another explicit origin receives 403.
- `git diff --check`.

The full application UI smoke suite and production container/host checks were not rerun as part of
this focused status change. CI retains the full suite and now also runs the independent status
browser checks and the actual BFF route smoke. Docker was unavailable locally; PostgreSQL ran in an
isolated Homebrew PostgreSQL 17 instance. Raw captures/logs and the disposable database are ignored
local artifacts under `.cache/status-review/`; sample screenshot provenance is committed separately.

## Mobile gallery adjustment

The gallery uses newly captured 430 × 932 mobile-viewport examples, preserving actual portrait
pixel dimensions and the app's bottom navigation. Progress shows the collapsed lift selector;
Volume shows the body map and heat scale; logging shows two sample working sets. Previews are
bounded to 320px wide with full-size links. Browser checks enforce portrait orientation, declared
image dimensions and responsive layout. Screenshot provenance and recapture steps were updated.

## External monitoring completed

The owner signed in through Chromium and authorized continuation with computer use. The existing
Better Stack team had one monitor and no public status page. The following configuration is now
live, using three-minute checks and SSL verification:

- Reused monitor `5105806`, renamed **Web application**, target
  `https://app.gymtrack.ch/login` (previously the root `gymtrack.ch` target).
- Added **Independent status page**, target `https://status.gymtrack.ch/`.
- Added **API and database**, target `https://app.gymtrack.ch/api/public-status`.
- Created the published provider page at <https://gymtrack.betteruptime.com/>, with all three exact
  component names and status-history widgets. Unmonitored days remain unmonitored. Automatic
  incident updates are enabled. No custom-domain/DNS changes or paid upgrades were made.
- Set non-secret repository variable `BETTER_STACK_STATUS_URL` to
  `https://gymtrack.betteruptime.com` in `haagjjan/gym-track`.

The actual public `/index.json` returned 200 and passed the existing parser: all three components,
one returned history day per component, one valid active incident and no incomplete incident
records. The feed grants `Access-Control-Allow-Origin: *`. At 09:11 UTC, web and independent page
were operational; API/database was downtime, consistent with the production route's HTML 404.
This is externally observed path health, not evidence that the entire application is down.

## Deployment remains pending

The owner requested finishing code and monitoring first, leaving SSH access for later. Neither the
application nor the updated GitHub Pages bundle has been deployed in this change. No commit or
push was made. Therefore the live custom page can still have its previous null configuration and
missing activity until the controlled rollout runs. Setting the repository variable alone does
not replace deployed `config.json`.

Production web/API exact SHA, standalone route manifest, proxy destination, and account aggregates
remain unverified. Initial LAN and remote Cloudflare SSH attempts timed out. During the mobile
gallery follow-up, a separate `gym-prod-remote` connection succeeded. Docker inspection was denied
for the normal user and `sudo -n` reported that interactive authentication is required. Computer
use also blocks the local Terminal app, so the existing owner shell cannot be operated through
that tool. No permission changes, speculative routing fix, or host configuration change was made.
The next bounded owner-assisted check is `sudo docker ps --format '{{.Names}} {{.Image}}'`
in the already-connected server terminal, sharing only the resulting container names/image tags.

Next, use the active `ops/production/README.md` exact-SHA staging/deployment procedure and the
controlled status rollout checklist in `ops/status/README.md`. Deploy the checked API/web revision
before publishing the updated static page; retain previous images/config and Pages artifact for
rollback. Verify production 200 JSON and CORS, compare the admin-inclusive account aggregate,
confirm the real page's chart/screenshots, and exercise a source-failure state before calling the
rollout complete. The user-reported eight enabled accounts have not yet been verified.


## Production image diagnosis from owner-supplied container inventory

The owner supplied `docker ps` output showing production API/web images tagged
`9c7bf0361ae8d3395c8df59b476c304bd6e178e6` (2026-08-31), while staging API/web/proxy/PostgreSQL
images use `967bf8d61d7c928a000b7682781657cec47a2f1e` (2026-10-19). Git ancestry confirms that
the public status routes were introduced later than production's tag, in
`6832aa8ef868529fca408631e6e6716b83a5aa7b` (2026-09-02). The production-tagged revision contains
neither the web public-status route nor the API status feature. This explains the observed 404
without a speculative route rewrite, assuming the image tags accurately identify their contents.

Running release environment values, container route manifests and proxy destination still need
read-only runtime confirmation. The latest showcase/metric work remains uncommitted and is not
in either environment. An upgrade must follow the exact-SHA staging, backup, migration and
production verification gates; restarting the old production images cannot introduce missing
routes. No production deployment or restart was performed during diagnosis.

## Owner-assisted verification and staging upgrade (21–22 October)

This follow-up supersedes the earlier deployment/access unknowns above. The owner committed and
pushed the showcase. Both `repo-checks` and `Status page` passed for exact revision
`89bf6530a14338a4d1b4c37b809e59ea1372f39d`; the static page now has its provider configuration.

The owner ran read-only production diagnostics on 21 October. The application database is
`gym_tracker`; its `public.schema_migrations` ledger contains the nine expected migrations through
`20260806120000000_add_workout_mutation_safety`. A read-only aggregate verified **eight ACTIVE
accounts including the administrator**. The production web route manifest contains no public
status route, while staging's manifest contains `/api/public-status/route`. The initial diagnostic
incorrectly queried the container's `postgres` maintenance database; no ledger was created or
modified to address that diagnostic error.

The staging build first stopped before migrations because the operator wrapper's restrictive
umask produced a source `package.json` at mode `0640`. Docker preserved that mode and the
migration UID `10001` could not read it. Recovery rebuilt from `git archive` of the exact revision,
extracting with normal source permissions and verifying readability as the migration UID before
running migrations. No container privilege expansion or secret permission changes were used.

The owner subsequently supplied successful staging results for the exact revision above: API,
web, proxy and PostgreSQL healthy; migration runner reported no pending migrations; the real
public BFF endpoint returned the additional aggregates and eight weekly buckets. The staging dump
and previous configuration/images were retained for rollback. Production remained unchanged.

A public request on 22 October at 08:02 UTC still returned HTML 404 from
`https://app.gymtrack.ch/api/public-status`. The production upgrade, current backup/restore gates,
public JSON/CORS checks, independent monitoring recovery and final live-page verification remain
outstanding. Static-page publication alone does not deploy application images. The metrics fetch
runs on page load and every five minutes, so successful production deployment is required before
these fields can appear.

Production preparation subsequently passed the restricted-user image input check but stopped
before cutover when `backup-postgres.sh` invoked Compose without the production environment file.
Compose could not interpolate required `EMAIL_FROM`. The production-facing Compose calls in
backup, erasure export, both database restore checks and the post-reboot helper now pass the
explicit host-only environment path; they no longer depend on the caller's current directory.
A guarded operator patch retains installed-script copies and verifies their hashes before changing
only these arguments. Successful backup and restore results are still required before cutover.

The next backup attempt reached Restic but failed on exclusive lock `e6150fea`, reported as
created on 21 October by PID `2547380` on `gym-prod`. Read-only SSH inspection confirmed that
PID absent, no Restic process running, and the backup and maintenance services in failed state.
A bounded recovery helper was prepared to revalidate the exact repository lock under the
existing operator lock, use default stale-lock removal, check integrity and retry preparation.
Recovery and the required fresh backup/restore are not yet confirmed.
