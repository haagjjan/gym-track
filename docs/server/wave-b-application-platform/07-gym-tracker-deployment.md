# Stage 7 — Gym Tracker Deployment

## Objective

Build and deploy the Gym Tracker Fastify API and Next.js web application against the private PostgreSQL service.

At the end of this stage, the application is testable only from the server itself through localhost-bound ports or internal Docker networking.

LAN exposure belongs to Stage 8.

---

## Dependencies

Stages 5 and 6 must be complete and reviewed.

Required inputs:

- [`../reports/05-server-filesystem-and-repository-report.md`](../reports/05-server-filesystem-and-repository-report.md)
- [`../reports/06-postgresql-foundation-report.md`](../reports/06-postgresql-foundation-report.md)
- clean repository working tree;
- selected production branch and commit;
- database runtime and migration secret files;
- working Docker and Compose.

---

## Scope

- inspect and validate existing Dockerfiles and build scripts;
- determine exact web and API ports;
- inventory required production environment variables;
- create host-specific Compose definitions;
- build pinned application images;
- run an explicit Prisma migration step;
- deploy Fastify and Next.js;
- connect services through internal Docker networks;
- bind temporary host test ports to `127.0.0.1` only;
- add health checks and restart policies;
- record deployed commit and image identifiers;
- test critical application flows from the server;
- verify restart and reboot behavior;
- produce the Stage 7 report.

---

## Explicitly out of scope

Do not:

- expose the application to the LAN;
- add a reverse proxy;
- publish Fastify directly to `192.168.1.57` or `192.168.86.178`;
- expose PostgreSQL;
- create public DNS, HTTPS, or external access;
- deploy Prometheus or Grafana;
- modify application features unrelated to deployment;
- run `prisma db push` against production;
- run unreviewed destructive migrations;
- commit production environment files;
- run migrations automatically on every container restart;
- use floating production image tags.

---

## Safety constraints

- Build from a clean, recorded Git commit.
- Do not deploy uncommitted changes.
- Use the existing package manager and lockfile.
- Prefer Docker builds over global Node.js installation on the host.
- Keep migration credentials out of long-running application containers.
- Use runtime database credentials for Fastify.
- Preserve the existing Next.js BFF architecture.
- Bind all temporary test ports to `127.0.0.1`.
- Do not use `docker compose down --volumes`.
- Back up the database before applying non-empty migrations.
- Stop if environment requirements are unclear.

---

## Target service topology

Preferred Docker networks:

```text
frontend
application
database
```

Preferred relationships:

```text
web
- frontend network
- application network
- calls api by Docker service name

api
- application network
- database network
- calls postgres by Docker service name

postgres
- database network only
```

The reverse proxy joins `frontend` in Stage 8.

The browser should not call Fastify directly when Next.js BFF routes are intended to manage cookies and authentication.

---

## Implementation steps

### 1. Verify repository state

Run:

```bash
cd /srv/gym-tracker/repo

git status --short --branch
git branch --show-current
git rev-parse HEAD
git remote -v
```

Stop if the working tree is dirty.

Do not run an implicit `git pull` without recording and reviewing the before and after commit.

### 2. Inspect build and runtime requirements

Inspect:

```bash
cat package.json
cat pnpm-workspace.yaml
cat turbo.json

find apps packages \
  -maxdepth 3 \
  -name package.json \
  -print 2>/dev/null

find . -maxdepth 4 -iname 'dockerfile*' -print

find . -maxdepth 4 \
  \( -iname '*compose*.yaml' -o -iname '*compose*.yml' \) \
  -print

find . -maxdepth 4 -name '.env.example' -print
```

Determine:

- package-manager version;
- Node.js version;
- workspace build commands;
- Next.js production command;
- Fastify production command;
- API and web ports;
- health endpoints;
- Next.js output mode;
- Prisma generation and migration requirements;
- native dependencies;
- build-time versus runtime variables;
- Render-specific assumptions;
- cookie, proxy, and trusted-origin configuration.

### 3. Audit Dockerfiles

For each production Dockerfile, verify:

- controlled Node base image;
- multi-stage build;
- lockfile-enforced install;
- non-root runtime user;
- no secret copied into image layers;
- correct monorepo build context;
- Prisma client generation;
- production-only runtime;
- correct signal handling;
- correct exposed port;
- health-check compatibility.

