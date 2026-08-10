# Data Protection Impact Assessment — Founding Beta

Version 1.1 · prepared 2026-08-08 · controller-approved 2026-08-10 · supersedes nothing; completes
[dpia-screening.md](../goal-1/dpia-screening.md)

**Status: approved by the controller, Jan Haag, on 2026-08-10.** This is the controller's own
assessment, prepared with engineering input. Approval records the controller's decision and
risk acceptance; it is not legal advice, a legal-compliance certification, or approval by a
qualified adviser. Section 15 preserves the questions that would need independent review if a
recorded trigger fires.

---

## 1. Controller, scope and governing law

| | |
|---|---|
| Controller | Jan Haag, Lerchenstrasse 74, 4059 Basel, Switzerland|
| Service | Gym Progress Tracker, `app.gymtrack.ch` |
| Processing | Strength - and Hypertrophy - training logging, progress analysis, account management |
| Data subjects | Adults resident in Switzerland who request and receive Founding Beta access; support correspondents |
| Scale | Capped at 50 accounts, of which two are the operator's. Free, no monetisation |
| Governing law | Swiss Federal Act on Data Protection (revFADP, in force September 2023) |
| Territorial scope | Switzerland only, per [ADR 0016](../../../decisions/0016-founding-beta-jurisdiction-scope.md) |

**On GDPR.** Eligibility is limited to Swiss residents and every invitation is approved by
hand, so the service does not target the EU market. GDPR is therefore not expected to apply.
GDPR-equivalent controls — export, erasure, consent versioning, retention limits — are retained
voluntarily, so that widening scope later is a legal review rather than a rebuild. Whether
eligibility-by-attestation is sufficient to avoid GDPR applicability is a question for
section 15.

**Representative and DPO.** No EU representative is expected to be required, given
Switzerland-only scope. The revFADP does not oblige private controllers to appoint a data
protection adviser; none is appointed. The controller performs the role personally.

**Register of processing activities.** Maintained as
[processor-inventory-final.md](processor-inventory-final.md) and
[data-processing-inventory.md](../goal-1/data-processing-inventory.md). Small private controllers have
a partial exemption, but the register exists regardless and costs nothing to keep.

## 2. Why a DPIA at all

The screening concluded that a full DPIA was warranted. That conclusion is retained, with one
honest qualification.

The revFADP requires a DPIA where processing is likely to entail a **high risk** to the
personality or fundamental rights of data subjects, particularly where sensitive personal data
is processed extensively or there is systematic large-scale monitoring. Fifty accounts is not
large scale by any ordinary reading, which is a genuine argument that a formal DPIA is not
legally mandated here.

It is nonetheless being completed, for three reasons. The data is longitudinal and detailed
enough to reveal routine and physical condition over time. The operator is a single person with
no organisational separation of duties. And the assessment is the cheapest way to find the
problems it has in fact already found — the counter bug, the misclassified exercises and the
absent consent records in section 9 all surfaced through this process rather than through
testing.

## 3. Processing activities

Summarised from the inventory. Full field-level detail lives there.

| Category | Data | Purpose |
|---|---|---|
| Account | Email, username, Argon2 password hash, verification state, role, account state | Authentication, authorisation, admission |
| Authentication | Hashed opaque session tokens, action-token hashes, failed-attempt counters, lock state | Secure access and recovery |
| Workout history | Sessions, exercises, sets — weight, reps, RIR, rest, free-text notes | The core product |
| Templates | Named exercise groupings | Repeat workouts |
| Custom exercises | Name, muscles, equipment, creator reference | Shared catalog |
| Body profile | Optional age, height, weight, body-fat estimate | Display calculations. **Browser-only** — never transmitted, never in the server export |
| Preferences | Storage/analytics/feedback choices, onboarding state, display settings | Enforce user choices |
| Counters | Login count, completed-workout count | Campaign trigger eligibility |
| Waitlist | Email, status, policy versions, attestation timestamps, hashed invitation token | Admission and cap control |
| Product events | Event name, bounded properties, account reference | Product understanding. **Opt-in, default off** |
| Campaign delivery | Delivery state and bounded responses | In-app notices and feedback |
| Admin audit | Admin reference, action, target, timestamp | Accountability for privileged actions |
| Support | Correspondence content | Resolving requests |

