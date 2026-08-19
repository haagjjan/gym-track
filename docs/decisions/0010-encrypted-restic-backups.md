# ADR 0010 - Encrypted Restic Backups to a Restricted MacBook Destination

## Status

Accepted. The retention duration and restore ordering were superseded by ADR 0013 on 2026-08-05.
ADR 0018 replaces only the unreliable direct `.local` destination route with a persistent,
loopback-bound reverse tunnel; the encryption and restricted-SFTP controls remain accepted.

## Context

The private `gym-prod` deployment now contains real account and workout data. Stage 11 requires independent encrypted backups, observable failures, and successful restoration tests. The second Mac mini is not configured yet, while the owner's MacBook is reachable on the private network and has enough free storage.

The MacBook is not continuously awake. A backup design that assumes permanent destination availability would silently miss the 24-hour recovery-point objective. Giving the server an ordinary key for the owner's normal Mac account would also create an unnecessarily broad trust boundary.

## Decision

Use Restic with its SFTP backend for the first private-production backup system:

- create PostgreSQL custom-format logical dumps without stopping production;
- stage reviewed operational configuration and required secrets in a root-only temporary directory;
- encrypt every off-machine snapshot with Restic before it is stored on the MacBook;
- use a dedicated hidden macOS account, an Ed25519 key, internal-SFTP-only forced command, disabled forwarding, and an OpenSSH chroot;
- keep a separate protected recovery copy of the Restic password outside the SFTP chroot;
- attempt backups four times daily so a sleeping laptop has multiple availability windows;
- originally keep 14 daily, 8 weekly, and 12 monthly Restic snapshots; ADR 0013 replaces this with a strict 30-day maximum while retaining only 7 days of local logical dumps;
- export authoritative backup and restore-test metrics through Node Exporter's textfile collector;
- prove both PostgreSQL and configuration restoration in isolated resources before considering Stage 11 complete.

The approved initial objectives are a 24-hour RPO and a 4-hour RTO.

## Consequences

Backups remain usable if the primary server's internal SSD fails, and repository contents stored on the MacBook are encrypted. A compromised `gym-prod` host can still use its SFTP credential to alter the writable repository; the initial MacBook destination does not provide immutability. The MacBook must be awake and reachable for an off-machine backup to succeed, so repeated timer windows and Telegram alerts mitigate but do not remove availability risk.

Moving the repository to the second always-on Mac mini or an immutable object-storage backend later does not require changing the logical dump or restore-test model. Such a move must preserve encryption, independent credential recovery, monitoring, retention, and tested restoration.
