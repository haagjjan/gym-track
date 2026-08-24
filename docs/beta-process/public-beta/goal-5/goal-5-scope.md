# Goal 5 Scope — Prepare and Verify Production

**Status:** Production cutover complete on exact release
`2cac1fe0e20f294c951cb8cb8115b83601ae6a5f` with registration and admission closed;
administrator bootstrap and UI verification complete

**Recorded:** 2026-08-20

**Owner:** Controller, with supervised agent assistance

Goal 5 is the SSH-dependent production stage defined in
[goal-structure.md](../goal-structure.md): identify the actual deployed commit and configuration,
verify service users, ports, firewall and Docker boundaries, inspect Caddy/tunnel behavior from
the server side, verify migrations and database health, check timers, backups, monitoring and
Alertmanager, test startup after reboot, run capacity checks on the target hardware, exercise
rollback and write-pause procedures, perform isolated restore and replacement-host drills, and
configure secure remote administration.

Production access is just-in-time and supervised: least privilege, and explicit approval before
anything that changes real data, migrations, networking, backups, or availability. Secrets are
entered by the controller or through the provider, never pasted into chat or committed.

## Relationship to the Goal 4 report

A substantial part of this work was already executed and recorded under Goal 4, in
[goal-4-production-verification.md](../goal-4/goal-4-production-verification.md). That evidence
stays where it was executed rather than being moved; Goal 5 does not repeat it. Already done
there:

- Read-only production preflight, deployed release and host resource state.
- Persistent loopback-bound reverse backup tunnel as a macOS launch agent.
- Fresh backups, strict 30-day retention maintenance, and repository checks.
- PostgreSQL, configuration and erasure-replay restore drills, before and after installing the
  candidate recovery artifacts.
- Production Resend and BFF secrets installed root-owned, and captured in a verified backup on
  2026-08-19.
- The version-controlled non-secret production Compose/Caddy definition and cutover runbook in
  [ops/production](../../../../ops/production/README.md), with CI invariant checks.

What remains below is the work that still has no evidence.

## Read-only production preflight — 2026-08-20

The first Goal 5 production preflight reached `gym-prod` through the documented
`gym-prod-remote` Cloudflare Access path. No deployment, migration, configuration change or
production write was attempted.

- The server repository is clean on branch
  `codex/gym-prod-public-beta-ops-hotfix-20260806T075754Z` at
  `d9d78a204545f80af3322d05cc13b95f3171a5bc`. The deployed application remains the older
  private release `ca18717aba553bac51f9c54c24a8c6e67de609d6` with `APP_ENV=private-lan` and
  `REGISTRATION_MODE=DISABLED`. The active Compose configuration parses successfully, but the
  final public-beta production definition and approved controller/contact values are not yet
  installed.
- The host had 28 GiB available memory, 384 GiB free on `/`, 3% inode use and synchronized NTP.
  Docker, Cloudflare Tunnel and SSH were active. The LAN-only Caddy listener returned the beta
  and Privacy pages successfully, and loopback Grafana health returned 200.
- The preflight initially stopped because the 15:28 CEST scheduled backup had failed when the
  loopback reverse tunnel refused port 2222. The prior successful backup from 09:24 CEST was
  still inside the 24-hour RPO, and the reverse listener was reachable again before recovery.
- Under controller supervision, a fresh backup completed at 21:14 CEST as snapshot `8268e822`:
  34 seconds, a 208,221-byte PostgreSQL dump and a clean Restic repository check across 48
  snapshots. Backup metrics returned to success, the reverse listener remained reachable only
  on production loopback, and `systemctl --failed` returned zero units. This clears the backup
  stop condition; it does not authorize cutover.
- The subsequent scheduled run also succeeded at 21:23 CEST as snapshot `80880f58`; the
  repository then contained 49 snapshots. This is the fresh rollback point for the next
  production window.
- The controller and Codex established the named remote `tmux` session and authenticated `sudo`
  inside the shared TTY without sharing a password. Production container inspection found every
  service healthy on the unchanged private release. After the isolated staging refresh, the host
  still had about 30.4 GB available memory and 411 GB free on `/`; production services remained
  healthy and no production configuration, migration or data was changed.

## Final-candidate staging refresh — 2026-08-20

The controller confirmed final candidate
`5a29890aa02f686e18fcfaa419981aa39be5adb4` and reported its Project checks, API DB integration
and Web smoke GitHub Actions jobs green. Local `pnpm check`, performance, production Compose
invariants and pinned-Caddy validation passed. The staging repository was clean at that exact
commit before building five immutable images:

| Image | Runtime image ID |
| --- | --- |
| PostgreSQL | `sha256:7b2434c0826b05057aa70c30d20fdf0631a6c71deca64bacbc50752628ea2153` |
| Migrate | `sha256:800a0df2cacf3d906c5bfeea9fe3b1e1b954500dab8a0a97ba7dbb4d1f70da26` |
| API | `sha256:ae2676e8578892b269b526aeb6a38a84e8d277140c10488010a44ef3c11d9fbb` |
| Web | `sha256:469a4b1fe827944300a22cd44e69f4c691af7d9d78b42519cc48bdff05971e66` |
| Proxy | `sha256:4d18b8a4a6c998d03c220dd881dedb30032b12ce0fe000e42408db702bd62439` |

The prior staging Compose, Caddy and environment inputs were preserved under the release-specific
rollback directory before installation. The reviewed Compose and Caddy hashes matched the
candidate, required ownership/modes remained intact, Compose rendered cleanly and the exact proxy
image accepted the Caddyfile. There was no database-file delta from the previous staging release;
the one-shot migration still ran and reported no pending work before the migration ledger grant
was revoked again.

PostgreSQL, API, web and proxy became healthy on the exact tags. Runtime `APP_RELEASE` matched the
candidate. API, web and proxy ran as `10001:10001`, with read-only roots, all capabilities
dropped and no-new-privileges; PostgreSQL retained its one-GiB/256-PID limits and
no-new-privileges. Staging published only `127.0.0.1:3100`.

Focused exact-release checks passed without a browser:

- Privacy, Terms, Cookie/Storage, Support and beta-limitations each returned HTTP 200 with no
  `PUBLICATION_BLOCKED` or placeholder marker.
- The approved controller name and full address rendered, all three public contacts matched, and
  the beta page showed invitation-only mode and the 50-account limit.
- Allowed Host returned 200 and hostile Host 421. An unsigned direct non-health API request
  returned 403 `BFF_REQUIRED`, while direct health and metrics returned 200.
- CSP, Permissions Policy, Referrer Policy, `nosniff` and frame denial were present. A live
  synthetic query probe appeared only as `REDACTED` in proxy logs.

Production was checked immediately before and after this staging-only operation and stayed
healthy on release `ca18717aba553bac51f9c54c24a8c6e67de609d6`, `APP_ENV=private-lan` and
`REGISTRATION_MODE=DISABLED`. This closes SQC-4 only; it is not production-cutover approval.

## Reversible production artifact preparation — 2026-08-20

The production repository fetched the remote history and then switched to a clean detached
checkout of the confirmed candidate. The fetch observed newer `origin/main` commit
`84fd94a2a4afa79e6883e45671d556958dd8ff3d`, but `5a29890...` is its ancestor and the intervening
files are limited to the independent status-page workflow/content and launch documentation. The
newer tip was not substituted for the exact SHA that passed CI and staging.

Without recreating any service, the host built the exact candidate's production images:

| Image | Image ID | Size |
| --- | --- | ---: |
| Migrate | `sha256:670867ffe3c53dcc5ac0de88a0d388055f7489528e5dfc4192071eefaeff5cef` | 424,567,888 bytes |
| API | `sha256:5fb5acdd8ac3c795fdd112f1c5dda6f1309857b0c1b114eda23023ae1a476dab` | 84,652,349 bytes |
| Web | `sha256:0de1e7d011d1c74ace87c7acc3c135e2338ea8e1d8ced4f7ea85a20bfc791254` | 91,619,161 bytes |

API and web retained the hardened direct-Node commands, non-root image user and built-in health
checks. The new host-only `production.env` is `admin-gym:gym-tracker` mode `0640`; its
`APP_RELEASE` and three image tags match the candidate, `REGISTRATION_MODE` remains `DISABLED`,
and its controller/contact values match the approved production values. It contains no provider
or database secret.

Static production Compose rendering and the pinned-Caddy validation passed against the prepared
environment. The database runtime URL, database migration URL, BFF secret and Resend key files
all remain `root:10001` mode `0440`; the BFF file is 64 bytes and the Resend key file is nonempty.
No secret value was printed or copied into the environment file.

The current active Compose and Caddy inputs were copied with matching SHA-256 hashes to
`/srv/gym-tracker/releases/pre-5a29890aa02f686e18fcfaa419981aa39be5adb4-20260820T220800Z/`.
The active Compose/Caddy files themselves were not replaced, no migration ran, no container was
recreated and no production data or edge state changed. Final inspection still found every
production and monitoring service healthy on the old private release. The next action is the
controlled cutover boundary and still requires the pre-cutover pauses plus explicit controller
approval.

## Phase 3 access-log containment requirement — 2026-08-21

The production forged-header correlation exposed a stop condition: the active Caddy access log
retained Cloudflare Access identity/credential headers and the signed BFF client-address headers.
The redaction hotfix must pass exact-SHA CI and production-equivalent isolated validation before
the remaining Phase 3 gates continue.

