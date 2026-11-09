# Stage 11 Backup, Restore, and Disaster Recovery Report

- **Target:** `gym-prod`
- **Execution date:** 2026-07-22
- **Application snapshot:** `73dcc1086802abbf2cbd96e8b1f99502b4c543b1`
- **Final result:** passed
- **Wave result:** Wave C complete; no later stage started

## Executive summary

Stage 11 completed successfully. `gym-prod` now creates validated PostgreSQL logical dumps, stages the operational configuration and protected secret files, encrypts the complete staging tree with Restic, and writes the encrypted repository to a restricted SFTP account on the owner's MacBook. Three encrypted snapshots existed at final verification.

The latest snapshot was restored into an isolated PostgreSQL container and into a separate configuration tree. The database restore contained 14 public tables, matched the production table-count digest, retained its migration ledger, had zero invalid foreign keys, and permitted the runtime role to read the restored schema. Compose, Caddy, Prometheus, Alertmanager, dashboard JSON, shell scripts, secret-directory permissions, and required recovery files all passed the configuration restore test.

The backup and maintenance services completed successfully, all 27 Prometheus alert rules loaded, backup metrics appeared through Node Exporter's textfile collector, and both the firing and resolved Telegram notifications were confirmed for a controlled backup failure. The backup timers and metrics survived a reboot from boot ID `2a05ea32-e155-4b92-a282-c52d342f2dee` to `49f6200b-34f9-4bf8-971f-d8e3e803d4b8`.

## Final RPO and RTO

| Objective | Final target | Implementation and evidence |
| --- | ---: | --- |
| Recovery point objective (RPO) | 24 hours | Four daily backup opportunities, a warning after 30 hours without a successful backup, and a critical alert after 48 hours |
| Recovery time objective (RTO) | 4 hours | Documented PostgreSQL and full-service recovery procedures plus protected credentials and a separate password copy |

These are operational targets, not guarantees. The isolated PostgreSQL restore completed in 11 seconds and the configuration restore in 10 seconds, but a full replacement-host recovery has not been timed. MacBook sleep or network unavailability can prevent a scheduled copy; repeated daily windows and stale-backup alerts reduce but do not remove that risk.

## State inventory

| State | Backup treatment |
| --- | --- |
| PostgreSQL application data | `pg_dump` custom-format logical dump plus checksum manifest |
| Compose definitions and deployment environment files | Included in the encrypted staging tree |
| Caddy configuration | Included and validated with the deployed Caddy image during restore testing |
| Prometheus, Alertmanager, and Grafana provisioning | Included; Prometheus and Alertmanager configs and dashboard JSON validated during restore testing |
| Recovery documents and systemd unit copies | Included |
| Operational scripts and numeric state files | Included |
| Required live secret files | Included only inside the encrypted Restic snapshot |
| Application Git source | Not duplicated; the deployed commit is recorded in backup metadata |
| PostgreSQL data volume | Not copied directly; logical dump is the supported backup artifact |
| Prometheus TSDB | Deliberately excluded because monitoring history is not product data |
| Grafana database | Deliberately excluded because the required dashboards and data source are file-provisioned |

## Selected backup tool and version

The selected tool is Restic `0.18.1`, installed from the Ubuntu package repository. The repository uses format version 2 with compression. Restic encrypts repository contents before they leave `gym-prod`; the SFTP destination cannot interpret database rows or secret values without the separate repository password.

The implementation follows Restic's supported [SFTP repository](https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html#sftp), [scripting](https://restic.readthedocs.io/en/stable/075_scripting.html), and [retention](https://restic.readthedocs.io/en/stable/060_forget.html) interfaces. A pinned SSH host key and dedicated identity are supplied through a protected SSH configuration. Restic's `sftp.args` option augments the normal SSH invocation without replacing its destination or SFTP subsystem arguments.

## Off-machine destination type

