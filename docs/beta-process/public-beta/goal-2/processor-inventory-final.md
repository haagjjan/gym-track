# Provider and Processor Inventory

Item 4 of the [Goal 2 decision record](goal-2-decision-record.md). Supersedes the unresolved
cells in [data-processing-inventory.md](../goal-1/data-processing-inventory.md), which remains
authoritative for *what data exists*; this document covers *who touches it*.

**Boundary.** This is an engineering inventory prepared for legal review, not legal advice. It
records what each provider does and what must be verified. It does not conclude whether a given
transfer is lawful — that is item 2.

**Scope.** [ADR 0016](../../../decisions/0016-founding-beta-jurisdiction-scope.md): Switzerland
only, Swiss FADP governing, GDPR-equivalent controls retained voluntarily.

## Classification

Not every provider is a processor, and treating them alike produces a misleading inventory.

- **Processor** — a third party that processes personal data on the controller's instructions.
- **Controller-operated** — infrastructure the controller owns and runs. No third party gains
  access, so there is no processor relationship even though personal data is present.
- **No personal data** — a supplier in the build or supply chain that never sees user data.

## Processors

| Provider | Entity / region | Personal data it touches | Transfer basis | Retention |
|---|---|---|---|---|
| **Infomaniak** | Infomaniak Network SA, Geneva, **Switzerland** | Inbound and outbound support, privacy and security correspondence, including whatever a user chooses to write. Mailbox contents at rest | **No transfer** — Swiss processor, Swiss data subjects | Until deleted from the mailbox; provider-side retention not recorded |
| **Cloudflare** | Cloudflare, Inc., **US** (Swiss traffic likely served from EU edge) | Connection metadata for every request: client IP, timestamp, user agent, requested hostname and path. Access identity for operator authentication. **No application payload** — TLS terminates at the tunnel and Caddy | **Swiss-U.S. Data Privacy Framework**, with EU SCCs (2021/914) plus Swiss modifications as fallback for Restricted Transfers. *Cloudflare DPA v6.4, 2026-04-03; retrieved 2026-08-10* | Free-plan log retention not recorded |
| **Resend** | Resend, Inc., **US** | Recipient address, subject and full body of every transactional email — invitations, verification, password reset, deletion and cancellation. Delivery, bounce and complaint metadata | **EU SCCs (2021/914) with Swiss modifications** (§6.5). No DPF certification relied on. *Resend DPA, last updated 2025-12-31; retrieved 2026-08-10* | Provider-side; the application keeps **no** outbox and no retry payload |
| ~~**Telegram**~~ | Telegram Messenger Inc. | **No personal data as of 2026-08-07.** Monitoring alerts only — alert name, severity, component, summary. The beta-request notification is being switched off, see below | n/a | — |

## Controller-operated

No third party gains access, so these are not processor relationships — but they are where the
data actually lives, and the inventory is incomplete without them.

| Component | Location | Holds | Note |
|---|---|---|---|
| `gym-prod` Mac mini | Operator's home, Switzerland | The production PostgreSQL database — every account, workout, set, note and token | Physical security is the operator's home. Disk encryption state should be recorded |
| Restic backup destination | Operator's MacBook, Switzerland | Encrypted snapshots of the full database plus deployment configuration and secrets | Encrypted before leaving the server. 30-day strict retention per ADR 0013 |
| **Apple Mail on the operator's Mac** | Switzerland | Local copies of all support, privacy and security correspondence | Support mail containing personal data is stored on a laptop that leaves the house. **FileVault confirmed enabled 2026-08-07** |
| Erasure ledger | `gym-prod`, root-owned, outside the database dump | Deleted user UUIDs and finalization times | Replayed before any restored database is reopened |

## No personal data

| Supplier | Role | Note |
|---|---|---|
| GitHub | Source code, CI | No user data — unless an issue or CI log ever contains it, which the private repository makes unlikely but not impossible |
| npm / Docker Hub / ghcr.io / quay.io | Build-time dependencies and images | Supply-chain dependency, not a data relationship. Images are version-pinned |
| Free Exercise DB | Static exercise catalog | Unlicense, pinned revision `b0eed06`. Imported at migration time; no runtime dependency |
| `status.gymtrack.ch` host | Incident status page | **No provider chosen** — the page is not deployed. Whichever is chosen must be independent of the Mac mini, and it will hold no personal data |

## Transfers abroad

Switzerland-only scope removes the transfer question for *data subjects*. It does not remove it
for *processors*: FADP still requires adequate protection when personal data goes abroad.

**Established 2026-08-10** from each provider's published data processing agreement. The
documents were retrieved and retained privately; the version stamps below are what matters,
because vendors revise these and what counts is the version relied on.

- **Infomaniak** — Swiss processor, Swiss data subjects. **No transfer arises.** This is the
  strongest position in the inventory and a direct consequence of the item 1 provider choice.
- **Cloudflare** — relies on the **Swiss-U.S. Data Privacy Framework**, with EU SCCs (2021/914)
  plus Swiss modifications as a fallback for Restricted Transfers. *DPA v6.4, 2026-04-03.*
  Framework participation is the cleaner of the two mechanisms, since it rests on an adequacy
  determination rather than on contractual terms alone.
- **Resend** — relies on **EU SCCs (2021/914) with Swiss modifications** (§6.5), with no DPF
  certification. *DPA last updated 2025-12-31.* SCCs are a recognised mechanism; recording the
  difference from Cloudflare matters because the two do not rest on the same footing, and
  Resend is the processor handling the most sensitive payload — recipient addresses and full
  message bodies.
- **Telegram** — reduced to infrastructure alerts only, so no personal data is transferred and
  no basis is required.