## 4. Justification for processing

The revFADP does not require a GDPR-style enumerated legal basis. Processing by a private
controller is permissible unless it unlawfully breaches the data subject's personality, in which
case justification is required — consent, an overriding private or public interest, or law.

The controller's position, subject to section 15:

- **Account, authentication and workout data** are processed to deliver a service the data
  subject has actively requested. The processing is the service; there is no breach of
  personality to justify.
- **Product events** are the exception. They are not necessary to deliver the service, so they
  are opt-in with a default of off, and disabling them costs the user nothing.
- **Admin audit records** are retained for accountability. They concern the operator's actions
  rather than the subject's, and are deliberately excluded from ordinary account export because
  a single record may concern more than one person.
- **Waitlist records** are processed to operate a capped admission process the applicant asked
  to enter.

## 5. Sensitive personal data

**This is the most consequential classification judgement in the assessment.**

The revFADP defines sensitive personal data to include data on health. Whether this service
processes it is genuinely arguable in both directions.

**Arguments that it does not.** Weight lifted, repetitions and rest intervals are performance
measurements, not clinical observations. No diagnosis, symptom, medication or treatment is
recorded. Nothing is collected from a medical device or professional.

**Arguments that it does.** Body-fat percentage and body weight are physiological measures.
Free-text set notes are unconstrained and users predictably write things like "shoulder still
hurting" or "back off, recovering from flu". Longitudinal training data reveals physical
capability and its changes over time, which in aggregate says a great deal about a person's
health and routine. The screening reached this conclusion independently.

**Position taken.** The controller treats the data as **potentially sensitive** and applies
sensitive-data handling throughout: no disclosure to third parties beyond the processors in
section 6, opt-in analytics, restricted self-hosted storage, encrypted off-machine backups, and
hard erasure on request. This is the conservative option and costs little, since the controls
were built anyway. The production host's full-disk encryption state remains to be recorded and
is not assumed here.

Mitigating factor worth noting: the body profile — the most clearly physiological category —
**never reaches the server**. It lives in browser storage only, is excluded from the account
export by design, and is documented as such in the export payload itself.

## 6. Processors and transfers

Detail in [processor-inventory-final.md](processor-inventory-final.md).

| Processor | Location | Data |
|---|---|---|
| Infomaniak | **Switzerland** | Support, privacy and security correspondence |
| Cloudflare | United States | Connection metadata — IP, timestamp, hostname. No payload |
| Resend | United States | Recipient address and full body of transactional email |

Telegram was reduced to infrastructure alerts only and no longer processes personal data.

The application, database and encrypted backups run on hardware the controller operates
personally in Switzerland. No third party has access.

**Transfers.** Cloudflare and Resend are US entities, so personal data goes abroad. The revFADP
requires adequate protection for such transfers. The basis applying to each — Swiss-US Data
Privacy Framework certification, Standard Contractual Clauses, or a provider Swiss addendum —
**has not been established** and is question 3 in section 15.

## 7. Necessity and proportionality

- Collection is minimal: an email address and a username. No name, no date of birth, no
  address, no payment data, no device identifiers.
- The most sensitive category is browser-only and never transmitted.
- Analytics is off by default and adds nothing to the service when disabled.
- No advertising, no third-party trackers, no data sharing, no profiling with legal effect.
- Automated decisions are limited to when an in-app prompt becomes eligible. Nothing is decided
  about a person.
- Retention is bounded per category rather than indefinite.

Proportionality is assisted considerably by the service being free. There is no commercial
incentive to collect beyond need, and none has been.

## 8. Risk assessment

Updated from the screening with what verification has since established.