The independent destination is the owner's MacBook on the private home network. A dedicated hidden macOS account named `gym-backup` is forced into `internal-sftp`, chrooted to `/private/var/gym-backup`, denied TTY and forwarding, and limited to public-key authentication. The tested SFTP view contained only `/repository`; a normal SSH command was rejected.

The MacBook SSH host key is pinned on `gym-prod`. The server's private SFTP key was never copied into the repository or displayed. The ordinary MacBook account is not a member of the dedicated Remote Login access group.

## Secret files created

No secret values are recorded here.

| Location | File | Protection |
| --- | --- | --- |
| `gym-prod` | `restic-password` | `0600`, owned by `admin-gym` |
| `gym-prod` | `restic-environment` | `0600`, root-owned |
| `gym-prod` | `restic-known-hosts` | `0600`, root-owned |
| `gym-prod` | `restic-sftp-key` | `0600`, root-owned |
| `gym-prod` | `restic-ssh-config` | `0600`, root-owned |
| `gym-prod` | `backup-database-password` | `0600`, root-owned |
| MacBook | `Library/Application Support/GymTrackerBackup/restic-password` | parent `0700`, file `0600`; checksum matched the server copy |

The operator should also store the Restic password in the owner's password manager. Loss of every password copy makes the encrypted repository unrecoverable.

## PostgreSQL backup method

`backup-postgres.sh` uses a dedicated `gym_tracker_backup` login with `CONNECT`, schema `USAGE`, and table/sequence read privileges. It does not grant superuser, database creation, role creation, inheritance, replication, or bypass-RLS privilege.

The script:

1. confirms the production PostgreSQL container is healthy;
2. copies the protected password into a temporary container file;
3. runs `pg_dump` over the container network in custom format with compression;
4. validates the dump with `pg_restore --list`;
5. records the PostgreSQL and dump-tool versions, deployed commit, byte size, and SHA-256 checksum in a manifest;
6. removes the temporary credential from the container;
7. retains local dump and manifest files for seven days.

Production was not stopped. The first successful manifest recorded PostgreSQL `17.10`, `pg_dump 17.10`, a 108,565-byte dump, and exit status zero.

## Configuration backup scope

Each root-only staging tree includes:

- deployment Compose files;
- Caddy and other deployment configuration;
- deployment environment documentation and protected environment files;
- Prometheus, Alertmanager, and Grafana configuration;
- recovery documents;
- installed Stage 11 systemd units;
- operational scripts;
- numeric state and deployment records;
- required secret files;
- the validated PostgreSQL dump and manifest;
- a file inventory and the deployed Git commit.

Symbolic links, device files, special files, sockets, swap files, and temporary files are rejected or excluded. Staging is deleted after each completed or failed Restic operation.

## Restic repository and retention

The encrypted repository was initialized on the off-machine SFTP destination and passed `restic check`. Final inspection found three snapshots for host `gym-prod` with the `gym-tracker` tag. Restic reported 655.540 KiB uncompressed and 294.957 KiB stored after compression and deduplication.

Retention is implemented by a separate weekly maintenance job:

- 14 daily snapshots;
- 8 weekly snapshots;
- 12 monthly snapshots;
- prune after applying retention;
- repository check with a 10% read-data subset;
- seven-day local retention for unencrypted PostgreSQL dumps and manifests.

Prune is not part of every daily backup. The initial maintenance run succeeded without removing the only valid snapshot.

## Systemd services and timers

| Unit | Purpose | Schedule or activation | Final state |
| --- | --- | --- | --- |
| `gym-tracker-backup.service` | Logical dump, encrypted off-machine snapshot, validation, and metrics | Triggered by backup timer or operator | Last result passed |
| `gym-tracker-backup.timer` | Four daily destination opportunities | 03:20, 09:20, 15:20, and 21:20 plus up to 20 minutes randomized delay | enabled and active after reboot |
| `gym-tracker-backup-maintenance.service` | Retention, prune, and repository check | Triggered by maintenance timer or operator | Last result passed |
| `gym-tracker-backup-maintenance.timer` | Weekly maintenance | Sunday 04:40 plus up to 30 minutes randomized delay | enabled and active after reboot |
| `gym-tracker-stage11-post-reboot.service` | One-time Stage 11 timer/metric verification | Boot-time condition file | passed on the final boot |

