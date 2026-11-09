# Stage 11 — Backup, Restore, and Disaster Recovery

## Objective

Implement a dependable backup system for PostgreSQL and operational configuration, copy backups off the primary Mac mini, expose backup-success metrics, and prove restoration through controlled tests.

A backup is not considered valid until restoration has succeeded.

---

## Dependencies

Stages 9 and 10 must be complete and reviewed.

Required inputs:

- [`../reports/09-monitoring-and-grafana-report.md`](../reports/09-monitoring-and-grafana-report.md)
- [`../reports/10-logging-and-alerting-report.md`](../reports/10-logging-and-alerting-report.md)
- healthy PostgreSQL service;
- Node Exporter textfile collector path;
- working Prometheus and Alertmanager;
- final deployment/configuration paths;
- one user-approved off-machine backup destination.

---

## Scope

- inventory all state that must be recoverable;
- define initial recovery objectives;
- select and configure encrypted backup tooling;
- create consistent PostgreSQL logical backups;
- back up host-specific Compose, proxy, monitoring, dashboard, script, and state configuration;
- protect required secret material through encrypted backups;
- copy backups off `gym-prod`;
- define retention and pruning;
- automate backup execution with systemd services and timers;
- export backup metrics to Node Exporter;
- add backup-failure and backup-age alerts;
- test database restoration into an isolated instance;
- test configuration restoration into an isolated directory;
- perform a documented partial disaster-recovery rehearsal;
- create recovery runbooks and the Stage 11 report.

---

## Explicitly out of scope

Do not:

- rely only on backups stored on the same internal SSD;
- copy a live PostgreSQL data directory as the primary database backup method;
- stop PostgreSQL for routine logical backups;
- expose the database or backup repository publicly;
- commit backup passwords, repository credentials, or secret files;
- upload unencrypted secrets to third-party storage;
- delete the primary database during a restore test;
- overwrite production configuration during a restore test;
- run `docker compose down --volumes`;
- claim full failover to the second Mac mini unless that machine is actually configured and tested;
- implement public high-availability or replication in this stage.

---

## Safety constraints

- Use PostgreSQL-native logical backups for the production database.
- Encrypt backups before they leave the primary server.
- Use a dedicated backup credential or restricted destination account.
- Store backup-tool secrets under `/srv/gym-tracker/secrets` with mode `0600`.
- Run restoration tests in isolated containers, networks, volumes, and directories.
- Never restore over the live database during validation.
- Do not place database dumps in Git.
- Protect backups as sensitive because they can contain user and workout data.
- Record checksums and outcomes, not contents.
- Use locking so overlapping backups cannot run.
- Fail visibly when any required backup component fails.

---

## Initial recovery objectives

For the private deployment, use these as proposed starting targets unless the user approves different values:

```text
Recovery Point Objective (RPO): 24 hours
Recovery Time Objective (RTO): 4 hours
```

Meaning:

- at most approximately one day of data loss under the normal daily backup schedule;
- a documented goal of restoring the service within four hours on available replacement infrastructure.

These are operational targets, not guarantees. Record the final accepted targets in the recovery documentation.

---

## State inventory

### Must be backed up

```text
PostgreSQL logical dump
/srv/gym-tracker/deploy/compose/
/srv/gym-tracker/deploy/config/
/srv/gym-tracker/deploy/monitoring/
/srv/gym-tracker/scripts/
/srv/gym-tracker/state/
/srv/gym-tracker/secrets/
Grafana provisioned dashboards and datasource files
Prometheus rules and configuration
Alertmanager configuration
Reverse-proxy configuration
```

### Usually reproducible and not essential to back up

```text
/srv/gym-tracker/repo/        # recoverable from Git remote and recorded commit
Docker images                 # rebuildable from repository or registry
Prometheus time-series data   # operational history, not product data
Container writable layers     # must not contain unique persistent state
```

### Evaluate before excluding

```text
/srv/gym-tracker/data/app/
/srv/gym-tracker/data/grafana/
/srv/gym-tracker/data/proxy/
```

If Grafana dashboards are fully provisioned from files, Grafana’s database is less critical but may still contain users, preferences, and alert state.

Prometheus TSDB backup is optional for this private deployment. Its loss should not affect product data.

---

## Preferred backup tool

Preferred default:

```text
restic
```

Reasons:

- encryption;
- integrity checking;
- deduplication;
- retention policies;
- multiple repository backends;
- snapshot-based restore;
- suitable for SFTP, local external storage, and supported object storage.