Do not rewrite the application architecture casually. Required source changes must be separately scoped and reviewed.

### 4. Create an environment-variable inventory

Create:

```text
/srv/gym-tracker/deploy/env/required-variables.md
```

Classify every variable:

| Class | Examples |
|---|---|
| Build-time public | `NEXT_PUBLIC_*` values intentionally included in browser bundles |
| Runtime non-secret | environment name, log level, internal service URL |
| Runtime secret | auth secret, cookie secret, runtime database URL |
| Migration-only secret | migration database URL |
| Optional integration | email, storage, analytics, error reporting |

Do not place live values in the Markdown inventory.

### 5. Generate confirmed application secrets

Generate only secrets actually required by the repository.

Preferred location:

```text
/srv/gym-tracker/secrets/
```

Possible files:

```text
application-auth-secret
cookie-signing-secret
database-runtime-url
database-migration-url
```

Use mode:

```bash
chmod 0600 /srv/gym-tracker/secrets/<secret-file>
```

Do not print values or create speculative secrets for unused integrations.

### 6. Create or extend the Compose definition

Use the existing project under:

```text
/srv/gym-tracker/deploy/compose/
```

Add:

- `api`;
- `web`;
- existing `postgres`;
- internal networks;
- explicit build contexts;
- image tags containing the Git commit;
- secret and environment-file mounts;
- health checks;
- restart policies;
- temporary loopback-only test ports.

Preferred image tags:

```text
gym-tracker-api:<short-commit>
gym-tracker-web:<short-commit>
```

Temporary publication pattern:

```yaml
ports:
  - "127.0.0.1:<host-port>:<container-port>"
```

Do not bind application ports to all interfaces.

Validate:

```bash
sudo docker compose config
```

Inspect rendered output for accidental secret exposure.

### 7. Build the application images

Record:

```bash
commit="$(git rev-parse HEAD)"
short_commit="$(git rev-parse --short=12 HEAD)"
```

Build:

```bash
sudo docker compose build --pull api web
```

Record:

```bash
sudo docker compose images
sudo docker image inspect \
  "gym-tracker-api:${short_commit}" \
  "gym-tracker-web:${short_commit}"
```

Do not prune previous known-good images.

### 8. Review pending database migrations

Before applying migrations:

- confirm PostgreSQL is healthy;
- confirm a valid backup exists;
- inspect pending migrations;
- inspect migration SQL for destructive operations;
- verify the database state is expected.

Use repository-supported production commands, normally:

```text
prisma migrate status
prisma migrate deploy
```

Do not use:

```text
prisma migrate dev
prisma db push
```

against production.

### 9. Run migrations as a one-shot task

Create a migration service or command that:

- uses migration credentials;
- joins the database network;
- uses the built application or dedicated migration image;
- exits after migration;
- has no restart policy;
- is not part of normal service startup.

Expected operational shape:

```bash
sudo docker compose run --rm migrate
```

Record:

- migrations detected;
- migrations applied;
- command exit code;
- resulting schema state.

The long-running API container must not receive migration credentials.

### 10. Start API and web services

Run:

```bash
sudo docker compose up -d api web
sudo docker compose ps
```

Inspect:

```bash
sudo docker compose logs --tail=300 api
sudo docker compose logs --tail=300 web
```

Wait for health checks to pass.

### 11. Verify API health

Using the actual loopback test port and health path:

```bash
curl -fsS \
  http://127.0.0.1:<api-test-port>/<health-path>
```

Verify:

- process health;
- database connectivity;
- no migration error;
- correct production log mode;
- no secret values in logs.

The API must not listen on a LAN address.

### 12. Verify web and BFF health

Run:

```bash
curl -fsS \
  http://127.0.0.1:<web-test-port>/ \
  >/dev/null
```

Verify:

- Next.js production server responds;
- static assets are available;
- no development server is running;
- BFF routes resolve the API by Docker service name;
- cookie and origin configuration is coherent for Stage 8.

### 13. Run non-destructive smoke tests

Test:

- home or login page;
- health endpoint;
- disposable test account only when approved;
- login;
- basic protected route;
- API-backed page;
- logout;
- absence of application errors in web and API logs.

Do not import real user data.

### 14. Record deployment state

Update:

```text
/srv/gym-tracker/state/deployment.env
```

Non-secret fields:

```text
COMPOSE_PROJECT_NAME=gym-tracker
DEPLOYED_COMMIT=<full-commit>
DEPLOYED_BRANCH=<branch>
DEPLOYED_AT=<ISO-8601 timestamp>
API_IMAGE=<image reference>
WEB_IMAGE=<image reference>
```

Record image IDs or digests.

### 15. Create operational scripts

Create:

```text
/srv/gym-tracker/scripts/status.sh
/srv/gym-tracker/scripts/logs.sh
/srv/gym-tracker/scripts/start.sh
/srv/gym-tracker/scripts/stop.sh
/srv/gym-tracker/scripts/restart.sh
/srv/gym-tracker/scripts/migrate.sh
```

Requirements:

- `set -euo pipefail`;
- fixed Compose directory;
- explicit project name;
- no embedded secrets;
- `stop.sh` must not delete volumes;
- `migrate.sh` is explicit and separate from restart;
- `status.sh` shows commit, containers, health, and published ports.

Set:

```bash
chmod 0750 /srv/gym-tracker/scripts/*.sh
```

### 16. Restart test

Run:

```bash
sudo docker compose restart api web
```

Verify:

- services return healthy;
- migrations do not rerun automatically;
- PostgreSQL remains healthy;
- application state persists.

### 17. Reboot test

Before reboot:

```bash
sudo docker compose ps
sudo docker compose images
sudo ss -lntup
```

Expected application listeners are loopback-only.

Reboot:

```bash
sudo reboot
```

Reconnect and verify:

```bash
cd /srv/gym-tracker/deploy/compose

sudo docker compose ps
sudo docker compose logs --tail=100 api
sudo docker compose logs --tail=100 web

curl -fsS \
  http://127.0.0.1:<web-test-port>/ \
  >/dev/null

curl -fsS \
  http://127.0.0.1:<api-test-port>/<health-path>

sudo ss -lntup
```

### 18. Verify no LAN exposure

From the MacBook:

```bash
nc -vz 192.168.1.57 <web-test-port>
nc -vz 192.168.1.57 <api-test-port>
```

Both should fail because Stage 7 ports are loopback-only.

---

## Rollback and recovery

### Image build fails

Do not alter lockfiles or dependencies on the server without a reviewed repository change.

Record the failing stage, commit, and relevant output.

### Migration fails

Stop deployment.

Do not rerun blindly.

Inspect migration status, PostgreSQL logs, migration logs, and backup availability.

Restore only when the migration changed the database and rollback is required.

### API or web fails

Keep PostgreSQL intact.

Inspect:

```bash
sudo docker compose logs --tail=500 <service>
sudo docker inspect "$(sudo docker compose ps -q <service>)"
```

Revert to a previous known-good image or commit when one exists.

### Reboot does not restore services

Use the Wi-Fi SSH fallback if needed.

Inspect Docker and Compose state. Do not recreate data volumes.

---

## Required report

Create:

```text
docs/server/reports/07-gym-tracker-deployment-report.md
```

Include:

```markdown
# Stage 7 Gym Tracker Deployment Report

## Executive summary
## Deployed branch and commit
## Repository build findings
## Environment-variable inventory
## Secret files created
## Dockerfiles and image tags
## Compose service and network design
## Migration review and result
## API health verification
## Web and BFF verification
## Smoke-test results
## Published-port audit
## Operational scripts created
## Restart and reboot verification
## Rollback state
## Files changed
## Deviations and deferred work
## Exact commands executed
## Recommendations for Stage 8
```

Do not include secret values or full database URLs.

---

## Completion criteria

Stage 7 is complete only when:

- deployment uses a clean recorded commit;
- images build successfully;
- migrations are explicit;
- migration credentials are absent from the runtime API;
- PostgreSQL remains private;
- API and web services are healthy;
- BFF behavior is verified;
- host test ports are loopback-only;
- smoke tests pass;
- services survive restart and reboot;
- deployment metadata is recorded;
- the report is complete.

---

## Stop conditions

Stop and report if:

- the repository requires unreviewed source changes;
- a migration is destructive or fails;
- secrets appear in logs, images, Compose output, or Git;
- the API requires PostgreSQL to be host-published;
- Fastify or Next.js must run as root without justification;
- direct browser-to-API exposure becomes necessary unexpectedly;
- services cannot become healthy;
- LAN clients can reach Stage 7 test ports;
- reboot causes data loss or corruption.

Do not continue to Stage 8.
