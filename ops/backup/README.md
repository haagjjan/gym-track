# Gym Tracker Backups

This directory owns the production backup, restore-test, scheduling, and MacBook destination assets for `gym-prod`.

## Recovery objectives

- Recovery Point Objective: 24 hours.
- Recovery Time Objective: 4 hours.

These are private-production targets, not guarantees. Four daily timer windows give a sleeping MacBook several opportunities to accept a backup while the stale-backup warning remains tied to the 24-hour RPO plus six hours of grace.

## Topology

```text
PostgreSQL custom-format dump ─┐
operational configuration ────┼─> root-only staging ─> encrypted Restic/SFTP ─> MacBook
required server secrets ──────┘                                      |
                                                                     └─> isolated restore tests
```

The destination uses a dedicated hidden macOS account forced into internal SFTP and chrooted to `/private/var/gym-backup`. The backup key cannot start a shell, request a terminal, or forward traffic. The Restic password has a separate recovery copy outside that chroot and should also be stored in the owner's password manager.

Recent macOS releases require Remote Login to be enabled interactively under **System Settings → General → Sharing**. Allow only `gym-backup` and do not grant remote users Full Disk Access. The setup script validates and reports this requirement instead of weakening macOS privacy controls.

## Included state

- a custom-format logical dump of `gym_tracker`;
- deployment Compose, environment, Caddy, monitoring, systemd, and recovery files;
- operator and backup scripts;
- operational state files;
- required server secrets;
- the deployed Git commit and a file inventory.

The live PostgreSQL data directory, Docker images, container layers, Prometheus TSDB, and Grafana runtime database are excluded. Application data is in the logical dump; dashboards and data sources are provisioned from files.

## Schedule and retention

- Backup attempts: 03:20, 09:20, 15:20, and 21:20 server local time, each with up to 20 minutes of randomized delay.
- Repository maintenance: Sunday 04:40 with up to 30 minutes of randomized delay.
- Restic retention: snapshots older than 30 days relative to maintenance time are explicitly forgotten, followed by prune. This avoids retaining stale snapshots merely because no newer snapshot exists.
- Local unencrypted logical dumps: 7 days.
- Repository check: metadata after each backup and a 10% data subset during weekly maintenance.
- Erasure tombstones are exported before every snapshot to the protected state tree outside the database dump. Every database restore must replay the newest valid ledger before the application network reopens.

## Operator commands

```bash
sudo systemctl start gym-tracker-backup.service
sudo systemctl status gym-tracker-backup.service --no-pager
sudo journalctl -u gym-tracker-backup.service -n 200 --no-pager
sudo /srv/gym-tracker/scripts/backup-status.sh
sudo /srv/gym-tracker/scripts/restore-test-postgres.sh
sudo /srv/gym-tracker/scripts/restore-test-config.sh
sudo /srv/gym-tracker/scripts/replay-erasure-ledger.sh RESTORE_CONTAINER /path/to/newest/current.csv
```

Do not run Restic repair, unlock, forget, or prune commands ad hoc. Preserve existing snapshots and follow the recovery runbooks if a check fails.

## Source layout

- `scripts/` contains the production backup and isolated restore-test commands.
- `systemd/` contains the service, timer, and one-time post-reboot units.
- `macos/` contains the idempotent restricted-destination setup.
- `deploy/` contains the reviewed Stage 11 deployment helper.

No credential, dump, Restic repository data, or generated metric belongs in Git.