Codex must verify the available package version and destination compatibility before installation.

Do not use an unencrypted `rsync` copy as the only off-machine backup for secrets and database dumps.

---

## Off-machine destination requirement

Before Stage 11 can complete, the user must approve one destination, for example:

1. the second Mac mini through a dedicated restricted SFTP account;
2. an encrypted external drive stored separately;
3. an approved S3-compatible or other Restic-supported repository;
4. another independent encrypted storage destination.

The destination must not be the same internal SSD as `gym-prod`.

A local backup staging directory is useful, but it does not satisfy the off-machine requirement.

---

## Preferred backup layout

```text
/srv/gym-tracker/backups/
├── postgres/
│   ├── current/
│   └── manifests/
├── staging/
├── restore-tests/
└── reports/

/srv/gym-tracker/secrets/
├── restic-password
├── restic-environment
└── backup-database-url
```

The Restic repository itself should be off-machine.

---

## Implementation steps

### 1. Inventory recoverable state

Run:

```bash
sudo find /srv/gym-tracker \
  -maxdepth 4 \
  -printf '%M %u:%g %s %p\n' \
  | sort

cd /srv/gym-tracker/deploy/compose
sudo docker compose config --services
sudo docker compose ps
sudo docker volume ls
sudo docker inspect $(sudo docker compose ps -q) \
  --format '{{.Name}} {{json .Mounts}}'
```

Identify every persistent mount and determine whether it contains:

- product data;
- rebuildable cache;
- configuration;
- credentials;
- monitoring history;
- disposable runtime state.

Document inclusion or exclusion decisions.

### 2. Confirm recovery objectives and destination

Record:

- final RPO;
- final RTO;
- destination type;
- destination owner;
- destination capacity;
- destination authentication method;
- whether destination-side snapshots or immutability exist;
- expected backup frequency;
- expected retention.

Stop if no off-machine destination is approved.

### 3. Install and verify Restic

Inspect first:

```bash
command -v restic || true
apt-cache policy restic
```

Install from an approved source:

```bash
sudo apt update
sudo apt install restic
```

Verify:

```bash
restic version
```

Do not download and execute an unverified installation script.

### 4. Create Restic secret files

Create:

```text
/srv/gym-tracker/secrets/restic-password
/srv/gym-tracker/secrets/restic-environment
```

Generate a strong repository password:

```bash
umask 077
openssl rand -base64 64 \
  > /srv/gym-tracker/secrets/restic-password
```

Set:

```bash
chmod 0600 \
  /srv/gym-tracker/secrets/restic-password \
  /srv/gym-tracker/secrets/restic-environment
```

The environment file may define:

```text
RESTIC_REPOSITORY=<approved-destination>
RESTIC_PASSWORD_FILE=/srv/gym-tracker/secrets/restic-password
```

Additional destination credentials must use restricted secret files or environment mechanisms supported by the selected backend.

Do not include these values in the report.

### 5. Initialize or verify the off-machine repository

Load the restricted environment without echoing values.

For a new repository:

```bash
restic init
```

For an existing repository:

```bash
restic snapshots
restic check
```

Record repository identity in a redacted form.

Do not reinitialize an existing repository.

### 6. Create a dedicated database-backup URL

Preferred file:

```text
/srv/gym-tracker/secrets/backup-database-url
```

The backup role should have the minimum privileges required to read all application schemas and sequences for `pg_dump`.

It must not be superuser unless a reviewed PostgreSQL-specific limitation makes that unavoidable.

Set mode `0600`.

Do not use the runtime API credential if a dedicated backup role can be used safely.

### 7. Create the PostgreSQL dump script

Create:

```text
/srv/gym-tracker/scripts/backup-postgres.sh
```

Requirements:

- `set -euo pipefail`;
- root-owned or appropriately restricted;
- acquire a non-blocking `flock` lock;
- verify PostgreSQL is healthy;
- use the same PostgreSQL major-version client as the server;
- create a custom-format `pg_dump`;
- include schema and data;
- exclude no application tables unless explicitly reviewed;
- write to a temporary filename first;
- run `pg_restore --list` as a structural validation;
- calculate SHA-256;
- atomically rename to the final filename;
- remove failed temporary files;
- never print credentials;
- exit nonzero on any failure.

Preferred filename:

```text
gym_tracker-YYYYMMDDTHHMMSSZ.dump
```

Create a manifest containing:

- timestamp;
- database name;
- PostgreSQL server version;
- dump tool version;
- deployed commit;
- dump filename;
- byte size;
- checksum;
- script exit status.

