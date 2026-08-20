# Goal 4 Production Verification

**Status:** Application baseline staged and focused automated/browser verification complete;
final policy/configuration candidate awaits commit, CI and rendered-page staging verification;
production cutover remains blocked by launch gates

**Evidence cutoff:** 2026-08-19

**Execution model:** Codex performs repository, isolated-system and read-only host checks; the
controller performs privileged, provider, asset-rights, real-device and cutover approvals.

## Goal reconciliation

| Goal | Current conclusion | Durable evidence |
| --- | --- | --- |
| 0 | Complete | Clean baseline `ee537d9` |
| 1 | Complete at repository scope | [Goal 1 remediation report](../goal-1/goal-1-remediation-report.md) |
| 2 | Decisions complete; corrected Cloudflare scope reaffirmed 2026-08-19 | [Goal 2 decision record](../goal-2/goal-2-decision-record.md), [DPIA](../goal-2/dpia.md) and [legal-risk acceptance](../goal-2/legal-risk-acceptance.md) |
| 3 | Complete | Exact release `4a4fccdae263126ceda164a792059514123f957f` and [Goal 3 staging report](../goal-3/goal-3-staging-report.md) |
| 4 | In progress; application baseline, backup, restore and capacity evidence verified; final configuration SHA and deployed proof remain | This report |

Goal 3 is not reopened. It remains valid evidence for its exact release. The immutable Goal 4
candidate is now `6b31f98981da266304484fb14c3a18904e279e4c`; local `main`, `origin/main` and
`origin/HEAD` all resolved to that SHA with a clean worktree before the evidence update. The
controller reported its exact-SHA CI run fully green. The candidate is deployed to the isolated
staging topology and the focused automated image, migration, security, email-containment,
capacity and rollback checks below passed. The controller-authenticated public browser pass also
completed through Cloudflare Access; production remains deliberately unchanged.

After that verification, the controller committed the Tripo evidence and public Support-page
attribution as `5c322c8b6ec55c6781df8a25bab7b7e4fcdd0065` and
`db5f12270cc460975f3ac822b5dc58ccf0256f5f`. The current batch changes policy rendering,
documentation, CI validation and a new non-secret production deployment definition; it does not
change application workflows, the database schema or runtime image contents. Therefore
`6b31f98...` remains valid
evidence for application images, migrations, security, capacity, restore and product workflows,
but it is no longer the prospective production SHA. After the controller commits this batch, the
new exact SHA requires green CI, including the production Compose/Caddy invariant check, and a
focused staging check of Privacy, Terms, Cookie/Storage, Support and beta-limitations rendering.
The unchanged capacity/restore/security matrix does not need to be repeated without an
application, database or deployed-topology delta.

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

After the candidate was committed and its CI run passed, the two committed restore scripts and
recovery runbook were installed with exact candidate hashes. The prior PostgreSQL script and
runbook remain available at
`/srv/gym-tracker/releases/goal4-restore-scripts-pre-6b31f98/`; the previously absent erasure drill
did not overwrite an older host copy. A post-install backup then completed as snapshot `8eb83d86`
in 127 seconds with a 207,457-byte dump and 44 repository snapshots. It captured 112 files and
directories (430.293 KiB), including the installed recovery artifacts.

All three installed drills passed against the production backup set without modifying the live
database. The PostgreSQL drill restored snapshot `48f0046e` with 22 public tables in 31 seconds;
the configuration drill restored `8eb83d86`, validated 21 protected files and completed in 33
seconds; and the erasure drill combined older database snapshot `a3bc255c` with the newest ledger
from `8eb83d86`, found the required resurrected test record and removed it in 53 seconds. The live
critical-count fingerprint was `7adb1886f058c2aa878196c581ca105e` both before and after. No
restore containers, networks, volumes or directories remained; every production container was
healthy, no systemd unit was failed, and backup, snapshot and maintenance metrics remained `1`.

No application deployment, production migration, public configuration change or gate removal was
attempted. Production cutover remains stopped; the live service stays on its older private release
pending the external, production-black-box and physical-device launch gates in this report.

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

