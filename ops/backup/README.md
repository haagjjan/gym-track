# Gym Tracker Backups

This directory owns the production backup, restore-test, scheduling, and MacBook destination assets for `gym-prod`.

## Recovery objectives

- Recovery Point Objective: 24 hours.
- Recovery Time Objective: 4 hours.

These are private-production targets, not guarantees. Four daily timer windows give a sleeping MacBook several opportunities to accept a backup while the stale-backup warning remains tied to the 24-hour RPO plus six hours of grace.

## Topology

```text
PostgreSQL custom-format dump ─┐
operational configuration ────┼─> root-only staging ─> encrypted Restic/SFTP
required server secrets ──────┘                                      |
                                                                     ├─> isolated restore tests
                                                                     └─> production loopback :2222
                                                                          ^
                                                                          |
                                                        persistent MacBook reverse SSH tunnel
```

The destination uses a dedicated hidden macOS account forced into internal SFTP and chrooted to `/private/var/gym-backup`. The backup key cannot start a shell, request a terminal, or forward traffic. The Restic password has a separate recovery copy outside that chroot and should also be stored in the owner's password manager.

The owner runs `macos/install-reverse-tunnel-launch-agent.sh` without `sudo`. The per-user
`launchd` agent keeps the existing `gym-prod-remote` SSH connection open and forwards production
`127.0.0.1:2222` back to Mac loopback port 22. The production listener is not exposed to the LAN
or Internet. An expired Cloudflare Access grant still requires an interactive owner login.

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

Production backup, erasure export, restore tests, and the post-reboot check pass
`/srv/gym-tracker/deploy/env/production.env` explicitly to Compose. They must resolve the
active production definition from any working directory, including systemd and a release build
directory. Keep this file protected; do not print or source its values into shell commands.

```bash
sudo systemctl start gym-tracker-backup.service
sudo systemctl status gym-tracker-backup.service --no-pager
sudo journalctl -u gym-tracker-backup.service -n 200 --no-pager
sudo /srv/gym-tracker/scripts/backup-status.sh
sudo /srv/gym-tracker/scripts/restore-test-postgres.sh
sudo /srv/gym-tracker/scripts/restore-test-config.sh
sudo /srv/gym-tracker/scripts/restore-test-erasure-replay.sh OLDER_SNAPSHOT_ID
sudo /srv/gym-tracker/scripts/replay-erasure-ledger.sh RESTORE_CONTAINER /path/to/newest/current.csv
```

MacBook tunnel commands:

```bash
ops/backup/macos/install-reverse-tunnel-launch-agent.sh
launchctl print gui/$(id -u)/ch.gymtracker.backup-reverse-tunnel
```

The erasure-replay drill requires an older snapshot that predates at least one unexpired
tombstone. It restores that database and the newest ledger from separate snapshots, requires
the older database to contain at least one ledger user, replays the newest ledger twice, and
records only counts and checksums while proving no erased user or direct reference remains.
The restore container has an internal-only Docker network and is always discarded.

Do not run Restic repair, unlock, forget, or prune commands ad hoc. Preserve existing snapshots
and use the bounded stale-lock procedure below when a repository lock blocks a required backup.
Other repository failures require investigation before changing repository state.

### Stale repository lock recovery

1. On the host named in the lock, record the lock ID, timestamp and owner PID. Check whether that
   PID exists and whether any Restic process or backup/maintenance job is active. An old timestamp
   alone does not establish that a lock is safe to remove.
2. Acquire the existing `/run/lock/gym-tracker-backup.lock` with nonblocking `flock`, keeping it
   held through inspection and repository verification so scheduled jobs cannot overlap.
3. Load protected repository configuration through `backup-common.sh` and
   `load_restic_environment`; do not print credential values. Inspect `run_restic list locks` and
   `run_restic cat lock LOCK_ID`. Require the expected lock ID, same host, absent owner PID and
   age over 30 minutes. Stop on any unexpected lock, running process or changed lock inventory.
4. Use only `run_restic unlock`, which applies Restic's own stale-lock checks. Do not pass
   `--remove-all`, bypass locking, manually delete lock files, or remove snapshots. Require an
   empty lock inventory and successful `run_restic check` afterward.
5. Release the operator lock before invoking the normal backup helper, which acquires it itself.
   Require a new off-machine backup and successful isolated PostgreSQL restore/erasure replay
   before proceeding with the application deployment.

Restic documents default stale-lock removal and the separate force-removal option in its
[unlock manual](https://github.com/restic/restic/blob/master/doc/man/restic-unlock.1).

## Source layout

- `scripts/` contains the production backup and isolated restore-test commands.
- `systemd/` contains the service, timer, and one-time post-reboot units.
- `macos/` contains the idempotent restricted-destination setup.
- `deploy/` contains the reviewed Stage 11 deployment helper.

No credential, dump, Restic repository data, or generated metric belongs in Git.
