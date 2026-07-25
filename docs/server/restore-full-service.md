# Restore the Full Gym Tracker Service

## Preconditions

Use a replacement x86_64 Ubuntu host that can run the recorded T2-compatible kernel when the hardware is another 2018 Intel Mac mini. Obtain administrator, repository, Restic, and network credentials through their protected recovery locations. Do not place them in shell history or documentation.

## Replacement-host sequence

1. Install the reviewed Ubuntu release and T2 kernel/firmware when applicable.
2. Apply the Wave A host baseline, administrator, SSH, firewall, Ethernet, and sleep-prevention controls.
3. Install the validated Docker Engine/Compose and Restic package versions.
4. Recreate the `/srv/gym-tracker` ownership and directory layout from the server setup runbooks.
5. Obtain the application repository and check out the commit recorded in the latest backup metadata.
6. Configure the protected Restic password, SFTP key, SSH host pin, and environment without printing them.
7. Restore the latest snapshot into an isolated root-owned directory.
8. Validate the staged inventory and run the configuration restore checks before copying files.
9. Install Compose, environment, proxy, monitoring, scripts, state, and secrets with their recorded permissions.
10. Create a new PostgreSQL volume and restore the custom-format dump using [`restore-postgresql.md`](./restore-postgresql.md).
11. Recreate production login roles with the protected credentials. Do not promote restore-test passwords.
12. Run migrations only when the restored migration ledger is behind the recorded application commit.
13. Build or load the recorded API and web release, then validate the rendered Compose model.
14. Start PostgreSQL, migrations when required, API, web, proxy, exporters, Prometheus, Alertmanager, and Grafana in dependency order.
15. Reinstall and enable the backup timers only after the replacement host can create and restore a fresh off-machine snapshot.

## Service verification

Confirm:

- all expected Compose services are healthy;
- PostgreSQL, Fastify, Prometheus, Alertmanager, and exporters have no host publication;
- Caddy is the only private-LAN application listener and Grafana remains loopback-only;
- UFW and SSH match the accepted private subnets;
- the API health endpoint, login, workout history, and analytics work without exposing data in logs;
- all Prometheus targets are up and the alert-rule count matches the restored configuration;
- Telegram receives one reviewed synthetic lifecycle test only when the owner approves it;
- backup metrics show a new success and the dashboard's backup panels populate;
- systemd has no failed units;
- a controlled reboot preserves the stack, timers, metrics, and network policy.

## Address and routing changes

The current private Ethernet endpoint is reserved outside this document's recovery logic. If replacement hardware receives a different private address, update the router reservation, SSH alias, Caddy/LAN checks, and documentation deliberately. Public DNS, port forwarding, public HTTPS, or an external tunnel require a separate future decision.

## Rollback during recovery

Keep the original disk, original Docker volume, restored snapshot, and pre-change configuration until the owner accepts the recovered service. If the candidate fails, stop it, preserve logs, return routing to the prior healthy target when available, and diagnose without deleting either recovery path.