The exact staged API and web images are 84,646,552 and 91,619,224 bytes, with IDs
`sha256:0c115b062f692013ce68d58477f5d2d85c1f95bdbec586dfe2021c8b2688fb5a` and
`sha256:72e82b7b6c2cfa696bee6e8eb6d9b2211d86f0817c70c3b9bb28376423d5ffed`.
Live container inspection confirmed UID/GID 1000. Offline Trivy image scans found zero
Node-package vulnerabilities in
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
| Staged application baseline and CI | Baseline `6b31f98981da266304484fb14c3a18904e279e4c` was committed and matched `main`, `origin/main` and `origin/HEAD` at verification time; the controller reported its exact CI pipeline fully green. Its repository check includes 212 API and 51 web tests, strict types, lint and both production builds. Later policy/configuration-only changes require a new final SHA, green CI and focused rendered-page staging verification, not repetition of unchanged functional evidence. |
| Version-controlled production definition | `ops/production` now contains the non-secret public-beta Compose/Caddy source, exact-SHA environment template and controlled cutover/rollback order. Local Compose interpolation/invariant checks pass: API, web and PostgreSQL publish no host ports; only Caddy and loopback Grafana do; private frontend/application/database/monitoring networks are internal; Caddy bridges a separate edge network; only API joins the general application-egress network for Resend; API/web use direct Node commands, explicit production mode, secure cookies/HSTS, fail-closed registration and file-backed BFF/Resend secrets; no production service has a build directive. Both staging and production Caddy templates redact invitation addresses and all known action-link query parameters. CI repeats these assertions and validates the Caddyfile with the pinned staging Caddy image. This closes the host-only-definition setup gap but does not claim deployed production behavior. |
| Performance suites | Passed all four API/web regression tests. |
| Fresh PostgreSQL 17 migrations and integration | All nine migrations applied; 16 tests in four suites passed, covering administrator containment, auth rotation, beta/email compensation, and workout isolation/idempotency/search/templates. |
| Production-image browsers | Hardened Compose images passed the CI-equivalent worker-one sequence: Chromium core/template/mobile-3D flows and Firefox core/template flows; only intentional project-specific skips remained. |
| Automated responsive/accessibility | The exact browser suite exercises the 390 px core workout flow, 320 px overflow floor, eight authenticated routes at 430/1440 px, zoom availability, representative axe WCAG A/AA scans, modal focus/inert/Escape/restoration, non-modal popover focus, reduced motion and 390 px touch scroll/orbit behavior. Physical Samsung/Firefox, Android keyboard and screen-reader review remain manual gates. |
| Exact staging deployment | All six staging release refs use the candidate SHA. PostgreSQL, API, web and proxy are healthy; API and web execute direct Node entry points; `APP_ENV=staging` and `REGISTRATION_MODE=INVITE_ONLY`; public ingress remains behind Cloudflare Access. |
| Authenticated public staging browser | Passed through the real Cloudflare Access, Tunnel and staging proxy path. Controller authentication and application login reached the dashboard without exposing credentials. An existing completed workout loaded; a named synthetic workout added Barbell Bench Press and one 20 kg x 8, RIR 2 working set; completion reported one exercise, one set and 160 kg; History, Progress and Weekly Volume reflected the write. No browser-console errors appeared; only pre-existing Three.js deprecation/sample-clipping warnings were recorded. |
| Focused staging security | Required configuration fails closed; hostile Host returned 421, cross-site POST and CORS preflight returned 403, same-origin login reached the API, secure session-cookie attributes passed, and 12 invalid logins with rotating lower-priority/forged headers produced ten 401s followed by two 429s. |
| Staging email containment | An unlisted synthetic reset recipient received the generic 200 contract while the failure metric increased by one, sent stayed unchanged, one allowlist-block log appeared and no provider-accept log appeared. Goal 3 retains the separate real controlled-inbox evidence. |
| Capacity gate | Exact candidate passed 20 active loggers and a 40-logger 2x probe with zero failed requests, bounded resource use and immediate one-user recovery. See the staging evidence below. |
| Focused rollback | A 150,163-byte pre-candidate dump with SHA-256 `5f65171315e17fb25a346dd0378c438dd22f1974259771433ab7b2b6f260cecd` restored independently. Both previous API image `4a4fccd...` and candidate API image `6b31f98...` reported healthy/database `ok`, rejected direct non-health access and saw baseline counts `2|2|6|9`. All disposable containers, networks and volumes were removed. |
| Fresh production backup | Passed repeatedly during Goal 4. The latest post-install run produced snapshot `8eb83d86`, a 207,457-byte dump and a 127-second run; it captured 112 files/directories and 430.293 KiB across a repository containing 44 snapshots. Latest-run and snapshot-availability metrics are `1`. The earlier full repository check reported no errors. |
| Strict retention maintenance | Passed after explicit approval: no snapshot exceeded the exact 30-day cutoff; prune removed zero blobs, safely repacked 13 packs and left zero unused bytes; the 10% data-pack read found no errors across 41 snapshots. |
| Persistent reverse tunnel | Passed: launchd state `running`; production listener restricted to `127.0.0.1:2222`; TCP acceptance, forced-restart recovery, sustained backup traffic and idempotent installer recovery all succeeded. |
| Installed recovery artifacts | Exact candidate files are installed root-owned: PostgreSQL restore script SHA-256 `e4bd84e0...`, erasure drill `e10f9afb...`, and recovery runbook `a1226de0...`. Script modes are `750`, the runbook is `640`, and the prior installed artifacts remain in the release-specific rollback directory. The post-install snapshot contains the new files. |
| Latest-snapshot PostgreSQL restore | Passed both before and after installation. The installed script restored snapshot `48f0046e` in 31 seconds: 22 public tables, zero invalid foreign keys, matching live/restored count hashes and successful runtime-role read. Prior sanitized host report: `postgres-restore-20260818T161531Z.env`. |
| Configuration restore | Passed both before and after installation. The installed script restored snapshot `8eb83d86` in 33 seconds and validated 21 protected files; Compose, Caddy, Prometheus, Alertmanager and dashboard JSON validations passed. Caddy emitted only its existing formatting warning. Prior sanitized host report: `config-restore-20260818T161322Z.env`. |
| Older snapshot plus newest ledger | Passed both before and after installation. The installed script combined database snapshot `a3bc255c` with newest-ledger snapshot `8eb83d86` in 53 seconds; one ledger user existed before replay and the test completed with zero resurrected users/references plus idempotent replay. Prior sanitized host report: `erasure-replay-restore-20260818T162455Z.env`. |
| Post-restore production safety | Live critical-count fingerprint remained `7adb1886f058c2aa878196c581ca105e`; every production container was healthy, no systemd unit was failed, no disposable restore resource remained, and installed hashes still matched the candidate. Production stayed on `APP_RELEASE=ca18717aba553bac51f9c54c24a8c6e67de609d6`, `APP_ENV=private-lan`, `REGISTRATION_MODE=DISABLED`. |
| Monitoring syntax | Compose rendered; `promtool` accepted all 31 alert rules; `amtool` accepted the Alertmanager route, receiver and inhibit rule using isolated synthetic secret files. |
| Dependency audit | Full and production audit: no known vulnerabilities. |
| Image scan | Zero Node-package findings; 22 Debian high/critical findings per image, none currently fixable. |
| Secret checks | Only `.env.example` is tracked among sensitive filename patterns. A local redacted Git-diff heuristic found no strong credential patterns. This is not equivalent to a complete dedicated secret-scanner attestation. |
| License inventory | Production packages are predominantly MIT/Apache/BSD/ISC; reviewed exceptions include LGPL-3.0-or-later libvips, MPL-2.0 lightningcss, CC-BY-4.0 caniuse-lite and Zlib. Archived official Tripo pricing around both model-introduction dates applies `CC BY 4.0` to the Free-tier FBX files; NOTICE and the public Support page now provide attribution and describe modifications. |

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

