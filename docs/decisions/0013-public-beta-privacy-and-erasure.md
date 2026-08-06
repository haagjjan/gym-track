# ADR 0013: Public Beta Privacy, Erasure, and Backup Aging

## Status

Accepted for implementation on 2026-08-05. Public wording still requires owner and qualified legal review.

This ADR supersedes ADR 0010 only for snapshot retention duration and restore ordering. ADR 0010 remains authoritative for encrypted Restic topology and access controls.

## Context

The app stores account, workout, body-related, authentication, device-local, and first-party event data. Public users need accurate disclosure, export, and account erasure. A database restore must not resurrect an account whose deletion completed after the restored snapshot.

## Decision

- Account-linked product analytics are opt-in. Security/audit records are separate essential processing.
- Browser preferences are user-scoped; functional persistence is optional, while the session cookie and active-set recovery remain essential.
- Account deletion immediately revokes sessions, locks access for a seven-day grace period, then hard-deletes live user data.
- A minimal erasure tombstone is exported to a separate encrypted operations ledger and replayed before a restored database is reopened.
- Encrypted application backups have a strict maximum age of 30 days; local plaintext dumps retain seven days.
- Shared exercise definitions referenced by other users survive only after creator identity is removed.
- Public legal routes are versioned and configuration-backed so production cannot silently publish invented controller or contact details.

## Consequences

Hard account erasure is an explicit exception to normal workout soft deletion. Deletion requires ordered, idempotent repository work and a restore drill. Policy, cookie/storage, processor, retention, and data-rights documentation must change whenever implementation or provider behavior changes.
