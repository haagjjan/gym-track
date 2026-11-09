# Goal 2 Decision Record — Human and External Decisions

Started: 2026-08-06. Controller: Jan Haag.

This is the master log for the ten Goal 2 items. Each carries a status, the decision, its
rationale, and whatever remains open. It is updated as items resolve, not written once.

**Status values:** `Decided` — resolved, values exist, external actions done. `Provisional` —
direction chosen, details or external actions outstanding. `Open` — not yet worked.
`Deferred` — deliberately postponed with a named trigger. `Blocked` — waiting on something
outside this repository.

No deployed-system checkbox in [launch-gates.md](../goal-1/launch-gates.md) is changed by this
document. The two document-evidence gates for controller legal-risk acceptance and DPIA
approval are checked against the signed records; operational gates still require Goals 4–6.

## Summary

| # | Item | Status | Outstanding |
|---|------|--------|-------------|
| 9 | Staging host | **Decided** | — |
| 8 | Owner workout data | **Decided** | admin bootstrap + email verification → Goal 5 |
| 7 | Availability expectations | **Decided** | — |
| 5 | Support expectations | **Decided** | repository wording implemented; deployed verification → Goal 5 |
| 3 | Allowed jurisdictions | **Decided** | Switzerland-only wording implemented in current worktree |
| 1 | Controller identity | **Decided** | dynamic rendering implemented; deployed configuration verification → Goal 5 |
| 4 | Provider and processor inventory | **Complete** | — |
| 6 | Billing, ownership, MFA, recovery | **Decided** | residual risk accepted; payment-card expiry check and calendar reminder outstanding |
| 10 | Public repository and licensing | **Decided** | Tripo 3D Free-tier models are separately licensed `CC BY 4.0`; attribution implemented; remaining repository-publication checklist still applies |
| 2 | Legal review and DPIA | **Decided** | corrected Cloudflare payload scope reaffirmed by the controller 2026-08-19 |

All ten decisions are recorded below. Remaining work is execution or evidence in
[goal-2-external-actions.md](goal-2-external-actions.md): provider transfer/retention records,
staging/production email configuration, account-recovery bookkeeping and later deployed
verification. The FBX asset and legal/DPIA decisions are closed.

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

**Status: Decided** · 2026-08-08

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

**Production inspection — completed 2026-08-07.** The 2026-07-21 migration report was stale,
and the inspection found three things it did not predict.

**Schema state — the question with the widest blast radius, and the answer is good.**
Production is already on the public-beta schema: `beta_settings`, `beta_access_requests`,
`erasure_tombstones` and `admin_audit_events` all exist. `beta_settings` reads cap 50,
approvals/day 10, with all three activity switches paused — the correct fail-safe default,
untouched since the migration seeded it. Goal 5 is therefore no larger than assumed.

**Current volume:** 116 workout sessions (100 active, 16 soft-deleted), 431 session exercises,
790 sets, 8 templates, 43 owned exercises. History runs 2025-10-28 to 2026-08-06.

**An unexpected second account.** `urs`, created 2026-07-25, never logged in, holding no data —
contradicting the migration report's "exactly one production user". Deleted 2026-08-08 on the
controller's instruction, using the same ordered cleanup as `finalizeDeletion` and writing an
erasure tombstone so a restored backup cannot resurrect it. Its existence means production
registration was open at some point; not pursued further, since the account is gone and
`REGISTRATION_MODE` will be set explicitly during Goal 5.

**Neither account held `ADMIN`.** The bootstrap has not happened, confirming the three-step
procedure in the staging spec is still required.

**Neither account has recorded policy acceptance** — terms, privacy and adult attestation are
all null, because both predate those columns. Relevant to the DPIA: the controller's own
account carries no recorded consent. Not a defect, but it should be stated accurately rather
than glossed.

**A counter bug, fixed.** `users.completed_workout_count` read 0 against 106 completed
workouts — added by `20260805` with `DEFAULT 0` and never backfilled. Campaign `NTH_WORKOUT`
triggers read that column, so every workout-count campaign would have misfired. Backfilled to
99, counting sessions that are both completed and not soft-deleted.

### Legacy exercise provenance — resolved 2026-08-08

Nine system exercises predated the catalog import, and the review found real problems:

| Exercise | Finding | Action |
|---|---|---|
| `Smoke Press 1779440300` | Automated-test artifact, visible to every tester | Reassigned → `Barbell Bench Press`, deleted |
| `Machine Press mrl27o1d5w1 Flow` | Test artifact, no equipment or type | Reassigned → `Barbell Bench Press`, deleted |
| `Bench Press` | Duplicate of `Barbell Bench Press` | Reassigned → `Barbell Bench Press`, deleted |
| `Barbell Squat` | Primary muscle **Glutes** — wrong — and duplicated `Back Squat` | Reassigned → `Back Squat`, deleted |
| `Cable Crunch` | Recorded as `barbell` / `compound` | Corrected to `cable` / `isolation` |
| Four others | Correct as-is | Kept |

The misclassifications mattered more than the visible test garbage: `Barbell Squat` counting
toward Glutes silently corrupted weekly volume, one of the product's headline screens.

Executed in a single transaction with pre-flight assertions. Nine became five. **No set,
workout or template was deleted** — history was reassigned, and the set count verified
unchanged at 790 before commit. Orphan checks on session exercises, template exercises and sets
all returned zero.

Worth recording why this needed raw SQL: `exercise-merge.repository.ts:95` refuses to retire
non-personal exercises, and `exercise-mutations.ts:60` blocks editing exercises the user does
not own. Neither the merge feature nor the admin UI could have done it — a concrete instance of
the operator-tooling gap in the audit's area 23.

**Handed to Goal 5, not blocking this item:**

- The operator account's email is still unverified. Fixing it needs working mail delivery, so it
  follows the Resend deployment.
- The dedicated `ADMIN` account still needs creating through the three-step bootstrap.

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

**Internal target added 2026-08-08: 99.85%** — 65 minutes per month, 13.1 hours per year.
Explicitly an engineering target, **not** a service commitment, and not published to users; the
published position remains "no guarantee". Planned maintenance fits easily; a single power cut
or failed deploy consumes most of a month's budget, so it is more meaningful annually than
monthly.

The target is currently **unmeasurable** — Prometheus runs on the machine it observes, so a host
outage produces neither measurement nor alert. Adopting a number is a good reason to add the one
external probe that area 15 of the audit already recommended.

**Artifact.** [availability-and-support-commitments.md](availability-and-support-commitments.md)

---

## Item 5 — Support expectations

**Status: Decided** · 2026-08-06; repository wording implemented

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
three-way match required by [launch-gates.md](../goal-1/launch-gates.md) is satisfied by configuration
rather than by discipline.

