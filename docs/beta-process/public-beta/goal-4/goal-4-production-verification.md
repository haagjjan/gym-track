# Goal 4 Production Verification

**Status:** Pre-deployment verification in progress; production cutover blocked by remaining launch gates

**Evidence cutoff:** 2026-08-19

**Execution model:** Codex performs repository, isolated-system and read-only host checks; the
controller performs privileged, provider, asset-rights, real-device and cutover approvals.

## Goal reconciliation

| Goal | Current conclusion | Durable evidence |
| --- | --- | --- |
| 0 | Complete | Clean baseline `ee537d9` |
| 1 | Complete at repository scope | [Goal 1 remediation report](../goal-1/goal-1-remediation-report.md) |
| 2 | Decisions complete; later-goal external execution remains | [Goal 2 decision record](../goal-2/goal-2-decision-record.md) and [external actions](../goal-2/goal-2-external-actions.md) |
| 3 | Complete | Exact release `4a4fccdae263126ceda164a792059514123f957f` and [Goal 3 staging report](../goal-3/goal-3-staging-report.md) |
| 4 | In progress; backup transport and maintenance gates verified | This report |

Goal 3 is not reopened. It remains valid evidence for its exact release. Goal 4 hardening changes
the prospective production candidate, however. The application and restore batch is committed and
its last CI run was reported green; the current operations follow-up still needs its own commit and
appropriate checks. The immutable candidate also needs focused staging revalidation before
deployment.

## Production preflight and stop decision

Read-only SSH checks reached the production Mac mini through the existing `gym-prod-remote`
Cloudflare Access path. The server repository is clean at
`d9d78a204545f80af3322d05cc13b95f3171a5bc`, while the deployed application reports older
release `ca18717aba553bac51f9c54c24a8c6e67de609d6`. It is still a private service with
`APP_ENV=private-lan` and `REGISTRATION_MODE=DISABLED`; it is not the Goal 4 candidate.

The host has about 30.3 GB available memory and 415.9 GB free on the root filesystem. Docker,
Cloudflare Tunnel and SSH are active. The root filesystem is plain ext4 without full-disk
encryption. Public requests to the application, beta and policy paths are still redirected to
Cloudflare Access, so applicant-facing production ingress is not yet open.

At initial inspection, production deployment was correctly **stopped** because both backup units
were failed. Restic's SFTP target at `127.0.0.1:2222` refused connections when the off-machine
MacBook destination was unavailable. The latest scheduled run had failed, and the last successful
backup was 2026-08-17 09:27:52 CEST—outside the 24-hour RPO at inspection time.

On 2026-08-18 the reverse SSH path was restored under operator supervision. A fresh backup then
completed successfully at 18:07:16 CEST as snapshot `905c5b1b`: the logical dump was 207,457
bytes, the run took 160 seconds, and Restic's repository check reported no errors across 41
snapshots.

On 2026-08-19 the approved transport was made persistent under the owner's per-user macOS
`launchd` domain. The agent keeps an SSH reverse forward from production loopback
`127.0.0.1:2222` to Mac loopback port 22, restarts failed connections after a 60-second throttle,
and logs bounded SSH errors under `~/Library/Logs/GymTrackerBackup`. Production acceptance checks
showed the listener bound only to `127.0.0.1` and a successful TCP connection through it. The
agent recovered correctly after forced restarts, and a second installer run proved the checked-in
installation procedure is idempotent. It still cannot back up while the Mac is asleep or renew an
expired interactive Cloudflare Access grant; four daily attempts and staleness alerts remain
necessary.

Fresh configuration, PostgreSQL and old-snapshot/newest-ledger restore drills also passed; their
sanitized results are recorded below. After explicit destructive-action approval, weekly
maintenance ran from 10:08:43 to 10:12:53 CEST on 2026-08-19. The exact wall-clock cutoff found no
snapshots older than 30 days; the oldest remained 2026-07-22. Restic therefore pruned without a
`forget`: it removed zero blobs, repacked 13 packs, left zero unused bytes and completed a 10%
data-pack read across 41 snapshots with no errors. The maintenance-success metric is now `1`.

The same persistent tunnel then carried a fresh production backup from 10:15:03 to 10:17:37 CEST.
Snapshot `f3a81d50` contains the expected 84 files and 417.492 KiB, including a 207,457-byte
PostgreSQL dump. The 154-second run finished with a full repository check across 42 snapshots and
no errors. Both backup and maintenance success metrics are `1`, no systemd units are failed, and
the reverse listener remains reachable only through production loopback.

No application deployment, production migration, public configuration change or gate removal was
attempted. Production remains stopped pending the exact candidate staging path and the other launch
gates in this report.

## Defects found and remediated in the prospective candidate

### Docker context containment

The original Docker context was about 1.19 GB and included nested Claude worktrees and local
environment files. A web build visibly loaded a local env file. `.dockerignore` now excludes Git
metadata, agent/worktree data, all nested environment files except the two reviewed examples,
recursive dependencies, build output and browser artifacts. `.gitignore` also excludes Claude
worktrees. A rebuilt context was about 76 MB and contained only `.env.example`; no local env,
Claude or Git directory remained.

