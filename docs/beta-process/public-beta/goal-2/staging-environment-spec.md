# Staging Environment Specification

Decision: [ADR 0015](../../../decisions/0015-staging-environment.md). Goal 2 owns this
specification; Goal 3 executes it. Nothing here has been deployed.

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
| `TELEGRAM_BETA_*` | unset | Staging must never reach the operator alert channel |

Host port bindings must not collide with production. Bind staging to loopback only, on a
distinct range — for example `127.0.0.1:3100` for web and `127.0.0.1:4100` for the API — with
Caddy as the only path in.

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
5. **Memory limits on every container.** Staging cannot be allowed to starve production.
   Suggested starting ceilings against 30 GiB total: PostgreSQL 1 GiB, API 512 MiB, web
   768 MiB. Tune from observed usage, and set them before first use rather than after an
   incident.
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

**A Resend account does not yet exist** (confirmed 2026-08-07), so this is a prerequisite for
Goal 3, not a detail within it.

The cheapest path that satisfies the boot contract without waiting on domain verification:

1. Create a Resend account. The free tier is ample for a 50-account beta.
2. Take an API key and use Resend's own `onboarding@resend.dev` sender for staging —
   `EMAIL_FROM="Gym Progress Tracker <onboarding@resend.dev>"`, which is already the schema
   default. No DNS work, and it can only deliver to the account's own registered address, which
   makes it structurally impossible for staging to email a real tester.
3. Verify `send.gymtrack.ch` separately for **production only**, per external action B2.

That split gives staging a working boot and real delivery to yourself, while keeping the
verified production sender identity clean and its reputation unexposed to staging mistakes.

The launch gate's black-box invitation, verification, reset, deletion and cancellation email
tests should run against the production sender before launch, since that is the identity real
testers will receive from.

Whatever is chosen, staging must never send to a real tester's address.

## Caddy and tunnel

Add a site block for `staging.gymtrack.ch` to `/srv/gym-tracker/deploy/config/caddy/Caddyfile`
proxying to the staging web port, and a corresponding Cloudflare Tunnel hostname with an Access
policy allowing only the operator identity.

While editing the Caddy configuration, resolve the audit's open question in the same pass: the
edge must unconditionally overwrite `cf-connecting-ip`, `x-forwarded-for`, `x-real-ip` and any
`x-gym-client-*` header arriving from a browser, on **both** hostnames. Staging is the correct
place to prove that a forged `cf-connecting-ip` does not reach attribution, before the same
change is trusted in production.

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
- [ ] Removing any one of `APP_BASE_URL`, `AUTH_COOKIE_SECURE`, `BFF_CLIENT_IP_SECRET` or
      `SUPPORT_EMAIL` makes the API refuse to start. That refusal is the control working.
- [ ] `Set-Cookie` on login carries `Secure`, `HttpOnly` and `SameSite=Lax`.
- [ ] A direct request to the staging API hostname, other than health or metrics, returns
      `BFF_REQUIRED`.
- [ ] A browser-supplied `cf-connecting-ip` does not influence rate-limit attribution.
- [ ] `/privacy`, `/terms`, `/cookies` and `/support` render real controller values with no
      `PUBLICATION_BLOCKED` banner. This is the check that catches the static-prerender defect.
- [ ] The full admission flow works end to end: waitlist request, admin approval, invitation
      email link, signup, automatic verification, first workout.
- [ ] All nine migrations apply fresh, then down, then up again, with no data loss on the
      representative synthetic dataset.
- [ ] The admin bootstrap procedure above completes and is written up.
- [ ] Production is provably unaffected: its containers stayed healthy and its memory headroom
      remained adequate throughout.

## Cost

No incremental hardware, hosting or licence cost. The additions are one Cloudflare hostname,
one Access policy, and disk on an SSD with 416 GB free. The real cost is operator attention:
every release now has an extra step before production.
