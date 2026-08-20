# Goal 5 Scope — Prepare and Verify Production

**Status:** Scope defined; execution not started

**Recorded:** 2026-08-20

**Owner:** Controller, with supervised agent assistance

Goal 5 is the SSH-dependent production stage defined in
[goal-structure.md](../goal-structure.md): identify the actual deployed commit and configuration,
verify service users, ports, firewall and Docker boundaries, inspect Caddy/tunnel behavior from
the server side, verify migrations and database health, check timers, backups, monitoring and
Alertmanager, test startup after reboot, run capacity checks on the target hardware, exercise
rollback and write-pause procedures, perform isolated restore and replacement-host drills, and
configure secure remote administration.

Production access is just-in-time and supervised: least privilege, and explicit approval before
anything that changes real data, migrations, networking, backups, or availability. Secrets are
entered by the controller or through the provider, never pasted into chat or committed.

## Relationship to the Goal 4 report

A substantial part of this work was already executed and recorded under Goal 4, in
[goal-4-production-verification.md](../goal-4/goal-4-production-verification.md). That evidence
stays where it was executed rather than being moved; Goal 5 does not repeat it. Already done
there:

- Read-only production preflight, deployed release and host resource state.
- Persistent loopback-bound reverse backup tunnel as a macOS launch agent.
- Fresh backups, strict 30-day retention maintenance, and repository checks.
- PostgreSQL, configuration and erasure-replay restore drills, before and after installing the
  candidate recovery artifacts.
- Production Resend and BFF secrets installed root-owned, and captured in a verified backup on
  2026-08-19.
- The version-controlled non-secret production Compose/Caddy definition and cutover runbook in
  [ops/production](../../../../ops/production/README.md), with CI invariant checks.

What remains below is the work that still has no evidence.

## Work items

Labels follow the ownership model in [goal-structure.md](../goal-structure.md).

| # | Item | Ownership |
|---|---|---|
| 1 | Production cutover: build exact-SHA images, install the committed definition, migrate, recreate services with `REGISTRATION_MODE=DISABLED`, verify release identity and container hardening | Supervised external, then Approval gate |
| 2 | Deployed configuration verification: controller identity, the three contact addresses, `SUPPORT_EMAIL`/reply-to match, and rendered Privacy, Terms, Cookie/Storage, Support and beta-limitations pages, then version-archive them | Supervised external + Human verification |
| 3 | Administrator bootstrap: first real user gets `role=ADMIN` through a controlled procedure with no email inference; decide the disposition of existing owner workout data | Decision needed, then Supervised external |
| 4 | Public reachability of `/beta` while Cloudflare Access gates the application — see the open conflict below | Decision needed, then Supervised external |
| 5 | Root domain and `www` DNS and redirect behavior | Decision recorded below, then Supervised external |
| 6 | Incident response plan: assessment step, FDPIC notification content and route, data-subject notification wording, and a post-incident record | Decision needed + Human verification |
| 7 | Independent status page at `status.gymtrack.ch` with TLS, plus an incident publication rehearsal | Supervised external |
| 8 | Received-header evidence that SPF, DKIM and DMARC align on a real production send from `noreply@send.gymtrack.ch` | Human verification |
| 9 | Remaining rehearsals: signup pause, campaign pause, incident notice, email outage | Supervised external |

Items 3, 4, 5 and 6 were deferred here by the Goal 2 decision record, the Goal 2 external-actions
list and the DPIA. Item 6 in particular is carried from the DPIA, which notes that launching
without it means improvising during the one event where improvisation is most costly.

## Root domain and redirect — decision recorded 2026-08-20

`gymtrack.ch` and `www.gymtrack.ch` do not resolve today; only `app.gymtrack.ch` does. Anyone
typing the bare domain gets nothing, and `app.` is not a memorable entry point.

The controller decided:

- **During the Founding Beta:** `gymtrack.ch` and `www.gymtrack.ch` redirect to the beta signup
  page, so the invitation request path is the easily reachable one.
- **After the beta:** the redirect moves to the general starting point rather than the beta signup
  page.

This is deliberately a two-phase change. Record the post-beta switch as a follow-up so the beta
redirect does not silently become the permanent behavior.

## Open conflict — Access scope versus public `/beta`

These two committed requirements are currently incompatible, and the redirect above depends on
resolving them:

- `launch-gates.md` keeps the Cloudflare private gate until an unauthenticated direct API signup
  cannot bypass invite admission.
- The waitlist at `/beta` must be publicly reachable, or no external applicant can request access.

Cloudflare Access currently protects the whole `app.gymtrack.ch` hostname, so a bare-domain
redirect inherits the gate and delivers an Access login wall instead of the signup form. Goal 2
flagged this as something to reconcile deliberately rather than discover at launch.

The likely shape of the answer is per-path Access scoping — public `/beta` and the legal and
support pages, gated everything else — but that must be decided and then verified from the
server side, because the gate's protection is what currently prevents direct API signup from
bypassing invite admission. Do not narrow Access scope without re-proving that property.

## Exit criteria

Goal 5 is complete when production runs the approved release with verified configuration, every
launch gate in [launch-gates.md](../goal-1/launch-gates.md) that depends on a deployed production
carries current evidence for that same release, and the rollback path has been exercised rather
than assumed. Goal 6 — the first ten-person cohort — starts only after an explicit recorded
go/no-go decision.
