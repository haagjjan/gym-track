# Stage 7 Gym Tracker Deployment Report

- **Target:** `gym-prod`
- **Execution date:** 2026-07-21
- **Execution boundary:** Stage 7 only
- **Compose project:** `gym-tracker`
- **Source snapshot:** `c168dd9f31dc953724d4b62a47f16c22f77be01a`
- **Final application state:** healthy after restart and host reboot
- **Exposure boundary:** localhost only

## Executive summary

Stage 7 deployed the Gym Tracker Fastify API and Next.js web application from the clean, recorded Stage 5 snapshot. Commit-tagged migration, API, and web images were built successfully. Five reviewed `node-pg-migrate` SQL migrations were applied explicitly by a one-shot service, and a post-migration logical backup was created.

PostgreSQL, Fastify, and Next.js are all healthy after an ordinary application restart and a controlled host reboot. The API and web processes run as UID/GID `10001`, with read-only root filesystems, all Linux capabilities dropped, and `no-new-privileges` enabled. The API receives only the restricted runtime database secret; migration credentials are absent from the long-running container.

The web service is published only at `127.0.0.1:3000`, and the API only at `127.0.0.1:4000`. PostgreSQL has no host publication. Attempts from the MacBook to reach both application ports on both server LAN addresses failed. UFW remains unchanged with only the two scoped SSH rules.

A disposable same-origin smoke flow passed signup, session lookup, a protected BFF-backed lookup, authenticated page rendering, logout, and rejection after logout. The generated account, session, auth-action token, events, password, and cookie jar were removed. The live database contains zero users.

One host-level issue was discovered during reboot verification: `grub2-common.service` failed to clear GRUB's `recordfail=1` value because `grub-editenv` could not resolve the NVMe host-disk mapping. The system booted successfully on the T2 kernel and both SSH paths work. No GRUB file or unit was changed because bootloader repair is outside Stage 7. This must be reviewed before Stage 8 or another planned reboot.

No reverse proxy, LAN application access, monitoring service, real email integration, public DNS, or TLS configuration was started.

## Deployed branch and commit

```text
Branch  codex/gym-prod-snapshot-20260721-1
Commit  c168dd9f31dc953724d4b62a47f16c22f77be01a
Tag     gym-prod-snapshot-20260721-1
Origin  repository-scoped read-only deploy-key alias
```

The server checkout remained clean before the build, after deployment, and after reboot. No pull, reset, source edit, package installation, or Git push occurred in Stage 7.

The MacBook's existing main dev working tree and real Git index were not changed. This report is the only Stage 7 repository artifact.

## Repository build findings

Observed requirements:

- pnpm workspace using `pnpm@10.11.0`;
- Node.js `>=22.0.0`;
- TypeScript Fastify API build using `tsc`;
- Next.js production build using `next build`;
- five plain-SQL migrations managed by `node-pg-migrate` `8.0.4`;
- PostgreSQL 17;
- Fastify container port `4000` and health route `/api/v1/health`;
- Next.js container port `3000`;
- same-origin browser calls through Next.js route handlers;
- server-side BFF target configurable through `API_BASE_URL` or `API_INTERNAL_HOSTPORT`;
- native Argon2 dependency built inside the Debian Node image.

The root Dockerfile:

- uses `node:22-bookworm-slim`;
- has separate `migrate`, `api`, and `web` targets;
- installs with the frozen pnpm lockfile;
- builds API and web in separate stages;
- does not copy ignored `.env`, Git, local dependency, or build-output paths;
- does not set a final runtime `USER`;
- retains the complete workspace dependency tree rather than a pruned production runtime.

The final two findings were handled without changing source: Compose forces UID/GID `10001` and read-only root filesystems. Runtime image-size optimization is deferred because it requires a reviewed Dockerfile change.

The resolved Node base image digest during the build was:

```text
sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3
```

The build completed the API TypeScript compilation and generated all 38 Next.js static pages. The resulting runtime reports Node.js `v22.23.1` and Next.js `15.5.19`.

## Environment-variable inventory

The permanent inventory is:

```text
/srv/gym-tracker/deploy/env/required-variables.md
```

Main decisions:

| Class | Stage 7 configuration |
| --- | --- |
| Build-time public | No public API URL; client diagnostics disabled |
| API runtime non-secret | Production mode, port/host, release, logging, cookie, session, and trust-proxy settings |
| API runtime secret | Restricted runtime database connection only |
| Migration-only secret | Separate migration database connection only |
| Web runtime non-secret | Production mode, port/host, internal BFF target, diagnostics disabled |
| Optional integration | Resend API key absent; metrics disabled |

Important temporary Stage 7 settings:

- `AUTH_COOKIE_SECURE=false` because access is HTTP on server loopback only;
- `API_TRUST_PROXY=false` because no proxy exists yet;
- `LOG_LEVEL=warn` because the repository's no-provider mail transport includes action links in info-level messages;
- `APP_BASE_URL` uses the loopback web origin;
- `API_BASE_URL` uses the internal `api` service name;
- no `NEXT_PUBLIC_API_BASE_URL` is supplied, preserving the BFF boundary.

Stage 8 must not expose registration beyond localhost until real email delivery is configured or a separate reviewed behavior is implemented. TLS and secure cookies must be treated as one change.

## Secret files created

No new secret value was generated. Stage 7 reused the separated database connection files created in Stage 6.

Standalone Docker Compose implements local file secrets as bind mounts and does not remap the mode-`0600` operator files for a numeric non-root process. Two process-readable copies were therefore created:

```text
/srv/gym-tracker/secrets/database-runtime-url-container
/srv/gym-tracker/secrets/database-migration-url-container
```

Both copies:

- contain the same value as their corresponding Stage 6 operator file;
- are owned by numeric UID/GID `0:10001`;
- use mode `0440`;
- are mounted read-only;
- are outside Git;
- were never printed.

The API mounts only the runtime copy. The one-shot migration service mounts only the migration copy. Docker inspection confirmed `DATABASE_URL` is absent from the persisted container configuration; the API entry command reads the mounted value into the Node process environment at startup.

Rendered Compose output, application logs, and this report were checked against the exact live database secrets. No value was found.

## Dockerfiles and image tags

| Purpose | Image reference | Image ID | Size |
| --- | --- | --- | ---: |
| Migration | `gym-tracker-migrate:c168dd9f31dc` | `sha256:45caa72087f13c44e30c9570ebac4711e12e257589943a044606da4dcab3d741` | 420 MB |
| API | `gym-tracker-api:c168dd9f31dc` | `sha256:3623d849c0453564c061c48b8c3c9d9cfbdd17214c2fbb65068d2e98ea00fccd` | 486 MB |
| Web | `gym-tracker-web:c168dd9f31dc` | `sha256:3f47211f92ddef519e09bb31c2b79980c881c8803e496dff320cae8f9225719a` | 524 MB |

The commit-derived tags are immutable operational labels for this host. Exact image IDs are recorded in `/srv/gym-tracker/state/deployment.env`.

The checked-in image default user is root. Compose overrides that default for the migration, API, and web services. Disposable probes proved every target can execute as `10001:10001` on a read-only filesystem before the database was migrated.

## Compose service and network design

The active definition is:

```text
/srv/gym-tracker/deploy/compose/compose.yaml
```

Services:

| Service | Networks | Host publication | Restart behavior |
| --- | --- | --- | --- |
| `postgres` | `database` | None | `unless-stopped` |
| `migrate` | `database` | None | `no`; operations profile only |
| `api` | `application`, `database` | `127.0.0.1:4000` | `unless-stopped` |
| `web` | `frontend`, `application` | `127.0.0.1:3000` | `unless-stopped` |

Network state:

| Network | Docker internal | Members after reboot |
| --- | ---: | --- |
| `gym-tracker_frontend` | Yes | web |
| `gym-tracker_application` | No | API and web |
| `gym-tracker_database` | Yes | PostgreSQL and API |

The application bridge is not marked Docker-internal because Docker Engine did not create host port listeners while every service network was internal. It provides container egress and permits the two loopback-only publications. It does not publish a LAN address. The PostgreSQL network remains internal, and PostgreSQL has no host binding.

API and web security settings:

