# Goal 2 External Actions

Things only the operator can do. Opened 2026-08-06 and updated as Goal 2 progresses.

`Blocking` means Goal 2 cannot close, or a later goal cannot start, until it is done.

## Blocking

### A1 — Run the production inspection · item 8
Requires SSH to `gym-prod` on the home network.

A read-only script was issued on 2026-08-06 (`goal2-item8-production-inspection.sql`). It is
`SELECT`-only and returns no email address, password hash, token or workout note.

```bash
PG=$(docker compose -p gym-tracker -f /srv/gym-tracker/deploy/compose/compose.yaml ps -q postgres)
docker exec -i "$PG" psql -X -U postgres -d gym_tracker < goal2-item8-production-inspection.sql
```

It answers five things this repository cannot: current data volume (the 2026-07-21 figures are
stale), whether production is on the public-beta schema at all, what `beta_settings` reads, the
names of the legacy system exercises, and whether the operator account's email is verified.

**Blocks:** item 8 closing, and the item 2 DPIA input describing what is actually processed.

### A2 — Review the legacy system exercises · item 8
Section 8 of the inspection lists every system-owned exercise created before the 2026-08-04
catalog import. Eight of those originated in unrelated development and test accounts and have
never been reviewed. They are visible to every future tester.

For each: keep as-is, rename, reclassify, or remove if unreferenced. Report the list back and
we will work through it together.

**Blocks:** inviting testers, who would otherwise be the first people to see them.

### A3 — Verify the operator account's email · item 8
The 2026-07-21 migration preserved an unverified state and created no verification token. That
account is also a recovery path.

Confirm the current state from section 4 of the inspection first — it may already have been
resolved. If not, the resend-verification flow is the clean route once mail delivery works,
which makes this dependent on A5.

### A4 — Supply the controller identity · item 1
Exact legal name as it should render, and the postal address in Swiss format. These become
public on `/privacy`, `/terms`, `/cookies` and `/support`.

**Blocks:** items 1 and 4, the Privacy and Terms drafts, and the whole of item 2.

### A5 — Activate Infomaniak mail and create the addresses · items 1, 4, 5
Provider and structure are decided: Infomaniak, one mailbox with two aliases. The mail service
exists on the account but has not been activated.

Note: the DNS zone is delegated to **Cloudflare**, not Infomaniak, so every mail record is
added on the Cloudflare side even though the mailboxes live at Infomaniak.

- [x] Mail Service activated for `gymtrack.ch`.
- [x] `support@gymtrack.ch` created, MX records live in Cloudflare, receiving into Apple Mail.
- [x] `privacy@gymtrack.ch` added as a full alias with send-as working.
- [x] `security@gymtrack.ch` added as a forwarding address — receives, cannot send as.
      Accepted; see the decision record for why this does not block launch.
- [x] Send and receive tested on all three. `support@` and `privacy@` pass both directions;
      `security@` passes receive/forward.
- [ ] Record what the mail tier actually costs, for item 6.

**A5 is otherwise complete.** The contact half of item 1 is delivered.

**Do not** set the Infomaniak account's own recovery address to anything `@gymtrack.ch`. See
A6 — this is now the single highest-consequence configuration choice in Goal 2.

**Blocks:** items 1, 4 and 5; `SUPPORT_EMAIL`, and therefore the API boot contract on staging.

### A7 — Configure Resend for staging · items 4, 12; **complete for Goal 3**

The Resend account was created on 2026-08-07 (free tier, Google SSO, US entity). No secret is
stored in this repository. `send.gymtrack.ch` is verified, receiving is disabled, and the
staging-only sending key and two-address recipient allowlist are installed outside Git. A real
controlled invitation was delivered and an unlisted recipient was rejected before Resend with
no provider record. Evidence: [Goal 3 staging report](../goal-3/goal-3-staging-report.md).

This was on the Goal 3 critical path in two independent ways. The staging requirement is now
satisfied. A distinct sending-only production key scoped to `send.gymtrack.ch` was created on
2026-08-19 and installed as a protected root-owned production secret. The reviewed production
definition wires it only to API; deployment and production delivery proof remain open.