The backup services use `ProtectSystem=strict`, `ProtectHome=true`, `PrivateTmp=true`, `NoNewPrivileges=true`, restricted address families, explicit writable paths, low I/O priority, and only the filesystem capabilities required to stage protected files. Docker socket access remains root-equivalent and is a necessary residual trust boundary for the containerized dump and isolated restore workflow.

## Backup metrics

Node Exporter's textfile collector exposes:

- `gym_backup_last_run_success`;
- `gym_backup_last_success_timestamp_seconds`;
- `gym_backup_last_duration_seconds`;
- `gym_backup_last_dump_size_bytes`;
- `gym_backup_last_snapshot_info`;
- `gym_backup_maintenance_last_run_success`;
- `gym_backup_maintenance_last_success_timestamp_seconds`;
- `gym_backup_restore_test_last_success_timestamp_seconds`.

Final numeric state recorded a successful latest backup, an available snapshot, a successful maintenance run, and a successful restore test. The latest required backup duration was 18 seconds and the latest dump size was 108,565 bytes. Prometheus exposed the metric after restart and again during the post-reboot verifier.

## Backup alert rules

Four rules increased the Prometheus total from 23 to 27:

| Rule | Condition | Purpose |
| --- | --- | --- |
| `GymTrackerBackupMetricsMissing` | Required backup series absent | Detect a broken metrics path |
| `GymTrackerBackupLastRunFailed` | Latest required run reports failure for two minutes | Notify on a concrete failed backup |
| `GymTrackerBackupTooOld` | Latest success older than 30 hours | Warn after the 24-hour RPO plus grace |
| `GymTrackerBackupTooOldCritical` | Latest success older than 48 hours | Escalate extended off-machine backup loss |

The Grafana service overview gained four panels for latest backup result, age, duration, and PostgreSQL dump size.

## First successful backup

The first successful encrypted snapshot was `d5532901`, created on 2026-07-22 at 15:58 CEST. Its source staging tree contained 104 files and directories and restored to 309.033 KiB. The repository contained three valid snapshots at final review; the newest was `cf42a82a` from 16:10 CEST.

The backup service recorded success only after the PostgreSQL dump, staging, Restic snapshot, `restic check`, snapshot discovery, state write, and metric write had all succeeded.

## PostgreSQL restore test

The finalized test explicitly selected newest snapshot `cf42a82a` by timestamp and restored it into a new internal Docker network, new volume, and uniquely named PostgreSQL container. It did not join a production network or mutate the production volume.

Evidence from `postgres-restore-20260722T143429Z.env`:

- result: passed;
- duration: 11 seconds;
- public tables: 14;
- live and restored table-count digests: equal;
- migration ledger: present;
- invalid foreign keys: zero;
- runtime-role read check: passed;
- isolated container, volume, network, restored files, and temporary password: removed by bounded cleanup.

No database rows or personal values were printed or recorded in the report.

## Configuration restore test

The finalized test explicitly selected newest snapshot `cf42a82a` by timestamp and restored it to a root-only temporary tree.

Evidence from `config-restore-20260722T143442Z.env`:

- result: passed;
- duration: 10 seconds;
- protected secret files discovered: 21;
- operational scripts discovered: 23;
- secret directory mode: `0700`;
- shell syntax: passed;
- Docker Compose rendering: passed;
- Caddy validation: passed;
- Prometheus validation: passed;
- Alertmanager validation: passed;
- Grafana dashboard JSON validation: passed;
- required recovery, state, metadata, dump, and manifest paths: present.