### Dependency security

The initial dependency audit reported 33 known vulnerabilities, 24 high; the production-only
view reported 24, 16 high. Direct Next.js, Fastify and Kysely ranges were raised, aligned ESLint
configuration was updated, and audited PostCSS and Sharp versions were pinned through workspace
overrides. The refreshed full and production dependency audits report no known vulnerabilities.
Fastify request-log suppression was moved to its current `LogController` API so the upgraded
runtime does not emit the deprecation warning.

### Runtime image hardening

The prior API and web images were approximately 478 MB and 523 MB, ran as root, retained build
and package-manager tooling, and had no image health checks. The API and web final stages now:

- use the exact pinned Node 22 Bookworm-slim digest;
- copy only production API dependencies/build output or Next standalone output;
- remove npm, Corepack, pnpm and Yarn from the long-running image;
- run as the unprivileged `node` user; and
- provide built-in health checks and direct Node entry points.

The final rebuilt API and web images are 84,649,602 and 91,607,655 bytes. Live container inspection
confirmed UID/GID 1000. Offline Trivy image scans found zero Node-package vulnerabilities in
both images. Each retains 22 high/critical Debian findings with no vendor fix available according
to the scan database; these require ongoing base-image monitoring rather than a false zero-risk
claim. The migration image remains a privileged one-shot build/dependency target and should be
treated as a short-lived deployment component.

### Restore-test reliability and erasure replay

The installed PostgreSQL restore test exposed a startup race: the official image briefly accepted
connections through its initialization server, stopped that server, and restarted into normal
operation. A one-shot readiness assertion could therefore fail silently between the two states.
The candidate now requires three consecutive ready checks, resets the streak across a restart and
emits bounded container logs plus an explicit timeout error. The exact patched script passed
against the newest production snapshot before any installation was made.

`restore-test-erasure-replay.sh` now encodes the missing ADR 0013 drill. It restores a caller-
selected older database snapshot and the newest erasure ledger into separate trees, requires at
least one resurrected ledger user before replay, checks the restored migration ledger against
production, replays twice for idempotence, and proves zero remaining erased users or direct
references. Only counts, timestamps, snapshot IDs and hashes enter the root-owned report; user IDs
are never printed. The disposable database has an internal-only Docker network.

## Verification completed

| Check | Result and scope |
| --- | --- |
| Full repository check | Passed on the Goal 4 working tree: 212 API and 51 web tests, strict types, lint and both production builds. |
| Performance suites | Passed all four API/web regression tests. |
| Fresh PostgreSQL 17 migrations and integration | All nine migrations applied; 16 tests in four suites passed, covering administrator containment, auth rotation, beta/email compensation, and workout isolation/idempotency/search/templates. |
| Production-image browsers | Hardened Compose images passed the CI-equivalent worker-one sequence: Chromium core/template/mobile-3D flows and Firefox core/template flows; only intentional project-specific skips remained. |
| Capacity preflight | See below; passed locally on disposable synthetic data, but does not yet close the staging/production gate. |
| Fresh production backup | Passed twice. The persistent-tunnel proof produced snapshot `f3a81d50`, a 207,457-byte dump and a 154-second run; the full repository check reported no errors across 42 snapshots and the latest-run metric is `1`. |
| Strict retention maintenance | Passed after explicit approval: no snapshot exceeded the exact 30-day cutoff; prune removed zero blobs, safely repacked 13 packs and left zero unused bytes; the 10% data-pack read found no errors across 41 snapshots. |
| Persistent reverse tunnel | Passed: launchd state `running`; production listener restricted to `127.0.0.1:2222`; TCP acceptance, forced-restart recovery, sustained backup traffic and idempotent installer recovery all succeeded. |
| Latest-snapshot PostgreSQL restore | Passed with the readiness fix in 53 seconds: 22 public tables, zero invalid foreign keys, matching live/restored count hashes and successful runtime-role read. Sanitized host report: `postgres-restore-20260818T161531Z.env`. |
| Configuration restore | Passed in 38 seconds: 21 protected files and 25 scripts; Compose, Caddy, Prometheus, Alertmanager and dashboard JSON validations passed. Sanitized host report: `config-restore-20260818T161322Z.env`. |
| Older snapshot plus newest ledger | Passed in 99 seconds: database `a3bc255c` predates separately restored ledger snapshot `905c5b1b`; one ledger user existed before replay, zero users/references remained, one tombstone remained, migration ledgers matched and a second replay was idempotent. Sanitized host report: `erasure-replay-restore-20260818T162455Z.env`. |
| Monitoring syntax | Compose rendered; `promtool` accepted all 31 alert rules; `amtool` accepted the Alertmanager route, receiver and inhibit rule using isolated synthetic secret files. |
| Dependency audit | Full and production audit: no known vulnerabilities. |
| Image scan | Zero Node-package findings; 22 Debian high/critical findings per image, none currently fixable. |
| Secret checks | Only `.env.example` is tracked among sensitive filename patterns. A local redacted Git-diff heuristic found no strong credential patterns. This is not equivalent to a complete dedicated secret-scanner attestation. |
| License inventory | Production packages are predominantly MIT/Apache/BSD/ISC; reviewed exceptions include LGPL-3.0-or-later libvips, MPL-2.0 lightningcss, CC-BY-4.0 caniuse-lite and Zlib. FBX provenance remains unresolved separately. |

