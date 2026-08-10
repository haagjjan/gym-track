# Staging Environment Specification

Decision: [ADR 0015](../../../decisions/0015-staging-environment.md). Goal 2 owns this
specification; Goal 3 executes it. Nothing here has been deployed.

Goal 3's reviewed repository definition now lives under `ops/staging/`. Repository readiness is
not deployment evidence; the checkboxes below remain open until the Mac mini rehearsal is run.

## Placement

Staging runs as a second Compose project on the existing `gym-prod` host, alongside production.

| | Production | Staging |
|---|---|---|
| Compose project | `gym-tracker` | `gym-tracker-staging` |
| Compose file | `/srv/gym-tracker/deploy/compose/compose.yaml` | `/srv/gym-tracker-staging/deploy/compose/compose.yaml` |
| Root | `/srv/gym-tracker` | `/srv/gym-tracker-staging` |
| Hostname | `app.gymtrack.ch` | `staging.gymtrack.ch` |
| Database | `gym_tracker` | `gym_tracker_staging` |
| Data | real user data | synthetic only |

Mirroring the production directory layout keeps the existing runbooks readable against both
environments. Staging gets its own root rather than a subdirectory of the production root so
that no backup, restore or maintenance script can traverse into it by accident.

## Environment contract

The point of staging is to exercise the production configuration contract rather than bypass
it. `apps/api/src/shared/env.ts` treats a deployment as production when `NODE_ENV=production`
and `APP_ENV` is neither `local` nor `private-lan`; `apps/web/src/request-security.ts` applies
the same rule. Setting `APP_ENV=staging` therefore forces staging to satisfy every assertion
production must satisfy — and to refuse to boot otherwise.

| Key | Staging value | Why |
|---|---|---|
| `NODE_ENV` | `production` | Required for the production branch of both validators |
| `APP_ENV` | `staging` | Not `local`/`private-lan`, so assertions are enforced, not skipped |
| `APP_BASE_URL` | `https://staging.gymtrack.ch` | Must be HTTPS or the API refuses to start |
| `APP_ALLOWED_HOSTS` | `staging.gymtrack.ch` | No LAN address, no localhost |
| `APP_ALLOWED_ORIGINS` | `https://staging.gymtrack.ch` | Same |
| `AUTH_COOKIE_SECURE` | `true` | Cannot be `false` in a production deployment |
| `AUTH_COOKIE_NAME` | `gym_staging_session` | Distinct from production for unambiguous debugging |
| `BFF_CLIENT_IP_SECRET` | fresh 32+ char value | Must differ from production |
| `SUPPORT_EMAIL` | the real support address | Required to boot; also proves the item 5 value is valid |
| `REGISTRATION_MODE` | `INVITE_ONLY` | Mirrors production so the admission flow is what gets rehearsed |
| `APP_RELEASE` | deployed commit SHA | Proves the release-identity wiring before production needs it |
| `HSTS_ENABLED` | `false` initially | Enable only once the hostname is stable |
| `METRICS_ENABLED` | `true` | Metrics are produced but not scraped by production Prometheus |
| `RESEND_API_KEY` | **required — see *Email*** | Staging cannot boot without it |
| `EMAIL_FROM` | required | Same |
| `EMAIL_RECIPIENT_ALLOWLIST` | two owner-controlled inboxes | Required in staging; all other recipients fail before Resend |
| `TELEGRAM_BETA_*` | unset | Staging must never reach the operator alert channel |

Host port bindings must not collide with production. The staging project includes its own Caddy
and publishes only that proxy at `127.0.0.1:3100`. Web, API and PostgreSQL have no host
publication. This avoids attaching the production proxy to staging networks or restarting the
production Compose project.

## Isolation requirements

These are the properties that make staging safe to run beside production. Goal 3 should treat
each as a checkable condition, not a guideline.

1. **Separate database instance.** Its own PostgreSQL container, its own named volume, its own
   role and password. Staging must not connect to the production database under any
   configuration.
2. **Synthetic data only.** A production dump is never restored into staging. Staging has
   weaker access control and no erasure-ledger discipline, so a copy of real user data there
   would create a second, uncontrolled location for personal data and would undermine the
   deletion guarantees in ADR 0013.
3. **Excluded from backups.** `/srv/gym-tracker-staging` is outside the Restic set. Including
   it would pollute the recovery repository and consume the 30-day retention budget with data
   that has no recovery value.
4. **Excluded from production alerting.** No staging target is added to the production
   Prometheus scrape config. A staging outage must never page the operator, and staging noise
   must not desensitise the alert channel that protects production.
5. **Memory limits on every container.** Staging cannot be allowed to starve production. The
   initial ceilings are PostgreSQL 1 GiB, migration 512 MiB, API 512 MiB, web 768 MiB and Caddy
   128 MiB. Stop staging if available host memory falls below 6 GiB or production health changes.
6. **Cloudflare Access restricted to the operator.** `staging.gymtrack.ch` is not public. This
   also keeps a half-finished release from being indexed or shared accidentally.