**Status page — resolved 2026-08-06.** The "Service status" section is removed from
`/support` rather than deferred, because it currently points at a host that does not resolve.
Reasoning in
[availability-and-support-commitments.md](availability-and-support-commitments.md#contradictions-in-existing-copy-that-these-decisions-create).

**Completed:** no helpdesk provider is used for the first cohort. Infomaniak mail and the
support/privacy/security addresses are active and tested under A5. Production configuration and
rendered verification remain Goals 3–5 evidence, not an unresolved support decision.

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

**Applied 2026-08-10.** All nine changes landed together and were verified in the browser:

- `/beta` — "Anyone can request access" → "open to adults resident in Switzerland"; heading
  changed to "Limited to 50 accounts", making the published claim exact rather than approximate
  now that two seats are operator accounts.
- Waitlist attestation — "at least 18 years old **and resident in Switzerland**", still writing
  to `adult_attested_at` with no schema change.
- Terms eligibility — Swiss residence and Swiss governing law stated.
- Privacy Notice — states it is written for the revFADP and offered only in Switzerland.
- `docs/00-workflow.md`, `docs/18-public-beta-handoff.md`, `launch-gates.md` and
  `dpia-screening.md` all updated; the counsel gate rewritten around the narrower scope.

The DPIA screening's **conclusion is deliberately unchanged**. Geography was never what drove
it — longitudinal health-adjacent data about identifiable people was, and narrowing the audience
does not touch that.

**Why this could not stay deferred.** The signed risk acceptance rests, under Q2, on eligibility
being "limited to Swiss residents, stated in the Terms and attested at request time". Until these
edits landed, neither was true — the assessment asserted a control that did not exist. A signed
document describing controls you do not have is worse than no document.

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
# web service
CONTROLLER_NAME=Jan Haag
CONTROLLER_ADDRESS=Lerchenstrasse 74, 4059 Basel, Switzerland
PRIVACY_EMAIL=privacy@gymtrack.ch
SUPPORT_EMAIL=support@gymtrack.ch
SECURITY_EMAIL=security@gymtrack.ch
SUPPORT_URL=

# api service
SUPPORT_EMAIL=support@gymtrack.ch
EMAIL_FROM=Gym Progress Tracker <noreply@send.gymtrack.ch>
```

> **Renamed 2026-08-08 — these were `NEXT_PUBLIC_*` and the prefix was the bug.** Next.js inlines
> `NEXT_PUBLIC_*` at build time and never re-reads it, so the values were baked in as `undefined`
> during `docker build` and no runtime configuration could reach them. Plain server variables are
> read per request. Both services now use the same `SUPPORT_EMAIL` name, which makes the
> three-way match required by `launch-gates.md` structural rather than a matter of discipline.

`SUPPORT_URL` stays empty. It exists for an optional voluntary-support link, which
`launch-gates.md` gates on approved provider terms and voluntary/no-benefit wording. Nothing is
lost by leaving it unset for the first cohort.

These values go in the production and staging environment files only — never in
`.env.example`, which is a template. The repository now reads them dynamically on each legal
route; staging and production must still verify the rendered HTML.

**External contact action complete:** Infomaniak mail and the support/privacy/security addresses
were configured and tested under A5. Production/staging environment configuration and rendered
verification belong to Goals 3–5.

**Configuration this produces:** server-only `CONTROLLER_NAME`, `CONTROLLER_ADDRESS`,
`PRIVACY_EMAIL`, `SUPPORT_EMAIL`, and `SECURITY_EMAIL`; optional client-visible
`NEXT_PUBLIC_SUPPORT_URL`; plus the API sender/reply-to configuration.

> **Repository fix complete; deployed evidence open.** `/privacy`, `/terms`, `/cookies` and
> `/support` force dynamic rendering and use plain server environment variables, so controller
> values are no longer frozen into the image. Goal 3/4 must prove the staging HTML and Goal 5
> must prove production HTML contains the approved values with no `PUBLICATION_BLOCKED` banner.

---

## Item 4 — Final provider and processor inventory

**Status: Decided** · 2026-08-07; provider evidence remains

Written as [processor-inventory-final.md](processor-inventory-final.md). Every provider is
classified as processor, controller-operated, or no-personal-data, because treating them alike
produced a misleading picture.

**Three processors:** Infomaniak (CH — mail), Cloudflare (US — connection metadata and all public
application content in transit), and Resend (US — recipient address and full message body).
Telegram is limited to infrastructure alerts and does not receive personal data.

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

**Closed 2026-08-10.** Both US processors' transfer bases are recorded with version stamps:

| Provider | Basis | Document |
|---|---|---|
| Cloudflare | Swiss-U.S. Data Privacy Framework, EU SCCs (2021/914) + Swiss modifications as fallback | DPA v6.4, 2026-04-03 |
| Resend | EU SCCs (2021/914) with Swiss modifications (§6.5) — no DPF | DPA of 2025-12-31 |

Worth recording that the two do **not** rest on the same footing. Cloudflare's Framework
participation follows an adequacy determination; Resend relies on contractual clauses alone —
and Resend stores recipient addresses and full message bodies including single-use action links.
Cloudflare's payload scope is broader because it processes all public application content in
transit, though it is not the system of record. The transfer mechanisms were accepted under Q3;
the corrected Cloudflare scope was reaffirmed by the controller on 2026-08-19. Any DPA version
change remains a recorded re-screen trigger.

**Resolved 2026-08-19:** current provider documentation records Cloudflare's Free-plan
customer-visible log windows and Resend's email, backup and termination-deletion windows. The
same review corrected the earlier false claim that Cloudflare could not see application payload:
Cloudflare terminates public TLS and processes application content in transit. The transfer basis
is unchanged, and the controller reaffirmed the signed legal-risk acceptance with the corrected
scope on 2026-08-19.

Infomaniak billing is now recorded as CHF 9/year for the domain with no other reported cost or
separately billed mail plan; operations therefore do not rely on paid-tier mailbox recovery. A
status-page host remains open if that page is deployed. Goal 4 inspection has now recorded that
`gym-prod` uses plain ext4 without full-disk
encryption; the documents no longer imply that control exists.

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

**Domain renewal — recorded 2026-08-07; auto-renew confirmed 2026-08-10.**

```
gymtrack.ch expires 2027-07-20
Auto-renew: enabled at Infomaniak
```

Auto-renew removes the known lapse caused by an omitted manual renewal. A failed charge can
still let the domain lapse; the application, all three contact addresses and the Cloudflare
tunnel would then stop at the same moment, and recovering the name could be expensive or
impossible.

Remaining renewal safeguards:

- [x] Enable auto-renew at Infomaniak (confirmed by the controller 2026-08-10).
- [ ] Confirm the payment card on file does not expire before 2027-07-20. Auto-renew fails
      silently when the card has expired, which reintroduces the whole failure with none of the
      warning.
- [ ] Add a calendar reminder for roughly 2027-06-20 as a backstop that does not depend on the
      card or the provider.

**Provider cost recorded 2026-08-19:** Infomaniak costs CHF 9/year for the domain, with no other
reported Infomaniak charge. Cloudflare and Resend remain on their Free plans.

---

## Item 10 — Public-repository intentions and licensing

**Status: Decided** · 2026-08-08

**Publish, under MIT, with full history, including the homelab documentation.**

Written up in [public-repository-plan.md](public-repository-plan.md). Artifacts created:
[LICENSE](../../../../LICENSE), [NOTICE](../../../../NOTICE),
[SECURITY.md](../../../../SECURITY.md).

MIT because the purpose is demonstrating competence rather than controlling use, and nothing in
the dependency set constrains the choice. Full history because 899 commits showing how the
project developed is a real signal to a technical reader; the controller accepts that this
publishes author identities, machine hostnames and deployment-timestamped branch names.

The homelab documentation is published after assessment rather than assumption. A scan found no
MAC addresses, no public IPv4, no SSH keys and no credential values — the Wave A–C reports had
already excluded passwords, fingerprints and serial numbers by design.

**One genuine finding.** `reports/01-host-baseline-audit-report.md:112` published the
ISP-assigned IPv6 prefix `2a04:ee40:20c5:c700::/64`. Unlike the RFC1918 addresses this is
globally unique and tied to a specific subscriber line, and it corroborates the home address
that is public by design on the legal pages. Redacted in the working tree; **still present in
history**, which the full-history decision would publish. A targeted `git filter-repo` scrub is
documented but deliberately left to the controller to decide and execute.

**Secret scan clean.** `gitleaks` over 760 commits returned four findings, all false positives
on a `localStorage` key name matched by entropy.

**Held back deliberately:** `launch-gates.md` and `security-review.md` publish after the gates
are checked rather than before. Beforehand they are an itemised list of one's own unverified
controls; afterwards the same documents read as evidence of a rigorous verification programme.

**3D model boundary:** the two FBX files are explicitly **not covered by MIT**. The controller
confirmed on 2026-08-19 that they came from Tripo 3D's Free tier. Archived official pricing from
2026-06-28 and 2026-07-12—immediately around the files' repository-introduction dates—applies
`CC BY 4.0` to public Free-tier models. That licence permits redistribution and adaptation with
attribution. The public Support page and NOTICE now credit Tripo, link the licence and identify the
application's modifications. See the
[Tripo FBX licence evidence](tripo-fbx-license-evidence.md). The remaining repository-publication
work is the unrelated pre-publication checklist in the plan.

---

## Item 2 — Legal review and DPIA

**Status: Decided** · original controller approval recorded 2026-08-10; Cloudflare-scope
correction reaffirmed 2026-08-19

The full [DPIA](dpia.md) was approved by Jan Haag as controller. The companion
[legal-risk acceptance](legal-risk-acceptance.md) was signed on the same date. The chosen approach
is documented self-assessment and written residual-risk acceptance rather than engaging counsel
for this free, Switzerland-only, invitation-only beta capped at 50 accounts. A 2026-08-19
correction records that Cloudflare processes public application content at its TLS edge; the
controller reaffirmed the acceptance with that corrected scope on 2026-08-19.

This is deliberately precise: the documents are **controller-approved, not counsel-reviewed**,
and they do not certify legal compliance. The acceptance becomes void and qualified review is
required if any recorded trigger fires: scope beyond Switzerland, monetisation, material cap
increase, new sensitive data or AI processing, a personal-data breach, or regulatory contact.

The controller accepted the conservative treatment of training data as potentially sensitive,
the Switzerland-only GDPR position, the Terms/no-medical-advice wording, the DPIA/no-prior-FDPIC-
consultation position, the deferred self-service email-change gap, existing-account policy
acceptance handling, and the stated availability/support posture. The no-medical-advice wording
has been strengthened, and invite-bound signup prevents the earlier hypothesised typo-created
account lockout.

The transfer terms and current provider retention facts have now been recorded. One Goal 5
follow-up remains:

1. Implement and rehearse the personal-data-breach procedure identified in DPIA section 12 as
   part of Goal 5 incident readiness.

Rendered policy/configuration verification remains a separate deployed-system gate.
