# Restore Gym Tracker PostgreSQL

## Safety rule

Never restore over the live production database during validation. The supported first step is always an isolated PostgreSQL 17 container, network, and volume with no published port.

## Locate and verify the backup

On `gym-prod`:

```bash
sudo /srv/gym-tracker/scripts/backup-status.sh
sudo systemctl status gym-tracker-backup.service --no-pager
sudo journalctl -u gym-tracker-backup.service -n 200 --no-pager
```

The status command loads the protected Restic environment without printing the repository password or destination credential.

## Repeat the proven isolated restore

```bash
sudo /srv/gym-tracker/scripts/restore-test-postgres.sh
```

The script:

1. acquires the shared backup lock;
2. restores the latest off-machine snapshot into a root-only temporary directory;
3. verifies that exactly one custom-format dump is present;
4. starts an isolated PostgreSQL container using the production image with a temporary network and volume;
5. creates placeholder roles required by the archive;
6. runs `pg_restore --exit-on-error`;
7. compares hashes of per-table row counts with production;
8. checks the migration ledger and foreign-key validation state;
9. runs a query under the runtime role's permissions;
10. writes a sanitized result under `/srv/gym-tracker/backups/reports/`;
11. removes only resources carrying the `gym-stage11-*` test prefix.

It never prints user rows or changes production.

## Prepare a production replacement

Only perform these steps after an incident decision confirms that the current database must be replaced:

1. Record the current time, release commit, latest snapshot, and incident reason.
2. Disable application writes by stopping the proxy, web, and API containers; keep evidence and the existing PostgreSQL volume intact.
3. Repeat the isolated restore and require a passing report.
4. Create a new production candidate volume rather than reusing or deleting the old volume.
5. Restore the verified dump into the candidate using the same PostgreSQL major version.
6. Recreate production login-role credentials from protected secret files; never copy temporary restore-test credentials.
7. Validate schema migrations, row-count hashes, foreign keys, runtime permissions, and representative application health.
8. Update Compose to reference the candidate volume only after a reviewed rollback path exists.
9. Start PostgreSQL, migrations if and only if the restored schema is behind the deployed release, API, web, and proxy in that order.
10. Retain the old volume until the owner accepts the recovered service and a new backup succeeds.

Do not run `docker compose down --volumes`, delete the old volume, or run migrations speculatively.

## Validation checklist

- PostgreSQL reports healthy.
- No database port is host-published.
- The migration ledger matches the deployed release.
- Per-table row-count hash matches the chosen recovery point.
- All foreign keys are validated.
- The runtime role can read and write only its intended objects.
- API health, authentication, workout history, and one non-destructive analytics query pass.
- Monitoring and backup metrics return.
- A new encrypted off-machine snapshot succeeds after recovery.
