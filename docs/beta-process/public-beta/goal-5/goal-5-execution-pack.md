# Goal 5 Execution Pack — Parallel Gate Closure

**Status:** Procedures prepared; every gate below needs controller execution or a controller decision

**Recorded:** 2026-08-20

**Scope:** the gates running in parallel with the agent-led SQC-4 and SSH closure track
(EXT-1, EXT-2, EXT-6, PROD-1, PROD-3, PROD-5, PROD-8, DATA-1). Nothing here is closable from the
repository alone; each entry states what is already verified, what decision is outstanding, and
the exact procedure and evidence to capture.

## PROD-2 — Administrator bootstrap

**Verified in repository.** `apps/api/scripts/promote-admin.mjs` is the audited operator CLI the
gate requires. It takes the address as an explicit argument, updates exactly one non-admin row or
rolls back, and records an `ADMIN_BOOTSTRAPPED_BY_OPERATOR` audit event with a null actor and
`{"method":"operator_cli"}`. There is no runtime email inference anywhere in the promotion path.

**Decided 2026-08-20:** the controller's own `JV` account becomes the first administrator.

Confirm which row the CLI will match **before** running it. The script refuses to act unless exactly
one non-admin account matches, so a mistyped address fails safe rather than promoting the wrong
member — but confirming first turns a rollback into a non-event:

```sql
SELECT id, email, username, role, account_status FROM users WHERE lower(email) = lower('<jv-address>');
```

**Ordering constraint.** The CLI promotes an account that already exists. Production runs with
`REGISTRATION_MODE=DISABLED` through cutover, so no account can be created in that window. The
chosen account must already exist in the production database before promotion.

**Procedure**

```bash
pnpm --dir apps/api admin:promote -- <controller-address>
```

**Evidence to capture:** the returned user id; the `admin_audit_events` row showing
`ADMIN_BOOTSTRAPPED_BY_OPERATOR`, null `admin_user_id` and `operator_cli`; a direct-API check that
an ordinary session still receives 403 from an administrator route.

## PROD-4 — Cloudflare Access scope and public `/beta`

**Verified in repository.** Invite admission is enforced by the API independently of Cloudflare
Access. `apps/api/src/features/auth/auth.routes.ts` rejects signup at the `onRequest` hook when
registration is `DISABLED`, and under `INVITE_ONLY` returns 403 `INVITATION_REQUIRED` unless an
invitation token, both policy versions and an adult attestation are present, then validates the
invitation server-side. Repository evidence for reuse, supersede, wrong-address and expiry is
recorded in [security-review.md](../goal-1/security-review.md).

This is what makes the gate satisfiable: the private gate is defence in depth, not the control
that prevents open signup.

**The conflict to resolve.** The waitlist at `/beta` must be publicly reachable or no external
applicant can request access, while Access currently protects the whole `app.gymtrack.ch`
hostname. The controller's root-domain decision — `gymtrack.ch` and `www` redirecting to the beta
signup page during the beta — inherits that gate and would deliver an Access login wall.

**Decided 2026-08-20: path-scoped Access.**

**Corrected 2026-08-21.** An earlier draft of this section proposed keeping the application behind
Access and exposing only `/beta` and the policy pages. That is unworkable: Access currently admits
one whitelisted address, members cannot be given Access identities, and an invited member who
cannot reach the application after signing up has not been admitted to anything. The gate text is
explicit that the private gate *remains until* server-side admission is proven — it is a temporary
shield to remove, not a scope to narrow.

The member-facing application therefore comes out from behind Access entirely. Access may be
retained on administrative surfaces as defence in depth, but nothing a member needs may sit behind
it.

**Must be re-proven after any narrowing, before the cohort is invited**

- Unauthenticated `POST` to the signup endpoint on the public hostname is refused without a valid
  invitation.
- Direct non-health requests to the API hostname still return `BFF_REQUIRED`.
- The waitlist endpoint remains rate limited and returns its generic accepted response for
  duplicate, existing-account, blocked and paused states.
- Nothing under the application path became reachable unauthenticated.

Narrowing Access removes a layer. Do not narrow it and invite in the same session.

## PROD-6 and PROD-7 — Real mailbox and delivery evidence

**Already recorded.** The sending domain is verified with DNS published through Cloudflare, and the
controller is named delivery owner in [ops/production/README.md](../../../../ops/production/README.md)
with per-batch and daily Resend dashboard review. The root DMARC record carries no aggregate
reporting address, so manual review is the deliberate substitute for the founding cohort.

**PROD-6 — header alignment.** Send one real production message and open its raw source.
`Authentication-Results` must show three passes, and alignment must hold: the `From` domain and the
DKIM `d=` domain must match. A verified domain does not prove alignment — a subdomain sender is
exactly where it usually fails. Capture the header block with the recipient address redacted.

**PROD-7 — the five transactional emails.** Invitation, verification, password reset, deletion
scheduled, deletion cancelled. For each: HTML and plain-text parts both present and legible; every
link resolves to the canonical origin; the action completes once; the same link fails on reuse; and
an expired link is refused. Do not paste raw tokens into evidence — record outcomes, timestamps and
provider message ids.

