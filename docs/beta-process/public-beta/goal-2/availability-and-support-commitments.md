# Availability and Support Commitments

Decisions: items 7 and 5 in the [Goal 2 decision record](goal-2-decision-record.md).

This document holds the wording that will be published, and the exact places it goes. Nothing
here has been applied to the application yet — item 1 must supply the real contact addresses
first, and the legal pages need the rendering fix noted in the decision record before any of
it reaches a user.

## Internal availability target — 99.85%

Set 2026-08-08. **This is an internal engineering target, not a service commitment**, and the
distinction is deliberate. Nothing below is published to users, and the published position
remains the one in the next section: no uptime guarantee.

The label matters because these documents are published. A reader who finds a number without
that framing will reasonably treat it as a promise, which would contradict the user-facing
wording.

| Window | Downtime budget at 99.85% |
|---|---|
| Month | **65 minutes** |
| Year | **13.1 hours** |

**Achievability.** Planned work fits comfortably: a monthly reboot costs roughly three minutes
and container updates about a minute each. The pressure comes entirely from unplanned events —
a single power cut, ISP outage or failed deployment consumes most of a month's budget in one go.
Swiss mains power is excellent; residential internet is the weaker link. Expect to meet this in
most months and miss it two or three times a year, which makes it a more meaningful **annual**
target than a monthly one.

> **It cannot currently be measured.** There is no external uptime monitoring, and the existing
> Prometheus stack runs on the machine it observes — so a total host outage produces no
> measurement and no alert. Until an external probe exists, this target is unfalsifiable and
> functions as an intention rather than a metric.
>
> This is the same gap recorded as high-criticality in area 15 of the operational audit. Adopting
> a numeric target is a good reason to close it: one external check, alerting independently of
> the Mac mini, converts the target into something real.

## The commitments, stated plainly

**Availability.** No uptime target, no maintenance window, no notification undertaking. The
service is a beta running on a home server and may be unavailable without warning.

**Support.** One mailbox, read by one person, plus in-app announcements for anything affecting
everyone. No published response time.

Both were chosen so that nothing is promised that a single operator on holiday would breach.
The corollary is that the wording has to work harder: silence must not read as abandonment,
and an outage must not read as the tester's own fault.

## Draft published wording

### Availability — for the `/beta` page and Terms

> **This is a beta.** Gym Progress Tracker runs on a single self-hosted server. It may be
> slow, unavailable, or interrupted without notice, and features may change or be removed
> during the beta. There is no uptime guarantee and no service-level commitment.
>
> Please keep your own record of anything you would be upset to lose. You can export your
> full workout history at any time from Settings, and we recommend doing so periodically.

The export sentence matters. It is the honest mitigation for having no availability
commitment, it costs nothing, and the export feature already exists and is already
password-confirmed.

### Support — replacing the "Contact" section on `/support`

> **Getting help.** Email {supportEmail}. Every message is read by the person who builds and
> operates the service. There is no support team and no guaranteed response time, but you will
> get a reply.
>
> It helps enormously if you include what you were doing, roughly when, which screen you were
> on, and which browser and device you were using.
>
> Never send your password, session cookie, invitation token, verification link or
> password-reset link. Nobody operating this service will ever ask you for them.

Two deliberate changes from the current copy in `apps/web/src/app/support/page.tsx:9`. First,
"you will get a reply" replaces an implied commitment with a personal one — keepable, and it
prevents silence from reading as abandonment. Second, "Nobody operating this service will ever
ask you for them" turns a list of prohibitions into an anti-phishing rule the tester can
actually apply.

### Announcements — new section on `/support`

> **Service announcements.** Anything affecting everyone — planned downtime, a significant bug,
> a fix worth knowing about — appears as a message inside the app. You do not need to check
> anywhere else.

This is the user-facing description of the campaign system. It is also the reason the campaign
system earns its place at launch rather than after it.

### Security reports — keeping the existing section, lightly adjusted

> **Reporting a security problem.** Send security reports to {securityEmail}. Replies come from
> {supportEmail} — the two addresses reach the same person. Please give us a reasonable chance
> to fix an issue before disclosing it publicly.
>
> While testing, do not access, modify or retain another person's data, and do not run
> disruptive tests against the live service. No bounty is offered, but genuine reports are
> genuinely welcome and we will credit you if you would like that.

The "replies come from" sentence exists because `security@gymtrack.ch` is a forwarding address
rather than a full alias, so it can receive but not send. One sentence removes the only
confusing consequence, and it is honest rather than apologetic.

The current wording at `apps/web/src/app/support/page.tsx:12` is accurate but reads as a
warning to the reporter. Security researchers respond better to a clear scope plus an offer of
credit, and it costs nothing.

## Contradictions in existing copy that these decisions create

Both were found while drafting and both are live now.

**1. `/support` links a status page that does not exist.**
`apps/web/src/app/support/page.tsx:11` tells users that service and maintenance information is
published at `status.gymtrack.ch`. That host is not deployed — `launch-gates.md` still lists it
as an open gate, and `ops/status/README.md` describes the checked-in page as "a template, not a
live status claim". A tester following that link during an outage gets a dead domain, which is
the worst possible moment for it.

Given the item 7 decision to publish no availability commitment, there were two coherent
options. Either deploy the status page before launch and keep the link, or remove the section
until it exists. Deferring the status page while advertising it was not one of them.

**Resolved 2026-08-06: remove the section.** The "Service status" block at
`apps/web/src/app/support/page.tsx:11` comes out, so the page stops pointing at a domain that
does not resolve. The template in `ops/status/` stays ready and the section returns when the
page is genuinely live. The edit has not been made yet — it belongs with the support-page
rewrite below, so both land together.

**2. `/beta` says "Anyone can request access."**
`apps/web/src/app/beta/page.tsx:13` directly contradicts the Switzerland-only decision. This
belongs to the item 3 wording cleanup and is listed here so it is not lost — the full list of
files needing that change is being assembled under item 3.

## Where each string goes

| Wording | Destination | Blocked on |
|---|---|---|
| Availability statement | `apps/web/src/app/beta/page.tsx`, plus a Terms section | Terms redraft (item 2 / Pass D) |
| Support contact | `apps/web/src/app/support/page.tsx` "Contact" section | Real address from item 1 |
| Announcements | New section on `apps/web/src/app/support/page.tsx` | — |
| Security reports | `apps/web/src/app/support/page.tsx` "Security reports" section | Real address from item 1 |
| Status section removal | `apps/web/src/app/support/page.tsx:11` | Decision above |

Every one of these renders through `LegalPage`, so none will display correct contact values
until the static-prerender defect is fixed. That dependency is recorded against item 1.

## Configuration these decisions produce

Values still to be supplied by item 1:

```
SUPPORT_EMAIL=                  # API; must equal the two below and the Resend reply-to
NEXT_PUBLIC_SUPPORT_EMAIL=      # published on /support
NEXT_PUBLIC_SECURITY_EMAIL=     # published on /support
```

`launch-gates.md` requires the API `SUPPORT_EMAIL`, the published web support contact and the
Resend reply-to to be the same address. Note that `apps/api/src/main.ts` already wires
`EMAIL_REPLY_TO` from `SUPPORT_EMAIL`, so that half is satisfied by configuration alone.

No helpdesk provider is used, so item 4 gains no processor from this decision. The mailbox
provider itself is a processor and is still to be chosen under item 1.
