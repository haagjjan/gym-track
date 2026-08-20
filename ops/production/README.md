# Public-Beta Production Operations

This directory owns the reviewed, non-secret production definition for `app.gymtrack.ch`.
It replaces the unreviewable host-only Compose/Caddy copy at the next controlled deployment; it
does not change the running service merely by being committed. Live environment values, provider
keys, database credentials, host data and Cloudflare credentials remain under
`/srv/gym-tracker`, outside Git.

The topology follows ADRs 0009 and 0011: Cloudflare Tunnel reaches the existing LAN-only Caddy
listener; Caddy routes only to Next.js; Fastify, PostgreSQL and monitoring stay unpublished.
The web/API service path is internal, and the API alone joins a general-egress network for
Resend. The Compose project retains the existing production database and monitoring bind mounts.

## Commit and CI gate

Do not install this definition from a dirty worktree or a branch name. After the controller
commits the final Goal 4 batch:

1. Require the exact 40-character commit SHA to pass CI.
2. Deploy that same SHA to staging and verify Privacy, Terms, Cookie/Storage, Support and beta
   limitations with the approved runtime values.
3. Fetch the exact commit into `/srv/gym-tracker/repo` without local changes.
4. Copy `production.env.example` to the host-only
   `/srv/gym-tracker/deploy/env/production.env`, replace every `REQUIRED_FULL_GIT_SHA` with the
   same SHA, and keep `REGISTRATION_MODE=DISABLED` through initial production verification.

Every application image name and `APP_RELEASE` must resolve to that same SHA. A mismatch stops
the deployment.

## Required protected files

Compose references these existing host-only files:

| File | Runtime reader | Required metadata |
| --- | --- | --- |
| `database-runtime-url-container` | API | existing `root:10001`, `0440` |
| `database-migration-url-container` | migration job | existing `root:10001`, `0440` |
| `bff-client-ip-secret-container` | API and web | `root:10001`, `0440`, 32+ random characters |
| `resend-api-key-container` | API | `root:10001`, `0440`, production sending-only key |
| monitoring/alerting secret files | their current services | unchanged current metadata |

Never print, diff, copy into an environment file, or commit a secret value. Production must not
set `EMAIL_RECIPIENT_ALLOWLIST`; that staging-only containment would prevent real beta mail.
`TELEGRAM_BETA_*` stays explicitly empty so Telegram receives infrastructure alerts only.

## Email delivery owner

Jan Haag is the production owner for Resend bounces, complaints and suppressions. For the first
cohort, inspect the Resend dashboard before and after every invitation batch and at least daily
during the 72-hour observation window. Pause invitation issuance immediately on an unexplained
bounce, complaint, suppression or quota warning; resolve the address/provider cause before using
the audited reissue action. Do not copy recipient addresses or message contents into committed
incident evidence.

The production black-box must retain received-header evidence that SPF, DKIM and DMARC align for
`noreply@send.gymtrack.ch`. The root DMARC record has no aggregate-reporting address, so the
manual Resend review is the selected initial monitoring path; revisit automated DMARC reporting
before increasing scope beyond the founding cohort.

## Static validation

With the host-only environment prepared:

```bash
production_compose=/srv/gym-tracker/repo/ops/production/compose.yaml
production_env=/srv/gym-tracker/deploy/env/production.env

docker compose --env-file "$production_env" -p gym-tracker \
  -f "$production_compose" config --quiet

docker run --rm \
  -v /srv/gym-tracker/repo/ops/production/Caddyfile:/etc/caddy/Caddyfile:ro \
  docker.io/library/caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648 \
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

Also require that all three application images exist locally, have the final SHA tag and use
the hardened direct-Node API/web targets. Validation does not authorize deployment.

## Pre-cutover stop conditions

Before changing the active Compose/Caddy copy:

- production and monitoring are healthy;
- the latest off-machine backup is inside the 24-hour RPO;
- an immediate fresh backup completes and its snapshot is visible;
- the exact candidate CI and focused staging checks are green;
- the current Compose/Caddy files and previous image tags are copied into a release-specific
  rollback directory;
- registration, waitlist intake, invitation issuance and campaigns are paused;
- the installed database restore and erasure-ledger replay procedures still validate; and
- the controller explicitly approves the cutover.

Stop on any unexplained write, failed backup, failed migration, unhealthy dependency, secret
permission error, wrong release identity or loss of monitoring.

## Controlled deployment order

The cutover remains a joint production action, not a pre-commit setup step:

1. Build the `migrate`, `api` and `web` Docker targets from the exact clean SHA and tag them with
   that full SHA.
2. Install the committed Caddyfile and Compose file to their active paths with the existing
   protected ownership, retaining release-specific previous copies.
3. Keep `REGISTRATION_MODE=DISABLED`; start/confirm PostgreSQL, run the one-shot migration job,
   and require a successful migration ledger check.
4. Recreate API and web, then Caddy. Do not use `down --volumes`.
5. Verify release identity, health, container user/read-only/capability state, internal network
   isolation, monitoring and the production data fingerprint.
6. Run the narrow production black-box: public legal/support rendering, hostile Host/Origin,
   unsigned/direct API rejection, forged forwarding headers, secure cookie/HSTS headers, and the
   controlled transactional email flows.
7. Only after those checks pass, change both API and web to `REGISTRATION_MODE=INVITE_ONLY` and
   confirm open signup remains impossible without an issued invitation.

The selected external tester performs the broader real-user product confirmation. Goal 4 does
not repeat the already green capacity and full staging suite unless application or database
behavior changes.

## Rollback

On a stop-rule failure, reapply the release-specific previous Compose/Caddy files and immutable
previous image tags. If the migration changed live data incompatibly, keep writes closed and
restore the verified pre-migration backup plus newest erasure ledger before reopening. Never run
the destructive public-beta down migration on production.