Do not put secret URLs in the manifest.

### 8. Create the configuration staging script

Create:

```text
/srv/gym-tracker/scripts/stage-backup-files.sh
```

The script should create a temporary staging tree containing reviewed paths, including:

```text
deploy/compose/
deploy/config/
deploy/monitoring/
scripts/
state/
secrets/
latest PostgreSQL dump and manifest
recovery documentation
```

Requirements:

- preserve permissions;
- avoid following unsafe symlinks;
- exclude sockets, caches, temporary files, and live PostgreSQL data;
- include an inventory file;
- include the deployed Git commit;
- clean previous temporary staging safely;
- never place staging inside the Git repository.

### 9. Create the Restic backup script

Create:

```text
/srv/gym-tracker/scripts/backup-restic.sh
```

Requirements:

- `set -euo pipefail`;
- `flock` protection;
- load restricted Restic environment;
- run the PostgreSQL dump script first;
- stage reviewed files;
- run `restic backup` with stable tags;
- record snapshot ID;
- run a lightweight repository verification after backup;
- clean staging files after confirmed success;
- preserve the latest local database dump according to local retention;
- emit metrics for success, duration, size, and timestamp;
- log a concise result;
- exit nonzero on any required component failure.

Suggested Restic tags:

```text
gym-prod
gym-tracker
daily
```

### 10. Define retention

Suggested initial policy:

```text
Keep 14 daily snapshots
Keep 8 weekly snapshots
Keep 12 monthly snapshots
```

Apply through:

```bash
restic forget \
  --keep-daily 14 \
  --keep-weekly 8 \
  --keep-monthly 12 \
  --prune
```

Do not run prune during every daily backup if it creates excessive runtime or destination load.

A separate weekly maintenance timer is preferable.

Local unencrypted dump retention should be shorter because the same SSD is not a backup destination. Suggested local retention:

```text
7 days
```

Delete only files matching the controlled backup naming pattern.

### 11. Export backup metrics

Use Node Exporter’s textfile collector directory:

```text
/srv/gym-tracker/data/node-exporter-textfile/
```

Write metrics atomically to:

```text
gym_backup.prom
```

Recommended metrics:

```text
gym_backup_last_run_success
gym_backup_last_success_timestamp_seconds
gym_backup_last_duration_seconds
gym_backup_last_dump_size_bytes
gym_backup_last_snapshot_info
```

Example semantics:

- `gym_backup_last_run_success 1` on success, `0` on failure;
- timestamp metric contains the last successful Unix timestamp;
- duration records the latest completed run;
- size records the latest logical dump size;
- snapshot info contains only bounded labels such as host and backup type.

Write to a temporary file and rename atomically.

Do not include repository URLs, snapshot credentials, filenames containing private identifiers, or user data as labels.

### 12. Create systemd services and timers

Preferred units:

```text
/etc/systemd/system/gym-tracker-backup.service
/etc/systemd/system/gym-tracker-backup.timer
/etc/systemd/system/gym-tracker-backup-maintenance.service
/etc/systemd/system/gym-tracker-backup-maintenance.timer
```

Daily backup service requirements:

- `Type=oneshot`;
- execute the restricted backup script;
- run with only required privileges;
- use appropriate hardening options after testing;
- wait for Docker and network readiness;
- avoid overlapping execution;
- log to the journal;
- no secret on the command line.

Suggested schedule:

```text
Daily during a low-use period
Persistent=true
RandomizedDelaySec=<small reviewed delay>
```

Weekly maintenance should perform:

- retention pruning;
- `restic check` or an appropriate subset check;
- result logging and metrics.

Validate units:

```bash
sudo systemd-analyze verify \
  /etc/systemd/system/gym-tracker-backup.service \
  /etc/systemd/system/gym-tracker-backup.timer \
  /etc/systemd/system/gym-tracker-backup-maintenance.service \
  /etc/systemd/system/gym-tracker-backup-maintenance.timer
```

Enable timers only after a manual backup succeeds.

### 13. Run the first manual backup

Run the service manually:

```bash
sudo systemctl start gym-tracker-backup.service
sudo systemctl status gym-tracker-backup.service --no-pager
sudo journalctl -u gym-tracker-backup.service -n 200 --no-pager
```

Verify:

```bash
restic snapshots
restic stats --mode raw-data
restic check
```

Confirm:

- snapshot exists off-machine;
- PostgreSQL dump is included;
- configuration and secret paths are included as intended;
- no live PostgreSQL data directory is included;
- metrics file reports success;
- no credential appears in logs.

### 14. Add Prometheus backup alerts

Add rules for:

#### Backup job failure

Fire when:

```text
gym_backup_last_run_success == 0
```

#### Backup too old

Fire when current time minus the last successful timestamp exceeds the accepted RPO plus a reasonable grace period.

For a 24-hour RPO, an initial warning might occur after approximately 30 hours and a critical alert after a longer reviewed interval.

#### Metrics missing

Alert when backup metrics disappear because the textfile collector or script path is broken.

Every alert must include first diagnostic commands.

Validate with `promtool`, reload Prometheus, and test without damaging backups.

### 15. Test PostgreSQL restoration

Create an isolated restore environment:

```text
/srv/gym-tracker/backups/restore-tests/<timestamp>/
```

Use:

- matching PostgreSQL major version;
- temporary Docker network;
- temporary volume or bind directory;
- no host-published port;
- isolated credentials;
- latest verified dump.

Restore with `pg_restore`.

Verify:

- restore exits successfully;
- migrations table exists where expected;
- schema objects exist;
- representative row counts are plausible;
- key foreign-key relationships validate;
- runtime role assumptions can be recreated;
- a simple application-compatible query succeeds.

Do not print actual user rows in the report.

Remove only isolated restore resources after recording results.

### 16. Test configuration restoration

Restore the latest Restic snapshot into an isolated directory:

```text
/srv/gym-tracker/backups/restore-tests/config-<timestamp>/
```

Verify:

- Compose files restore;
- proxy configuration restores;
- monitoring provisioning restores;
- dashboards restore;
- scripts restore with intended permissions;
- state files restore;
- encrypted secret files restore to the isolated path;
- no restored file overwrites production.

Run syntax validation against restored configuration where possible:

```text
docker compose config
caddy validate
promtool check config
promtool check rules
amtool check-config
```

Use isolated paths and do not start a second conflicting production stack.

### 17. Perform a partial disaster-recovery rehearsal

Without touching production, rehearse the sequence required to recover onto a clean host or isolated directory:

1. install required base tools;
2. obtain repository access;
3. clone the recorded commit;
4. install Docker and Compose;
5. restore operational configuration and secrets;
6. start an isolated PostgreSQL instance;
7. restore the database dump;
8. validate application image build or availability;
9. validate Compose configuration;
10. document the remaining steps to start the complete service.

The rehearsal may use the second Mac mini later, but Stage 11 must not claim secondary-host recovery unless it was actually performed.

### 18. Create recovery documentation

Create:

```text
docs/server/disaster-recovery.md
docs/server/restore-postgresql.md
docs/server/restore-full-service.md
```

#### `disaster-recovery.md`

Include:

- scope;
- final RPO and RTO;
- backup destination type;
- what is and is not backed up;
- backup frequency and retention;
- credential recovery requirements;
- incident roles;
- decision tree for common failures;
- latest restoration-test date;
- limitations.

#### `restore-postgresql.md`

Include exact steps to:

- locate and verify a snapshot;
- restore a dump into an isolated instance;
- validate it;
- prepare for production replacement;
- avoid overwriting the live database accidentally.

#### `restore-full-service.md`

Include exact steps to:

- prepare a replacement Ubuntu host;
- restore repository and configuration;
- restore secrets securely;
- recreate Docker services;
- restore PostgreSQL;
- run migrations only when required;
- verify application, monitoring, firewall, and LAN access;
- update DNS or routing only in a later external-access context.

Do not include secret values.

### 19. Enable and verify timers

After manual backup and restore tests succeed:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now gym-tracker-backup.timer
sudo systemctl enable --now gym-tracker-backup-maintenance.timer
```

Verify:

```bash
systemctl list-timers \
  gym-tracker-backup.timer \
  gym-tracker-backup-maintenance.timer \
  --all
```

Do not enable failed or untested timers.

### 20. Test failure reporting safely

Simulate one controlled failure, such as pointing a temporary test invocation at an unavailable test destination or using a test-only script flag.

Verify:

- service exits nonzero;
- journal records a useful error without secrets;
- backup-success metric becomes `0` for the test path or a dedicated test metric;
- Prometheus alert fires;
- notification arrives;
- successful normal backup clears the alert.

Do not corrupt the real repository or delete valid snapshots.

### 21. Reboot verification

Before reboot:

```bash
systemctl list-timers \
  gym-tracker-backup.timer \
  gym-tracker-backup-maintenance.timer \
  --all

