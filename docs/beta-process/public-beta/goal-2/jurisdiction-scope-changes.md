# Switzerland-Only Scope — Wording Changes

Decision: [ADR 0016](../../../decisions/0016-founding-beta-jurisdiction-scope.md).

Every place the beta is described as worldwide, or as open to anyone, has to change together.
Half-applying this list leaves the rendered pages contradicting the decision record, which is
worse than not starting.

**None of these edits have been made.** This is the specification for whoever applies them.

## Application code

### 1. `apps/web/src/features/beta/waitlist-form.tsx:38`
The combined-attestation change. No schema work — it keeps writing to `adult_attested_at`.

```
- <span>I confirm that I am at least 18 years old.</span>
+ <span>I confirm that I am at least 18 years old and resident in Switzerland.</span>
```

The submit handler at line 20 continues sending `adultAttested: true`. Worth understanding
rather than fixing: the checkbox is `required` in HTML, so the form cannot be submitted without
it, but the value is not read and a direct API call could assert it regardless. That is inherent
to self-attestation and is not a defect — the evidence is that the applicant was shown a
specific recorded version of the wording, which `terms_version` and `privacy_version` capture.

### 2. `apps/web/src/app/beta/page.tsx:13`
Currently "Anyone can request access." — the most direct contradiction of ADR 0016.

```
- Anyone can request access. Each request is reviewed personally, and selected members
- receive a seven-day invitation. Access has no scheduled expiry.
+ The Founding Beta is open to adults resident in Switzerland. Each request is reviewed
+ personally, and selected members receive a seven-day invitation. Access has no scheduled
+ expiry.
```

While this file is open, consider line 12: "Limited to 50 founding members". Two of the fifty
seats are operator accounts, so "50 accounts" would be exactly rather than approximately true.
One word, entirely optional.

### 3. `apps/web/src/app/terms/page.tsx:9`
The Eligibility section is where scope belongs legally, and it currently states only the age
condition.

```
- You must be at least 18. Founding Beta access is invitation-only and capped at 50
- reserved/active seats.
+ You must be at least 18 and resident in Switzerland. The Founding Beta is offered only in
+ Switzerland and is governed by Swiss law. Founding Beta access is invitation-only and capped
+ at 50 reserved/active seats.
```

### 4. `apps/web/src/app/privacy/page.tsx`
Add scope to the "Controller and contact" section, so the notice states which regime it is
written against:

> This notice is written for the Swiss Federal Act on Data Protection. The Founding Beta is
> offered only to residents of Switzerland.

The "Processors and transfers" section stays substantively as drafted — Resend and Cloudflare
are still transfers abroad under FADP, and that paragraph already says the final list must name
them. Switzerland-only narrows the analysis; it does not remove it.

## Documentation

### 5. `docs/18-public-beta-handoff.md:5`
Rewrite the release-model sentence. Currently reads "worldwide-targeted, English-only, 18+,
invitation-only" and closes with "Worldwide remains a legal-review target; it is not approval
to promote in every jurisdiction." Both the framing and that caveat are superseded — the caveat
existed precisely because worldwide had not been approved, and the answer is now that it is not
being attempted.

### 6. `docs/00-workflow.md:269`
"50 worldwide-targeted, English-speaking adult founding members" → Switzerland-resident.

### 7. `docs/beta-process/public-beta/launch-gates.md:10`
The counsel gate is written around approving a worldwide target:

> Qualified counsel approves worldwide target or records excluded jurisdictions, Swiss
> FADP/GDPR applicability, …

Rewrite against the narrower scope: Swiss FADP applicability, lawful bases, sensitive-data
analysis, transfers, Terms and liability, no-medical-advice wording, shared contributions and
voluntary support. Drop the excluded-jurisdictions and representative language — ADR 0016
removes the question rather than answering it.

### 8. `docs/beta-process/public-beta/dpia-screening.md`
Two changes, and this one matters most for item 2. Line 5 states "The service is worldwide" as
a factor raising residual risk, and line 14 records "Geography: worldwide invitation requests;
counsel may require excluded jurisdictions, representative appointments, or transfer
safeguards."

Both change to Switzerland-only. The screening's conclusion — that a full DPIA and qualified
review are still required — does **not** change. The scope reduction lowers the surface; it
does not remove longitudinal health-adjacent processing, which is what drove the screening
outcome in the first place.

### 9. `docs/beta-process/public-beta/data-processing-inventory.md`
Check the transfer and geography language once items 4 and 6 close, and reconcile in the same
pass. Nothing here contradicts ADR 0016 outright.

## Deliberately not changed

| File | Why |
|---|---|
| `gym-tracker-operational-readiness-audit.md`, `operational-readiness-audit.md` | Dated snapshots. They accurately describe what was true when written, and Goal 1's report already commits to preserving them |
| `security-review.md` | Dated 2026-08-05 review, same reasoning |
| `goal-1-remediation-report.md` | Dated report of work performed |
| Anything matching "globally unique" | Refers to exercise-name uniqueness, unrelated to jurisdiction |

## Verification

Once applied, this should return nothing outside the preserved snapshots:

```bash
grep -rIn -i "worldwide\|world-wide" docs apps --include="*.md" --include="*.tsx" \
  | grep -v "operational-readiness-audit\|security-review\|goal-1-remediation"
```

Then confirm on the rendered pages — not just in source — that `/beta`, `/terms` and `/privacy`
state Swiss eligibility, and that the waitlist checkbox shows the combined wording. That
verification depends on the static-prerender fix, so it belongs to Goal 4 rather than to
whoever applies these edits.
