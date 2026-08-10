# Goal 3 Staging Execution Report

**Status:** Repository foundation implemented; external deployment not yet executed

**Repository implementation date:** 2026-08-10

**Execution owner:** Controller/operator with Codex SSH assistance

## Implemented repository foundation

- Dedicated `gym-tracker-staging` Compose project with separate PostgreSQL, migration, API, web
  and Caddy services.
- Separate volume, roles, passwords, networks, cookie, BFF secret and release identity.
- Loopback-only Caddy publication on port 3100; API, web and PostgreSQL remain unpublished.
- File-backed secrets, bounded logs, read-only application containers and container memory/PID
  ceilings.
- `APP_ENV=staging` requires `EMAIL_RECIPIENT_ALLOWLIST`; the mailer rejects unlisted recipients
  before contacting Resend.
- Exact-SHA build, hard preflight, migration, rollback, product-flow and sanitized-evidence
  procedures documented in `ops/staging/README.md`.

Repository implementation is not evidence that the environment or provider controls are live.
No launch-gate checkbox should reference this section as deployed proof.

## External prerequisites

- [ ] Authenticate a current Cloudflare Access SSH session and capture the read-only host preflight.
- [ ] Verify `send.gymtrack.ch` without changing the root Infomaniak mail records.
- [ ] Create the staging sending-only Resend key and confirm MFA/recovery.
- [ ] Configure two owner-controlled staging recipient addresses outside Git.
- [ ] Create the owner-only `staging.gymtrack.ch` Tunnel route and Access policy.
- [ ] Commit/push the exact release candidate and obtain green CI.

## Deployment evidence

Not yet executed. Record only sanitized values here.

| Evidence | Result |
| --- | --- |
| Release SHA and CI run | Pending |
| Image IDs | Pending |
| Production preflight and backup age | Pending |
| Staging Compose/Caddy validation | Pending |
| Fresh migration ledger | Pending |
| Migration-7 forward-preservation comparison | Pending |
| Disposable down/up behavior | Pending |
| Dump hash and isolated restore | Pending |
| Cloudflare Access positive/negative tests | Pending |
| Header, cookie, Host/Origin and BFF tests | Pending |
| Email allowlist and controlled delivery | Pending |
| Admin bootstrap and admission flow | Pending |
| Production post-deployment health/headroom | Pending |

## Completion decision

Goal 3 remains open. It can be marked complete only after every staging acceptance item has a
dated result and production is shown to have remained healthy. The FBX redistribution issue and
production-origin security/email checks remain separate public-release blockers.