**It would block staging from booting if removed.** `apps/api/src/shared/env.ts` requires `EMAIL_FROM`
and `RESEND_API_KEY` in any production-like deployment, and `APP_ENV=staging` is deliberately
production-like. Without a key the stack refuses to start — correct fail-closed behaviour, but
the requirement is now satisfied.

**Production delivery still blocks the beta outright.** Every account flow depends on delivery:
invitations, email verification, password reset, deletion scheduling and the cancellation link.
Without Resend the application runs and no one can be invited, verify an address, or recover an
account.

Completed staging work:

1. Verified `send.gymtrack.ch` and created a sending-only staging API key stored only in the
   staging secret environment and password manager.
2. Used `staging@send.gymtrack.ch` as the staging sender and configured exactly two
   owner-controlled addresses in the staging-only `EMAIL_RECIPIENT_ALLOWLIST`.
3. Proved controlled delivery and provider-free rejection of an unlisted recipient through the
   deployed exact-SHA environment.

Production uses its own separate key and sender configuration. The production key exists but is
not stored in this repository; host installation passed metadata validation on 2026-08-19
without exposing its value. Version-controlled Compose wiring is complete but not deployed. The
staging key and recipient allowlist are never reused.

Provider retention, transfer/DPA terms and plan costs are recorded in the final inventory.

### A6 — Break the recovery loop, then build the register · item 6
The register template comes in Pass C. These parts are urgent and independent of it, because
the Infomaniak decision in A5 concentrated the domain, the DNS zone and all three contact
addresses into a single account.

**Do these before anything else in Goal 2:**

- [x] **Infomaniak recovery address set correctly.** A dedicated Gmail — neither the operator's
      personal address nor anything `@gymtrack.ch`.
- [x] **MFA enabled on Infomaniak, Cloudflare and GitHub** (2026-08-07). None of the three
      recovers through `@gymtrack.ch` mail; recovery runs through phone or a secondary address.
      This closes the cascade risk that made A6 urgent.
- [ ] **Confirm backup codes exist and are stored off-phone.** This is the remaining gap and it
      is not the same thing as having MFA. If the second factor is an authenticator app on the
      phone and the phone is lost or wiped, recovery codes are the only way back in — and codes
      stored only on that phone are lost with it. Somewhere durable: a password manager that
      syncs elsewhere, or printed.
- [ ] **Harden the recovery Gmail itself.** It is the root of trust — whoever holds it can take
      the domain. It needs its own MFA and its own recovery path, independent of this project.
- [x] Resend uses the operator's Google SSO account and inherits that account's MFA; recovery does
      not run through `@gymtrack.ch`.
- [x] Expiry date recorded: **`gymtrack.ch` expires 2027-07-20**.
- [x] **Auto-renew enabled at Infomaniak** (confirmed by the controller 2026-08-10).
- [ ] Confirm the card on file does not expire before 2027-07-20 — auto-renew fails silently
      against a dead card.
- [ ] Calendar reminder for ~2027-06-20 as a backstop independent of provider and card.
- [x] Record plan and cost: Infomaniak CHF 9/year for the domain with no other reported charge;
      Cloudflare and Resend Free plans.
- [ ] Record the applicable payment method and expiry for the paid Infomaniak domain renewal.

## Non-blocking, but do them early

### ~~B1 — Confirm no helpdesk provider~~ · resolved 2026-08-10

No helpdesk provider is used for the first cohort. Support, privacy and security correspondence
uses the configured Infomaniak mailbox/aliases and the operator's local mail client.

### B2 — Add the Resend DNS records for `send.gymtrack.ch` · items 1, 4; **complete for staging**
Decided 2026-08-06: Resend sends from a subdomain, so no SPF merging is needed on the root.

**Historical zone state as of 2026-08-07, before Resend configuration:**