The cutover procedure now includes three explicit requirements:

1. The fixed Caddy configuration stops new leakage but does not erase existing Docker
   `json-file` records. After redeployment and a sanitized production redaction proof, truncate
   only the exact current proxy container log, confirm it is empty and recheck proxy/monitoring
   health. The configuration backup staging script excludes container logs, and the local
   `ops/logging/scripts` readers do not ship them off-host, so no Restic snapshot or third-party
   request-log destination requires separate containment.
2. Regenerate the release-specific rollback bundle after deployment. Previous application image
   references may be retained for rollback, but every usable rollback copy must carry the fixed
   Caddyfile; an older copy with the defective filter is unsafe because it silently reintroduces
   the leak.
3. Treat the configuration fix as a new exact-SHA release. Rebuild and retag `migrate`, `api` and
   `web` from that SHA and set all three image names plus `APP_RELEASE` to it, even if the image
   contents are byte-identical to the prior build. Any release-identity mismatch remains a hard
   stop.

## Controlled production cutover and containment — 2026-08-21

The controller reported all three CI jobs green for exact release
`2cac1fe0e20f294c951cb8cb8115b83601ae6a5f`. Production was clean at that detached commit before
the cutover. The preflight found all ten services running, all seven healthchecked services
healthy, no failed systemd units, registration disabled, all three admission controls paused,
and a current successful off-machine backup. Compose and Caddy validation passed before any
service was replaced.

Migrate, API and web were rebuilt and tagged for the exact release. Their production image IDs
are `sha256:dc9d9c272a7e2cd65d4337841ec562dbfcece392d5b87d6febea7446e535d23b`,
`sha256:818025d633183537cdde19dedd1ff8214057b015d6f2c8653773e351e00d8f03` and
`sha256:760ac64e2a66ef1c62e8696eb22eb405577299831b45987f40a466b11332aebe`, respectively. The one-shot
migration reported no pending work and the ledger remained exactly nine entries. API, web and
proxy were then recreated sequentially, with a health wait after each. API and web expose the
exact release through `APP_RELEASE`, run with `APP_ENV=production` and
`REGISTRATION_MODE=DISABLED`, and retain the non-root/read-only/capability-drop hardening. The
post-cutover data fingerprint was unchanged.

The fixed Caddy filter was proved with a synthetic request containing sentinel values for every
removed identity, Cloudflare Access and signed BFF header. The resulting access records contained
zero sensitive header fields and zero sentinel values. The old proxy container and its Docker
`json-file` log disappeared during recreation; the exact new proxy log was then truncated and the
proxy remained healthy. Backup staging excludes Docker logs, and the logging utilities only read
them locally, so neither Restic nor a third-party log destination received the retained request
logs.

The usable rollback bundle was regenerated under the hotfix release with the prior application
image references, registration disabled and the fixed Caddyfile. Its Compose rendering and Caddy
validation passed, and earlier defective rollback directories were marked unsafe so they cannot
silently restore the leaking filter.

The first post-cutover backup attempt failed closed before creating a dump because the stricter
exact-image Compose variables were not available to the systemd service. A persistent service
drop-in now loads the protected production environment file; the installed and backup-staged
copies match, and `systemd-analyze verify` passes. The retry completed as encrypted off-machine
snapshot `8b2ae9db`; the full Restic repository check found no errors. Backup metrics record success
at timestamp `1787313457`, after the retry began. The final audit again found ten of ten services
running, seven of seven healthchecked services healthy, six of six Prometheus targets up, no
failed systemd units, exact release identity, registration disabled, and waitlist, invitations and
campaigns all paused. The database settings remain account cap 50 and daily approval limit 10.

Immediately before administrator bootstrap, production contained exactly one active ordinary
account named `JV` and no administrator. The controller had already captured authenticated 403
responses from three administrator routes while that account still had `role=USER`. The
exact-release operator CLI then promoted exactly that one row without printing its address and
created exactly one matching `ADMIN_BOOTSTRAPPED_BY_OPERATOR` audit event with a null actor and
`operator_cli` method. The controller confirmed the same existing session could enter the
administrator UI, which displayed account cap 50, daily approval limit 10 and all three runtime
controls paused. Sanitized promotion evidence is retained under the release archive.

### Opening-door verification — 2026-08-21

The controller replaced the hostname-wide Cloudflare Access login wall with public access while
retaining Cloudflare proxying, TLS, Tunnel and the normal zone controls. A clean browser session
reached the application without a Cloudflare redirect. Production then moved from
`REGISTRATION_MODE=DISABLED` to `INVITE_ONLY` by recreating API and web sequentially from the same
immutable release; both retained their non-root, read-only, all-capabilities-dropped and
no-new-privileges hardening.

