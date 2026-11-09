# JV Production Data Migration Report

**Execution date:** 2026-07-21
**Source:** MacBook local PostgreSQL development database
**Target:** `gym-prod` PostgreSQL database `gym_tracker`
**Result:** Completed and verified

## Summary

The development data was not present on the Mac mini. The production database contained the five expected schema migrations and twelve canonical muscle groups, but no users, exercises, workouts, sets, or templates.

The local database contained 161 users and substantial automated/development data. Importing the complete database would therefore have copied unrelated test accounts, authentication artifacts, and test history into production. A selective migration copied the `JV` account and its complete workout-domain data instead.

The import completed atomically. PostgreSQL schema state was unchanged, all imported references are valid, and all four production containers remained healthy.

## Imported data

| Relation | Imported rows |
|---|---:|
| Users | 1 |
| Exercises | 47 |
| Exercise muscle assignments | 52 |
| Exercise secondary-muscle assignments | 2 |
| Workout templates | 5 |
| Workout template exercises | 19 |
| Workout sessions | 106 |
| Session exercises | 396 |
| Sets | 736 |

The workout history ranges from 2025-10-28 through 2026-07-16. Eleven soft-deleted workout rows were retained because they are part of the account's source history and the selective migration preserved domain-row deletion state.

## Exercise ownership handling

The source account owned 38 exercises. Those rows remain owned by `JV` in production.

The account's workouts and templates also referenced nine required exercises that were not owned by `JV`: one was already a system exercise and eight belonged to unrelated development accounts. The unrelated accounts were not imported. Their eight required exercise definitions were imported as system exercises so the workout history remains complete without introducing fake production users or broken foreign keys.

Final production exercise ownership:

| Ownership | Rows |
|---|---:|
| `JV` owned | 38 |
| System | 9 |

## Deliberately excluded data

The following local development data was not imported:

- the other 160 development/test users;
- browser and API sessions;
- email-verification and password-reset tokens;
- application event records;
- authentication failure counters and account lockout state;
- exercises, workouts, sets, and templates unrelated to `JV`.

The password hash was copied without being printed or exposed, so the existing account password remains the login credential. Login failure state was reset to zero and no lockout was retained. The source account's unverified-email state was preserved; production currently contains no verification token for the account.

## Safety controls

Before production changed:

1. The existing local PostgreSQL volume was copied to a mode-`0600` safety archive outside the repository.
2. A selective transfer database was built locally from the current schema.
3. The selected rows were restored into a second disposable local database.
4. Counts and foreign-key relationships were verified with zero orphaned rows.
5. The transfer archive was copied over SSH with mode `0600` and its SHA-256 digest was verified on both hosts.
6. Production schema statements were compared with the local schema.
7. Production target tables were asserted to be empty.
8. The archive was restored into a disposable database built from the production schema.
9. The disposable server-side restore matched the manifest and contained zero orphaned rows.
10. A full custom-format production backup was created before the live import.

The first schema-fingerprint check stopped before backup or import because `pg_dump` emitted a server-only comment saying that the initdb-created `public` schema would not be created. A line-by-line comparison found this comment to be the only difference. The check was corrected to hash executable schema statements rather than dump comments; the local and production DDL hashes then matched exactly.

## Pre-import production backup

The retained rollback backup is:

```text
/srv/gym-tracker/backups/postgres/gym_tracker-pre-jv-import-20260721T194236Z.dump
SHA-256: ccb9fec68d57f667016bef69ac125a643d33cc47a5e6f486bde9c85ad7fd1820
```

The file is mode `0600`, owned by `admin-gym:gym-tracker`, and was validated with `pg_restore --list` before import.

## Production verification

Post-import checks confirmed:

- exactly one production user, with username `JV`;
- every imported table matches the row manifest above;
- zero orphaned exercise, muscle-group, template, workout, or set references;
- zero imported sessions, action tokens, or application events;
- zero retained login failures or account lockout;
- the five-row migration ledger is unchanged;
- the executable schema hash is unchanged;
- PostgreSQL remains running and healthy;
- API, web, and reverse-proxy containers remain running and healthy;
- `http://192.168.1.57/login` returns HTTP 200;
- the unauthenticated auth endpoint returns the expected HTTP 401.

## Cleanup

The sensitive transfer dump, schema-comparison file, and administrative helper were removed from `/home/admin-gym` after verification. The disposable server database and container-side temporary archive were removed automatically. The temporary root shell was closed, its tmux session ended, and sudo authorization was invalidated.

The full pre-import production backup was intentionally retained. The MacBook's original development database was not modified or removed.

## User verification still required

Database and service verification are complete. The remaining end-user check is to sign in as `JV` at `http://192.168.1.57/login` with the existing local-development password and visually confirm the workout history, templates, exercises, Progress view, and Weekly Volume view.