7. **Distinct secrets throughout.** BFF secret, database password and cookie name are all
   generated fresh. No secret is shared with production.

## Email

> **Corrected 2026-08-07.** An earlier version of this spec said to leave `RESEND_API_KEY`
> unset and rely on the log transport. That is no longer possible. Goal 1 made email
> configuration fail closed: `apps/api/src/shared/env.ts:92-105` now requires both
> `EMAIL_FROM` and `RESEND_API_KEY` whenever `isProductionDeployment` is true — which is
> exactly what `APP_ENV=staging` makes it. **Staging will refuse to start without a Resend
> key.** The fail-closed behaviour is correct; it simply means Resend now comes before staging.

**A Resend account now exists** (created 2026-08-07), but Goal 3 still needs a sending-only
staging API key stored outside the repository. The chosen execution path brings verification of
`send.gymtrack.ch` forward so the administrator and invited-user flow can use two distinct,
owner-controlled inboxes. Staging sends as
`Gym Progress Tracker Staging <staging@send.gymtrack.ch>`.

Domain verification removes Resend's one-recipient sandbox protection, so the application adds
an equivalent stronger boundary: `APP_ENV=staging` refuses to boot without
`EMAIL_RECIPIENT_ALLOWLIST`, and the mailer rejects every unlisted recipient before the provider
call. The live allowlist is a secret file containing exactly the staging administrator and
invited-user test inboxes. It is never committed or printed.

The launch gate's black-box invitation, verification, reset, deletion and cancellation email
tests should run against the production sender before launch, since that is the identity real
testers will receive from.

Whatever is chosen, staging must never send to a real tester's address.

## Caddy and tunnel

The staging Compose project runs a dedicated Caddy on loopback port 3100. Add a Cloudflare Tunnel
hostname for `staging.gymtrack.ch` with origin `http://127.0.0.1:3100` and an Access policy that
allows only the operator identity. Do not add a public API hostname or change the production
Compose/Caddy configuration in Goal 3.

The staging Caddy strips all inbound `x-gym-client-*` headers. Verify through the public origin
that Cloudflare replaces browser-supplied client-IP headers and that rotating forged values
cannot evade rate limiting. Equivalent production-origin evidence remains a later production
gate; staging success must not be recorded as proof that the live production edge is hardened.

## Admin bootstrap rehearsal

Item 8 chose a dedicated `ADMIN` account separate from the operator's personal training
account. Under `REGISTRATION_MODE=INVITE_ONLY` that account cannot simply be registered, and
`apps/api/scripts/promote-admin.mjs` requires the account to already exist and to be the only
non-admin match. The bootstrap is therefore a three-step operator procedure, and staging is
where it gets rehearsed and timed before production:

1. Set `REGISTRATION_MODE=ENABLED` and restart the API.
2. Register the admin account through the normal signup form.
3. Restore `REGISTRATION_MODE=INVITE_ONLY`, restart, and confirm signup is closed again.
4. Run `pnpm --dir apps/api admin:promote -- <admin address>`.
5. Confirm exactly one `ADMIN` row and one `ADMIN_BOOTSTRAPPED_BY_OPERATOR` audit event.

Write the result up as a runbook during the staging rehearsal; production then follows it
rather than improvising.

## What Goal 3 must demonstrate

Staging is complete when all of the following hold:

- [ ] The stack boots with `APP_ENV=staging` and serves `https://staging.gymtrack.ch`.
- [ ] Removing any one of `APP_BASE_URL`, `AUTH_COOKIE_SECURE`, `BFF_CLIENT_IP_SECRET`,
      `SUPPORT_EMAIL`, `RESEND_API_KEY` or `EMAIL_RECIPIENT_ALLOWLIST` makes the API refuse to
      start. That refusal is the control working.
- [ ] `Set-Cookie` on login carries `Secure`, `HttpOnly` and `SameSite=Lax`.
- [ ] A direct request from inside the staging network to the unpublished API, other than health
      or metrics, returns `BFF_REQUIRED`. No public API hostname exists.
- [ ] A browser-supplied `cf-connecting-ip` does not influence rate-limit attribution.
- [ ] `/privacy`, `/terms`, `/cookies` and `/support` render real controller values with no
      `PUBLICATION_BLOCKED` banner. This is the check that catches the static-prerender defect.
- [ ] The full admission flow works end to end: waitlist request, admin approval, invitation
      email link, signup, automatic verification, first workout.
- [ ] All nine migrations apply fresh; migrations 8–9 preserve a representative migration-7
      synthetic dataset; destructive down/up behavior is recorded only on a disposable copy;
      and verified dump restoration plus candidate reapplication succeeds.
- [ ] The admin bootstrap procedure above completes and is written up.
- [ ] Production is provably unaffected: its containers stayed healthy and its memory headroom
      remained adequate throughout.

## Cost

No incremental hardware, hosting or licence cost. The additions are one Cloudflare hostname,
one Access policy, and disk on an SSD with 416 GB free. The real cost is operator attention:
every release now has an extra step before production.