| Record | Type | Purpose |
|---|---|---|
| `app.gymtrack.ch` | Tunnel, proxied | Application, via `gym-prod` connector |
| `autoconfig` / `autodiscover` | CNAME → `infomaniak.com` | Mail client auto-setup |
| `gymtrack.ch` | MX → `mta-gw.infomaniak.ch` | Inbound mail |
| `gymtrack.ch` | TXT `v=spf1 include:spf.info…` | SPF for Infomaniak |
| `20260806._domainkey` | TXT `v=DKIM1; t=s; p=…` | DKIM for Infomaniak |
| `_dmarc` | TXT `v=DMARC1; p=reject;` | DMARC, root |

During Goal 3, Resend's DNS-only DKIM record was added at
`resend._domainkey.send.gymtrack.ch`, with the provider MX and SPF records at
`send.send.gymtrack.ch`. Resend reports the sending domain verified and a controlled Gmail inbox
accepted a real invitation from `staging@send.gymtrack.ch`. The root Infomaniak MX, SPF, DKIM and
strict DMARC records were left unchanged. Production still needs separate-key delivery,
and received-header evidence before its launch gate can close. Jan Haag is assigned as the
bounce/complaint/suppression owner; the initial monitoring path is a Resend dashboard review
before/after each invitation batch and daily during the 72-hour observation window, with an
immediate invitation pause on unexplained events. The root DMARC policy remains `p=reject` without
an aggregate-reporting address, so automated aggregate reporting should be reconsidered before
scope expands beyond the founding cohort.

### ~~B3 — Decide the seat cap~~ · resolved 2026-08-06
Cap stays at **50**, giving 48 external testers alongside the two operator accounts. No
configuration change. See the note in the decision record about one optional word change to
`/beta` that would make the published claim exactly rather than approximately true.

### ~~B4 — Decide the status page question~~ · resolved 2026-08-06
The "Service status" section is **removed** from `apps/web/src/app/support/page.tsx` rather
than deferred, so the page stops pointing at a domain that does not resolve. The template in
`ops/status/` stays ready and the section returns when the page is genuinely live. The
repository edit is complete; deployed rendering remains a later verification step.

## Handed to other goals

Not operator actions, recorded so they are not lost between goals.

Secure remote administration from audit Area 34 was completed on 2026-08-08. The owner-only
`ssh.gymtrack.ch` Cloudflare Access path passed an outside-network test without a public SSH
port; see [ADR 0017](../../../decisions/0017-secure-remote-administration.md) and the
[Stage 12 secure remote administration report](../../../server/reports/12-secure-remote-administration-report.md).

| What | Owner | Why it matters |
|---|---|---|
| Decide how an external applicant reaches `/beta` while Cloudflare Access gates `app.gymtrack.ch` | Goal 5 | The waitlist form must be publicly reachable for anyone to request access, but Access currently protects the whole hostname. `launch-gates.md` keeps the private gate until direct API signup cannot bypass invite admission, so the two requirements have to be reconciled deliberately rather than discovered at launch |
| Root `gymtrack.ch` and `www` do not resolve — only `app.` does | Goal 5 | Survivable for a beta, but anyone typing the bare domain gets nothing. Decide whether to redirect to `app.` or leave it |
| Verify the dynamically rendered legal routes with real server-only contact values | Goals 4–5 | Staging passed without `PUBLICATION_BLOCKED`; production still needs to prove the approved version renders |
| ~~Execute [staging-environment-spec.md](staging-environment-spec.md)~~ | Goal 3, complete | Evidence: [Goal 3 staging report](../goal-3/goal-3-staging-report.md) |
| Edge must overwrite `cf-connecting-ip` and friends on the public production path | Goal 4 | Staging rejected the forged Cloudflare header and resisted application-header rotation; production must be verified independently |
| Verify rendered production HTML carries real controller values | Goal 4 | The check that catches the prerender defect |
| ~~Rehearse the admin bootstrap under `INVITE_ONLY`~~ | Goal 3, complete | Packaged CLI produced exactly one administrator and one bootstrap audit event |
