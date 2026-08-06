# DPIA Screening — Founding Beta

Date: 2026-08-05. Owner: controller to be supplied. Review state: **screening indicates a full DPIA and qualified legal review are required before public launch**.

This is an engineering screening, not a completed legal assessment. Workout patterns, free-text notes, optional body-profile values, account behavior counters and behavior-triggered feedback can reveal health, routine or lifestyle information. The service is worldwide, involves systematic tracking over time, introduces personalized prompt eligibility, uses processors/transfers, and is operated by a small team. Those factors may combine into elevated risk even with a 50-member cap.

## Processing characteristics

- Data subjects: adults who request and receive Founding Beta access; support correspondents.
- Scale: capped at 50 reserved/active seats, but long-lived and longitudinal.
- Data: identifiers, credentials, detailed training history and notes, optional browser-only body metrics, usage counters, optional event data and feedback.
- Decisions: no automated eligibility, pricing, medical decision, or legal-significant profiling. Counters only decide when a configured in-app prompt becomes eligible.
- Sharing: hosting/database, Resend/email infrastructure, Telegram alerting, off-machine encrypted backups, independent status host, and final support provider.
- Geography: worldwide invitation requests; counsel may require excluded jurisdictions, representative appointments, or transfer safeguards.

## Principal risks and implemented mitigations

| Risk | Impact | Current mitigation | Residual/open work |
| --- | --- | --- | --- |
| Cross-account workout/browser disclosure | Sensitive history exposed | Ownership-scoped queries; scoped device keys; legacy import prompt; IDOR/security test gate | Focused security review and real-browser multi-account test required |
| Credential/token compromise | Account takeover | Argon2; hashed opaque sessions/tokens; HttpOnly Secure SameSite cookie; rate limits; single use/expiry; token redaction rule | Production email/domain and brute-force tests required |
| Excess collection | Unnecessary profiling | Account analytics off by default; no third-party analytics/ads; essential counters separated; plain bounded responses | Verify deployed storage and logs match notices |
| Coercive feedback | User discomfort or dark patterns | Responses optional; permanent dismiss; feedback opt-out; at most one prompt; never over active workout | UX/accessibility review required |
| Deletion failure or backup resurrection | Continued processing after erasure | Immediate lock/session revocation; seven-day grace; idempotent hard deletion; tombstone ledger; 30-day encrypted backup window | Isolated old-backup + latest-ledger proof required |
| Shared exercise erasure conflict | Other users lose valid history or creator identity persists | Delete unreferenced definitions; null creator on shared references; disclosed rule | Legal review of contribution terms required |
| Applicant enumeration | Harassment/account discovery | Generic waitlist response across new/duplicate/account/blocked cases | Black-box timing/content test required |
| Privilege misuse | PII/cap/deletion manipulation | Explicit ADMIN role; owner-only APIs; privileged audit events; Telegram is alert-only | Operator credential/MFA/access-log procedure required |
| International transfers/provider retention | Unlawful or surprising disclosure | Inventory and public processor route foundation | Final providers, regions, contracts, SCC/Swiss safeguards and representatives require counsel |
| Service/medical misunderstanding | Injury or reliance | Beta limitations and no-medical-advice route | Counsel review and final rendered-text sign-off required |

## Required DPIA completion evidence

The controller and qualified reviewer must document: applicable Swiss/EU/other law; purposes and lawful bases per processing category; special/sensitive-data analysis; necessity/proportionality; data-subject consultation decision; processor and transfer assessment; excluded jurisdictions; risk scoring; security controls and test evidence; retention rationale; incident/data-breach workflow; controller/representative/DPO requirements; approval, review date and change triggers.

Re-screen on any material change to data categories, analytics/tracking, campaign logic, automation, minors policy, public geography, processors, payments, AI, sharing, or scale.