- user `10001:10001`;
- read-only root filesystem;
- ephemeral `/tmp`;
- ephemeral writable Next.js cache only for web;
- all capabilities dropped;
- `no-new-privileges:true`;
- Docker init enabled;
- explicit health checks;
- graceful stop periods.

The web working directory is `/app/apps/web`. Local workspace binaries are executed directly, avoiding Corepack downloads at runtime.

## Migration review and result

All five up-migrations were read before execution. On the empty database they create the core schema, seed twelve muscle groups, add auth hardening and first-party events, add multi-muscle exercise assignments and workout templates, and add canonical exercise classifications and user volume preferences.

No extension, object drop, table truncation, real-data import, `db push`, Prisma command, or down-migration was used.

Immediately before migration:

```text
Public tables          0
Migration ledger       absent
Expected roles         3
Pre-migration backup   gym_tracker-pre-migrations-20260721T153452Z.dump
Backup SHA-256         41e9fab51f84f782f0e86329e5c36b890a68d5d4b61a3d2ff4c691086d4881ef
```

The first one-shot invocation exited before connecting to PostgreSQL because the numeric process could not read the original mode-`0600` bind-mounted secret. The fallback `pnpm` shim then attempted a registry lookup on the intentionally isolated network. Verification immediately after the failure found zero public tables, no ledger, no PostgreSQL error, an unchanged backup, and no leftover migration container.

The secret mount and direct local binary fixes were proven independently. One controlled retry then applied all five migrations successfully.

Final migration state:

```text
Ledger rows                  5
Owner-owned public tables    14
Seeded muscle groups         12
Ledger hash                  697f00f4d2b01745e406a925d382dcd0
Runtime ledger privilege     none
```

The owner default privileges initially gave the runtime role DML access to `schema_migrations`. As recommended by Stage 6, all runtime privileges on that table were revoked after migration. The ledger remained unchanged across application restart and host reboot. No migration service ran automatically.

The post-migration checkpoint is:

```text
/srv/gym-tracker/backups/postgres/gym_tracker-post-migrations-20260721T153851Z.dump
SHA-256: 41b99dd0e280eb84a12df3897a1800f7f6b65ab5ccb805704a0db77575f5aa37
```

## API health verification

The loopback API health endpoint returned:

```json
{"data":{"status":"ok","api":"ok","database":"ok"}}
```

Verified after initial start, application restart, and host reboot:

- API container healthy;
- Fastify and database both `ok`;
- process UID/GID `10001:10001`;
- read-only root filesystem;
- runtime database connection present in the Node process;
- migration connection absent from the container;
- only the runtime secret mounted;
- structured production JSON logging;
- no secret, session token, password, or auth-action link value in logs;
- no database or API critical log entry.

## Web and BFF verification

Verified after initial start, application restart, and host reboot:

- Next.js `15.5.19` production server healthy;
- `/login` returned `200`;
- a generated `/_next/static/...` asset returned `200` and non-empty content;
- an unauthenticated same-origin `/api/auth/me` call returned `401` from the Fastify path through the BFF;
- the web container resolved the API by Docker service name;
- no browser-facing Fastify base URL was configured;
- process UID/GID `10001:10001`;
- read-only root filesystem with only ephemeral cache writes;
- production server ready in under one second after final restart and reboot.

## Smoke-test results

The final disposable smoke flow used generated, non-personal credentials and a mode-`0600` temporary cookie jar.

```text
Signup through Next.js BFF          201
Authenticated current-user lookup  200
Protected muscle-group lookup      200, 12 items
Authenticated home page            200
Logout                              200
Current-user lookup after logout    401
Disposable account cleanup          passed
```

The first cleanup command used `psql` variable syntax that was not expanded inside `-c`. The functional smoke flow had already passed. Exactly one account matching the unique Stage 7 prefix was resolved and its dependent rows were deleted in a transaction. The corrected full flow was then run again and cleaned itself successfully.

Final residue checks found:

```text
Stage 7 smoke users       0
Stage 7 cookie jars       0
Stage 7 helper scripts    0
Stage 7 test containers   0
Migration containers      0
```

## Published-port audit

Final host listeners:

```text
127.0.0.1:3000  Next.js web
127.0.0.1:4000  Fastify API
```

There is no host listener on `5432`. Docker reports PostgreSQL's declared container port but `docker port` returns no mapping.

