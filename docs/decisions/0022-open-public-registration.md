# ADR 0022 - Open Public Registration (v0)

## Status

Accepted on 2026-11-08. Supersedes [ADR 0012](0012-curated-public-beta-access.md). Amends [ADR 0016](0016-founding-beta-jurisdiction-scope.md).

## Context

The closed Founding Beta did its job. The app has been tested extensively and is ready to be generally available as v0. The beta admission flow was waitlist, then admin approval, then a single-use invitation, then signup. Together with the 50-seat cap and the daily approval limit, it adds friction for users and code we'd otherwise carry into the mobile app (ADR 0021).

## Decision

- **Registration is open.** `REGISTRATION_MODE` takes `ENABLED` or `DISABLED`. Production runs `ENABLED`, and `DISABLED` stays the emergency kill switch. `INVITE_ONLY` is removed.
- **Email verification is required but doesn't block.** New accounts get a session right away and a verification email. Settings shows the pending state with a resend button. Nothing in the app depends on a verified address except the existing account-recovery flows.
- **Scope stays Swiss residents only (ADR 0016).** Signup now carries the attestation that used to be on the waitlist: "I'm at least 18 and live in Switzerland". It is written to `users.adult_attested_at`, together with the accepted terms and privacy versions.
- **Removed:**
  - the waitlist, invitations and admissions admin
  - the seat cap and daily approval limit
  - the Telegram beta notifier
  - the `FOUNDING_BETA_2026` cohort handling
- **In-app messages and campaigns stay, for everyone.** Publishing a campaign now reaches every active account, not only the beta cohort. Optional messages still skip people who turned feedback prompts off. The admin campaigns switch still gates publishing. It keeps its storage in the legacy `beta_settings` row until the deferred cleanup moves it.
- **The admin console gains an Overview** with exact counts and every account's activity (last active, finished workouts, last workout). It shows exact numbers because only administrators see it. The public status page keeps its thresholds (ADR 0019).
- **Kept as well:**
  - the admin members, deletion support and audit tools
  - the onboarding demo (ADR 0020)
  - export, erasure and consent versioning
- **No schema change in this release.** `beta_access_requests` and `users.beta_cohort` stay in the database, unused by product code. Export, erasure and retention keep covering the personal data in them. A follow-up migration drops them, together with that code, and moves `campaigns_open` out of `beta_settings`, once v0 is stable. The campaign and message tables are still in use.

## Consequences

- Anyone can create an account. Abuse protection now rests on the existing auth rate limits, the `DISABLED` kill switch and admin suspension. There's no manual gate anymore.
- The Swiss-only scope is self-attested and can't be enforced by hand-picking applicants. ADR 0016 already treats attestation as evidence, not a control, and that holds here too.
- Rolling back to the previous image works against the same database, because the schema is unchanged.
- Privacy, terms, support and status copy no longer mention the beta, invitations or a seat cap. The policy versions are bumped so acceptance records the new wording.
