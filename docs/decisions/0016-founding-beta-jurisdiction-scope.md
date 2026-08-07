# ADR 0016 - Founding Beta Jurisdiction Scope

## Status

Accepted on 2026-08-07. Supersedes the worldwide framing in `docs/18-public-beta-handoff.md`
and `docs/00-workflow.md`.

## Context

The Founding Beta was drafted as worldwide-targeted, English-only, 18+ and invitation-only.
`docs/beta-process/public-beta/dpia-screening.md` identified that framing as a material risk
factor in its own right: a worldwide service processing health-adjacent longitudinal data,
operated by one person, triggers the widest possible set of obligations.

Worldwide scope would require, at minimum, a lawful-basis analysis under GDPR alongside Swiss
FADP, an assessment of whether an Article 27 representative is needed, transfer safeguards for
every processor, and counsel review of which jurisdictions to exclude. That is a large and
expensive surface for a free beta capped at fifty accounts, most of whom will come from the
operator's own network.

The scope is also genuinely enforceable rather than aspirational, because every invitation is
approved by hand. Admission is already a manual, audited decision under ADR 0012.

## Decision

The Founding Beta is offered to **residents of Switzerland only**.

- Swiss FADP is the governing regime. GDPR exposure is avoided through eligibility rather than
  through compliance effort.
- Eligibility is self-attested at the point of request. The existing waitlist checkbox is
  relabelled to cover both conditions — "I confirm that I am at least 18 years old and resident
  in Switzerland" — and continues to write to `beta_access_requests.adult_attested_at`. No
  schema change is made. The evidence survives the conflated column name because
  `terms_version` and `privacy_version` already record which wording was shown.
- A request from someone who is not eligible is simply never approved. It remains `PENDING` and
  is removed by the existing 180-day retention rule. No new status is introduced, and the
  applicant receives the same generic intake response as everyone else, preserving the
  anti-enumeration property.
- **GDPR-equivalent controls are retained voluntarily.** Export, erasure, consent versioning,
  retention limits and breach-response handling stay as built.

## Consequences

The legal surface shrinks to one regime, which makes the outstanding DPIA and any counsel
review materially cheaper and faster. Terms and the Privacy Notice both shorten: no
representative discussion, no data-subject transfer analysis.

Transfers do not disappear. Resend and Cloudflare remain processors outside Switzerland, and
FADP still requires adequate protection for transfers abroad. That assessment is unchanged in
substance and is an input to the deferred legal-review item.

Retaining GDPR-equivalent controls means a later widening of scope is a legal review rather
than a re-engineering exercise. Since the controls already exist, the ongoing cost is close to
zero.

Attestation is self-declared and unverifiable. It is evidence that the applicant asserted
eligibility against a recorded version of the published wording, not proof of residence. That
is the normal standard for this kind of gate and is proportionate to a fifty-person free beta,
but it should be described accurately in the DPIA rather than as a control.

Every document describing the beta as worldwide must change in the same pass, or the rendered
pages will contradict this record. The affected files are listed in
`docs/beta-process/public-beta/goal-2/jurisdiction-scope-changes.md`.

Widening scope later requires a new ADR, a re-screen under the DPIA's own change triggers, and
counsel review before any non-Swiss applicant is approved.
