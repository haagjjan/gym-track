# ADR 0012: Curated Public Beta Access

## Status

Accepted for implementation on 2026-08-05.

## Context

The public beta must be publicly requestable without becoming open registration. The owner must be able to select applicants, cap admissions at 50, pause admissions without a deployment, and audit every privileged decision. Existing opaque sessions remain the authentication foundation.

## Decision

- Production registration uses `INVITE_ONLY`; `DISABLED` remains the emergency environment kill switch.
- A public email-only waitlist records adult and privacy acknowledgements.
- Owner approval occurs only through an authenticated `ADMIN` API/UI. Telegram notifications contain a request reference only and never perform approval.
- Invitations are hashed, single-use, valid for seven days, and reserve one of 50 seats.
- Runtime settings own waitlist, invitation, campaign, account-cap, and daily-approval controls.
  All three activity switches default paused on a fresh migration and require an explicit
  administrator action before public intake or prompts begin.
- Approved accounts receive the `FOUNDING_BETA_2026` cohort and verified-email state when the invitation is consumed.
- Admin authorization is an explicit stored role. No email-address inference or client-side-only guard is accepted.

## Consequences

The API gains waitlist/admin/campaign boundaries and an audit trail. Admission requires database transactions to prevent cap races. Local development may retain enabled registration, while public production cannot create an account without a valid invitation.