The Caddy validator repeated the existing non-blocking formatting warning for line 32. It reported a valid adapted configuration and did not enable automatic HTTPS.

## Disaster-recovery rehearsal

The rehearsal combined real encrypted repository access with two destructive-action-isolated restores:

1. prove the pinned SFTP account can write only inside its chroot and cannot open a shell;
2. create and integrity-check the encrypted repository;
3. restore the newest database dump into disposable PostgreSQL infrastructure;
4. compare restored and production table counts without printing rows;
5. restore the complete configuration tree separately and validate executable configuration;
6. confirm the protected password copy exists outside the server and outside the SFTP chroot;
7. reboot the production host and verify timers and metrics return.

A total-loss replacement-host rehearsal was not performed because no replacement host is configured and Stage 11 did not authorize destruction of the working server. The documented full-service procedure is the next-best bounded rehearsal and supports the four-hour target.

## Recovery documents created

- `docs/server/disaster-recovery.md` — recovery priorities, credentials, scenarios, validation, and escalation;
- `docs/server/restore-postgresql.md` — isolated inspection and controlled PostgreSQL replacement procedure;
- `docs/server/restore-full-service.md` — host preparation, configuration restore, database restore, service start, and validation order.

Protected copies were installed under `/srv/gym-tracker/deploy/recovery` and included in every encrypted snapshot.

## Failure-notification test

A controlled `--simulate-failure` run exited nonzero and wrote failure state without attempting a database dump or off-machine write. `GymTrackerBackupLastRunFailed` reached firing state, and the operator confirmed the Telegram firing notification.

A subsequent real backup succeeded, updated the state and metric, and cleared the alert. The operator confirmed the Telegram resolved notification. The final marker was `BACKUP_FAILURE_ALERT_TEST=passed`.

## Reboot verification

The host rebooted from boot ID `2a05ea32-e155-4b92-a282-c52d342f2dee` to `49f6200b-34f9-4bf8-971f-d8e3e803d4b8`. The one-time verifier completed at 2026-07-22 16:30 CEST with exit status zero.

After reboot:

- both backup timers were enabled and active;
- the PostgreSQL Compose service was running;
- the backup success metric remained present in the Node Exporter textfile and Prometheus query API;
- no systemd units were failed;
- the private LAN login page returned HTTP 200;
- port 80 remained reachable on the approved Ethernet address;
- ports 3000, 4000, 5432, 9090, 9093, 9100, and 9187 remained unpublished to the LAN.

The host still reports systemd overall state `starting` because the pre-existing `plymouth-quit-wait.service` boot job remains activating. This did not prevent Docker, the application, timers, or the Stage 11 post-reboot verifier from starting, but it remains a host-level follow-up.

## Files changed

Repository artifacts created or changed for Stage 11:

- `.env.example`;
- `.gitignore`;
- `compose.monitoring.yaml`;
- `ops/backup/README.md`;
- `ops/backup/deploy/stage11-server.sh`;
- `ops/backup/macos/setup-backup-destination.sh`;
- `ops/backup/scripts/*.sh`;
- `ops/backup/systemd/*`;
- `ops/monitoring/README.md`;
- `ops/monitoring/prometheus/rules/alerts.yaml`;
- `ops/monitoring/grafana/dashboards/service-overview.json`;
- `docs/decisions/0010-encrypted-restic-backups.md`;
- `docs/server/disaster-recovery.md`;
- `docs/server/restore-postgresql.md`;
- `docs/server/restore-full-service.md`;
- `docs/server/GRAFANA-DASHBOARD-GUIDE.md`;
- `docs/server/SERVER-SETUP-INDEX.md`;
- `docs/server/reports/11-backup-restore-and-disaster-recovery-report.md`;
- `docs/server/wave-a-host-fundation/README.md`;
- `docs/server/wave-b-application-platform/README.md`;
- `docs/server/wave-c-operations-dashboard/README.md`;
- `docs/status/server-status-gym-prod.md`;
- `docs/repository-structure.md`;
- `docs/00-workflow.md`;
- `ARCHITECTURE.md`.

