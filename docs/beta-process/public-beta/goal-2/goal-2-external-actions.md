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

### A7 — Configure Resend for staging · items 4, 12; **partially complete, still blocks Goal 3**

The Resend account was created on 2026-08-07 (free tier, Google SSO, US entity). No secret is
stored in this repository. Staging still needs its own API key/configuration, and the production
sending domain remains separate under B2.

This is now on the critical path in two independent ways.

**It blocks staging from booting.** `apps/api/src/shared/env.ts:92-105` requires `EMAIL_FROM`
and `RESEND_API_KEY` in any production-like deployment, and `APP_ENV=staging` is deliberately
production-like. Without a key the stack refuses to start — correct fail-closed behaviour, but
it means Resend precedes staging rather than following it.

**It blocks the beta outright.** Every account flow depends on delivery: invitations, email
verification, password reset, deletion scheduling and the cancellation link. Without Resend the
application runs and no one can be invited, verify an address, or recover an account.

Minimum remaining work to unblock staging:

1. Verify `send.gymtrack.ch` and create a sending-only staging API key; store it only in the
   staging secret environment.
2. Confirm the Resend/Google identity has appropriate MFA and recovery protection.
3. Use `staging@send.gymtrack.ch` as the staging sender and configure exactly two
   owner-controlled addresses in the staging-only `EMAIL_RECIPIENT_ALLOWLIST`. The repository
   guard now refuses staging boot without that list and blocks other recipients before Resend.

The same verified subdomain is later used for production, but production gets a separate key and
sender configuration. The staging key and recipient allowlist are never reused.

Record provider retention and the applicable transfer/DPA terms while you are in the console;
item 4 still needs those facts.

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
- [ ] MFA on Resend once the account exists (A7), not recovering through `@gymtrack.ch`.
- [x] Expiry date recorded: **`gymtrack.ch` expires 2027-07-20**.
- [x] **Auto-renew enabled at Infomaniak** (confirmed by the controller 2026-08-10).
- [ ] Confirm the card on file does not expire before 2027-07-20 — auto-renew fails silently
      against a dead card.
- [ ] Calendar reminder for ~2027-06-20 as a backstop independent of provider and card.
- [ ] Record plan tier, cost and billing method for each provider — item 4 needs these too.

## Non-blocking, but do them early

### ~~B1 — Confirm no helpdesk provider~~ · resolved 2026-08-10

No helpdesk provider is used for the first cohort. Support, privacy and security correspondence
uses the configured Infomaniak mailbox/aliases and the operator's local mail client.

### B2 — Add the Resend DNS records for `send.gymtrack.ch` · items 1, 4
Decided 2026-08-06: Resend sends from a subdomain, so no SPF merging is needed on the root.

**Zone state as of 2026-08-07** (7 records, Cloudflare free plan):

| Record | Type | Purpose |
|---|---|---|
| `app.gymtrack.ch` | Tunnel, proxied | Application, via `gym-prod` connector |
| `autoconfig` / `autodiscover` | CNAME → `infomaniak.com` | Mail client auto-setup |
| `gymtrack.ch` | MX → `mta-gw.infomaniak.ch` | Inbound mail |
| `gymtrack.ch` | TXT `v=spf1 include:spf.info…` | SPF for Infomaniak |
| `20260806._domainkey` | TXT `v=DKIM1; t=s; p=…` | DKIM for Infomaniak |
| `_dmarc` | TXT `v=DMARC1; p=reject;` | DMARC, root |

Infomaniak mail is complete and correct. **No Resend records exist yet** — this action is fully
open. The subdomain decision is validated by what is already in the zone: the root SPF belongs
to Infomaniak and must not be touched.

> **`p=reject` with no reporting address is the risk to manage here.** The DMARC record carries
> no `sp=` tag, so `send.gymtrack.ch` inherits `reject` rather than falling back to something
> softer. Once Resend starts sending, any SPF or DKIM misalignment causes receiving servers to
> **reject** the message outright rather than spam-folder it — an invitation simply never
> arrives, and nothing in the application logs explains why. There is also no `rua=`, so no
> aggregate reports are produced and the failure is invisible.
>
> Add reporting **before** configuring Resend, keeping the strict policy:
>
> ```
> v=DMARC1; p=reject; rua=mailto:support@gymtrack.ch; fo=1
> ```
>
> Keeping `p=reject` is the right posture. It simply leaves no margin for error, which is
> exactly why the feedback loop has to exist first.

In Resend, add `send.gymtrack.ch` as a sending domain; it will produce SPF, DKIM and (usually)
a return-path record. Add them **in Cloudflare** as records on the `send` subdomain, leaving
the root domain's MX and SPF for Infomaniak mail untouched.

Set these records to **DNS only** (grey cloud) rather than proxied. Cloudflare's proxy applies
to HTTP, and proxying mail-related records breaks them.

Then add one DMARC record at the root — `_dmarc.gymtrack.ch` — covering both. Start at
`p=none` with a reporting address so you can observe before enforcing, then tighten once the
first real invitations have been seen to arrive.

Verify in Resend that the domain shows as verified, and confirm SPF, DKIM and DMARC all pass on
a received test message. That is a launch gate.

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
| Verify the dynamically rendered legal routes with real server-only contact values | Goals 3–5 | The repository fix is complete; staging and production still need to prove the approved version renders without `PUBLICATION_BLOCKED` |
| Execute [staging-environment-spec.md](staging-environment-spec.md) | Goal 3 | — |
| Edge must overwrite `cf-connecting-ip` and friends on both hostnames | Goal 3, verified in Goal 4 | Rate limiting is bypassable until it does |
| Verify rendered production HTML carries real controller values | Goal 4 | The check that catches the prerender defect |
| Rehearse the admin bootstrap under `INVITE_ONLY` | Goal 3 | The dedicated admin account cannot be registered normally |
