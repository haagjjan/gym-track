# Goal 3 Staging Execution Report

**Status:** Complete

**Execution window:** 2026-08-10 through 2026-08-18

**Evidence cutoff:** 2026-08-18T09:31:43+02:00

**Execution owner:** Controller/operator with Codex SSH assistance

## Release and topology

The owner-only environment is live at `staging.gymtrack.ch` as Compose project
`gym-tracker-staging`, separate from production under `/srv/gym-tracker-staging`. It uses its
own PostgreSQL instance and volume, database roles, passwords, BFF secret, cookie, networks and
staging-only Resend key. Only the dedicated Caddy proxy is published, at
`127.0.0.1:3100`; PostgreSQL, API and web have no host publication. Staging contains synthetic
data only and remains outside production backups, Prometheus and alerts.

The deployed release is the clean, full commit
`4a4fccdae263126ceda164a792059514123f957f`. GitHub Actions reported green **Project checks**,
**API DB integration** and **Web smoke** jobs for that exact SHA before deployment.

| Image | Immutable image ID |
| --- | --- |
| `gym-tracker-staging-postgres:4a4fccdae263126ceda164a792059514123f957f` | `sha256:4b1013dba801b4d876bae465bfc4c7403643cf4f1899c65f18b3d83dff672908` |
| `gym-tracker-staging-migrate:4a4fccdae263126ceda164a792059514123f957f` | `sha256:6164cfd8ce822e4db8313caf9456d4e40809b9b222749ab207d9c6e0465ab136` |
| `gym-tracker-staging-api:4a4fccdae263126ceda164a792059514123f957f` | `sha256:b7264af791cf89b1d8cbee4ef66a52c6c0be5544ab90d1e7df7e6be2d32e17bc` |
| `gym-tracker-staging-web:4a4fccdae263126ceda164a792059514123f957f` | `sha256:d0ac45f02f0e8073d87cb090bb10b82a8589be8482a0e48adfe68ddb38d2d8a8` |
| `gym-tracker-staging-proxy:4a4fccdae263126ceda164a792059514123f957f` | `sha256:c86a329ea878122360879ad036803a1c2f7192611b3d7a2d003cff76c17a89e5` |

## Provider and operational evidence

- `send.gymtrack.ch` is verified in Resend for sending. Its staging-only sending key is stored
  outside Git, receiving is disabled and a real invitation was accepted by a controlled inbox.
- The runtime recipient allowlist contains exactly two controlled inboxes. An unlisted
  controlled address was rejected before Resend: the administrator saw the recoverable delivery
  failure, the inbox received nothing and Resend recorded no request. The unused invitation was
  then blocked through the audited UI.
- `staging.gymtrack.ch` reaches loopback Caddy through the existing Cloudflare Tunnel. Cloudflare
  Access issued OTPs only to the two exact allowed identities; an unlisted identity received no
  OTP and could not reach the application.
- Production and staging containers were healthy after the final acceptance run. The operator
  confirmed the latest successful off-machine production backup remained within the 24-hour RPO
  and `cloudflared` was active.
- Final available host memory was `30,324,682,752` bytes and final root-disk availability was
  `415,891,062,784` bytes, above the 6 GiB memory and 50 GiB disk stop thresholds. Production
  remained running throughout Goal 3.

## Migration and rollback rehearsal

- All nine migrations applied to an empty staging database.
- A migration-7 fixture covered one synthetic user, custom exercise, template and template
  exercise, workout, session exercise and set. Before migrations 8–9 it contained seven rows
  with checksum `34a3be4ff5305bb5f08a3f505a78ae11`; the row count and checksum were unchanged after
  applying migrations 8–9.
- Down/up ran only on a disposable clone. Reverting migrations 9 and 8 removed the beta table
  and beta user columns as expected. Reapplying them restored the schema but not the disposable
  beta row, recording the migration's expected destructive behavior rather than claiming data
  preservation.
- The pre-public-beta custom-format logical dump has SHA-256
  `f182cbfc7648ba1c84f6ac083dda6b552d752ed26a44b49293be917d8da7defd`. Restoration to a fresh
  database reproduced the migration-7 checksum, and candidate reapplication returned the ledger
  to nine migrations with the representative dataset intact.
- The previous immutable API release `e70ee51c200bfb66abb9df4bde3b8b15bc382d15` started against
  the restored synthetic database and returned HTTP 200 with API and database health `ok`. The
  ephemeral rollback container and disposable databases were removed; production was not used
  as a rollback target.

