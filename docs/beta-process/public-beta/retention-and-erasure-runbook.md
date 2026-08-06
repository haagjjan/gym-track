# Retention, Erasure and Restore Runbook

## Scheduled lifecycle

The API cleanup process expires invitations and finalizes due deletion requests idempotently. It removes identifiable events after 90 days, clears campaign response bodies after 180 days, removes pending waitlist records after 180 days, removes expired/joined invitation records after 30 days, and expires database tombstones after 30 days. Production must monitor cleanup failures; process uptime alone is insufficient evidence.

The backup job exports current tombstones to `/srv/gym-tracker/state/erasure-ledger/current.csv` before staging the encrypted Restic snapshot. Local logical dumps expire after seven days. Weekly maintenance explicitly forgets snapshots older than 30 days relative to the current maintenance time, then prunes; it does not measure the window from an old latest snapshot.

## Account deletion

1. User confirms the current password and receives the exact deadline.
2. API changes the account to `DELETION_PENDING`, revokes sessions, creates one hashed cancellation token and emails the raw single-use link.
3. Normal login is locked. User may cancel by link; an administrator may cancel an authenticated urgent support request. Both restore `ACTIVE`; the admin path is audited.
4. After the deadline, one transaction removes user-owned live data, nulls creator identity on retained shared exercises, deletes unreferenced exercises, records a 30-day tombstone and deletes the user.
5. Backup export preserves the tombstone outside the database dump.

## Restore rule — mandatory ordering

Never attach a restored database to the web/API network before erasure replay.

1. Isolate the restore host/container with no public network route.
2. Restore the selected database dump.
3. Apply the exact reviewed target schema migrations while the restore remains isolated. This ensures the replay tables exist even when the selected dump predates the public-beta migration.
4. Obtain the newest valid `current.csv` erasure ledger independently of the selected older database dump. Validate its Restic snapshot, permissions and expected CSV header.
5. Run `ops/backup/scripts/replay-erasure-ledger.sh POSTGRES_CONTAINER LEDGER.csv`.
6. Query every ledger user ID across `users`, sessions, workouts/templates, app events, messages, targets and access requests; all live personal rows must be absent. Shared exercises may remain only with `created_by_user_id IS NULL`.
7. Run foreign-key validation, application smoke and ownership-isolation checks.
8. Record operator, snapshot IDs, ledger source, hashes, row verification and time. Only then may the application network reopen.

The replay is transactionally idempotent. If it fails, destroy the isolated restore and investigate; do not bypass it. A full old-snapshot/latest-ledger drill is a launch blocker because the checked-in scripts alone do not prove the deployed repository, credentials or operator procedure.
