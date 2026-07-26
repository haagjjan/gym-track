# Stage 6 PostgreSQL Foundation Report

- **Target:** `gym-prod`
- **Execution date:** 2026-07-21
- **Execution boundary:** Stage 6 only
- **Compose project:** `gym-tracker`
- **Source snapshot:** `c168dd9f31dc953724d4b62a47f16c22f77be01a`

## Executive summary

Stage 6 completed successfully. PostgreSQL 17.10 is running as the only service in the `gym-tracker` Compose project. Its exact Alpine-based image is digest-pinned, its data is stored outside Git under `/srv/gym-tracker/data/postgres`, and it has no published host port. The database is attached only to an internal Docker network.

Separate non-login owner, migration, and restricted runtime roles were created. Both login roles were proven to authenticate with SCRAM over the Docker network. The runtime role can perform application DML on owner-created objects but cannot create tables, databases, roles, extensions, or assume the owner role.

A custom-format logical backup was created under `/srv/gym-tracker/backups/postgres`. It was restored successfully into a disposable, isolated PostgreSQL instance, where the test row, ownership, and runtime grants were verified. All disposable resources and temporary credentials were then removed. The live validation table was also removed, leaving no application table or real user data in the database.

An ordinary container restart and a controlled host reboot both preserved the database identity, roles, storage, backup, health, and network isolation. Docker, containerd, SSH, and UFW returned active with no failed system unit. Stage 7 was not started.

## Repository database requirements

Observed facts:

- The repository uses PostgreSQL and `node-pg-migrate` `^8.0.4`; it does not use Prisma.
- Migration configuration is in `apps/api/db/migrate.json`.
- Five plain-SQL migrations were present in the inspected source snapshot.
- No migration requires a PostgreSQL extension.
- The repository's development database image is `postgres:17-alpine`.
- The retained Render configuration also targets PostgreSQL 17.
- The Dockerfile provides a separate `migrate` target, so migration and runtime identities can be separated.
- Host Node.js and pnpm are not needed for this database-only stage.

Decision:

- PostgreSQL 17 was selected to match both existing repository conventions and the retained hosted-deployment configuration.
- An exact image digest and exact resolved version were recorded so later starts cannot silently select another image.

## Selected PostgreSQL image and digest

The deployed image is:

```text
docker.io/library/postgres:17.10-alpine3.24@sha256:742f40ea20b9ff2ff31db5458d127452988a2164df9e17441e191f3b72252193
```

Verified platform details:

```text
PostgreSQL version       17.10
Alpine version           3.24
Architecture             amd64
amd64 manifest digest    sha256:af194ccf3e2d7fe367012c7b88ce8b816c5c889b18a5b316799a1f0d7eac746a
Container postgres UID   70
Container postgres GID   70
```

The container user identity was measured with the pinned image before data-directory ownership was applied; it was not guessed.

## Compose structure

The permanent Compose file is:

```text
/srv/gym-tracker/deploy/compose/compose.yaml
```

It defines one `postgres` service with:

- the exact digest-pinned image;
- `restart: unless-stopped`;
- `stop_grace_period: 1m`;
- `no-new-privileges:true`;
- a secret-file bootstrap password;
- `PGDATA=/var/lib/postgresql/data/pgdata`;
- a bind mount from `/srv/gym-tracker/data/postgres`;
- a `pg_isready` health check;
- one internal network named `database`;
- no `ports` section.

Final Docker objects:

```text
Container  gym-tracker-postgres-1
Network    gym-tracker_database
Volume     none; persistent data uses a host bind mount
```

Docker reports `5432/tcp` because the image declares that container port. `docker port` returned no binding and the inspected `PortBindings` object was empty.

## Persistent-storage path and ownership

Persistent cluster storage is outside the Git checkout:

```text
/srv/gym-tracker/data/postgres
```

Verified metadata:

| Path | Owner/group | Mode |
| --- | --- | ---: |
| `/srv/gym-tracker/data/postgres` | UID/GID `70:70` | `0750` |
| `/srv/gym-tracker/data/postgres/pgdata` | UID/GID `70:0` | `0700` |
| `pgdata/PG_VERSION` | UID/GID `70:70` | `0600` |

`PG_VERSION` contains `17`. The initialized cluster occupied approximately 43 MB. The Stage 5 layout check was extended for the PostgreSQL ownership and secret-file policy and passed after the change.

## Secret files created

The following live files were generated directly on `gym-prod` and were never added to Git:

```text
/srv/gym-tracker/secrets/postgres-bootstrap-password
/srv/gym-tracker/secrets/postgres-migrator-password
/srv/gym-tracker/secrets/postgres-app-password
/srv/gym-tracker/secrets/database-runtime-url
/srv/gym-tracker/secrets/database-migration-url
```