## PROD-9 — Independent status page

**Partly built.** `ops/status/public/` already holds a dependency-free page template, and a GitHub
Pages publishing workflow was added on 2026-08-20. What remains is hosting activation, DNS, TLS and
the incident publication rehearsal.

**The constraint that decides it:** the status page must survive the thing it reports on. Anything
hosted on the Mac mini or reached through its tunnel is disqualified — during the outage that
matters, it would be unreachable too.

**Decided 2026-08-20: GitHub Pages** — the only option independent of both the Mac mini and Cloudflare, and it adds no processor. A publishing workflow and the custom-domain `CNAME` are committed; see [ops/status/README.md](../../../../ops/status/README.md) for the two remaining caveats (Pages on a private repository needs a paid plan or a dedicated public repository, and GitHub Pages ignores the `_headers` file). Options considered:

| Option | Independent of the Mac mini | Notes |
| --- | --- | --- |
| Hosted status provider free tier | Yes | Purpose-built, includes incident publication and subscriber notices; adds a processor to the inventory |
| GitHub Pages | Yes | Fully independent of both the server and Cloudflare; manual incident updates by commit |
| Cloudflare Pages | Yes of the server | Shares the Cloudflare dependency, so a Cloudflare incident takes both down |

**Also needed:** a `status.gymtrack.ch` DNS record with TLS, and one incident publication
rehearsal — publish a test incident, confirm it is publicly visible without authentication, then
resolve and archive it. If a hosted provider is chosen, add it to
[processor-inventory-final.md](../goal-2/processor-inventory-final.md) with region, transfer basis
and retention before it carries any real content.

## SQC-1 — Remaining browser and provider-log evidence

Repository-level evidence is complete as of 2026-08-20; see
[security-review.md](../goal-1/security-review.md) for the per-threat state. What remains needs the
deployed production:

- Multi-account IDOR matrix repeated through a browser against the production build.
- CSRF, CORS and hostile `Host` behaviour black-boxed behind the final edge.
- Direct API hostname returns `BFF_REQUIRED`; forged forwarding headers fail attribution.
- Distributed and parallel brute-force timing comparison.
- Hostile campaign title, body, choice and free-text payloads rendered in a browser.
- Deployed secret audit, plus Resend, Cloudflare and Telegram log inspection for token or
  recipient leakage, and confirmation of the 30-day retention claim.
- Browser draft privacy: sign-out and account switch on a shared device leave no prior account's
  draft visible.
- Lifecycle liveness: Prometheus rules load and fire on the deployed single-process topology.

## SQC-7 and SQC-8 — Physical device and manual accessibility

Automated coverage already closed SQC-5 and SQC-6: 320, 390, 430 and 1440 px without horizontal
overflow, axe WCAG 2 A/AA and 2.1 A/AA on representative screens, modal focus, trap, inert
background, Escape and restoration, non-modal popovers, and reduced motion. What remains is what
automation cannot produce.

**SQC-7, Samsung S22 Plus, Firefox, on mobile data — not Wi-Fi.** Complete one full workout:
sign in, start a workout, add an exercise, log three sets, end it, then check History, Progress and
Weekly Volume. Confirm the Android keyboard does not obscure the set inputs, that the 3D figure
accepts vertical scroll and horizontal orbit without trapping the page, and that a mid-session
connectivity drop recovers without losing logged sets.

**SQC-8, manual accessibility on production-shaped rendering.** A screen reader pass (VoiceOver or
NVDA) through signup, workout logging and settings; contrast checked against real rendered colours
rather than tokens; reduced-motion honoured with the system setting on; and a keyboard-only pass
that never traps focus or loses the visible focus ring.

Record failures as defects with screenshots. Anything found here changes application code and
therefore the release SHA, so run it before the final freeze if at all possible.

## SQC-9 — Supervised rehearsals

Two of the six are already evidenced under Goal 4: rollback, and database restore with erasure
ledger replay. Four remain, all exercised through administrator runtime controls on production:

| Rehearsal | Control | Evidence |
| --- | --- | --- |
| Signup pause | `waitlistOpen: false` | Waitlist submissions receive the generic accepted response and no new request is queued |
| Campaign pause | `campaignsOpen: false` | No new campaign delivery is created while paused |
| Incident notice | In-app message campaign | The notice reaches an account, is dismissible, and its delivery is recorded |
| Email outage | Suspend or misconfigure the provider key in a controlled window | Required deletion mail compensates the account back to `ACTIVE`; cancellation survives an informational-mail failure |

The email-outage compensation path already has integration coverage; the rehearsal proves it holds
against the real provider. Restore invitation issuance and the provider key immediately afterwards,
and confirm each control returns to its intended state.

## Suggested order

1. **PROD-9 hosting decision** — longest external lead time, nothing depends on it.
2. **PROD-4 Access scoping decision** — gates the root-domain redirect and every external applicant.
3. **PROD-2 account choice** — needed the moment production runs the candidate.
4. **SQC-7 and SQC-8** — before the final freeze, because findings change the SHA.
5. **PROD-6, PROD-7, SQC-1, SQC-9** — after cutover, against the deployed release.