The rehearsed production rollback is therefore: stop writes, restore the verified pre-migration
dump with the previous immutable images, verify, and only then reopen. The destructive beta
down-migration is not a production rollback mechanism.

## Security and fail-closed evidence

- Compose rendered cleanly, the staging Caddyfile validated, the migration image contained the
  operator promotion CLI, and all long-running services became healthy on the exact release.
- Isolated startup checks rejected missing `APP_BASE_URL`, `AUTH_COOKIE_SECURE`,
  `BFF_CLIENT_IP_SECRET`, `SUPPORT_EMAIL`, `RESEND_API_KEY` and
  `EMAIL_RECIPIENT_ALLOWLIST`. Both empty and explicitly false `AUTH_COOKIE_SECURE` values were
  rejected by the deployed candidate while the live API remained healthy.
- The application session cookie was observed with `Secure`, `HttpOnly` and `SameSite=Lax`.
- An unsigned direct request inside the staging network returned `403 BFF_REQUIRED`; health and
  metrics remained the only direct exceptions and returned HTTP 200.
- The allowed Host returned HTTP 200, a hostile Host returned 421 and a hostile cross-site
  state-changing request returned 403. Security headers included CSP, Permissions Policy,
  Referrer Policy, `nosniff` and `X-Frame-Options: DENY`.
- Through the real public Cloudflare path, forged `cf-connecting-ip` requests were rejected with
  403. Rotating `x-forwarded-for`, `x-real-ip` and forged `x-gym-client-*` values produced nine
  bounded 401 responses followed by three 429 responses; header rotation did not evade the
  credential rate limit.
- `/privacy`, `/terms`, `/cookies` and `/support` returned successfully with the approved runtime
  values and without `PUBLICATION_BLOCKED`.

## Administrator and product evidence

- The administrator bootstrap used the packaged interactive CLI after normal account creation.
  Final evidence contains exactly one `ADMIN` user and exactly one
  `ADMIN_BOOTSTRAPPED_BY_OPERATOR` audit event; no email-derived runtime promotion exists.
- A second controlled identity completed waitlist request, administrator approval, real Resend
  invitation delivery, invited signup, automatic verification and a first synthetic workout
  visible in History.
- Reissuing an unused invitation rotated the token. Reusing the consumed invitation returned
  “This invitation is invalid or expired” and created no account.
- The exact-SHA API DB integration job proved concurrent last-seat contention with one HTTP 200
  and one HTTP 409. Live staging separately set the cap to the two current accounts and rejected
  another approval, then restored the cap to 50.
- Waitlist pause accepted the public request generically but created no row. Invitation pause
  rejected approval and sent no email. Campaign pause rejected publication of a synthetic draft;
  the resulting synthetic campaign checks were ended without becoming eligible. The final
  controls are waitlist open, invitations open, campaigns paused, cap 50 and daily limit 10.
- `REGISTRATION_MODE=DISABLED` removed direct profile creation while existing users continued to
  log in. Waitlist intake remained independently controlled as designed. The environment was
  restored to `INVITE_ONLY` and API/web returned healthy.
- Final sanitized staging state: nine applied migrations; two users, both verified; one admin;
  one joined request; two blocked synthetic requests; no pending or invited requests; and two
  completed synthetic workouts.

## Accepted invitation-link trade-off

The invitation email currently carries the raw single-use token and invited address in the
`/signup` query string. The token is cryptographically unguessable, but the URL is still a
secret-bearing artifact that can be extracted from screenshots, browser history, link scanners
or edge logs. The server stores only its hash, locks signup to the request's case-insensitive
email, expires it after seven days, consumes it atomically and invalidates the old token when an
invitation is reissued.

On 2026-08-17 the owner accepted this transport trade-off for the small controlled beta rather
than adding a fragment-to-cookie exchange or a separate verified-account acceptance flow. The
operational rule is to never paste or screenshot invitation URLs; a disclosed unused link must
be reissued before signup. Removing the address from the URL and exchanging the token for a
short-lived restricted `HttpOnly` invitation session remains a hardening option before a broader
release. This acceptance does not mean that invitation URLs are non-sensitive.

## Completion decision

Goal 3 is complete. The production-shaped owner-only staging environment, immutable deployment,
migration/rollback rehearsal, provider containment, black-box security checks and complete
admission/product flow have dated sanitized evidence. This closes staging readiness only: it
does not prove the production edge, production sender, production legal rendering, public
capacity or real-device launch gates. The unresolved FBX redistribution terms also remain a
separate blocker before public delivery.
