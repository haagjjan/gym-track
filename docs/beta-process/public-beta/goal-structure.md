# Founding Beta Goal Structure — Goals 0 to 6

**Status:** Canonical goal declaration

**Recorded:** 2026-08-20

**Author:** Controller (Jan Haag)

This is the authoritative statement of what each Founding Beta goal covers and who can complete
its work. Individual goal directories hold the evidence; this file holds the definitions. Where a
goal report and this declaration disagree, this file states the intent and the report states what
was actually executed — see the reconciliation note at the end.

I would not treat the 41 audit areas as 41 separate goals. Many are evidence checks, and one
well-designed exercise can close several at once. I would use a hybrid structure: a small number
of outcome-based goals, each containing tasks classified by who can complete them.

## Recommended structure

### Goal 0 — Capture a safe baseline

Turn the current worktree into a reproducible "Founding Beta foundation" checkpoint.

The batch commit is reasonable because the changes already form one broad implementation
foundation. It will not be ideal for code review or `git bisect`, but it is better than continuing
with an indefinitely dirty worktree.

Before committing:

- Review every changed/untracked filename and the diff statistics.
- Check that no `.env`, credentials, dumps, logs, or local artifacts are included.
- Run `git diff --check`.
- Run database integration and Playwright smoke tests in addition to the checks already passed.
- Describe the commit as an implementation checkpoint, not as a beta-ready release.
- Prefer making the commit on a dedicated beta-readiness branch.
- Avoid creating a production tag yet.

A suitable concept would be `feat: add founding beta implementation foundation`. After that
checkpoint, all readiness work should use smaller, focused commits.

### Goal 1 — Close repository-level blockers

This is mostly LLM-autonomous and does not require SSH.

It includes:

- Restore browser zoom and fix modal focus behavior.
- Reconcile `localStorage` draft behavior with the processing inventory.
- Add CSV formula escaping.
- Define and implement workout mutation replay/concurrency safety.
- Make production email configuration fail closed.
- Improve lifecycle cleanup visibility and scheduling.
- Add missing administrator containment actions.
- Expand authorization, lifecycle, invite-failure, accessibility, and concurrency tests.
- Update stale documentation.

The LLM can implement and verify most of this independently. Controller intervention is needed
only for product or architectural choices — for example, whether drafts should actually be
session-scoped, or what level of email reliability architecture is appropriate.

### Goal 2 — Resolve human and external decisions

This can run alongside Goal 1, but it is human-led.

It includes:

- Controller identity and public contact details.
- Legal review and DPIA.
- Allowed jurisdictions.
- Final provider and processor inventory.
- Support expectations.
- Provider billing, ownership, MFA, recovery, and renewals.
- Availability expectations for a home-hosted beta.
- Whether existing owner workout data stays in the beta database.
- Choice of staging host.
- Public-repository intentions and licensing.

An LLM can prepare inventories, decision documents, checklists, draft policy language, and
configuration guidance. It cannot approve legal conclusions, create a trustworthy
account-recovery arrangement on the controller's behalf, enter secret credentials, or accept
operational risk.

### Goal 3 — Establish staging

This is where infrastructure access first becomes important.

The staging environment should have:

- A separate database and credentials.
- A separate restricted hostname.
- Production-like BFF and ingress behavior.
- Safe email recipients or a sandbox.
- Synthetic data only.
- Monitoring and alerting.
- A documented reset policy.
- The same immutable application artifacts intended for production.

The retained Render setup may provide a convenient starting point, but the important requirement
is isolation and production similarity — not the particular provider.

SSH is needed only if staging is hosted on one of the controller's Macs or another SSH-managed
server. A managed staging platform might instead require provider-console/API access.

### Goal 4 — Execute the formal verification program

This is a mixture of autonomous and supervised work.

The LLM can largely run:

- Repository and CI checks.
- Migration rehearsals against isolated data.
- Multi-user authorization tests.
- Browser automation.
- Load tests.
- Failure injection.
- Security-header and ingress checks.
- Rollback rehearsal.
- Evidence collection and launch-gate updates.

The controller must participate in:

- Physical-device testing.
- Screen-reader and real mobile-data checks.
- Real email inbox and bounce testing.
- Provider-console validation.
- Destructive restore rehearsals.
- Legal acceptance.
- Decisions about defects or residual risk.

One staging campaign can close many audit items simultaneously: admission, email, authorization,
mobile, migration, rollback, capacity, monitoring, alerting, and incident handling.

### Goal 5 — Prepare and verify production

This is the main SSH-dependent stage.

SSH would be useful or required for:

- Identifying the actual deployed commit and configuration.
- Verifying service users, ports, firewall and Docker boundaries.
- Inspecting Caddy/tunnel behavior from the server side.
- Verifying migrations and database health.
- Checking timers, backups, monitoring and Alertmanager.
- Testing startup after reboot.
- Running capacity checks on the target hardware.
- Exercising rollback and write-pause procedures.
- Performing isolated restore and replacement-host drills.
- Configuring secure remote administration.

Production access should be just-in-time and supervised, using a dedicated operator account,
least privilege, and explicit approval before anything that changes real data, migrations,
networking, backups, or availability. Secrets should be entered by the controller or through the
provider — not pasted into chat or committed.

SSH is not required for legal work, code fixes, most tests, documentation, CI, GitHub
preparation, or provider-account planning.

### Goal 6 — Launch the initial cohort

This should remain deliberately human-controlled:

1. Confirm all canonical launch gates have current evidence for the same release.
2. Record an explicit go/no-go decision.
3. Invite 10 members.
4. Observe for 72 hours.
5. Review backups, errors, capacity, email, support, and unexplained writes daily.
6. Stop automatically on the documented P0/P1 conditions.
7. Expand only after another explicit decision.

The LLM can monitor evidence, produce daily readouts, investigate failures, and suggest
responses. It must not independently invite users, accept legal risk, delete production data, or
decide to resume after a serious incident.

## Task ownership model

Every task carries one of these labels:

| Type | Meaning |
|---|---|
| Autonomous | Repository work the LLM can implement, test, and document without external access |
| Decision needed | The LLM prepares options; the controller chooses before implementation continues |
| Supervised external | The LLM can operate provider/SSH systems while the controller supplies access and approves material changes |
| Human verification | Physical device, email inbox, legal, billing, identity, or recovery evidence only the controller or a specialist can provide |
| Approval gate | Explicit human acceptance required even if all technical work passes |

This prevents unnecessary interruptions: the LLM completes autonomous batches alone, collects
related questions, and asks only when the answer changes the architecture, legal position, cost,
or production risk.

The overall sequence is therefore:

```text
Baseline
   ├── Repository blockers ─────┐
   └── Human/external decisions ├── Staging ── Verification ── Production ── 10-user launch
                                ┘
```

The first practical move is the baseline commit, followed by turning the audit blockers into
roughly six outcome-based goals — not dozens of isolated tasks.

## Reconciliation with executed work

Recorded 2026-08-20 so the numbering is not read as a status shorthand without checking:

- **Production work is filed under Goal 4, not Goal 5.** This declaration assigns "prepare and
  verify production" to Goal 5, but
  [goal-4-production-verification.md](goal-4/goal-4-production-verification.md) already records
  production preflight, secret installation, backup/restore drills, the version-controlled
  production definition, and the cutover runbook under Goal 4. Either the report should be split
  or this declaration should absorb production into Goal 4.
- **Gate count is not fixed.** [launch-gates.md](goal-1/launch-gates.md) is the live list and its
  total is allowed to move as gates are added or closed; earlier planning referred to 29, and the
  controller confirmed on 2026-08-20 that the count itself is not a target.
- **`goal-5/` now exists**, created 2026-08-20: see [goal-5-scope.md](goal-5/goal-5-scope.md). It
  collects the production stage plus the items deferred to Goal 5 by Goal 2 and the DPIA
  (incident-response plan, admin bootstrap, deployed configuration verification, public `/beta`
  reachability under Cloudflare Access, root-domain DNS and redirect). Production evidence
  already gathered under Goal 4 stays in that report rather than being moved. No `goal-6/`
  directory exists yet.