MacBook checks failed as required for:

```text
192.168.1.57:3000
192.168.1.57:4000
192.168.86.178:3000
192.168.86.178:4000
```

UFW remains active with only:

- scoped SSH on `enp4s0` from `192.168.1.0/24`;
- scoped SSH on `wlp3s0` from `192.168.86.0/24`.

No UFW rule was added for the database, API, or web service.

## Operational scripts created

The following fixed-path scripts are owned by `admin-gym:gym-tracker` with mode `0750`:

```text
/srv/gym-tracker/scripts/status.sh
/srv/gym-tracker/scripts/logs.sh
/srv/gym-tracker/scripts/start.sh
/srv/gym-tracker/scripts/stop.sh
/srv/gym-tracker/scripts/restart.sh
/srv/gym-tracker/scripts/migrate.sh
```

All use `set -euo pipefail`, the explicit `gym-tracker` project, and the fixed production Compose path. `stop.sh` stops services without deleting containers, images, networks, bind-mounted data, or volumes. `restart.sh` restarts only API and web. `migrate.sh` remains an explicit one-shot operation.

`check-layout.sh` was extended to validate the Stage 7 Compose file, inventory, deployment metadata, operational scripts, rollback file, and both process-readable secret copies. It passes after reboot.

## Restart and reboot verification

Application restart result:

- API and web returned healthy;
- both start timestamps changed;
- PostgreSQL start time did not change;
- the migration ledger hash did not change;
- no migration container appeared;
- loopback health and web checks passed.

Host reboot result:

```text
Kernel                 7.1.3-1-t2-resolute
Docker                 active
containerd             active
SSH                    active
UFW                    active
Ethernet SSH alias     reachable
Wi-Fi SSH alias        reachable
PostgreSQL             healthy
API                    healthy
Web                    healthy
```

Persistence identifiers before and after reboot:

```text
PostgreSQL system identifier  7664993968341856291
gym_tracker database OID      16392
Migration ledger rows         5
Migration ledger hash         697f00f4d2b01745e406a925d382dcd0
Live users                    0
Post-migration backup hash    41b99dd0e280eb84a12df3897a1800f7f6b65ab5ccb805704a0db77575f5aa37
```

All values persisted. Application logs contain no secret or action-token value, and PostgreSQL logs after its post-reboot start contain no `PANIC`, `ERROR`, or `FATAL` entry.

The reboot produced one failed host unit:

```text
grub2-common.service - Record successful boot for GRUB
```

Observed error:

```text
grub-editenv: error: cannot read `/boot/grub/grubenv': Invalid argument.
```

Read-only follow-up found `/boot/grub/grubenv` present as a 1024-byte environment block with `recordfail=1`; `grub-editenv list` warned that it could not resolve `hostdisk//dev/nvme0n1p2`. The boot succeeded, but another reboot could show a GRUB delay or require recovery. No bootloader write, unit reset, package change, or additional reboot was attempted.

## Rollback state

The Stage 6 PostgreSQL-only Compose definition is preserved at:

```text
/srv/gym-tracker/releases/compose-stage6-postgres-only.yaml
```

Application rollback can stop and remove only the stateless API and web containers, restore the preserved Compose definition, and leave PostgreSQL and its bind-mounted data intact. The exact commit images remain present and were not pruned.

Database recovery points:

```text
Pre-application Stage 6 backup
Pre-migration Stage 7 backup
Post-migration Stage 7 backup
```

No down-migration or automatic database restore should be run. If rollback is required before user data exists, restore should still be a separately reviewed operation using the already proven isolated restore procedure.

## Files changed

Permanent Stage 7 server files created:

```text
/srv/gym-tracker/deploy/env/required-variables.md
/srv/gym-tracker/secrets/database-runtime-url-container
/srv/gym-tracker/secrets/database-migration-url-container
/srv/gym-tracker/backups/postgres/gym_tracker-pre-migrations-20260721T153452Z.dump
/srv/gym-tracker/backups/postgres/gym_tracker-post-migrations-20260721T153851Z.dump
/srv/gym-tracker/releases/compose-stage6-postgres-only.yaml
/srv/gym-tracker/scripts/status.sh
/srv/gym-tracker/scripts/logs.sh
/srv/gym-tracker/scripts/start.sh
/srv/gym-tracker/scripts/stop.sh
/srv/gym-tracker/scripts/restart.sh
/srv/gym-tracker/scripts/migrate.sh
```

