# Goal 2 Decision Record — Human and External Decisions

Started: 2026-08-06. Controller: to be supplied (item 1).

This is the master log for the ten Goal 2 items. Each carries a status, the decision, its
rationale, and whatever remains open. It is updated as items resolve, not written once.

**Status values:** `Decided` — resolved, values exist, external actions done. `Provisional` —
direction chosen, details or external actions outstanding. `Open` — not yet worked.
`Deferred` — deliberately postponed with a named trigger. `Blocked` — waiting on something
outside this repository.

No checkbox in [launch-gates.md](../launch-gates.md) is changed by this document. Those require
deployed evidence, which belongs to Goals 4–6.

## Summary

| # | Item | Status | Outstanding |
|---|------|--------|-------------|
| 9 | Staging host | **Decided** | — |
| 8 | Owner workout data | **Provisional** | production inspection (A1–A3) |
| 7 | Availability expectations | **Decided** | — |
| 5 | Support expectations | **Decided** | page edits not yet applied |
| 3 | Allowed jurisdictions | **Decided** | wording changes not yet applied |
| 1 | Controller identity | **Decided** | rendering fix owed by Goal 1/5 |
| 4 | Provider and processor inventory | **Decided** | transfer basis deferred to item 2 |
| 6 | Billing, ownership, MFA, recovery | **Decided** | residual risk accepted; renewal date + costs outstanding |
| 10 | Public repository and licensing | Open | — |
| 2 | Legal review and DPIA | **Deferred** | Pass D; needs 1, 3, 4, 5, 7, 8 |

All decisions taken so far are recorded below. Everything still outstanding is an external
action in [goal-2-external-actions.md](goal-2-external-actions.md) — nothing is waiting on
further discussion except the item 3 sub-decisions and the Pass C items not yet worked.

---

## Item 9 — Choice of staging host

**Status: Decided** · 2026-08-06

A second Docker Compose project on the existing `gym-prod` Mac mini, published at
`staging.gymtrack.ch` behind Cloudflare Access restricted to the operator.

**Rationale.** The host has six cores, ~30 GiB RAM and 416 GB free, so capacity was not the
constraint. The deciding factor was fidelity: the three defects the audit found that CI cannot
see — the `APP_ENV` bypass, `cf-connecting-ip` trust, and the statically prerendered legal
routes — all live in the deployed edge path. Only a staging environment behind the same
Cloudflare and Caddy layer exercises them. Isolation on separate hardware would have traded
away exactly the fidelity that makes staging worth building.

**Consequences.** Shared failure domain with production, bounded by per-container memory limits
but not eliminated. Staging is excluded from backups and from production alerting, so staging
outages are found by use rather than notification. The spare Mac mini stays reserved as a
recovery host.

**Artifacts.** [ADR 0015](../../../decisions/0015-staging-environment.md) ·
[staging-environment-spec.md](staging-environment-spec.md)

**Handoff.** Goal 3 executes the specification. Nothing is deployed yet.

---

## Item 8 — Whether existing owner workout data stays in the beta database

**Status: Provisional** · 2026-08-06

**Decided:**

1. **The owner's workout history stays.** It is not exported and wiped.
2. **A dedicated `ADMIN` account, separate from the personal training account.** The existing
   account remains an ordinary user holding the workout history; a new account holds `ADMIN`
   and has no training data.
3. **Statistics count all data regardless of owner.** No account is excluded from public or
   internal statistics. Operator data and tester data are treated identically.

**Rationale.** Separating the admin role from the data-subject role limits what a compromise of
the day-to-day login reaches, and is materially easier to describe in the DPIA than an account
that is simultaneously controller, administrator and data subject. Counting all data uniformly
avoids a special case in the statistics layer and is simpler to explain publicly than a
selective figure.

**Consequences.**

- Two operator accounts consume seats against the cap of 50, leaving 48 for external testers.
  See open sub-decision below.
