# SQC-9 Rehearsal Script

**Status:** Four of six evidenced; campaign pause and incident notice blocked pending a cohorted member

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

**Blocked 2026-08-21.** Both production accounts return `cohort=NULL` — neither the operator account
nor the operator-created test account passed through the invitation flow that assigns
`FOUNDING_BETA_2026`. The rehearsal campaign published on 2026-08-21 therefore created zero delivery
rows. Re-publishing later does not fix this: deliveries are written at `PUBLISH` time against the
recipient set as it stands then, so a member invited afterwards receives nothing from an existing
campaign. **Rehearsals 2 and 3 require a fresh campaign published after a cohorted member exists**,
which places them after the PROD-7 invitation. The rehearsal campaign should be `END`ed rather than
carried forward.

Worth recording beyond the rehearsal: because delivery requires a cohort, the operator account never
receives its own incident notices. During a real incident, "I can see it" is not a valid confirmation
that members received anything.

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

## 4. Email outage — handoff for the SSH operator

**Owner:** agent SSH track, supervised. **Account:** the operator-created test account, never `JV`.

**What it proves.** Two deliberately opposite behaviours, verified against the real provider rather
than the stubbed mailer the integration tests use:

- A **required** email that fails must roll its action back. Scheduling a deletion while the
  provider is down returns `503 EMAIL_DELIVERY_FAILED` and compensates the account to `ACTIVE`, so
  nobody is stranded in `DELETION_PENDING` holding a cancellation link that was never sent.
- An **informational** email that fails must not roll its action back. Cancelling a deletion
  succeeds even when the confirmation cannot be sent, reporting `notificationStatus: "FAILED"`.

If both rolled back, a provider blip would strand accounts with no route out. That asymmetry is the
property under test.

### Before touching anything

Copy the live secret aside first, so the restore never depends on retrieving the key again:

```sh
install -o root -g 10001 -m 0440 \
  /srv/gym-tracker/secrets/resend-api-key-container \
  /srv/gym-tracker/secrets/resend-api-key-container.rehearsal-backup
```

Confirm the copy is byte-identical before proceeding. The key is also present in the verified
backup set as a second fallback, and can be reissued from the Resend dashboard as a third.

The API reads the key at startup, so each swap needs an API restart. Production carries
approximately no traffic, but the window should still be minutes rather than open-ended.

### Sequence

1. **Provider healthy.** Schedule deletion on the test account. Expect `200`, the account in
   `DELETION_PENDING`, and a `DELETION_SCHEDULED` email carrying a cancellation link. Keep the link
   — the next step needs it.
2. **Break the provider.** Replace the secret file contents with an invalid key, preserving
   `root:10001` and `0440`, then restart the API.
3. **Informational case.** Cancel the deletion using the link from step 1. Expect `200` with
   `notificationStatus: "FAILED"`, and the account back at `ACTIVE`. The cancellation must succeed
   despite the failed confirmation email.
4. **Required case.** Schedule deletion again. Expect `503` with `EMAIL_DELIVERY_FAILED`, and the
   account still `ACTIVE` — compensated rather than left pending.
5. **Restore.** Copy the backup over the secret file, restart the API, and delete the backup copy
   once verified.
6. **Prove recovery.** Trigger one password reset on the test account and confirm delivery.

### Evidence to capture

The `200` and `notificationStatus: "FAILED"` from step 3; the `503` and `EMAIL_DELIVERY_FAILED`
from step 4; the account's `account_status` and `deletion_due_at` after each of steps 3 and 4; the
delivery-failure metric incrementing while the sent metric does not; and the successful send in
step 6. Record the window's start and end times.

**Executed 2026-08-21 against deployed production — PASS.** The controlled window ran from
`2026-08-21T15:50:31Z` to `2026-08-21T16:02:46Z`; the invalid-key outage
was limited to `15:55:42Z` through `16:02:06Z`. The live secret was copied byte-for-byte before the
outage. Every swap preserved numeric ownership `0:10001` and mode `0440`, and only the API was
restarted.

- With Resend healthy, deletion scheduling returned `200`, set the test account to
  `DELETION_PENDING`, and delivered the cancellation link.
- During the outage, cancellation completed at `15:59:13.535Z` with HTTP `200`. The member-facing
  result reported that deletion was cancelled and its confirmation email failed. The database then
  showed `ACTIVE` with both deletion timestamps null. The API metric recorded one
  `DELETION_CANCELLED/FAILED` delivery and no sent delivery.
- During the same outage, a second deletion schedule completed at `16:01:12.157Z` with HTTP `503`
  and `EMAIL_DELIVERY_FAILED`. The database again showed `ACTIVE` with both deletion timestamps
  null. The metric recorded one `DELETION_SCHEDULED/FAILED` delivery while sent remained absent.
- The original secret was restored byte-for-byte before the second API restart. The rehearsal copy
  was removed only after API health and secret verification passed. The final account state is
  `ACTIVE` with both deletion timestamps null, and all live container identities remained unchanged.
- After restore, the password-reset request returned `200` and the fresh API metric recorded one
  `PASSWORD_RESET/SENT` delivery. The controller confirmed the message arrived in the member inbox,
  proving recovery against the real provider.

### Stop conditions

Abort and restore immediately if the account does not return to `ACTIVE` after step 3 or step 4, if
the secret file's ownership or mode changes, or if any container other than the API is disturbed.
An account left in `DELETION_PENDING` at the end of this rehearsal is a failure of the rehearsal,
not an acceptable outcome — the compensation path returning it to `ACTIVE` is precisely what is
being tested.

## Closing the gate

Record for each rehearsal: date, operator, the control changed, the observed evidence, and
confirmation that the control was restored. SQC-9 closes when all four are recorded alongside the
Goal 4 rollback and restore evidence.