Server state created or changed:

- backup, restore-test, report, cache, and staging directories under `/srv/gym-tracker/backups`;
- backup scripts under `/srv/gym-tracker/scripts`;
- recovery documents and unit copies under `/srv/gym-tracker/deploy`;
- five systemd units under `/etc/systemd/system`;
- protected Restic and database-backup credential files under `/srv/gym-tracker/secrets`;
- numeric backup state and Node Exporter textfile metrics;
- four Prometheus rules and four Grafana panels;
- least-privilege `gym_tracker_backup` PostgreSQL role;
- rollback directories under `/srv/gym-tracker/releases` for each controlled apply attempt.

MacBook state created or changed:

- hidden `gym-backup` account and restricted Remote Login membership;
- root-owned SSH drop-in and public authorized-key file;
- chrooted SFTP repository directory;
- encrypted Restic repository;
- protected recovery-password copy outside the chroot.

No repository commit, tag, push, package update, public exposure, database-volume replacement, or later-stage deployment was performed.

## Deviations and remaining risks

1. **Mac SSH setup required two compatibility corrections.** The root-owned public authorized-key file must be readable by the target account (`0644`), and macOS PAM requires an account shell from `/etc/shells`. The account uses `/bin/zsh`, but the tested SSH `Match` rule still forces `internal-sftp`, disables TTYs and forwarding, and rejects shell commands.
2. **The initial Restic option replaced too much of the SSH command.** `sftp.command` omitted the destination and subsystem. It was replaced with the supported `sftp.args` option and probed against a nonexistent repository before initialization.
3. **Root Git metadata lookup required a command-scoped trust declaration.** Both metadata lookups now use `git -c safe.directory=/srv/gym-tracker/repo`; no global Git setting or ownership change was made.
4. **The initial config-restore path glob matched descendants.** The matcher now searches exactly one level beneath the restored staging parent.
5. **The initial restore-report snapshot lookup grouped by unique source path.** Both tests now select `max_by(.time)` and restore that explicit ID. The narrow finalizer reran both tests and produced consistent evidence for `cf42a82a`.
6. **Systemd services need bounded filesystem capabilities.** `CAP_CHOWN`, `CAP_DAC_OVERRIDE`, and `CAP_FOWNER` were added because root must read protected app secrets and preserve staged ownership. Empty capability sets would make scheduled backups fail.
7. **The destination is writable, not immutable.** A compromised production host could alter snapshots through its SFTP credential. A future second destination with append-only or immutable retention would materially improve resilience.
8. **The MacBook is not continuously available.** Sleep, Remote Login changes, address-resolution failure, or network separation can miss a window. The four daily attempts and 30/48-hour alerts are mitigations, not guarantees.
9. **The RTO is not a timed bare-metal result.** Component restoration and documentation passed, but a replacement-host recovery has not been rehearsed.
10. **The Restic password still needs an owner-managed password-manager copy.** The separate protected MacBook file exists and matches the server copy, but the repository remains unrecoverable if all password copies are lost.
11. **Plymouth remains activating after boot.** This pre-existing job leaves `systemctl is-system-running` at `starting` despite zero failed units. It should be diagnosed in a separate host-maintenance scope.
12. **Caddy retains a formatting warning.** Its restored configuration validates, and formatting was not changed because Stage 11 did not authorize reverse-proxy cleanup.

## Exact commands executed

Sensitive values were entered only at local prompts and are represented by protected files or placeholders below.

MacBook destination preparation:

```bash
sudo /Users/janva/Projects/gym-progress-tracker/ops/backup/macos/setup-backup-destination.sh /tmp/gym-backup-sftp-key.pub
```

Server candidate and SFTP validation included:

```bash
ssh gym-prod
tmux new -s stage11
sftp -b - -i /home/admin-gym/codex-stage11-candidate/gym-backup-sftp-key \
  -o IdentityAgent=none -o IdentitiesOnly=yes \
  -o UserKnownHostsFile=/home/admin-gym/codex-stage11-candidate/macbook-test-known-hosts \
  -o StrictHostKeyChecking=yes gym-backup@MacBook-Jan.local
ssh -i /home/admin-gym/codex-stage11-candidate/gym-backup-sftp-key \
  -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes \
  gym-backup@MacBook-Jan.local true
restic --no-cache \
  -o "sftp.args=-F /home/admin-gym/codex-stage11-candidate/restic-test-ssh-config" \
  snapshots
```

Stage execution and finalization:

```bash
sudo /home/admin-gym/codex-stage11-candidate/stage11-server.sh apply
sudo /home/admin-gym/codex-stage11-candidate/stage11-server.sh reboot
sudo /home/admin-gym/codex-stage11-candidate/stage11-server.sh finalize
```

The idempotent `apply` command was rerun after each stopped, reviewed correction. The successful path invoked:

```bash
systemd-analyze verify \
  /etc/systemd/system/gym-tracker-backup.service \
  /etc/systemd/system/gym-tracker-backup.timer \
  /etc/systemd/system/gym-tracker-backup-maintenance.service \
  /etc/systemd/system/gym-tracker-backup-maintenance.timer \
  /etc/systemd/system/gym-tracker-stage11-post-reboot.service
systemctl start gym-tracker-backup.service
/srv/gym-tracker/scripts/restore-test-postgres.sh
/srv/gym-tracker/scripts/restore-test-config.sh
systemctl start gym-tracker-backup-maintenance.service
systemd-run --quiet --wait --collect \
  --unit=gym-tracker-backup-failure-test \
  /srv/gym-tracker/scripts/backup-restic.sh --simulate-failure
systemctl enable --now gym-tracker-backup.timer gym-tracker-backup-maintenance.timer
systemctl enable gym-tracker-stage11-post-reboot.service
systemctl reboot
```

Final read-only verification included:

```bash
systemctl is-enabled gym-tracker-backup.timer gym-tracker-backup-maintenance.timer
systemctl is-active gym-tracker-backup.timer gym-tracker-backup-maintenance.timer
systemctl list-timers gym-tracker-backup.timer gym-tracker-backup-maintenance.timer --all
systemctl --failed --no-pager
restic snapshots --host gym-prod --tag gym-tracker --latest 5
restic stats --mode raw-data --host gym-prod --tag gym-tracker
curl --connect-timeout 5 http://192.168.1.57/login
nc -z -w 2 192.168.1.57 80
nc -z -w 1 192.168.1.57 <private-service-port>
```

Repository validation included:

```bash
bash -n ops/backup/scripts/*.sh \
  ops/backup/deploy/stage11-server.sh \
  ops/backup/macos/setup-backup-destination.sh
shellcheck -x -P ops/backup/scripts \
  ops/backup/scripts/*.sh \
  ops/backup/deploy/stage11-server.sh \
  ops/backup/macos/setup-backup-destination.sh
promtool check rules /etc/prometheus/rules/alerts.yaml
docker compose -f compose.yaml -f compose.monitoring.yaml config --quiet
jq empty ops/monitoring/grafana/dashboards/service-overview.json
git diff --check
```

## Wave C completion assessment

Wave C is complete. Stages 9, 10, and 11 are executed, verified, documented, and linked from the current server handoff. The deployment is privately observable, has tested Telegram alert delivery, creates encrypted off-machine backups, has proven PostgreSQL and configuration restoration, and preserves its timers and metrics across reboot.

This completion does not authorize public DNS, HTTPS, router forwarding, public dashboards, SaaS launch work, or any later server wave. The next action is operator review and normal monitoring of the first scheduled backup windows.
