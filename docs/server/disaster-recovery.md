# Gym Tracker Disaster Recovery

## Scope and objectives

This runbook covers recovery of the private `gym-prod` service from an application, database, configuration, or primary-host loss.

```text
Recovery Point Objective: 24 hours
Recovery Time Objective: 4 hours
```

These are operational targets rather than guarantees. The current independent repository is an encrypted Restic repository on the owner's MacBook.

## Protected state

Backups include:

- a PostgreSQL custom-format logical dump;
- Compose, deployment environment, and systemd files;
- Caddy configuration;
- Prometheus rules, Alertmanager routing, and Grafana provisioning;
- production scripts and Stage 11 recovery documents;
- operational state files;
- required server secrets;
- the deployed Git commit and a staged-file inventory.

Backups exclude Docker images, container writable layers, the live PostgreSQL data directory, Prometheus history, and rebuildable repository files. Grafana runtime preferences are not authoritative because dashboards and data sources are provisioned from files.

## Frequency and retention

- The server attempts an encrypted backup four times daily to accommodate MacBook sleep periods.
- A warning fires after 30 hours without a successful snapshot and a critical alert after 48 hours.
- Public-beta policy strictly removes snapshots older than 30 wall-clock days and prunes the repository; ADR 0013 supersedes the earlier tiered retention.
- Before a restored database is reopened, replay the newest protected erasure ledger so an older snapshot cannot resurrect deleted accounts.
- Weekly maintenance applies retention and checks 10% of repository data.
- Local unencrypted dumps are retained for 7 days but are not treated as independent backups.

## Credential recovery requirements

Recovery requires:

1. access to the MacBook or a future copied Restic repository;
2. the Restic repository password from the protected MacBook recovery copy or the owner's password manager;
3. administrator access to the replacement host;
4. the production SSH/deploy key or another reviewed way to obtain the recorded application commit;
5. router and LAN administration only if the replacement host receives a different private address.

Do not store the Restic password only inside the repository it decrypts.

## Incident responsibility

The owner is the incident lead and credential custodian. Codex may diagnose and execute reviewed recovery steps while the owner supplies interactive credentials directly. No third party is assumed to have emergency authority.

## Decision tree

### Application or proxy failure, database healthy

1. Inspect container health and bounded logs.
2. Restart only the affected service when evidence supports it.
3. Do not restore the database merely to fix an application process.

### Database unavailable, primary disk healthy

1. Stop application writes if corruption or data divergence is possible.
2. Preserve the current data directory and logs.
3. Restore the newest snapshot into an isolated database first.
4. Compare counts, constraints, and application-compatible queries.
5. Promote a restored database only after an explicit destructive-action review.

### Configuration loss, product data healthy

1. Restore the latest snapshot to an isolated directory.
2. Validate Compose, Caddy, Prometheus, Alertmanager, dashboards, scripts, and permissions.
3. Copy only reviewed files into production and restart only affected services.

### Primary host or SSD lost

Follow [`restore-full-service.md`](./restore-full-service.md). Preserve the failed disk for investigation and do not reinitialize it merely to speed up recovery.

### MacBook repository unavailable

Preserve local dumps, stop retention/pruning changes, and restore destination availability. A local dump helps short-term recovery but does not satisfy the normal off-machine policy.

## Verification history

The authoritative latest test date and evidence are recorded in:

```text
/srv/gym-tracker/backups/reports/
docs/server/reports/11-backup-restore-and-disaster-recovery-report.md
```

The public-beta erasure drill must select a snapshot that predates an unexpired tombstone and
must obtain the newest ledger from a different snapshot:

```bash
sudo /srv/gym-tracker/scripts/restore-test-erasure-replay.sh OLDER_SNAPSHOT_ID
```

The drill fails unless the older isolated database contains at least one ledger user, its
migration ledger matches production, two consecutive ledger replays are idempotent, all erased
users and direct references are absent afterward, and matching tombstones remain. It never
connects the restore database to the application network and does not print user identifiers.

## Limitations

- The MacBook is not always awake.
- The writable SFTP repository is encrypted but not immutable.
- The spare Mac mini has not been configured or tested as a recovery host.
- Logical dumps provide an RPO-based recovery point, not point-in-time recovery.
- Public failover, DNS, and external routing are outside this private stage.