**What this does and does not settle.** Each provider's mechanism is now recorded rather than
assumed, which was the open action. Whether each is *sufficient* for this processing remains a
judgement the controller has accepted under Q3 of
[legal-risk-acceptance.md](legal-risk-acceptance.md) rather than one confirmed by a qualified
adviser. Re-check on any DPA version change — that is a recorded re-screen trigger.

## Account facts

| Provider | Account | Plan | Limits | Notes |
|---|---|---|---|---|
| Infomaniak | Direct | Mail service on the domain | — | Cost to record |
| Cloudflare | Direct | **Free** | — | |
| Resend | **Google SSO** (operator's main personal Google account), created 2026-08-07 | **Free** | ~3,000/month; the free tier is also commonly capped around 100/day | Region not exposed on the free plan |
| GitHub | Direct | | | |
| Telegram | Bot | | | |

**On the Resend region.** The setting is not surfaced on the free plan, and it does not change
the analysis: Resend, Inc. is a US entity, so the data goes to the US regardless of which
datacenter serves it. What matters for FADP is the transfer basis, not the region string.
Record it as US and move on.

**On the send limits.** Whatever the exact figures, there is ample headroom. The admission
design caps approvals at 10 per rolling 24 hours, so invitation traffic cannot exceed 10 mails
a day. Verification, reset and deletion mail is incidental on top of that. A 50-account beta
will not approach a 3,000/month ceiling.

**On Google SSO.** Resend has no password of its own — it is only as secure as the Google
account behind it, and inherits that account's MFA rather than having its own. Recovery runs
through Google, not through Resend.

The account used is the operator's **main personal Google account**, not the dedicated recovery
Gmail. The controller has considered this and accepts it at the current scale, consistent with
the residual-risk decision recorded under item 6: this is a hobby and portfolio project, and the
consequence of losing Resend access is an interruption to invitations rather than data loss or
an unrecoverable asset. It would be worth separating if the project ever became something people
depend on — the same trigger already recorded for item 6.

## Open cells

Reduced to what actually affects a launch decision.

**Provider documentation:**

- [x] **Transfer basis recorded 2026-08-10** for both US processors — Cloudflare on the
      Swiss-U.S. Data Privacy Framework (DPA v6.4, 2026-04-03), Resend on EU SCCs with Swiss
      modifications (DPA of 2025-12-31). See *Transfers abroad* above. This was the last open
      action in Goal 2.
- [ ] Provider-side retention windows for Cloudflare and Resend remain unrecorded. Deliberately
      not chased: both are published standard terms on free or near-free tiers, and neither
      changes a launch decision. Retrieve if a recorded trigger fires.

**Pairs with the item 8 inspection:**

- [ ] Disk encryption state on `gym-prod` — needs SSH.

**If it ever happens:**

- [ ] Status page host, if the status page is deployed.

**Answered 2026-08-07:** Resend account exists (free tier, Google SSO, US entity). FileVault
confirmed enabled on the MacBook. Telegram no longer processes personal data — see below.

**Still to record:** exact Cloudflare/Resend provider-side retention from their current terms.
Precise plan costs are operational bookkeeping rather than a legal approval condition.

## Telegram — decided 2026-08-07

**Keep monitoring alerts. Switch off the beta-request notification.**

Telegram carried two independent streams:

1. **Alertmanager alerts** (`ops/monitoring/alertmanager/alertmanager.yaml`) — alert name,
   severity, component, summary. No personal data. **Retained** — a real operational control,
   and losing it would be a genuine regression.
2. **Beta-request notifications** (`apps/api/src/shared/operator-notifier.ts`) — a request
   reference and timestamp. Pseudonymous, but personal data in context. **Dropped.**

**Telegram therefore stops processing personal data entirely** and is no longer a processor in
the FADP sense. That removes one transfer basis from item 2's workload.

**Implementation: no code change.** The streams are already configured independently.
`apps/api/src/main.ts:43-48` attaches the operator notifier only when `TELEGRAM_BETA_BOT_TOKEN`
and `TELEGRAM_BETA_CHAT_ID` are both set; `server.ts` otherwise falls back to
`noopOperatorNotifier`. Alertmanager uses separate file-based secrets (`ALERTMANAGER_TELEGRAM_*`),
untouched. The change is simply **leaving those two API variables unset in production**.

**Consequence, accepted.** Nothing pushes a notification when someone requests access, so the
admin queue is checked deliberately. Verified workable: `GET /api/v1/admin/beta/requests` returns
newest-first and `beta-admin-panel.tsx` renders `PENDING` rows at the top with an Approve action,
so a new applicant surfaces on opening the page. With approvals capped at 10 per rolling 24 hours
there is no volume pressure — the only cost is remembering to look.

## Public-facing summary

Draft for the Privacy Notice "Processors and transfers" section, replacing the current
placeholder. Publishable only once the open cells close and item 2 approves the wording.

> **Who else processes your data.** The application and its database run on hardware operated
> personally by the controller in Switzerland. Encrypted backups are held on a second device,
> also in Switzerland.
>
> Three external providers are involved. **Infomaniak** (Switzerland) hosts the email addresses
> used for support, privacy and security correspondence. **Cloudflare** (United States) carries
> traffic to the application and sees connection information such as your IP address, but not
> the contents of what you do in the app. **Resend** (United States) delivers account emails —
> invitations, verification, password resets and deletion notices — and therefore handles your
> email address and the contents of those messages.
>
> No advertising networks and no third-party analytics are used.

## Maintenance

Re-check on any provider change, plan change, or new integration. The DPIA screening lists
processor changes as a re-screen trigger, so this document and the DPIA move together.