| Risk | Severity | Likelihood | Controls | Residual |
|---|---|---|---|---|
| Cross-account data disclosure | High | Low | Ownership re-derived from the session in every repository query; reorder membership-checked; export joins constrained | **Medium until tested.** Code reads correct; the two-account matrix has not been run |
| Credential compromise | High | Low | Argon2; hashed opaque sessions; HttpOnly/Secure/SameSite cookies; 10-attempt lockout; per-route rate limits | **Medium.** Rate limiting depends on edge header handling, unverified |
| Deletion failure or backup resurrection | High | Low | Immediate lock and session revocation; seven-day grace; idempotent hard erasure under row lock; tombstone ledger; 30-day backup ceiling | **Medium.** The old-snapshot plus latest-ledger drill has not been run |
| Excess or surprising collection | Medium | Low | Analytics off by default; no third-party trackers; body profile never transmitted | **Low** |
| Applicant enumeration | Medium | Low | Generic waitlist response across all outcomes | **Low.** Timing comparison untested |
| Privilege misuse | Medium | Low | Explicit stored ADMIN role; server-side checks on every privileged route; audited mutations | **Low.** No admin account exists yet |
| Loss of service or data | Medium | Medium | Encrypted off-site backups four times daily; 24h RPO, 4h RTO; verified restore tests | **Medium.** Single home server, no failover, single off-site destination |
| Service misunderstood as medical advice | Medium | Low | Explicit no-medical-advice section in Terms | **Medium** — wording unreviewed, see section 15 |
| Operator incapacity | Medium | Low | None. One person holds every credential | **Accepted** — recorded under item 6 |

**No high residual risk is identified that mitigation cannot address**, on the controller's own
assessment. That matters because it determines whether prior consultation with the FDPIC is
required. It is question 5 in section 15.

## 9. Security controls and evidence status

Being explicit about what is built versus what is proven, because conflating the two is how
assessments become fiction.

**Implemented and evidenced by automated tests:** Argon2 hashing; hashed opaque sessions;
ownership scoping across all user-owned resources; invitation single-use, expiry and email
binding; cap-race prevention under row lock; idempotent workout mutations; log redaction of
tokens, cookies and emails; bounded metric labels.

**Implemented, not yet verified in deployment:** production environment assertions; edge header
handling for client-IP attribution; rendered legal pages; cross-account isolation against a
production build; email delivery and authentication; erasure replay after restore.

**Known gaps:** no external uptime monitoring, so a total host outage is silent; containers run
as root; the web CSP has no `default-src` or `script-src`; no dependency scanning in CI.

**Found and fixed through this assessment:** two automated-test artifacts were live in the
shared exercise catalog and would have been visible to every tester; `Barbell Squat` was
misclassified to Glutes, silently corrupting the weekly volume feature;
`completed_workout_count` had never been backfilled, so campaign triggers would have misfired;
an unused second account existed unexplained and has been deleted with a tombstone.

## 10. Retention

| Category | Retention |
|---|---|
| Account and workout data | Until deletion is requested |
| Deletion grace period | 7 days, then permanent erasure |
| Pending waitlist requests | 180 days |
| Expired or consumed invitations | 30 days |
| Identifiable product events | 90 days |
| Campaign responses | 180 days after closure, then response body cleared |
| Application logs and metrics | 30 days |
| Encrypted backups | Strict 30-day wall-clock ceiling, then pruned |
| Local database dumps | 7 days |
| Erasure tombstones | 30 days |
| Support correspondence | 180 days unless a documented legal or security hold applies |

Every window is enforced by the hourly lifecycle scheduler or by backup maintenance, not by
memory. Backup ageing is what makes erasure meaningful: without a ceiling, deleted data would
persist indefinitely in snapshots.

## 11. Data subject rights

| Right | Mechanism | State |
|---|---|---|
| Information | Privacy Notice, Terms, Cookie/Storage pages, versioned | Drafted; **not rendering** — see below |
| Access and portability | Password-confirmed JSON export from Settings, 11 data categories | Built, untested end to end |
| Erasure | Password-confirmed, 7-day grace, immediate session revocation, hard erasure | Built, untested end to end |
| Rectification | **No self-service path.** Email and username are immutable | **Gap** — question 6 |
| Objection to optional processing | Analytics and feedback toggles in Settings | Built |
| Withdraw device storage consent | Explicit choice plus per-account device clearing | Built |

**Repository fix completed; deployed verification remains.** The legal routes now opt into
dynamic rendering, so server-side controller/contact values are no longer frozen as build-time
placeholders. Goal 4/5 must still verify the rendered staging and production HTML and confirm
that no `PUBLICATION_BLOCKED` banner appears with the approved configuration.

