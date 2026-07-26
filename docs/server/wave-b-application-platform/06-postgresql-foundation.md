# Stage 6 — PostgreSQL Foundation

## Objective

Deploy a private, persistent PostgreSQL service for the Gym Tracker, create deliberate database roles, and prove that the database can be backed up and restored.

PostgreSQL must not be exposed to the home LAN or public network.

---

## Dependencies

Stage 5 must be complete and reviewed.

Required inputs:

- [`../reports/05-server-filesystem-and-repository-report.md`](../reports/05-server-filesystem-and-repository-report.md)
- the repository’s Prisma schema and migrations;
- the actual PostgreSQL compatibility requirements;
- the Wave A Docker report.

---

## Scope

- inspect repository database requirements;
- select and pin an appropriate PostgreSQL image;
- create secret files outside Git;
- add PostgreSQL to the single `gym-tracker` Compose project;
- configure persistent storage;
- configure health checks;
- create database owner, migration, and runtime roles when supported;
- keep PostgreSQL on an internal Docker network;
- test database connectivity and privileges;
- create a logical backup;
- restore into a disposable isolated database;
- verify reboot persistence;
- produce the Stage 6 report.

---

## Explicitly out of scope

Do not:

- publish PostgreSQL port `5432` to the host;
- expose PostgreSQL to either LAN;
- start Next.js or Fastify;
- create monitoring exporter credentials;
- configure scheduled off-machine backups;
- import real user data;
- use the PostgreSQL `latest` tag;
- delete the PostgreSQL data directory;
- run `docker compose down --volumes`;
- store database passwords in Git-controlled files;
- use `prisma db push` against production.

---

## Safety constraints

- Use one Compose project: `gym-tracker`.
- Pin the PostgreSQL major version and image family.
- Confirm Prisma compatibility before selecting the version.
- Store live credentials under `/srv/gym-tracker/secrets`.
- Keep data outside the Git working tree.
- Never print complete passwords in reports.
- Avoid exposing credentials through shell history or process arguments.
- Use a separate migration identity when the repository supports it.
- Stop if a pre-existing database volume or data directory is found.

---

## Preferred role model

| Role | Login | Purpose |
|---|---:|---|
| `gym_tracker_owner` | No | Owns database objects |
| `gym_tracker_migrator` | Yes | Used only for Prisma migration deployment |
| `gym_tracker_app` | Yes | Runtime API access without schema ownership |
| Bootstrap administrator | Yes | Initial container administration only |

The exact names may be adapted to existing repository conventions.

If the application supports only one `DATABASE_URL`, use migration credentials only for the explicit migration command and runtime credentials for the API service.

---

## Implementation steps

### 1. Inspect database requirements

From the repository:

```bash
cd /srv/gym-tracker/repo

find . \
  \( -name schema.prisma -o -path '*/prisma/migrations/*' \) \
  -print

grep -RInE \
  'postgres|DATABASE_URL|DIRECT_URL|MIGRATION|prisma migrate|db push' \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  . | head -300
```

Inspect:

- Prisma version;
- database provider;
- required extensions;
- raw SQL migrations;
- expected schemas;
- Render database assumptions;
- connection-pool settings;
- whether a migration-only URL already exists.

Do not select a PostgreSQL version until this inspection is complete.

### 2. Select and pin the image

Choose a supported image such as:

```text
postgres:<major>-bookworm
```

or a digest-pinned equivalent after validation.

Do not use:

```text
postgres:latest
```

Pull and record the digest:

```bash
sudo docker pull 'postgres:<selected-tag>'

sudo docker image inspect 'postgres:<selected-tag>' \
  --format '{{index .RepoDigests 0}}'
```

The report must explain the version choice.

### 3. Create secret files

Preferred files:

```text
/srv/gym-tracker/secrets/postgres-bootstrap-password
/srv/gym-tracker/secrets/postgres-migrator-password
/srv/gym-tracker/secrets/postgres-app-password
```

Generate securely:

```bash
umask 077

openssl rand -base64 48 \
  > /srv/gym-tracker/secrets/postgres-bootstrap-password

openssl rand -base64 48 \
  > /srv/gym-tracker/secrets/postgres-migrator-password

openssl rand -base64 48 \
  > /srv/gym-tracker/secrets/postgres-app-password
```

Set:

```bash
chmod 0600 /srv/gym-tracker/secrets/postgres-*-password
```

Verify metadata only:

```bash
stat -c '%A %a %U:%G %n' \
  /srv/gym-tracker/secrets/postgres-*-password
```

Do not display file contents.

### 4. Establish the Compose project

Use:

```text
/srv/gym-tracker/deploy/compose/
```

Preferred files:

```text
compose.yaml
compose.database.yaml
```

or one central `compose.yaml` when that is easier to maintain.

Set:

```text
COMPOSE_PROJECT_NAME=gym-tracker
```

Do not create unrelated Compose projects for database and application services.

### 5. Create an internal database network

Preferred configuration:

```yaml
networks:
  database:
    internal: true
```

PostgreSQL should join only the database network until application services are added.

Do not define `ports:` for PostgreSQL.

### 6. Configure persistent storage

Preferred host path:

```text
/srv/gym-tracker/data/postgres
```

Verify the container’s PostgreSQL user ID before applying ownership:

```bash
sudo docker run --rm 'postgres:<selected-tag>' id postgres
```

Then set only the required ownership on the data directory.

Do not guess the container UID/GID.

### 7. Define the PostgreSQL service

The service must include:

- pinned image;
- restart policy;
- secret-based bootstrap password;
- no host-published port;
- persistent data;
- internal database network;
- health check;
- inherited Docker log rotation.

Example pattern:

```yaml
services:
  postgres:
    image: postgres:<selected-tag>
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_DB: postgres
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_bootstrap_password
    secrets:
      - postgres_bootstrap_password
    volumes:
      - /srv/gym-tracker/data/postgres:/var/lib/postgresql/data
    networks:
      - database
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d postgres"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 20s
```

Adapt to the selected image and repository.

Validate before startup:

```bash
cd /srv/gym-tracker/deploy/compose
sudo docker compose config
```

The rendered configuration must not reveal secret values.

### 8. Start PostgreSQL

Run:

```bash
sudo docker compose up -d postgres
sudo docker compose ps
sudo docker compose logs --tail=200 postgres
```

Wait for healthy state:

```bash
sudo docker inspect \
  --format '{{.State.Health.Status}}' \
  "$(sudo docker compose ps -q postgres)"
```

Expected:

```text
healthy
```

### 9. Create database and roles

Create:

- database `gym_tracker`;
- owner role;
- migration role;
- runtime role;
- schema permissions;
- default privileges for future tables and sequences.

Use a temporary restricted SQL or `psql` variable approach outside Git.

Requirements:

- no secret appears in the repository;
- no secret appears in the report;
- temporary generated SQL is removed afterward;
- runtime role is not a superuser and does not own the database;
- migration role can apply schema changes;
- owner role does not need login access.

### 10. Verify privileges

Verify:

- bootstrap administrator can administer;
- migrator can create and alter schema objects;
- runtime role can connect and perform expected DML;
- runtime role cannot create databases, roles, or extensions;
- runtime role does not own the database.

Useful inspection:

```sql
\du
\l+ gym_tracker
\dn+
```

Record sanitized output only.

### 11. Create connection secret files

Create:

```text
/srv/gym-tracker/secrets/database-runtime-url
/srv/gym-tracker/secrets/database-migration-url
```

Set:

```bash
chmod 0600 /srv/gym-tracker/secrets/database-*-url
```

The host part should be the Docker service name:

```text
postgres
```

Do not use `192.168.1.57` for container-to-container database traffic.

Do not include full URLs in the report.

### 12. Verify network isolation

Run:

```bash
sudo docker compose ps
sudo ss -lntup | grep 5432 || true
sudo docker port "$(sudo docker compose ps -q postgres)"
```