All five files are owned by `admin-gym:gym-tracker` with mode `0600`. Passwords were generated independently with 256 bits of randomness. The two connection files use the Docker service name `postgres`; their contents are intentionally omitted.

The rendered Compose configuration was searched for every exact generated secret. None appeared in the rendered output. Passwords, complete connection URLs, private keys, and dump contents are not present in this report.

## Database and role model

The live database is `gym_tracker`. Its owner and the `public` schema owner are both `gym_tracker_owner`.

| Role | Login | Membership/purpose | Security properties |
| --- | ---: | --- | --- |
| Bootstrap `postgres` | Yes | Initial container administration | Container-only administration identity |
| `gym_tracker_owner` | No | Owns the database, schema, and migration-created objects | No superuser, database creation, role creation, inheritance, or replication |
| `gym_tracker_migrator` | Yes | Explicit migration commands; member of owner role | No superuser, database creation, role creation, inheritance, or replication |
| `gym_tracker_app` | Yes | Runtime API database access | No superuser, database creation, role creation, inheritance, replication, or owner membership |

The migration connection sets the effective role to `gym_tracker_owner`. The runtime role receives owner-defined default privileges for table DML and sequence use. `PUBLIC` privileges were revoked from the database and schema, and default public function execution was revoked for future owner-created functions.

Privilege tests passed:

- migration login authenticated over TCP with SCRAM and created an owner-owned probe table;
- runtime login authenticated over TCP with SCRAM and performed `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on that table;
- runtime table creation was denied;
- runtime database creation was denied;
- runtime role creation was denied;
- runtime `SET ROLE gym_tracker_owner` was denied;
- runtime `CREATE EXTENSION pg_trgm` was denied;
- an intentionally incorrect password was rejected.

The effective host-based authentication policy trusts the Unix socket and container loopback connections used for local administration and health checks. Non-loopback host TCP connections require `scram-sha-256`, and `password_encryption` is `scram-sha-256`.

## Health-check result

At final verification:

```text
Container state       running
Container health      healthy
pg_isready            accepting connections
PostgreSQL version    17.10
Restart policy        unless-stopped
Live public tables    0
Critical log events   none after the post-reboot start time
```

The expected Alpine initialization warning that no system locales were usable was observed. The cluster initialized and all connection, privilege, restart, backup, restore, and reboot checks passed.

Data-page checksums are disabled by the official image's default initialization behavior. No reinitialization or data-directory deletion was performed.

## Network-isolation verification

The database network `gym-tracker_database` was verified with `Internal=true` and only the PostgreSQL container attached.

No PostgreSQL host publication exists:

- `docker port gym-tracker-postgres-1` returned no mapping;
- inspected host port bindings were empty;
- host `ss` output contained no listener on port `5432`;
- connection attempts to loopback, Ethernet address `192.168.1.57`, and Wi-Fi address `192.168.86.178` were blocked;
- MacBook connection attempts to both server LAN addresses were blocked.

UFW was unchanged. Its only allow rules remain scoped SSH access on Ethernet from `192.168.1.0/24` and Wi-Fi from `192.168.86.0/24`. No PostgreSQL firewall rule was added.

## Initial backup

The retained backup is:

```text
/srv/gym-tracker/backups/postgres/gym_tracker-pre-app-20260721T145913Z.dump
```

Verified properties:

```text
Format       PostgreSQL custom archive
Size         3466 bytes
Mode         0640
Owner/group  admin-gym:gym-tracker
SHA-256      3ac0c76271277e3c6e4fb82782b6c6dd15de30d323e70a0f797cabfc8f1146b5
```

The backup was taken after creating a one-row probe table and confirming runtime DML. It therefore provided a concrete restore proof without containing real user data. After the restore test, the probe table was dropped from the live database; the retained archive remains the pre-application recovery point.

## Disposable restore test

The backup was restored with the same pinned PostgreSQL image into resources created only for this test:

- a unique internal Docker network;
- a unique Docker-managed data volume;
- a unique PostgreSQL container with no published port;
- a temporary password file outside the repository.

The disposable database was prepared with placeholder owner and runtime roles needed by the archive. `pg_restore --exit-on-error` completed successfully. Verification confirmed:

- the row value `stage6-backup-proof` was restored;
- the restored table owner was `gym_tracker_owner`;
- the runtime DML access-control entries were restored.

The exact disposable container, volume, network, and temporary password file were then removed. Final Docker and filesystem searches found none of them. The permanent PostgreSQL service remained healthy throughout.

## Reboot verification

Two persistence tests passed.

First, an ordinary container restart preserved:

- the PostgreSQL system identifier;
- the `gym_tracker` database object identifier;
- all three deliberate roles;
- the empty final live schema;
- the backup and its checksum;
- the internal-only network and absence of port bindings.

Second, a controlled host reboot completed successfully. Both Ethernet and Wi-Fi SSH paths returned. Post-reboot verification found:

```text
Kernel                  7.1.3-1-t2-resolute
Docker                  active
containerd              active
SSH                     active
UFW                     active
Failed system units     none
PostgreSQL              running and healthy
PostgreSQL start time   2026-07-21T15:02:12.081284199Z
```

The database identity, role set, TCP SCRAM authentication for both application identities, backup checksum, data permissions, zero published ports, and internal network all persisted. Post-start PostgreSQL logs contained no `PANIC` or `ERROR` entry.

## Files changed

Permanent files created on `gym-prod`:

```text
/srv/gym-tracker/deploy/compose/compose.yaml
/srv/gym-tracker/state/postgres-image.txt
/srv/gym-tracker/state/postgres-foundation.txt
/srv/gym-tracker/secrets/postgres-bootstrap-password
/srv/gym-tracker/secrets/postgres-migrator-password
/srv/gym-tracker/secrets/postgres-app-password
/srv/gym-tracker/secrets/database-runtime-url
/srv/gym-tracker/secrets/database-migration-url
/srv/gym-tracker/backups/postgres/gym_tracker-pre-app-20260721T145913Z.dump
```

Permanent server file updated:

```text
/srv/gym-tracker/scripts/check-layout.sh
```

Persistent PostgreSQL cluster files were created beneath `/srv/gym-tracker/data/postgres`. The only repository artifact created for Stage 6 is this report. Application source, migrations, Dockerfiles, and the Stage 5 snapshot checkout were not modified.

All known Stage 6 helper files, captured command outputs, generated role SQL, and restore-test credentials were explicitly removed. No broad or recursive cleanup command was used.

## Deviations and deferred work

1. The stage draft refers to Prisma, but the repository uses `node-pg-migrate`. The repository's actual migration model was followed.
2. The first role-authentication check ran through container loopback, where the official image uses trust authentication. This was recognized and corrected: both identities and the wrong-password case were retested over the internal Docker network using the service name, proving SCRAM behavior.
3. The official image's effective authentication policy retains trust for Unix socket and container loopback access. Database traffic from application containers uses SCRAM.
4. Alpine logged the expected missing-system-locale warning during initialization. This did not prevent database initialization or any acceptance test.
5. Data-page checksums are disabled by the official default. Changing this would require deliberate cluster reinitialization and was not authorized.
6. One version-inspection client was stopped by nested terminal job control while running through `sudo` in tmux. The client was terminated safely; PostgreSQL remained healthy, and subsequent inspection used direct container execution.
7. The pre-existing tmux server did not inherit the new Stage 5 supplementary group. It was empty and was replaced before privileged database work; the replacement session had the correct group.
8. Scheduled and off-machine backups remain deferred to Wave C. The retained Stage 6 archive is a local recovery proof, not a complete backup policy.
9. No real application migration was run, because application deployment belongs to Stage 7.

## Exact commands executed

The following lists the material command forms used. Secret values and complete database URLs are omitted deliberately.

Repository and host preflight:

```bash
git -C /srv/gym-tracker/repo status --short --branch
find /srv/gym-tracker/repo -type f -path '*/migrations/*' -print
rg -n 'postgres|DATABASE_URL|MIGRATION|node-pg-migrate|prisma' /srv/gym-tracker/repo
find /srv/gym-tracker/data/postgres -mindepth 1 -print -quit
sudo docker ps -a
sudo docker volume ls
sudo docker network ls
ss -H -lnt
systemctl --failed --no-legend --plain
```

Image selection and storage:

```bash
sudo docker pull 'postgres:17.10-alpine3.24'
sudo docker image inspect 'postgres:17.10-alpine3.24'
sudo docker buildx imagetools inspect 'postgres:17.10-alpine3.24'
sudo docker run --rm "$pinned_postgres_image" id postgres
sudo install -d -o 70 -g 70 -m 0750 /srv/gym-tracker/data/postgres
sudo install -d -o admin-gym -g gym-tracker -m 2750 /srv/gym-tracker/backups/postgres
```

Secret generation and metadata checks:

```bash
umask 077
openssl rand -hex 32 > /srv/gym-tracker/secrets/postgres-bootstrap-password
openssl rand -hex 32 > /srv/gym-tracker/secrets/postgres-migrator-password
openssl rand -hex 32 > /srv/gym-tracker/secrets/postgres-app-password
chmod 0600 /srv/gym-tracker/secrets/postgres-*-password
chmod 0600 /srv/gym-tracker/secrets/database-runtime-url
chmod 0600 /srv/gym-tracker/secrets/database-migration-url
stat -c '%A %a %U:%G %n' /srv/gym-tracker/secrets/*
```

Compose startup and isolation checks:

```bash
sudo docker compose -p gym-tracker -f /srv/gym-tracker/deploy/compose/compose.yaml config
sudo docker compose -p gym-tracker -f /srv/gym-tracker/deploy/compose/compose.yaml up -d postgres
sudo docker compose -p gym-tracker -f /srv/gym-tracker/deploy/compose/compose.yaml ps
sudo docker inspect gym-tracker-postgres-1
sudo docker network inspect gym-tracker_database
sudo docker port gym-tracker-postgres-1
ss -H -lnt
sudo ufw status verbose
```

Role creation and privilege testing used `psql` inside short-lived clients on `gym-tracker_database`. Passwords were read from protected files into process environments; they were not placed in command arguments. The material SQL operations were:

```sql
CREATE ROLE gym_tracker_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
CREATE ROLE gym_tracker_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
CREATE ROLE gym_tracker_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
GRANT gym_tracker_owner TO gym_tracker_migrator;
CREATE DATABASE gym_tracker OWNER gym_tracker_owner;
ALTER SCHEMA public OWNER TO gym_tracker_owner;
REVOKE ALL ON DATABASE gym_tracker FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE gym_tracker TO gym_tracker_migrator, gym_tracker_app;
GRANT USAGE ON SCHEMA public TO gym_tracker_app;
ALTER DEFAULT PRIVILEGES FOR ROLE gym_tracker_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO gym_tracker_app;
ALTER DEFAULT PRIVILEGES FOR ROLE gym_tracker_owner IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO gym_tracker_app;
ALTER DEFAULT PRIVILEGES FOR ROLE gym_tracker_owner IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
```

Backup, restore, and persistence verification:

```bash
sudo docker exec gym-tracker-postgres-1 pg_isready -U postgres
sudo docker exec gym-tracker-postgres-1 pg_dump \
  --format=custom --file=/tmp/gym_tracker-pre-app.dump gym_tracker
sudo docker cp gym-tracker-postgres-1:/tmp/gym_tracker-pre-app.dump \
  /srv/gym-tracker/backups/postgres/gym_tracker-pre-app-20260721T145913Z.dump
sha256sum /srv/gym-tracker/backups/postgres/gym_tracker-pre-app-20260721T145913Z.dump
sudo docker run --detach --network "$restore_network" --mount source="$restore_volume",target=/var/lib/postgresql/data "$pinned_postgres_image"
sudo docker exec "$restore_container" pg_restore --exit-on-error --dbname=gym_tracker /restore/source.dump
sudo docker restart -t 60 gym-tracker-postgres-1
sudo reboot
```

Disposable resource names were resolved to exact values before their individual removal. Final validation used:

```bash
/srv/gym-tracker/scripts/check-layout.sh
sudo docker compose -p gym-tracker -f /srv/gym-tracker/deploy/compose/compose.yaml ps
sudo docker inspect gym-tracker-postgres-1
sudo docker network inspect gym-tracker_database
sudo docker port gym-tracker-postgres-1
sudo docker volume ls
ss -H -lnt
systemctl --failed --no-legend --plain
sudo systemctl is-active docker containerd ssh ufw
sha256sum /srv/gym-tracker/backups/postgres/gym_tracker-pre-app-20260721T145913Z.dump
sudo -k
sudo -n true
```

## Recommendations for Stage 7

1. Use the protected migration connection file only for the one-shot `node-pg-migrate` container and the runtime connection file only for Fastify.
2. Run migrations before starting the API, then verify that application objects are owned by `gym_tracker_owner` and usable by `gym_tracker_app`.
3. Revoke runtime access to the migration bookkeeping table after migrations. The current owner default privileges would otherwise grant application DML on `schema_migrations`.
4. Keep PostgreSQL attached only to the internal database network and do not add a host port.
5. Add API and web services to the same `gym-tracker` Compose project. Publish neither database nor API to a LAN interface.
6. Confirm non-root runtime behavior and writable paths for the existing application images before accepting the deployment.
7. Preserve the retained pre-application backup and record a new checkpoint after successful migrations.
8. Keep monitoring, reverse-proxy exposure, domains, TLS, and scheduled off-machine backups in their documented later stages.

Stage 7 was not started.
