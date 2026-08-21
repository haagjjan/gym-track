# SQC-9 Rehearsal Script

**Status:** Two of six already evidenced; four ready to run

**Recorded:** 2026-08-21

**Owner:** Controller, with agent verification

SQC-9 covers six rehearsals. **Rollback** and **database restore with erasure-ledger replay** were
executed and recorded under Goal 4 and are not repeated here. The four below run against deployed
production through administrator controls, now that an administrator exists.

Run them in the order given. Each ends by restoring the control it changed — verify the restore,
because a rehearsal that leaves a kill switch flipped is worse than one never run.

Use the **second test account** as the member side throughout, never the administrator account. A
rehearsal that strands an account should never strand the only account that can fix it.

## 1. Signup pause

**What it proves.** Intake can be stopped without an outage, and stopping it does not tell an
applicant anything they could use to enumerate accounts.

The pre-cutover stop conditions require registration, waitlist intake and invitation issuance to
be pausable together, so pause both switches, not just the waitlist.

```
PATCH /api/admin/beta/settings   { "waitlistOpen": false, "invitationsOpen": false }
POST  /api/beta/waitlist         { "email": "<fresh-address>", "adultAttested": true,
                                   "termsVersion": "<current>", "privacyVersion": "<current>" }
GET   /api/admin/beta/requests
```

**Executed 2026-08-21 against deployed production — PASS.** With both switches off, a waitlist
submission from a fresh external address returned `202 {"data":{"received":true}}`, the admin queue
stayed at zero, and the address was absent from it. After restoring both switches the same address
returned `202` and appeared in the queue, and a settings read confirmed
`waitlistOpen: true, invitationsOpen: true`. The response is byte-identical paused and open, so the
pause leaks no service state. The same read incidentally confirmed `accountCap: 50` and
`dailyApprovalLimit: 10`, corroborating PROD-3 from a second direction, and revealed
`campaignsOpen: false` as the pre-existing production state — rehearsal 3 must open it before an
incident notice can publish.

**Evidence.** The waitlist submission returns the same generic accepted response it returns when
intake is open — a different status or body while paused would leak service state. The admin queue
shows **no new request**. Restore with `{ "waitlistOpen": true, "invitationsOpen": true }` and
confirm a subsequent submission does queue.

## 2. Campaign pause

**What it proves.** There are two independent ways to stop in-app messaging: a global switch and a
per-campaign action. Both matter — the global one is the emergency stop, the per-campaign one is
the surgical fix for a single bad message.

```
POST  /api/admin/campaigns                      (create a throwaway campaign, see §3 for the body)
POST  /api/admin/campaigns/{id}/action          { "action": "PUBLISH" }
POST  /api/admin/campaigns/{id}/action          { "action": "PAUSE" }
PATCH /api/admin/beta/settings                  { "campaignsOpen": false }
```

**Corrected 2026-08-21.** An earlier draft of this section claimed the global switch would prevent a
`RESUME` from resurrecting delivery. It does not. `campaigns_open` is consulted only inside the
`PUBLISH`-from-`DRAFT` branch of `setCampaignStatus`, and the due-message query does not filter on
it at all. **The global switch is a publish gate, not a kill switch:** a campaign that is already
live is stopped only by `PAUSE` or `END`. This is worth stating plainly in the incident procedure,
because an operator under pressure may reasonably expect the opposite.

**Two preconditions for meaningful evidence.** Campaign recipients are filtered to
`account_status = 'ACTIVE'` **and `beta_cohort IS NOT NULL`**, so an account created outside the
invitation flow receives no deliveries at all. Confirm the intended recipient carries a cohort
before concluding anything from an empty inbox. And a `NEXT_LOGIN` campaign sets
`trigger_count_target = login_count + 1` at publish time, so the recipient must sign in once after
publication before the message is due — checking before that login proves nothing.

**Evidence.** With the recipient's cohort confirmed and a post-publication login completed,
`GET /api/messages` as that member returns nothing while the campaign is `PAUSED`, because the due
query requires `campaigns.status = 'PUBLISHED'`. `RESUME` then makes the same message appear
without a further login, since the trigger condition is already satisfied. `END` the throwaway
campaign afterwards so it cannot reach a real cohort.

## 3. Incident notice

**What it proves.** A message can be published to every member during an incident, reaches them,
and its delivery is recorded — the mechanism the incident-response plan depends on.

```
POST /api/admin/campaigns
{
  "title": "Rehearsal notice — please ignore",
  "body": "This is a launch-readiness rehearsal. No action is required.",
  "audienceType": "ALL",
  "triggerType": "NEXT_LOGIN",
  "responseType": "ACKNOWLEDGEMENT",
  "essential": true
}
```

`essential: true` is the important field. An incident notice must reach members regardless of
their feedback-prompt preference; a non-essential campaign can be suppressed by that choice, which
would silently exclude exactly the people who opted out of optional messaging.

**Evidence.** Sign in as the test account and confirm the notice appears, is dismissible, and that
`message_deliveries` records the delivery with its shown and dismissed timestamps. Then `END` the
campaign. Do not leave a rehearsal notice publishable.

## 4. Email outage

**What it proves.** The compensation path holds against the real provider, not only against the
stubbed mailer in the integration tests. Two distinct behaviours are being checked, and they are
deliberately different:

- A **required** email that fails must roll the action back. Scheduling a deletion when the
  provider is down returns `503 EMAIL_DELIVERY_FAILED` and compensates the account to `ACTIVE`, so
  nobody is left in `DELETION_PENDING` with no way to cancel.
- An **informational** email that fails must not roll the action back. Cancelling a deletion
  succeeds even when its confirmation email cannot be sent, reporting `notificationStatus: FAILED`.

**Inducing the outage.** Replace the production Resend key with an invalid value, restart the API,
run the flows, then restore the real key and restart again. This is a supervised production change:
have the restore command staged **before** starting, and time-box the window.

**Safety.** Use the test account. Run the required-email case first — if anything goes wrong the
compensation path is exactly what returns the account to `ACTIVE`, so the failure mode is the thing
being tested rather than a new problem.

**Evidence.** The `503` with `EMAIL_DELIVERY_FAILED` and the account back at `ACTIVE`; the
cancellation succeeding with `notificationStatus: FAILED`; the delivery-failure metric incrementing
while the sent metric does not; and after restoring the key, one successful send proving recovery.

## Closing the gate

Record for each rehearsal: date, operator, the control changed, the observed evidence, and
confirmation that the control was restored. SQC-9 closes when all four are recorded alongside the
Goal 4 rollback and restore evidence.