Expected:

- no host listener on `5432`;
- no published Docker port.

Attempt from the host:

```bash
nc -vz 127.0.0.1 5432
nc -vz 192.168.1.57 5432
```

Both should fail unless a separate pre-existing local PostgreSQL service exists.

### 13. Create a logical backup

Create:

```bash
install -d -m 0750 /srv/gym-tracker/backups/postgres
```

Create a custom-format dump named like:

```text
gym_tracker-pre-app-<timestamp>.dump
```

Authenticate without printing the password.

After creation:

```bash
ls -lh /srv/gym-tracker/backups/postgres
sha256sum /srv/gym-tracker/backups/postgres/*.dump
```

Record filename, size, and checksum only.

### 14. Perform a disposable restore test

Create an isolated disposable PostgreSQL container with:

- matching PostgreSQL major version;
- temporary network;
- temporary volume or directory;
- no host-published port.

Restore the dump.

Verify:

- restore exits successfully;
- expected schema exists;
- a simple query succeeds;
- role ownership behavior is understood.

Remove only the disposable test resources afterward.

Do not remove production data.

### 15. Reboot verification

Before reboot:

```bash
sudo docker compose ps
sudo docker compose exec postgres pg_isready
sudo ss -lntup | grep 5432 || true
```

Reboot:

```bash
sudo reboot
```

Reconnect and verify:

```bash
cd /srv/gym-tracker/deploy/compose

sudo docker compose ps
sudo docker compose exec postgres pg_isready

sudo docker inspect \
  --format '{{.State.Health.Status}}' \
  "$(sudo docker compose ps -q postgres)"

sudo ss -lntup | grep 5432 || true
```

Expected:

- PostgreSQL restarts automatically;
- health becomes `healthy`;
- no host port is published;
- data and roles persist.

---

## Rollback and recovery

### PostgreSQL fails before real data exists

Inspect:

```bash
sudo docker compose logs --tail=300 postgres
sudo docker inspect "$(sudo docker compose ps -q postgres)"
```

Correct configuration without deleting the data directory.

### Initialization role error

Do not wipe the database directory to rerun initialization.

Use the bootstrap administrator to correct roles deliberately.

### Data-directory ownership error

Inspect the selected image’s actual PostgreSQL UID/GID and correct only the bind-mounted path.

### Restore test fails

Do not continue. Record whether failure came from:

- dump creation;
- version mismatch;
- role ownership;
- missing extension;
- invalid SQL or migration assumption.

---

## Required report

Create:

```text
docs/server/reports/06-postgresql-foundation-report.md
```

Include:

```markdown
# Stage 6 PostgreSQL Foundation Report

## Executive summary
## Repository database requirements
## Selected PostgreSQL image and digest
## Compose structure
## Persistent-storage path and ownership
## Secret files created
## Database and role model
## Health-check result
## Network-isolation verification
## Initial backup
## Disposable restore test
## Reboot verification
## Files changed
## Deviations and deferred work
## Exact commands executed
## Recommendations for Stage 7
```

Do not include passwords, complete database URLs, or dump contents.

---

## Completion criteria

Stage 6 is complete only when:

- PostgreSQL uses a pinned image;
- persistent storage is outside Git;
- no host port is published;
- the database is healthy;
- roles and privileges are documented;
- runtime and migration credentials are separated where supported;
- secret files are mode `0600`;
- a logical backup exists;
- a disposable restore test succeeds;
- PostgreSQL survives reboot;
- the report is complete.

---

## Stop conditions

Stop and report if:

- compatibility with the selected PostgreSQL version is uncertain;
- a pre-existing database is discovered;
- PostgreSQL becomes host- or LAN-accessible;
- secrets appear in Git or rendered Compose output;
- privilege separation cannot be implemented safely;
- backup or restore testing fails;
- the data directory is at risk of deletion;
- the database cannot survive reboot.

Do not continue to Stage 7.