One exploratory Playwright run used five workers against a single local BFF attribution key and
correctly reached HTTP 429 limits. It was not counted as an application failure. The exact CI
worker-one/restart sequence was then run and passed. An initial database command set
`DATABASE_URL` rather than `INTEGRATION_DATABASE_URL`, causing intended integration skips; that
run was discarded and the correct 16-test integration run passed.

## Guarded capacity preflight

`apps/api/scripts/beta-capacity.ts` requires an explicit synthetic-data confirmation, a 32+
character BFF secret, and separate approval of any non-loopback host. It creates synthetic users
outside the measured phase, then starts concurrent active-logger flows. Each flow creates a
workout, adds Bench Press, writes three idempotency-keyed sets, ends the workout and rereads it to
prove all three sets persisted.

The disposable hardened stack produced:

| Active loggers | Requests | Failures | Wall time | Throughput | p50 | p95 | p99 | Max |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 140 | 0 | 153.05 ms | 914.76 req/s | 16.72 ms | 51.93 ms | 57.01 ms | 60.30 ms |
| 40 (2× baseline) | 280 | 0 | 233.53 ms | 1,198.99 req/s | 25.40 ms | 87.75 ms | 105.35 ms | 107.26 ms |

Post-run health reported API and database `ok`; PostgreSQL showed three current connections. The
API used about 86.11 MiB and PostgreSQL 40.13 MiB in the post-run sample. Cumulative disposable-
database counts matched 122 synthetic users, 122 workouts and 366 sets across all valid preflight
and final-image runs. A new one-user write/read flow passed immediately after the final 40-user
burst.

This is strong defect-detection evidence for the workload and new images, not completion of the
launch gate. The exact committed image must repeat the workload in production-shaped staging
while recording peak CPU, memory, connections and disk growth. The gate also needs an explicit
measured-peak definition and monitored recovery/overload evidence.

## Remaining gates and ownership

| Work | Primary owner | SSH needed? | Why it remains open |
| --- | --- | --- | --- |
| Exact-SHA CI, image rebuild and focused staging regression | Controller commits; Codex verifies | Only for staging deployment | The application hardening and restore batch is committed as `16d013347e577df7f3d0d017358cbc86f91a27f0`; the controller reports the last CI run clear. The operational tunnel follow-up remains uncommitted at this cutoff and needs its final commit/check evidence. |
| Install the committed restore scripts and repeat focused restore verification | Joint | Yes, with owner-supervised privilege | The successful fixes ran from private temporary copies; production's installed script was deliberately not replaced ahead of commit/deploy. |
| Production Resend key, recovery/billing/retention register and delivery monitoring | Controller | Usually no host SSH until secret install | Production provider configuration is incomplete. |
| FBX redistribution proof or remove/replace both models and update NOTICE | Controller decides; Codex can implement removal/replacement | No | Public delivery is blocked by unknown asset terms. |
| Controller identity/address and final production-rendered legal/support pages | Controller supplies/approves; Codex verifies | Production black-box step only | Real values and final rendered archive are absent. |
| Cloudflare production edge, BFF secret, invite mode and email black-box checks | Joint | Yes for internal/API corroboration | Production still runs the old private release. |
| Independent status page and incident publication rehearsal | Controller/provider setup, Codex verification | Not normally | No independent public status path is deployed. |
| Samsung S22 Plus Firefox/mobile-data and final accessibility/manual QA | Controller/device operator | No | Physical device, network and assistive-technology evidence is required. |
| Production deployment, rollback readiness and public gate change | Controller approval; Codex can execute guided checks | Yes | Destructive/external transition must follow all stop rules. |

Most repository, database, browser, image, dependency, monitoring and synthetic-load work does
not need Mac mini SSH. SSH is needed only when the fact being proved lives on the host: backup and
restore state, deployed topology/secrets, exact production release, internal-edge behavior,
deployment, rollback and production black-box corroboration.

## Clean continuation order

1. Controller resolves the FBX path and provider/legal values in parallel with candidate work.
2. Review and commit the persistent-tunnel operations follow-up, then require the appropriate
   exact-SHA checks.
3. Deploy the immutable candidate SHA to staging; repeat focused browser/security/email/capacity/image
   checks affected by the new dependency and container changes.
4. Prepare production-only provider secrets and a verified rollback point.
5. Deploy the committed restore scripts and candidate under a write/opening freeze, repeat the
   focused restore verification, run production black-box checks, and roll back immediately
   on any stop-rule failure.
6. Complete device/accessibility/status/restore gates, then invite only the first 10-person cohort
   and observe it for 72 hours before any expansion.

Goal 4 is therefore progressing cleanly. Fresh backup and restore evidence is now strong, including
the previously missing old-snapshot/newest-ledger proof. Backup maintenance and transport
durability are now verified, but production is **not approved** while exact-candidate staging and
external launch gates remain open.