### Production-shaped staging capacity evidence

For the founding-beta gate, 20 concurrent active loggers is the measured operating-peak target;
40 is the required 2x probe. The exact candidate ran both levels on the isolated staging
application network. User creation stayed outside the workload phase and also completed with zero
failures: 20 users in 4,184.33 ms and 40 users in 6,923.26 ms.

| Active loggers | Requests | Failures | Wall time | Throughput | p50 | p95 | p99 | Max |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 20 measured peak | 140 | 0 | 642.11 ms | 218.03 req/s | 86.75 ms | 131.87 ms | 144.76 ms | 151.71 ms |
| 40 (2x peak) | 280 | 0 | 1,143.01 ms | 244.97 req/s | 167.59 ms | 263.14 ms | 307.33 ms | 332.60 ms |

Across 312 database samples, peak PostgreSQL connections were 17. API peak CPU was 384.92% on
the multi-core host, peak memory was 236.1 MiB of 512 MiB (46.11%) and peak PIDs were 20.
PostgreSQL peak CPU was 67.75%, peak memory was 51.88 MiB of 1 GiB (5.07%) and peak PIDs were 22.
The database grew 532,480 bytes, from 12,031,667 to 12,564,147 bytes. The 2x run produced no
request failure, health failure or observed overload condition. A one-user seven-request
write/read flow then passed immediately in 259.96 ms with every set verified, proving recovery.