sudo docker compose ps
cat /srv/gym-tracker/data/node-exporter-textfile/gym_backup.prom
```

Reboot:

```bash
sudo reboot
```

Reconnect and verify:

```bash
systemctl is-enabled gym-tracker-backup.timer
systemctl is-active gym-tracker-backup.timer
systemctl list-timers \
  gym-tracker-backup.timer \
  gym-tracker-backup-maintenance.timer \
  --all

cd /srv/gym-tracker/deploy/compose
sudo docker compose ps
```

Verify backup metrics remain visible in Prometheus and dashboards.

Run another manual backup only if needed to prove post-reboot operation.

---

## Suggested operational scripts

Create or finalize:

```text
/srv/gym-tracker/scripts/backup-postgres.sh
/srv/gym-tracker/scripts/stage-backup-files.sh
/srv/gym-tracker/scripts/backup-restic.sh
/srv/gym-tracker/scripts/backup-maintenance.sh
/srv/gym-tracker/scripts/backup-status.sh
/srv/gym-tracker/scripts/restore-test-postgres.sh
/srv/gym-tracker/scripts/restore-test-config.sh
```

All scripts must:

- use `set -euo pipefail`;
- use explicit paths;
- avoid echoing secrets;
- validate prerequisites;
- fail nonzero on error;
- support safe dry-run or check modes where useful;
- avoid destructive defaults;
- include comments explaining recovery-sensitive operations.

---

## Rollback and recovery

### Backup fails

Do not delete existing valid snapshots.

Inspect:

```bash
sudo systemctl status gym-tracker-backup.service --no-pager
sudo journalctl -u gym-tracker-backup.service -n 300 --no-pager
```

Check:

- PostgreSQL health;
- destination reachability;
- credential-file permissions;
- free disk space;
- Restic repository state;
- lock state;
- metrics file.

### Restic repository check fails

Stop pruning and writes until the issue is understood.

Preserve local dumps and existing snapshots.

Follow Restic’s supported recovery process for the specific backend; do not run destructive repair commands speculatively.

### Restore test fails

Do not claim backup success.

Determine whether failure is caused by:

- invalid dump;
- missing role or extension;
- PostgreSQL version mismatch;
- incomplete configuration backup;
- wrong permissions;
- missing secret;
- application incompatibility.

Correct the backup process and repeat the full restore test.

### Off-machine destination unavailable

Keep the latest local dump temporarily, raise an alert, and restore off-machine operation promptly.

A local dump does not satisfy the normal backup policy.

---

## Required report

Create:

```text
docs/server/reports/11-backup-restore-and-disaster-recovery-report.md
```

Include:

```markdown
# Stage 11 Backup, Restore, and Disaster Recovery Report

## Executive summary
## Final RPO and RTO
## State inventory
## Selected backup tool and version
## Off-machine destination type
## Secret files created
## PostgreSQL backup method
## Configuration backup scope
## Restic repository and retention
## Systemd services and timers
## Backup metrics
## Backup alert rules
## First successful backup
## PostgreSQL restore test
## Configuration restore test
## Disaster-recovery rehearsal
## Recovery documents created
## Failure-notification test
## Reboot verification
## Files changed
## Deviations and remaining risks
## Exact commands executed
## Wave C completion assessment
```

Do not include repository passwords, destination credentials, full URLs, database rows, or secret values.

---

## Completion criteria

Stage 11 is complete only when:

- final RPO and RTO are recorded;
- an independent off-machine destination is configured;
- backup credentials are protected;
- PostgreSQL logical backups run successfully;
- operational configuration and required secrets are encrypted in the backup;
- retention is defined and implemented;
- backup services and timers are enabled;
- backup metrics appear in Prometheus;
- backup-failure and backup-age alerts work;
- a PostgreSQL restoration test succeeds;
- a configuration restoration test succeeds;
- disaster-recovery steps are documented;
- failure notification is tested;
- timers and monitoring survive reboot;
- the report is complete.

---

## Stop conditions

Stop and report if:

- no off-machine destination is approved;
- backups leave the server unencrypted;
- database dumps are incomplete or invalid;
- restore testing fails;
- a backup process requires stopping production routinely;
- backup credentials appear in Git or logs;
- pruning could delete the only valid copy;
- metrics or alerts falsely indicate success;
- recovery documentation depends on unavailable credentials or undocumented knowledge;
- timers do not survive reboot.

Do not claim Wave C completion until restoration is proven.
