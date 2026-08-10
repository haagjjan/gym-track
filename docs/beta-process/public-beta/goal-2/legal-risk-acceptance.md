# Legal Risk Acceptance — Founding Beta

Companion to [dpia.md](dpia.md). Records the controller's position on each question that would
otherwise require qualified legal input, and the reasoning behind it.

**Approach decided 2026-08-08:** documented self-assessment with written risk acceptance, in
preference to engaging counsel. Proportionate to a free, invitation-only, fifty-account beta
operated by one person in Switzerland, and consistent with the risk posture recorded under
item 6.

> **Status: PROPOSED — not yet accepted.** Each position below is drafted for the controller to
> confirm, amend or reject. Nothing here is legal advice, and preparing it does not make the
> controller's answers correct. It makes them *recorded*, which is the point: a documented
> position taken deliberately is defensible in a way that an undocumented assumption is not.

## Not everything here should be accepted

**Q3 is researchable, not a judgement call.** Both providers publish their transfer terms.
Reading them is twenty minutes, not an opinion. It remains the one open action.

*(Q6 was also listed here in an earlier draft, on the basis that a mistyped email could lock a
user out of their own account. Checking the invite-only signup path showed that cannot happen —
see Q6 below. It is now accepted, with a low-effort improvement planned.)*

---

## Q1 — Is this sensitive personal data?

**Position: treat it as potentially sensitive and apply sensitive-data handling throughout.
Do not assert either way.**

The honest answer is that it is arguable, and section 5 of the DPIA sets out both sides. Rather
than pick a side and build on it, the controller adopts the conservative handling standard
without claiming the classification.

This costs almost nothing, because the controls it implies were built anyway: no third-party
disclosure beyond the named processors, opt-in analytics defaulting off, full-disk encryption at
rest, hard erasure on request, and no sharing or profiling.

One genuine structural mitigation: the **body profile — the most clearly physiological
category — never reaches the server.** It is browser-only, excluded from the account export by
design, and documented as such in the export payload itself.

**Residual risk: low.** Being wrong in the direction of caution costs nothing. Being wrong the
other way is what would matter, and this position avoids it.

## Q2 — Does Switzerland-only eligibility avoid GDPR?

**Position: accept that GDPR is not expected to apply, and retain GDPR-equivalent controls
anyway as a hedge.**

The service does not target the EU market: eligibility is limited to Swiss residents, stated in
the Terms and attested at request time; every invitation is approved by hand; there is no
marketing, no EU-language provision, and no payment infrastructure. Reachability from an EU IP
address is not by itself targeting.

The residual uncertainty is real — attestation is self-declared and unverified. It is mitigated
by the controls in ADR 0016 being retained voluntarily, so an EU resident who slipped through
would receive GDPR-equivalent treatment in practice even without a GDPR obligation.

**Residual risk: low-medium, accepted.** Manual approval of every single admission is a stronger
control than most services of this size have.

## Q3 — Transfer basis for Cloudflare and Resend

**Not a risk-acceptance item. Action required.**

Both providers publish their data processing terms and the transfer mechanisms they rely on.
This is a matter of reading and recording, not of judgement:

- [ ] Retrieve Cloudflare's data processing addendum and record the transfer mechanism it
      relies on for Swiss customers.
- [ ] Do the same for Resend.
- [ ] Record both in [processor-inventory-final.md](processor-inventory-final.md), with the date
      retrieved and the version.

Accepting standard published terms is what a controller of this size does. Not knowing which
terms apply is different, and is not something to accept.

## Q4 — Do the Terms hold?

**Position: accept, with one wording strengthening.**

*Liability limitation.* Swiss law generally does not permit excluding liability for gross
negligence or intent, so the limitation may not hold in full. Practical exposure is
correspondingly low: the service is free, no payment is taken, and the plausible harm from a
workout logger failing is loss of training records — mitigated by an export function that users
are explicitly encouraged to use.

*No medical advice.* The clause exists and is clear. Worth strengthening slightly, because the
app computes estimated one-rep maxima and training volume, and a user could conceivably treat a
computed 1RM as a recommendation to attempt that lift. The Terms should say plainly that
calculations are descriptive summaries of what the user recorded and are not training
prescriptions.

*Shared exercise contributions.* The rule — that a custom exercise may persist in others'
history with creator identity removed after erasure — is disclosed in both the Terms and the
Privacy Notice, and is the only way to avoid destroying other users' records. Accepted as
disclosed.

**Residual risk: low, accepted**, subject to the no-medical-advice wording change.

