# Goal 3 Staging Operations

This directory owns the reviewed, non-secret deployment definition for the owner-only staging
environment. Staging is a second Compose project on `gym-prod`; it does not reuse production
containers, networks, volumes, credentials, monitoring or backups.

## Fixed topology

| Property | Value |
| --- | --- |
| Server root | `/srv/gym-tracker-staging` |
| Compose project | `gym-tracker-staging` |
| Public hostname | `staging.gymtrack.ch` |
| Only host publication | `127.0.0.1:3100` → staging Caddy |
| Database | `gym_tracker_staging`, synthetic data only |
| Cloudflare origin | `http://127.0.0.1:3100` |
| Registration default | `INVITE_ONLY` |

The API, web and PostgreSQL services have no host ports. The API is the only service with
outbound network access, which it needs for Resend. Staging is deliberately absent from the
production Prometheus configuration and `/srv/gym-tracker-staging` is outside the production
Restic source set.

## Responsibilities

The operator performs Cloudflare and Resend console changes, MFA, and secret entry. The SSH
operator may install, deploy and verify the reviewed files after those actions are complete.
Never paste a provider key, password, controlled recipient address or controller postal address
into chat, Git, a deployment report or a command that prints it.

Before server work:

1. Verify `send.gymtrack.ch` in Resend using only the subdomain records Resend supplies. Leave
   the root Infomaniak MX/SPF records unchanged and keep mail-related records DNS-only.
2. Create a sending-only Resend key named for staging.
3. Choose exactly two owner-controlled inboxes: the staging administrator and the invited-user
   test account. Neither may belong to a beta tester.
4. Add `staging.gymtrack.ch` to the existing tunnel with origin
   `http://127.0.0.1:3100`, then protect it with an exact-owner Cloudflare Access application.
   Do not create a staging API hostname or wildcard route.

## Hard preflight

Authenticate the `gym-prod-remote` Cloudflare Access session first. The initial pass is
read-only:

```bash
ssh gym-prod-remote
/srv/gym-tracker/scripts/status.sh
sudo /srv/gym-tracker/scripts/backup-status.sh
git -C /srv/gym-tracker/repo status --short --branch
git -C /srv/gym-tracker/repo rev-parse HEAD
docker compose -p gym-tracker -f /srv/gym-tracker/deploy/compose/compose.yaml ps
ss -ltn '( sport = :3100 )'
free -b
df -B1 /
systemctl is-active cloudflared
```

Stop if any production service is unhealthy, the latest successful off-machine backup exceeds
the 24-hour RPO, port 3100 is occupied, available memory is below 6 GiB, root free space is below
50 GiB, `cloudflared` is inactive, or the release commit has not passed CI. Do not repair an
unrelated production problem within Goal 3.

Record the production status and row-count evidence before and after staging. Do not print
environment variables or inspect secret contents.

## Install the reviewed definition

The committed release must be clean and identified by its full 40-character SHA. Clone or fetch
that exact commit into `/srv/gym-tracker-staging/repo`; do not deploy a working-tree archive.

Create this root-owned layout:

```text
/srv/gym-tracker-staging/
├── deploy/
│   ├── compose/compose.yaml
│   ├── config/caddy/Caddyfile
│   ├── env/staging.env
│   └── postgres/init-roles.sh
├── backups/
├── releases/
├── repo/
├── secrets/
└── state/
```

Install the Compose definition as `root:gym-tracker` mode `0640`, the initialization script as
`root:gym-tracker` mode `0750`, and the Caddyfile as `root:10001` mode `0440`. Keep
`deploy/env/staging.env` owned by `admin-gym:gym-tracker` at `0640`, and keep `secrets/` owned
by `admin-gym:gym-tracker` at `0700` with each secret file at `0600`. Numeric group `10001`
lets the non-root Caddy container read only its non-secret configuration.

Copy `staging.env.example` to the server environment file and replace every `REQUIRED` marker.
The three image variables must contain the same full `APP_RELEASE` SHA used as their immutable
tag. `REGISTRATION_MODE` starts as `INVITE_ONLY`.

Create these one-line secret files directly on the server:

| File | Requirement |
| --- | --- |
| `postgres-owner-password` | Unique 64-character hexadecimal value |
| `postgres-app-password` | Different unique 64-character hexadecimal value |
| `bff-client-ip-secret` | Different from production, at least 32 random characters |
| `resend-api-key` | Staging sending-only key |
| `email-recipient-allowlist` | Two comma-separated owner-controlled addresses |

Generate the three random local secrets with a password manager or `openssl rand -hex 32`.
Enter the Resend key and recipient list interactively without placing them in shell history.

## Build and validate the exact release

From the clean staging checkout, set `release_sha` to the full reviewed commit and build all
three application targets:

```bash
cd /srv/gym-tracker-staging/repo
release_sha="$(git rev-parse HEAD)"
test "$(git status --porcelain)" = ""
docker build --target migrate -t "gym-tracker-staging-migrate:${release_sha}" .
docker build --target api -t "gym-tracker-staging-api:${release_sha}" .
docker build --target web -t "gym-tracker-staging-web:${release_sha}" .
```

Check that `APP_RELEASE` and all image references in `staging.env` equal `release_sha`, then:

```bash
staging_compose=/srv/gym-tracker-staging/deploy/compose/compose.yaml
staging_env=/srv/gym-tracker-staging/deploy/env/staging.env
docker compose --env-file "$staging_env" -p gym-tracker-staging -f "$staging_compose" config --quiet
docker run --rm \
  -v /srv/gym-tracker-staging/deploy/config/caddy/Caddyfile:/etc/caddy/Caddyfile:ro \
  docker.io/library/caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648 \
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

## First deployment

Start only PostgreSQL, run the one-shot migration profile explicitly, revoke application access
to the migration ledger, and then start the long-running services:

```bash
docker compose --env-file "$staging_env" -p gym-tracker-staging -f "$staging_compose" up -d postgres
docker compose --env-file "$staging_env" -p gym-tracker-staging -f "$staging_compose" \
  --profile operations run --rm migrate
docker compose --env-file "$staging_env" -p gym-tracker-staging -f "$staging_compose" \
  exec -T postgres psql -X -v ON_ERROR_STOP=1 \
  -U gym_tracker_staging_owner -d gym_tracker_staging \
  -c 'REVOKE ALL ON TABLE schema_migrations FROM gym_tracker_staging_app;'
docker compose --env-file "$staging_env" -p gym-tracker-staging -f "$staging_compose" \
  up -d api web proxy
docker compose --env-file "$staging_env" -p gym-tracker-staging -f "$staging_compose" ps
```

Re-run the production status, memory and row-count checks immediately. If production changes
state or memory falls below the preflight floor, stop staging only:

```bash
docker compose --env-file "$staging_env" -p gym-tracker-staging -f "$staging_compose" stop
```

Never use `down --volumes` as an incident response command.

## Required verification

### Network and fail-closed checks

- Confirm only `127.0.0.1:3100` is published for the staging project.
- From inside the API container, request a non-health endpoint without signed BFF headers and
  require `403 BFF_REQUIRED`. Health and metrics are the only exceptions.
- Temporarily remove each required value in an isolated `docker compose run` and require startup
  failure: `APP_BASE_URL`, `AUTH_COOKIE_SECURE`, `BFF_CLIENT_IP_SECRET`, `SUPPORT_EMAIL`,
  `RESEND_API_KEY` and `EMAIL_RECIPIENT_ALLOWLIST`.
- Attempt mail to a third controlled-but-unlisted address and require the application to reject
  it without a Resend delivery record.
- Through the public hostname, test untrusted Host/Origin, cross-site state change, secure cookie
  attributes, security headers, and rotating forged `cf-connecting-ip`, `x-forwarded-for`,
  `x-real-ip` and `x-gym-client-*` values. Rotating forged headers must not evade the endpoint
  rate limit.
- Confirm an unauthorized Cloudflare identity cannot reach the origin.

### Legal and product checks

- `/privacy`, `/terms`, `/cookies` and `/support` must show the approved controller values with
  no `PUBLICATION_BLOCKED` warning.
- Set `REGISTRATION_MODE=ENABLED`, recreate API/web, register and verify the staging administrator,
  restore `INVITE_ONLY`, recreate API/web and confirm open signup is closed.
- Run the admin promotion CLI against the staging database, then verify exactly one `ADMIN` user
  and one `ADMIN_BOOTSTRAPPED_BY_OPERATOR` audit event.
- With the second allowlisted inbox, complete waitlist → approval → invitation delivery → signup
  → automatic verification → first workout. Exercise token reuse, cap contention, the three
  runtime switches and `REGISTRATION_MODE=DISABLED`.

Do not record addresses, tokens, message bodies or workout contents in the evidence report.

## Migration and rollback rehearsal

Use disposable staging databases or volumes for destructive migration checks. The authoritative
staging dataset is never the target of `down`.

1. Prove all nine migrations apply from an empty database.
2. Create a disposable database at migration 7, insert representative synthetic users, workouts,
   sets, templates and exercises, record row counts/checksums, apply migrations 8–9, and compare.
3. Run down/up only on another disposable copy. Record that the public-beta down migration drops
   its tables and columns; this is expected destructive behavior, not a data-preservation pass.
4. Before a candidate migration, create a custom-format logical dump under
   `/srv/gym-tracker-staging/backups/`, hash it, and record the candidate SHA.
5. Restore the dump into a fresh isolated volume/database, run the previous application images,
   and perform the core smoke test. Reapply the candidate to a fresh restored copy and repeat.

The production rollback rule derived from this rehearsal is: stop writes, restore the verified
pre-migration backup with the previous immutable images, and verify before reopening. Never run
the destructive beta `down` migration on production.

## Evidence and completion

Write sanitized results to
`docs/beta-process/public-beta/goal-3/goal-3-staging-report.md`. Include timestamps, exact release
SHA, image IDs, pass/fail outcomes, migration ledger names, dump hashes, resource measurements and
production health comparisons. Exclude secrets, account addresses, Cloudflare/Resend identifiers,
internal tokens and raw personal data.

Goal 3 remains open if any acceptance item fails or lacks evidence. The FBX redistribution issue,
production edge changes and public-production delivery remain separate launch gates.