## 12. Personal data breach workflow

The revFADP requires notification to the FDPIC as soon as possible where a breach is likely to
result in high risk to the personality or fundamental rights of data subjects, and notification
of data subjects where necessary for their protection or where the FDPIC requires it.

**No procedure currently exists.** This is a genuine gap identified in the operational audit and
it is not closed by this document. The minimum required before launch:

1. Named criteria for what constitutes a reportable breach here — cross-account disclosure,
   database exfiltration, credential compromise, backup repository compromise.
2. A containment sequence: revoke sessions, pause registration, preserve evidence before
   remediation.
3. An assessment step recording what data, how many subjects, and what harm is plausible.
4. FDPIC notification content and route, prepared in advance rather than drafted under pressure.
5. Data-subject notification wording, drafted in advance for the same reason.
6. A post-incident record.

Assigned to Goal 5. Launching without it means improvising during the one event where
improvisation is most costly.

## 13. Data subject consultation

Not conducted. The revFADP contemplates seeking the views of data subjects where appropriate.
For a fifty-person invitation-only beta drawn largely from the operator's own network, and where
the beta itself is the consultation mechanism, formal consultation is disproportionate.

Feedback collection is built in — the campaign system supports rating, single-choice and
free-text responses. That is the practical substitute and it is recorded as such rather than
claimed as consultation.

## 14. Approval and review

| | |
|---|---|
| Prepared | 2026-08-08 |
| Approved by | **Jan Haag, controller, 2026-08-10** |
| Review date | Within 12 months of launch, or on any trigger below |

**Re-screen triggers**, unchanged from the screening: material change to data categories,
analytics or tracking, campaign logic, automation, minors policy, geographic scope, processors,
payments, AI features, data sharing, or scale. Widening beyond Switzerland is a trigger. Any
form of monetisation is a trigger.

## 15. Questions covered by controller self-assessment

These are the points where independent advice could reduce uncertainty, ordered by what it
costs to be wrong. The controller chose the documented positions in
[legal-risk-acceptance.md](legal-risk-acceptance.md) and approved them on 2026-08-10 instead of
engaging counsel for this bounded beta. They are not open approval conditions. A qualified
adviser should revisit them if any recorded review trigger fires. The provider transfer basis
in item 3 remains a factual documentation action, not a legal-approval question.

1. **Is this sensitive personal data?** Does strength-training history — combined with optional
   browser-only body metrics and unconstrained free-text notes — constitute data on health under
   Art. 5(c) revFADP? This determines the handling standard, and it is the question everything
   else hangs from. Section 5 sets out both sides.

2. **Is Switzerland-only eligibility sufficient to avoid GDPR applicability**, given that
   eligibility is self-attested rather than verified, the site is reachable from anywhere, and
   every invitation is manually approved?

3. **What transfer basis applies to Cloudflare and Resend**, and does anything need recording or
   signing beyond accepting their standard terms?

4. **Do the Terms hold?** Specifically: the liability limitation against Swiss consumer
   protection; the no-medical-advice disclaimer given that the app computes estimated one-rep
   maxima and training volume; and the shared-exercise contribution clause, under which one
   user's exercise definition persists in others' history after that user's erasure.

5. **Is a DPIA legally required at this scale, and is prior FDPIC consultation needed?** Section
   8 identifies no unmitigable high residual risk, which on the controller's reading means no
   consultation is required. Confirmation would be useful.

6. **Is the absence of a rectification path acceptable?** Email and username are immutable, so a
   user who mistypes their address at signup has no self-service correction — and on an
   invitation-bound signup may be locked out entirely.

7. **Do the existing accounts need anything?** Both predate the consent columns and hold no
   recorded policy acceptance. One is the controller's own. Is retrospective acceptance needed
   before the beta opens?

8. **Is the published availability and support posture adequate?** No uptime commitment, no
   response-time commitment, and a service holding data users may care about.

---

## What this document does not do

It does not establish compliance, and it should not be cited as though it does. It is a
structured, honest account of what is processed, why, what could go wrong and what has been done
about it — approved by the controller with engineering input and not independently reviewed.

Its most useful property may be that writing it surfaced four real defects that testing had not.