The public boundary was re-proved before issuing an invitation. A same-origin signup without a
token returned `403 INVITATION_REQUIRED` and created no user; the public origin still returned 404
for the Fastify path; an existing-account waitlist submission returned the generic 202 response
without creating a request row; and an unauthenticated administrator request returned
`401 UNAUTHORIZED`. The emergency switch was then rehearsed end to end between
`2026-08-21T16:30:17Z` and `16:31:49Z`: API and web were recreated under `DISABLED`, the same signup
returned `403 REGISTRATION_DISABLED`, and both services were recreated under `INVITE_ONLY`, where
the response returned to `403 INVITATION_REQUIRED`.

Final state was exact release `2cac1fe0e20f294c951cb8cb8115b83601ae6a5f`, 10/10 services
running, 7/7 healthchecked services healthy, 6/6 Prometheus targets up and no synthetic user row.
The production environment and its protected pre-change rollback copy are both mode 0640. A fresh
encrypted off-machine backup completed as snapshot `599aec7e`, and no systemd unit remained failed.

## Work items

Labels follow the ownership model in [goal-structure.md](../goal-structure.md).

| # | Item | Ownership |
|---|---|---|
| 1 | Production cutover: build exact-SHA images, install the committed definition, migrate, recreate services with `REGISTRATION_MODE=DISABLED`, verify release identity and container hardening | Supervised external, then Approval gate |
| 2 | Deployed configuration verification: controller identity, the three contact addresses, `SUPPORT_EMAIL`/reply-to match, and rendered Privacy, Terms, Cookie/Storage, Support and beta-limitations pages, then version-archive them | Supervised external + Human verification |
| 3 | Administrator bootstrap: first real user gets `role=ADMIN` through a controlled procedure with no email inference; decide the disposition of existing owner workout data | Decision needed, then Supervised external |
| 4 | Public reachability of `/beta` while Cloudflare Access gates the application — see the open conflict below | Decision needed, then Supervised external |
| 5 | Root domain and `www` DNS and redirect behavior | Decision recorded below, then Supervised external |
| 6 | Incident response plan: assessment step, FDPIC notification content and route, data-subject notification wording, and a post-incident record | Decision needed + Human verification |
| 7 | Independent status page at `status.gymtrack.ch` with TLS, plus an incident publication rehearsal | Supervised external |
| 8 | Received-header evidence that SPF, DKIM and DMARC align on a real production send from `noreply@send.gymtrack.ch` | Human verification |
| 9 | Remaining rehearsals: signup pause, campaign pause, incident notice, email outage | Supervised external |

Items 3, 4, 5 and 6 were deferred here by the Goal 2 decision record, the Goal 2 external-actions
list and the DPIA. Item 6 in particular is carried from the DPIA, which notes that launching
without it means improvising during the one event where improvisation is most costly.

## Root domain and redirect — decision recorded 2026-08-20

`gymtrack.ch` and `www.gymtrack.ch` do not resolve today; only `app.gymtrack.ch` does. Anyone
typing the bare domain gets nothing, and `app.` is not a memorable entry point.

The controller decided:

- **During the Founding Beta:** `gymtrack.ch` and `www.gymtrack.ch` redirect to the beta signup
  page, so the invitation request path is the easily reachable one.
- **After the beta:** the redirect moves to the general starting point rather than the beta signup
  page.

This is deliberately a two-phase change. Record the post-beta switch as a follow-up so the beta
redirect does not silently become the permanent behavior.

## Open conflict — Access scope versus public `/beta`

These two committed requirements are currently incompatible, and the redirect above depends on
resolving them:

- `launch-gates.md` keeps the Cloudflare private gate until an unauthenticated direct API signup
  cannot bypass invite admission.
- The waitlist at `/beta` must be publicly reachable, or no external applicant can request access.

Cloudflare Access currently protects the whole `app.gymtrack.ch` hostname, so a bare-domain
redirect inherits the gate and delivers an Access login wall instead of the signup form. Goal 2
flagged this as something to reconcile deliberately rather than discover at launch.

The likely shape of the answer is per-path Access scoping — public `/beta` and the legal and
support pages, gated everything else — but that must be decided and then verified from the
server side, because the gate's protection is what currently prevents direct API signup from
bypassing invite admission. Do not narrow Access scope without re-proving that property.

## Exit criteria

Goal 5 is complete when production runs the approved release with verified configuration, every
launch gate in [launch-gates.md](../goal-1/launch-gates.md) that depends on a deployed production
carries current evidence for that same release, and the rollback path has been exercised rather
than assumed. Goal 6 — the first ten-person cohort — starts only after an explicit recorded
go/no-go decision.