Permanent server files updated:

```text
/srv/gym-tracker/deploy/compose/compose.yaml
/srv/gym-tracker/scripts/check-layout.sh
/srv/gym-tracker/state/deployment.env
```

PostgreSQL migration objects and seed rows were added to the existing persistent cluster under `/srv/gym-tracker/data/postgres`.

Local repository file created:

```text
docs/server/reports/07-gym-tracker-deployment-report.md
```

No application source file, migration file, Dockerfile, lockfile, or server checkout file changed.

## Deviations and deferred work

1. The Stage 7 draft refers to Prisma. The repository uses `node-pg-migrate`; its actual one-shot migration target was used.
2. The checked-in final images default to root. Compose forces all application and migration processes to UID/GID `10001`; a future reviewed Dockerfile should encode the non-root user directly.
3. File-backed Compose secrets do not remap ownership in standalone mode. Root-owned, GID-`10001`, mode-`0440` process copies were required to retain non-root containers without exposing values through Compose environment configuration.
4. Runtime commands use workspace-local binaries directly. Corepack's global pnpm shim attempted a registry download on the isolated network during the first failed migration invocation.
5. The application bridge is not Docker-internal because Docker did not create loopback port listeners while every attached network was internal. Database isolation is unchanged, and application publications remain loopback-only.
6. The first web start used the wrong working directory after replacing the pnpm wrapper with the direct Next.js binary. The stateless container restarted without finding `.next`; setting `/app/apps/web` as the working directory corrected it.
7. The first disposable-account cleanup used unsupported `psql -c` variable expansion. Exactly one resolved test account was removed, then the corrected flow passed with automatic cleanup.
8. The first post-reboot audit looked for the API environment on PID 1, which is Docker's init process. The corrected check resolved the Node child process and passed. The deployment was healthy throughout.
9. No production email provider is configured. Stage 7 uses `LOG_LEVEL=warn` so fallback auth messages containing action links are suppressed. Registration must not be exposed to users in this state.
10. HTTP loopback testing requires `AUTH_COOKIE_SECURE=false`. Stage 8 must introduce HTTPS and secure cookies together.
11. API metrics and the repository's monitoring overlay remain disabled and deferred.
12. The application images retain build tooling and full workspace dependencies. They are functional but larger than an optimized production runtime.
13. `grub2-common.service` failed after the controlled reboot while clearing `recordfail`. Bootloader repair was not authorized in Stage 7 and remains a host-maintenance item before later exposure work or another planned reboot.

## Exact commands executed

Material command forms are listed below. Secret values, complete database URLs, session tokens, generated passwords, and cookie contents are omitted.

Repository and host preflight:

```bash
git -C /srv/gym-tracker/repo status --short --branch
git -C /srv/gym-tracker/repo rev-parse HEAD
git -C /srv/gym-tracker/repo remote -v
find /srv/gym-tracker/repo -maxdepth 4 \
  \( -iname 'dockerfile*' -o -iname '*compose*.yaml' \
     -o -name package.json -o -name '.env.example' \) -print
rg -n 'process\.env|DATABASE_URL|API_INTERNAL_HOSTPORT|AUTH_COOKIE' \
  /srv/gym-tracker/repo/apps
systemctl --failed --no-legend --plain
ss -H -lnt
sha256sum /srv/gym-tracker/backups/postgres/gym_tracker-pre-app-20260721T145913Z.dump
```

Compose validation and secret inspection:

```bash
docker compose -p gym-tracker -f /srv/gym-tracker/deploy/compose/compose.yaml \
  --profile operations config --quiet
docker compose -p gym-tracker -f /srv/gym-tracker/deploy/compose/compose.yaml \
  --profile operations config --format json
```

The rendered configuration was compared in memory against each exact secret. No rendered output was retained.

Image build and inspection:

```bash
sudo docker compose -p gym-tracker \
  -f /srv/gym-tracker/deploy/compose/compose.yaml \
  --profile operations build --pull api web migrate
sudo docker image inspect \
  gym-tracker-migrate:c168dd9f31dc \
  gym-tracker-api:c168dd9f31dc \
  gym-tracker-web:c168dd9f31dc
sudo docker run --rm --network none --user 10001:10001 \
  --read-only --tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m,mode=1777 \
  <image> node --version
```

Backups and database preflight:

```bash
sudo docker exec gym-tracker-postgres-1 \
  pg_dump -U postgres -d gym_tracker --format=custom \
  > /srv/gym-tracker/backups/postgres/<checkpoint>.dump
sha256sum /srv/gym-tracker/backups/postgres/<checkpoint>.dump
sudo docker exec gym-tracker-postgres-1 \
  psql -U postgres -d gym_tracker -Atc '<read-only state query>'
```

Migration and post-migration privilege control:

```bash
/srv/gym-tracker/scripts/migrate.sh
sudo docker exec gym-tracker-postgres-1 \
  psql -U postgres -d gym_tracker \
  -c 'REVOKE ALL ON TABLE public.schema_migrations FROM gym_tracker_app;'
```

Application startup and verification:

```bash
/srv/gym-tracker/scripts/start.sh
sudo docker compose -p gym-tracker \
  -f /srv/gym-tracker/deploy/compose/compose.yaml ps
sudo docker inspect gym-tracker-api-1 gym-tracker-web-1
sudo docker network inspect \
  gym-tracker_frontend gym-tracker_application gym-tracker_database
sudo docker port gym-tracker-api-1
sudo docker port gym-tracker-web-1
sudo docker port gym-tracker-postgres-1
curl -fsS http://127.0.0.1:4000/api/v1/health
curl -fsS http://127.0.0.1:3000/login
curl -sS http://127.0.0.1:3000/api/auth/me
ss -H -lnt '( sport = :3000 or sport = :4000 or sport = :5432 )'
```

The disposable smoke test used `curl --data-binary @-` so the generated password was not placed directly in the command line. Its cookie jar was created with `mktemp`, and exact test rows were removed in a transaction.

Restart and reboot:

```bash
/srv/gym-tracker/scripts/restart.sh
sudo reboot
systemctl is-active docker containerd ssh ufw
systemctl --failed --no-legend --plain
/srv/gym-tracker/scripts/check-layout.sh
```

GRUB diagnosis was read-only:

```bash
systemctl status grub2-common.service --no-pager --full
systemctl cat grub2-common.service --no-pager
journalctl -b -u grub2-common.service --no-pager
stat /boot/grub/grubenv
file /boot/grub/grubenv
sha256sum /boot/grub/grubenv
grub-editenv /boot/grub/grubenv list
```

No `grub-editenv` write command, GRUB installation command, service reset, or boot-file replacement was run.

Cleanup used exact `unlink` operations for known temporary cookie, smoke, and audit files. Sudo authorization was invalidated after the final privileged check.

## Recommendations for Stage 8

1. Resolve or explicitly accept the `grub2-common.service`/`recordfail` issue through a separately reviewed host-maintenance procedure before another planned reboot.
2. Configure a real production email provider before exposing signup, verification, or password-reset flows. Keep log level at `warn` until action links no longer use the log transport.
3. Decide the private HTTPS origin and set `APP_BASE_URL` to it.
4. Introduce the reverse proxy first, verify TLS, then set `AUTH_COOKIE_SECURE=true` in the same reviewed change.
5. Remove the temporary API host publication once proxy-level operational access no longer needs it. Fastify should remain internal behind the BFF boundary.
6. Replace the temporary web loopback publication with the reviewed proxy connection; do not bind Next.js directly to a LAN address.
7. Keep PostgreSQL on `gym-tracker_database` with no host port.
8. Join the reverse proxy only to the frontend boundary. Do not attach it to the database network.
9. Retain the post-migration backup and create the next checkpoint only after the first approved real-user smoke flow.
10. Consider a later reviewed Dockerfile hardening change for encoded non-root users, production dependency pruning, and disabled Next.js build telemetry. Do not mix that refactor into Stage 8 exposure work.
11. Keep monitoring disabled until its ordered Wave C stage.

Stage 8 was not started.
