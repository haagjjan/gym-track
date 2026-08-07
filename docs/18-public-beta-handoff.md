# Curated Founding Beta Handoff

## Release model

The release is worldwide-targeted, English-only, 18+, invitation-only, and capped at 50 reserved/active seats. Anyone may submit an email-only request, but only an explicit administrator may approve it. The truthful public wording is “Founding Beta — invitation only — limited to 50 members.” Worldwide remains a legal-review target; it is not approval to promote in every jurisdiction.

Production registration uses `INVITE_ONLY`. `DISABLED` remains the environment kill switch. Database runtime settings independently pause waitlist intake, invitation issuance and campaigns, set the total cap, and enforce the rolling 24-hour approval limit. Active, suspended and deletion-pending accounts plus unexpired invitations consume seats.

## Implemented repository foundation

- Versioned migration for explicit roles/account states/cohort, policy evidence, privacy preferences, reliable counters, onboarding, waitlist/invitations, runtime settings, audit records, cancellation tokens, erasure tombstones, campaigns and deliveries.
- Generic public waitlist response, PII-free Telegram alert, owner-only review, transactional seat reservation, hashed seven-day single-use invitations and automatic email verification on invited signup.
- JSON account export, password-confirmed seven-day deletion, immediate session revocation/lock, single-use and audited support cancellation, hard erasure and shared-exercise anonymization.
- Account-linked product events off by default, user-scoped device storage, explicit storage choice, legacy-data import/discard prompt and per-account device clearing.
- Synced onboarding/checklist, repeatable tour, non-persistent practice workout, Help entry and accessible contextual information popover.
- In-app inbox and owner campaign control for supported one-time triggers/responses; plain text only, HTTPS action URLs, immutable publication, pause/end, opt-out and active-workout suppression.
- Public policy/support route foundations, optional voluntary support link, external static status bundle, branded Resend HTML/plain delivery, signed BFF client attribution and independent endpoint limits.
- Strict 30-day Restic retention configuration, externalized erasure-ledger export and isolated replay script.
- Browser zoom remains available, and genuinely modal surfaces share initial focus, keyboard trapping, Escape close, background inertness, scroll locking and focus restoration. Representative Playwright keyboard/axe coverage is repository evidence only; real-device and assistive-technology checks remain open.
- Active-set recovery uses a versioned user/workout/exercise-scoped local-storage envelope for no more than 24 hours after the last edit. The logical mutation UUID survives failed saves; expired/malformed/legacy data and all save/discard/workout/account/device-clear paths remove the draft.
- Session-exercise and set creates are parent-scoped idempotent operations. Workout structural writes serialize through parent-row locks, while beta update/reorder behavior remains last-write-wins with authoritative refetch. CSV export escapes spreadsheet formula prefixes.
- Transactional email is synchronous and observable through bounded, redacted kinds/outcomes. Invitation failures preserve `INVITED` for explicit resend; required deletion-scheduling failure compensates to `ACTIVE`; cancellation and final-erasure notifications follow their documented non-blocking rules.
- One API-process, single-flight lifecycle runner executes on startup and hourly with phase isolation, deletion continuation, bounded metrics and alert rules. Canonical administrator API/UI supports user listing, ordinary-user suspension/reactivation, session revocation and recent cursor-paginated audit review; the older beta-user list is a deprecated read-only alias.

## Evidence and external work still required

The implementation does not make the beta launch-ready by itself. Follow [launch-gates.md](beta-process/public-beta/launch-gates.md), the repository findings in [security-review.md](beta-process/public-beta/security-review.md), and the bounded [Goal 1 remediation report](beta-process/public-beta/goal-1-remediation-report.md). No launch-gate checkbox may be changed from repository implementation alone. In particular, real controller/contact/provider facts, qualified legal review and full DPIA are unavailable in the repository. Production Resend DNS/delivery/bounce behavior, Telegram, external status hosting, operator credentials, 30-day pruning, restore/erasure replay, black-box security review, capacity, responsive/device/assistive-technology QA and incident/rollback rehearsals require deployed evidence.

The application deliberately renders a visible configuration warning on legal pages while required controller/contact values are absent. Do not remove that gate or publish placeholder facts.

## Rollout

Finish the Goal 1 automated acceptance matrix and create the user-owned clean batch commit before staging. Staging/provider/legal/SSH work belongs to later explicit goals. Run every launch gate without inferring evidence from the repository. Only after every blocker has linked deployed evidence, invite 10 users, observe 72 hours, then add no more than 10 per rolling 24 hours with deliberate pauses. Apply the stop rules in the launch-gate document without exception.