The synthetic capacity records were intentionally retained in isolated staging for reproducible
inspection rather than deleted with an unreviewed cleanup query. The later authenticated browser
smoke added one deliberately named closed workout and one set to the controlled staging tester,
bringing the known counts to 63 users, 64 workouts and 190 sets; production was never targeted.
Registration was restored to
`INVITE_ONLY`, all four staging services are healthy, and the public endpoint still redirects to
Cloudflare Access. This closes the capacity-specific launch gate for the exact candidate; it is not
authorization to deploy or open production.

## Remaining gates and ownership

| Work | Primary owner | SSH needed? | Why it remains open |
| --- | --- | --- | --- |
| Production Resend configuration and delivery monitoring | Joint | Yes for internal verification | A sending-only `gym-track-production` key scoped to `send.gymtrack.ch` was created and installed on 2026-08-19 as the root-owned `resend-api-key-container` secret (`0440`, GID `10001`; value never recorded). The version-controlled candidate wires it only to API; deployed delivery proof remains. |
| Controller identity/address and final production-rendered legal/support pages | Controller supplies/approves; Codex verifies | Production black-box step only | The approved real values are present in the production environment template; deployed rendering and the final archive remain absent. |
| Final policy/configuration SHA, CI and legal-page staging refresh | Controller commits; Codex verifies | Only for the focused staging refresh | The fully tested application baseline remains valid, but later policy and deployment-definition changes move the deployable SHA. |
| Cloudflare production edge, invite mode and narrow email black-box checks | Joint | Yes for internal/API corroboration | The shared file-backed BFF secret is installed with verified `root:10001`, `0440` metadata and 64-character length, but production still runs the old private release. Broader real-user confirmation belongs to the selected beta tester. |
| Independent status page and incident publication rehearsal | Controller/provider setup, Codex verification | Not normally | No independent public status path is deployed. |
| Samsung S22 Plus Firefox/mobile-data and final accessibility/manual QA | Controller/device operator | No | Physical device, network and assistive-technology evidence is required. |
| Production deployment, rollback readiness and public gate change | Controller approval; Codex can execute guided checks | Yes | Destructive/external transition must follow all stop rules. |

Most repository, database, browser, image, dependency, monitoring and synthetic-load work does
not need Mac mini SSH. SSH is needed only when the fact being proved lives on the host: backup and
restore state, deployed topology/secrets, exact production release, internal-edge behavior,
deployment, rollback and production black-box corroboration.

## Clean continuation order

1. Controller commits the now-reaffirmed policy/provider/production-definition batch; require
   green exact-SHA CI and focused legal-page staging.
2. Capture both protected production secrets in a fresh backup, then validate/install the
   version-controlled definition while preserving the verified rollback point.
3. Deploy the final candidate under a write/opening freeze, repeat the
   focused restore verification, run production black-box checks, and roll back immediately
   on any stop-rule failure.
4. Complete device/accessibility/status/restore gates, then invite only the first 10-person cohort
   and observe it for 72 hours before any expansion.

Goal 4 is therefore progressing cleanly. Exact-candidate CI, immutable staging deployment,
automated security/email containment, production-shaped capacity and focused rollback all have
current evidence. Fresh production backup, strict maintenance, restore/erasure replay and tunnel
durability are also verified, and the exact committed recovery artifacts are installed and
reverified. Production is **not approved** while production black-box work and external launch
gates remain open.