- Published statistics include pre-beta history dating from 2025-10-28, so headline totals
  describe the app's whole lifetime rather than the beta period. If the public page is meant to
  read as beta activity, it needs a date-bounded framing rather than an owner exclusion.
- The admin account cannot simply be registered under `INVITE_ONLY`. The bootstrap procedure is
  specified in [staging-environment-spec.md](staging-environment-spec.md#admin-bootstrap-rehearsal)
  and must be rehearsed on staging before production.

**Open, and blocked on production inspection.** The 2026-07-21 migration report
(`docs/server/reports/jv-production-data-migration-report.md`) is the only record of what
production holds, and it is stale — workouts have been logged since. These facts require SSH
access to the Mac mini and can only be gathered by the operator:

- [ ] Current data volume, replacing the stale 106 workouts / 736 sets figures.
- [ ] Whether production is on the public-beta schema at all, and what `beta_settings` reads.
- [ ] **Provenance review of the legacy system exercises.** Nine exercises were promoted to
      system-owned during the 2026-07-21 migration, eight of them originating in unrelated
      development and test accounts. They are now shared with every future tester and their
      names and classifications have never been reviewed for public exposure.
- [ ] **Verification state of the operator's email.** The migration preserved an unverified
      state and created no verification token. That account is also a recovery path.
- [ ] Whether policy-acceptance columns are null for the pre-existing account, and how that is
      described in the DPIA.

A read-only inspection script covering all of the above was produced on 2026-08-06 and issued
to the operator. It contains only `SELECT` statements and returns no email address, password
hash, token or workout note.

**Seat accounting — resolved 2026-08-06.** The cap stays at **50**. Two operator accounts count
against it, because `beta.repository.ts` counts every `ACTIVE` account, so the cohort is 48
external testers. No configuration change.

One optional refinement, noted rather than pressed: `/beta` currently reads "Limited to 50
founding members", which with two operator accounts is approximately rather than exactly true.
Changing "50 founding members" to "50 accounts" would make it precise at the cost of one word.
Worth doing if the `/beta` copy is being edited anyway for the Switzerland-only change under
item 3; not worth a dedicated edit.

---

## Item 7 — Availability expectations for a home-hosted beta

**Status: Decided** · 2026-08-06

A minimal statement with no commitments: testers are told this is a beta that may be
unavailable, with no uptime target, no maintenance window and no notification undertaking.

**Rationale.** Nothing is promised that cannot be kept. There is currently no external uptime
monitoring, so any numeric target would be unmeasurable, and any notification commitment would
depend on the operator noticing an outage that the host-local alerting cannot report.

**Consequences.** A tester who loses access mid-workout gets no signal about whether the fault
is theirs or the service's. The `ops/status/public/` page already exists as a template and
remains the lowest-cost way to close that gap later, without changing the published
commitment. No action required now; recorded so the trade-off is visible rather than implicit.

**Artifact.** [availability-and-support-commitments.md](availability-and-support-commitments.md)

---

## Item 5 — Support expectations

**Status: Provisional** · 2026-08-06

**Decided:** a single support mailbox plus in-app announcements through the existing campaign
system. **No published response time** — best effort only, consistent with the item 7 posture.

**Rationale.** The campaign system is already built and is the only channel reaching testers
who never open email, which makes it the right vehicle for incident and fix notices. Declining
to publish a response window keeps support consistent with availability: no undertaking that a
single operator on holiday would breach.

**Consequences.** A tester who hears nothing has no reference point for when to chase. The
support page wording should therefore be warm and explicit that messages are read, even though
no window is given — that costs nothing and prevents silence reading as abandonment.

**Addresses, from item 1:** support is `support@gymtrack.ch`; security reports go to
`security@gymtrack.ch`, an alias onto the same mailbox. `SUPPORT_EMAIL` on the API takes the
same value, and `apps/api/src/main.ts` already derives the Resend reply-to from it, so the
three-way match required by [launch-gates.md](../launch-gates.md) is satisfied by configuration
rather than by discipline.

**Status page — resolved 2026-08-06.** The "Service status" section is removed from
`/support` rather than deferred, because it currently points at a host that does not resolve.
Reasoning in
[availability-and-support-commitments.md](availability-and-support-commitments.md#contradictions-in-existing-copy-that-these-decisions-create).

**Open:**

- [ ] Confirmation that no helpdesk provider is used, so item 4 gains no processor here
      (external action B1).
- [ ] Mailbox activation, so the addresses actually receive (external action A5).

**Artifact.** [availability-and-support-commitments.md](availability-and-support-commitments.md)

---

## Item 3 — Allowed jurisdictions

**Status: Provisional** · 2026-08-06

**Decided: Switzerland only.** The Founding Beta is offered to Swiss residents.

**Rationale.** Swiss FADP applies; GDPR exposure is avoided by eligibility rather than by
compliance effort. This collapses the international-transfer analysis for data subjects,
removes the EU-representative question, and materially shortens both the Terms and the Privacy
Notice. It is enforceable rather than aspirational because every invitation is approved by hand.

**Consequences.** Every document currently describing the beta as worldwide must change in the
same pass, or the rendered pages will contradict this record.

**Sub-decisions, 2026-08-07:**

1. **Combined attestation, no schema change.** The existing waitlist checkbox is relabelled to
   "I confirm that I am at least 18 years old and resident in Switzerland" and keeps writing to
   `adult_attested_at`. A separate residence column would be cleaner evidence, but the recorded
   `terms_version` and `privacy_version` already prove which wording was shown, so the
   conflated column name costs nothing that matters. This keeps item 3 out of the migration
   queue entirely.
2. **Ineligible requests stay `PENDING`.** They are simply never approved, and the existing
   180-day retention rule removes them. No new status, no admin work, and the applicant gets
   the same generic intake response as everyone else — preserving the anti-enumeration
   property. `BLOCKED` was rejected because it means abuse, and conflating "not Swiss" with
   "bad actor" would corrupt the audit trail.
3. **GDPR-equivalent controls retained voluntarily.** Export, erasure, consent versioning,
   retention limits and breach handling stay as built. They already exist, so the ongoing cost
   is near zero, and a later widening of scope becomes a legal review rather than a rebuild.

**Artifacts.** [ADR 0016](../../../decisions/0016-founding-beta-jurisdiction-scope.md) ·
[jurisdiction-scope-changes.md](jurisdiction-scope-changes.md) — nine files, with exact diffs,
and four dated snapshots explicitly excluded.

**Open:** the wording changes are specified but **not applied**. They must land together; a
partial application leaves the rendered pages contradicting this record.

---

## Item 1 — Controller identity and public contact details

**Status: Provisional** · 2026-08-06

**Decided:** the controller is a natural person — the operator — identified by legal name and
residential address.

**Rationale.** Legally valid and normal for a small Swiss operator, with no entity formation
cost or ongoing administration. The consequence, raised once and accepted, is that a
residential address becomes permanently public and crawler-archived.

**Controller identity, supplied 2026-08-06:**

```
Jan Haag
Lerchenstrasse 74
4059 Basel
Switzerland
```

Rendered on the legal pages as a single line: `Jan Haag, Lerchenstrasse 74, 4059 Basel,
Switzerland`. The street name is written in full rather than abbreviated to `Lerchenstr.`,
which is the normal convention for a legal notice. The country is included even though the
beta is Switzerland-only, because the pages themselves are publicly readable from anywhere.

This address is public by design — it appears on `/privacy`, `/terms`, `/cookies` and
`/support`. Recording it here therefore adds no exposure beyond what the published pages
already carry, and it must **not** be added to `.env.example`, which is a template rather than
a configuration.

**Mailbox decisions, 2026-08-06:**

- **Provider: Infomaniak** (Geneva, Switzerland), which is also the registrar for
  `gymtrack.ch`. DNS is **not** hosted there: the zone is delegated to Cloudflare, which serves
  the tunnel and Access records. Mail records are therefore added in Cloudflare, not Infomaniak.
- **Structure: one mailbox, three aliases.** `support@gymtrack.ch` is the real mailbox;
  `privacy@gymtrack.ch` and `security@gymtrack.ch` are aliases onto it, with send-as enabled so
  replies leave from the address the sender wrote to.

**Rationale.** A Swiss processor serving Swiss-only users needs no transfer analysis in item 4,
which is the simplest possible entry. Consolidating on the existing registrar avoids a fourth
provider account to secure, pay for and remember. One mailbox rather than three keeps the
register short and means there is only one inbox to actually read.

**Delivered and tested, 2026-08-07.** All three addresses are live against the Apple Mail
client, with the send half verified rather than assumed:

| Address | Receive | Send as | Kind |
|---|---|---|---|
| `support@gymtrack.ch` | yes | yes | mailbox |
| `privacy@gymtrack.ch` | yes | yes | alias |
| `security@gymtrack.ch` | yes | **no** | forwarding address |

`security@` forwards into the same mailbox but cannot be sent from. This is **accepted**, not a
defect to fix before launch. A reply to a security report will arrive from `support@`, which is
still a project address rather than a personal one, so nothing private leaks and the thread
stays in one place — a researcher replying to that message lands back in the same inbox.
Security researchers encounter this routinely.

Two small consequences, both cheap:

1. The published security wording should acknowledge it, so a reply from a different address
   does not read as the wrong person answering. Handled in
   [availability-and-support-commitments.md](availability-and-support-commitments.md).
2. Forwarded mail can fail SPF alignment at the receiving end and land in spam. The forward is
   internal to Infomaniak, so the risk is low, but the spam folder is worth checking during the
   first weeks — an unnoticed vulnerability report is the one piece of mail that must not go
   missing.

Upgrading `security@` to a full alias later is optional and blocks nothing.

> **Concentration risk.** Two accounts carry the project, and they are not equally recoverable.
>
> **Infomaniak** holds the domain registration and the mailboxes. Losing it means losing the
> domain itself, which is unrecoverable by any other means — and losing every published way of
> contacting the controller at the same time.
>
> **Cloudflare** holds the DNS zone, the tunnel and Access. Losing it takes the application dark
> and breaks mail delivery too, because MX resolution depends on the zone. But it *is*
> recoverable: while the registrar account is intact, the nameservers can be repointed and the
> zone rebuilt. That asymmetry makes Infomaniak the root of trust.
>
> Three rules follow, and all belong in item 6:
>
> 1. The Infomaniak account's recovery address must be at a **different provider on a different
>    domain**. If it is anything `@gymtrack.ch`, the account recovers to a mailbox that only
>    exists while the account does.
> 2. The same applies to Cloudflare. If DNS is down, `@gymtrack.ch` mail is down, so a reset
>    sent there cannot arrive.
> 3. No other provider — Resend, GitHub, Telegram, the backup destination — may recover to an
>    `@gymtrack.ch` address either, for the same reason.

**Sending domain, 2026-08-06: `send.gymtrack.ch`.** Resend sends from a dedicated subdomain
rather than the root. This is Resend's own documented pattern and it exists precisely for this
situation: the root domain keeps Infomaniak's SPF record for ordinary mail, and the subdomain
carries Resend's SPF and DKIM independently. Nothing has to be hand-merged, and a transactional
deliverability problem cannot damage the ability to send and receive ordinary correspondence.
Recipients see `noreply@send.gymtrack.ch` with `Reply-To: support@gymtrack.ch`, which
`apps/api/src/main.ts` already wires from `SUPPORT_EMAIL`.

**Resulting configuration.** Complete apart from mailbox activation (external action A5):

```
NEXT_PUBLIC_CONTROLLER_NAME=Jan Haag
NEXT_PUBLIC_CONTROLLER_ADDRESS=Lerchenstrasse 74, 4059 Basel, Switzerland
NEXT_PUBLIC_PRIVACY_EMAIL=privacy@gymtrack.ch
NEXT_PUBLIC_SUPPORT_EMAIL=support@gymtrack.ch
NEXT_PUBLIC_SECURITY_EMAIL=security@gymtrack.ch
NEXT_PUBLIC_SUPPORT_URL=
SUPPORT_EMAIL=support@gymtrack.ch
EMAIL_FROM=Gym Progress Tracker <noreply@send.gymtrack.ch>
```

`NEXT_PUBLIC_SUPPORT_URL` stays empty. It exists for an optional voluntary-support link, which
`launch-gates.md` gates on approved provider terms and voluntary/no-benefit wording. Nothing is
lost by leaving it unset for the first cohort.

These values go in the production and staging environment files only — never in
`.env.example`, which is a template. They will not render until the static-prerender defect
above is fixed.

**Open:** activation of the mail service and the DNS records (external action A5).

**Configuration this will produce:** `NEXT_PUBLIC_CONTROLLER_NAME`,
`NEXT_PUBLIC_CONTROLLER_ADDRESS`, `NEXT_PUBLIC_PRIVACY_EMAIL`, `NEXT_PUBLIC_SUPPORT_EMAIL`,
`NEXT_PUBLIC_SECURITY_EMAIL`, optionally `NEXT_PUBLIC_SUPPORT_URL`, plus `SUPPORT_EMAIL` and
the `EMAIL_FROM` reply-to on the API.

> **Blocking dependency, not yet resolved.** These values will not reach users as the code
> stands. `apps/web/src/features/legal/legal-page.tsx` reads `process.env.NEXT_PUBLIC_*` inside
> server components that use no dynamic API; there is no `export const dynamic` anywhere under
> `apps/web/src/app`; and the `Dockerfile` passes no build args. Next.js statically prerenders
> `/privacy`, `/terms`, `/cookies` and `/support` at build time, freezing in the placeholders
> and the `PUBLICATION_BLOCKED` banner. Two distinct fixes are needed: force dynamic rendering
> for the server-rendered legal routes, and pass build args for the genuinely client-side use in
> `apps/web/src/features/settings/help-support-panel.tsx`. Goal 2 records the values; the fix
> belongs to Goal 1 or Goal 5; Goal 4 must verify the rendered production HTML.

---

## Item 4 — Final provider and processor inventory

**Status: Provisional** · 2026-08-07

Written as [processor-inventory-final.md](processor-inventory-final.md). Every provider is
classified as processor, controller-operated, or no-personal-data, because treating them alike
produced a misleading picture.

**Four processors:** Infomaniak (CH — mail), Cloudflare (US — connection metadata, no payload),
Resend (US — recipient address and full message body), Telegram (reference and timestamp only).

**Findings worth carrying forward:**

- The item 1 provider choice pays off here. Infomaniak being Swiss means the mailbox — the one
  processor holding free-text personal correspondence — involves no transfer at all.
- **Support mail is stored locally in Apple Mail on a laptop that leaves the house.** This is
  the kind of thing an inventory built only from infrastructure diagrams misses. FileVault
  state needs confirming and recording.
- **Telegram carries the weakest contractual position for the least benefit.** It receives only
  a reference and a timestamp, yet needs the same transfer basis as providers doing real work.
  Worth asking whether to drop it and check the admin queue directly instead — that would
  remove a processor outright.
- Switzerland-only removes the transfer question for *data subjects*, not for *processors*.
  Cloudflare and Resend still need a recorded basis under FADP.

**Resolved 2026-08-07:** Resend account created (free tier, Google SSO, US entity); FileVault
confirmed on the MacBook; **Telegram reduced to alerts only**, so it no longer processes
personal data and is no longer a processor. That last one required no code change — the two
Telegram streams are already independently configured, so it is achieved by leaving
`TELEGRAM_BETA_BOT_TOKEN` and `TELEGRAM_BETA_CHAT_ID` unset on the API.

**Open:** one substantive item — the transfer basis for Cloudflare and Resend, which is a
question for item 2 rather than an engineering lookup. Plus `gym-prod` disk encryption, which
pairs with the item 8 inspection, and a status-page host if that page is ever deployed.

Exact provider retention windows and plan costs were deliberately not chased: free or near-free
tiers on published standard terms, and neither changes a launch decision.

A draft public-facing processor summary for the Privacy Notice is included, publishable once
the open cells close and item 2 approves the wording.

---

## Item 6 — Provider billing, ownership, MFA, recovery, renewals

**Status: Provisional** · 2026-08-07

**Done:** MFA is enabled on Infomaniak, Cloudflare and GitHub, and none of the three recovers
through `@gymtrack.ch` mail — recovery runs via phone or a secondary address. That closes the
cascade risk which made this item urgent: losing the mailbox no longer locks the operator out
of the registrar, the DNS zone or the source repository.

A register template was produced and issued to the operator on 2026-08-07. It lives outside
this repository and records *where* credentials and codes are kept, never their values.

**Residual risk — accepted by the controller, 2026-08-07.**

The remaining exposure is the simultaneous-failure case: losing the phone *and* a second
recovery route at the same time would leave one or more accounts unrecoverable. Mitigating it
fully would mean storing backup codes off-phone for every provider and separately hardening the
recovery Gmail.

The controller has weighed this and **accepts the risk**, on the basis that this is a hobby and
portfolio project rather than a service anyone depends on, and that single-system failure is
already covered by the MFA and recovery separation now in place.

Recorded here because accepted risk should be visible and revisitable, not because it needs
revisiting now. Two conditions would justify reopening it: the beta acquiring users who would
be materially harmed by permanent loss of the service, or the project becoming commercial.

**Domain renewal — recorded 2026-08-07.**

```
gymtrack.ch expires 2027-07-20
Auto-renew: NOT enabled
```

This sits outside the accepted-risk decision above, because it is not a low-probability
simultaneous failure — it is a **scheduled certainty** with roughly eleven months' notice. If
the domain lapses, the application, all three contact addresses and the Cloudflare tunnel stop
at the same moment, and the name enters a redemption period that is expensive to reverse and
sometimes not reversible at all.

The fix is two clicks and free. Recommended actions:

- [ ] Enable auto-renew at Infomaniak.
- [ ] Confirm the payment card on file does not expire before 2027-07-20. Auto-renew fails
      silently when the card has expired, which reintroduces the whole failure with none of the
      warning.
- [ ] Add a calendar reminder for roughly 2027-06-20 as a backstop that does not depend on the
      card or the provider.

**Also remaining, for item 4 rather than item 6:** plan and cost per provider.

---

## Item 10 — Public-repository intentions and licensing

**Status: Open** · Pass C.

---

## Item 2 — Legal review and DPIA

**Status: Deferred** · 2026-08-06

**Trigger for revisiting:** completion of items 1, 3, 4, 5, 7 and 8 — that is, once there is a
named controller, a settled Switzerland-only scope, a closed processor list, published support
and availability commitments, and a resolved position on the operator's own data.

At that point the choice is between a scoped paid consultation covering only what
Switzerland-only leaves open, and a documented self-assessment with written residual-risk
acceptance. The preparatory artifact is the same either way: a full DPIA built out from the
existing [screening](../dpia-screening.md), the finalized inventory, draft Privacy, Terms and
Cookie wording, and a specific question list.

**Goal 2 does not close until this item has a recorded resolution.** Deferred is a valid
interim status; unaddressed is not.