## Q5 — Is a DPIA required, and is FDPIC consultation needed?

**Position: a formal DPIA is probably not mandated at this scale; one was completed regardless.
No prior FDPIC consultation.**

The revFADP requires a DPIA where processing entails high risk, particularly extensive
sensitive-data processing or systematic large-scale monitoring. Fifty accounts is not large
scale on any ordinary reading.

Consultation under Art. 23 arises where a DPIA shows high residual risk that the controller
cannot mitigate. Section 8 of the DPIA identifies none — the medium residual risks are all
"built but not yet verified", which verification closes rather than accepts.

**Residual risk: low, accepted.** Completing an assessment that may not have been required is
not a risk. It found four real defects.

## Q6 — The rectification gap

> **Corrected 2026-08-08.** An earlier draft described this as a user being permanently locked
> out of an account holding their data, and ranked it the most serious item here. That was based
> on the general signup path. **Production runs invite-only, where it cannot happen.**
>
> `apps/api/src/features/auth/auth.repository.ts:166` rejects signup unless the submitted email
> matches the invitation address case-insensitively, and line 177 marks invited signups verified
> on creation. A typo at signup therefore returns `invalid_invitation` and **creates no account
> at all**. A typo at the waitlist stage means no invitation arrives, so again no account exists
> and the applicant simply reapplies.

**Position: accept, with a low-effort fix planned rather than required.**

What genuinely remains is narrower: **a user cannot change their email address after signup.**
That is a legitimate need — changing jobs, leaving a provider, losing access to an old mailbox —
and it is a rectification gap. It is not a lockout, and it does not block launch.

**Planned resolution**, chosen by the controller: a self-service email change that sends a
confirmation link **to the new address** and only switches once it is clicked. This is
self-correcting — a mistyped new address receives nothing, so nothing changes and the existing
address keeps working. It reuses the existing `auth_action_tokens` machinery rather than adding
a mechanism.

**One residual risk, accepted.** A waitlist typo that happens to land on a real address means a
stranger receives an invitation. Probability is low, manual approval of every request is the
mitigation, and the invitation is single-use and expires in seven days.

**Residual risk: low, accepted.** Deferred to a normal development cycle rather than the
pre-launch critical path.

## Q7 — Existing accounts without recorded consent

**Position: record acceptance for the operator account before launch; accept the reasoning.**

The account predates the consent columns, so terms, privacy and adult-attestation timestamps are
all null. It is the controller's own account, so "consent" is somewhat circular — but the
records exist to demonstrate which policy version was presented, and that has value independent
of who the subject is.

**Action:** record acceptance of the current policy versions against the operator account when
the policies are finalised, through the same path any user would take if one exists, or by
direct update if not.

The second account that shared this condition has been deleted.

**Residual risk: low, accepted.**

## Q8 — Availability and support posture

**Position: accept as decided.**

No uptime commitment, no response-time commitment, both stated plainly rather than buried, and
paired with explicit guidance to export data periodically. For a free beta on a single
self-hosted machine, promising less and stating it clearly is more honest than promising more
and breaching it.

Decided under items 5 and 7; recorded here for completeness.

**Residual risk: low, accepted.**

---

## Summary

| # | Question | Disposition |
|---|---|---|
| 1 | Sensitive data | Accepted — conservative handling, no classification asserted |
| 2 | GDPR applicability | Accepted — with voluntary equivalent controls |
| 3 | Transfer basis | **Action** — retrieve and record both DPAs |
| 4 | Terms | Accepted — with a no-medical-advice wording change |
| 5 | DPIA and consultation | Accepted |
| 6 | Rectification gap | Accepted — email change planned, not launch-blocking |
| 7 | Existing account consent | Accepted — record acceptance first |
| 8 | Availability and support | Accepted |

## Review triggers

This acceptance is bounded. It is void, and qualified review becomes necessary, on any of:

- widening beyond Switzerland;
- any monetisation, including donations tied to features;
- raising the account cap materially beyond 50;
- adding data categories, particularly anything clinical, or any AI feature processing user data;
- a personal data breach;
- any regulatory contact.

Otherwise: review within 12 months of launch.

## Controller acceptance

By signing, the controller confirms that the positions above are their own, that they understand
this document is not legal advice and has not been reviewed by a qualified adviser, and that
they accept the residual risk of proceeding on this basis.

```
Controller:  Jan Haag
Date: 10.8.2026
Signature: Jan Haag
```

**Accepting this document does not complete Goal 2's item 2.** The two items marked as action
and not-accepted must be closed first.
