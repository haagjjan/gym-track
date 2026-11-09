# Stage 5 — Server Filesystem and Repository

## Objective

Establish a predictable and secure server-side layout for source code, deployment configuration, secrets, persistent data, backups, scripts, and release metadata.

Obtain appropriately scoped access to the Gym Tracker repository and clone it without deploying the application.

---

## Dependencies

Wave A must be complete and reviewed.

Required inputs:

- [`../server-status-gym-prod.md`](../server-status-gym-prod.md)
- [`../reports/04-docker-platform-report.md`](../reports/04-docker-platform-report.md)
- the actual Gym Tracker repository;
- confirmation of the intended production branch;
- confirmation of whether the repository is private.

---

## Scope

- inspect existing `/srv`, `/opt`, home-directory, Git, and Docker state;
- inspect the repository structure and deployment-related files;
- create the final `/srv/gym-tracker` layout;
- establish ownership, group, and permissions;
- create a dedicated read-only repository credential when required;
- clone the repository;
- verify remote, branch, and commit;
- identify Dockerfiles, Compose files, environment templates, and migration tooling;
- create deployment-state files and operational script locations;
- produce the Stage 5 report.

---

## Explicitly out of scope

Do not:

- build or run application containers;
- start PostgreSQL;
- create production application credentials;
- run Prisma migrations;
- modify application code;
- push to the remote repository;
- copy the MacBook’s private SSH key to the server;
- publish ports;
- install Node.js or pnpm globally unless the inspected repository proves this is required;
- delete unknown files under `/srv`, `/opt`, `/var/lib/docker`, or the user’s home directory.

---

## Safety constraints

- Inspect before creating directories.
- Stop if `/srv/gym-tracker` already contains meaningful data.
- Do not place secrets inside the Git working tree.
- Do not use a personal access token in a Git remote URL.
- Prefer a dedicated read-only deploy key for a private repository.
- Never print or commit private key material.
- Do not modify Git history, authorship, tags, or branches.
- Do not run `git clean`, `git reset --hard`, or force operations.
- Keep host-specific deployment state separate from application source.

---

## Preferred host layout

```text
/srv/gym-tracker/
├── repo/                   # Git working tree
├── deploy/
│   ├── compose/            # Host-specific Compose files and overrides
│   ├── env/                # Non-secret templates and inventories
│   └── config/             # Service configuration
├── secrets/                # Live secrets; never Git-controlled
├── data/
│   ├── postgres/
│   ├── app/
│   └── proxy/
├── backups/                # Local staging; not the final off-machine backup
├── logs/
├── scripts/
├── releases/
└── state/                  # Deployed commit and operational state
```

The audit may justify a different path. Any deviation must be documented.

---

## Implementation steps

### 1. Inspect current server state

Run:

```bash
sudo ls -la /srv
sudo find /srv -maxdepth 3 -mindepth 1 -printf '%M %u:%g %p\n' 2>/dev/null
sudo ls -la /opt
ls -la "$HOME"
git --version
docker version
docker compose version
```

Search for an existing deployment:

```bash
find "$HOME" /srv /opt \
  -maxdepth 4 \
  -type d \
  \( -name .git -o -iname '*gym*tracker*' \) \
  2>/dev/null
```

Stop if meaningful existing application or database state is found.

### 2. Inspect repository deployment conventions

Using the existing local repository or repository documentation, identify:

- canonical remote URL;
- intended production branch;
- monorepo root;
- Dockerfiles;
- Compose files;
- Render configuration;
- `.env.example` files;
- Prisma schema and migrations;
- web and API ports;
- build commands;
- package-manager lockfile;
- health endpoints;
- current deployment scripts.

Do not invent a replacement structure until existing conventions are understood.

### 3. Create a dedicated server group

Inspect:

```bash
getent group gym-tracker || true
```

Create if absent:

```bash
sudo groupadd --system gym-tracker
```

Add the administrator:

```bash
sudo usermod -aG gym-tracker admin-gym
```

A new login is required before supplementary group membership applies.

### 4. Create the directory structure

Create the base and group-controlled directories:

```bash
sudo install -d -o admin-gym -g gym-tracker -m 2775 \
  /srv/gym-tracker \
  /srv/gym-tracker/repo \
  /srv/gym-tracker/deploy \
  /srv/gym-tracker/deploy/compose \
  /srv/gym-tracker/deploy/env \
  /srv/gym-tracker/deploy/config \
  /srv/gym-tracker/data \
  /srv/gym-tracker/data/app \
  /srv/gym-tracker/backups \
  /srv/gym-tracker/logs \
  /srv/gym-tracker/scripts \
  /srv/gym-tracker/releases \
  /srv/gym-tracker/state
```

Create restricted paths:

```bash
sudo install -d -o admin-gym -g gym-tracker -m 0750 \
  /srv/gym-tracker/data/postgres \
  /srv/gym-tracker/data/proxy

sudo install -d -o admin-gym -g gym-tracker -m 0700 \
  /srv/gym-tracker/secrets
```

The setgid bit on collaborative directories keeps new files in the `gym-tracker` group.

### 5. Configure repository authentication

#### Public repository

Use HTTPS or SSH without an embedded token.

#### Private repository

Preferred approach: a dedicated read-only deploy key generated on `gym-prod`.

```bash
install -d -m 0700 "$HOME/.ssh"

ssh-keygen \
  -t ed25519 \
  -f "$HOME/.ssh/gym_tracker_repo_ed25519" \
  -C "gym-prod-read-only-deploy-key"
```

Set permissions:

```bash
chmod 600 "$HOME/.ssh/gym_tracker_repo_ed25519"
chmod 644 "$HOME/.ssh/gym_tracker_repo_ed25519.pub"
```

Display only the public key:

```bash
cat "$HOME/.ssh/gym_tracker_repo_ed25519.pub"
```

Pause for the user to register it as a **read-only deploy key** for the correct repository.

Create an SSH alias:

```sshconfig
Host github-gym-tracker
    HostName github.com
    User git
    IdentityFile ~/.ssh/gym_tracker_repo_ed25519
    IdentitiesOnly yes
```

Validate:

```bash
ssh -G github-gym-tracker >/dev/null
ssh -T github-gym-tracker
```

A message confirming authentication while denying shell access is expected.

### 6. Clone the repository

Confirm that `/srv/gym-tracker/repo` is empty, then clone the intended branch.

Example form:

```bash
git clone \
  --origin origin \
  --branch '<production-branch>' \
  --single-branch \
  'github-gym-tracker:<owner>/<repository>.git' \
  /srv/gym-tracker/repo
```

Do not substitute placeholders without confirmation.

Verify:

```bash
cd /srv/gym-tracker/repo
git remote -v
git status --short --branch
git branch --show-current
git rev-parse HEAD
git log -1 --format=fuller
```

The working tree must be clean.

### 7. Inspect deployment-related repository files

Run:

```bash
find . -maxdepth 4 \
  \( -iname 'dockerfile*' \
  -o -iname '*compose*.yml' \
  -o -iname '*compose*.yaml' \
  -o -name 'render.yaml' \
  -o -name 'package.json' \
  -o -name 'pnpm-lock.yaml' \
  -o -name 'pnpm-workspace.yaml' \
  -o -name 'turbo.json' \
  -o -name 'schema.prisma' \
  -o -name '.env.example' \
  -o -iname '*health*' \
  \) \
  -print
```

Inspect:

- workspace scripts;
- production build targets;
- Docker build contexts;
- runtime users;
- expected ports;
- BFF API target variables;
- Prisma migration commands;
- health endpoints;
- Render-specific assumptions;
- whether Docker builds require host Node.js.

Do not modify code in this stage.

### 8. Create deployment metadata

Create:

```text
/srv/gym-tracker/state/deployment.env
```

Initial non-secret content:

```text
COMPOSE_PROJECT_NAME=gym-tracker
DEPLOYED_COMMIT=
DEPLOYED_BRANCH=
DEPLOYED_AT=
```

Set:

```bash
chmod 0640 /srv/gym-tracker/state/deployment.env
```

Create a source record:

```bash
cd /srv/gym-tracker/repo
{
  printf 'REMOTE_URL=%q\n' "$(git remote get-url origin)"
  printf 'BRANCH=%q\n' "$(git branch --show-current)"
  printf 'COMMIT=%q\n' "$(git rev-parse HEAD)"
  printf 'RECORDED_AT=%q\n' "$(date --iso-8601=seconds)"
} > /srv/gym-tracker/state/source-record.txt
```

The remote URL must not contain credentials.

### 9. Document secret handling

Create:

```text
/srv/gym-tracker/deploy/env/README.md
```

State that:

- live secret values belong under `/srv/gym-tracker/secrets`;
- `.env.example` files contain placeholders only;
- production `.env` files are never committed;
- secret files use mode `0600`;
- reports refer to secret filenames, not values;
- secrets should not appear directly in shell command lines when avoidable.

Do not generate production database or application secrets yet.

### 10. Create minimal inspection scripts

Create:

```text
/srv/gym-tracker/scripts/show-source.sh
/srv/gym-tracker/scripts/check-layout.sh
```

Requirements:

- `set -euo pipefail`;
- no embedded credentials;
- `show-source.sh` reports branch, commit, remote, and working-tree state;
- `check-layout.sh` verifies required paths and permissions.

Set:

```bash
chmod 0750 /srv/gym-tracker/scripts/*.sh
```

Do not create a deployment script before the Compose design exists.

### 11. Verify Git safety

Run:

```bash
cd /srv/gym-tracker/repo
git status --short --branch
git diff --check
git config --show-origin --get-regexp \
  '^(user\.|remote\.|commit\.|gpg\.|credential\.)' \
  2>/dev/null || true
```

Confirm:

- working tree is clean;
- remote is correct;
- no project-level credential is stored;
- no server-generated files were added;
- no author identity was changed unintentionally.

### 12. Verify permissions

Run:

```bash
sudo find /srv/gym-tracker \
  -maxdepth 3 \
  -printf '%M %u:%g %p\n' \
  | sort

namei -l /srv/gym-tracker/secrets
namei -l /srv/gym-tracker/data/postgres
```

Expected:

- most paths owned by `admin-gym:gym-tracker`;
- `secrets/` not group/world readable;
- no world-writable path;
- repository writable by the intended administrator;
- database data path not world-readable.

---

## Rollback and recovery

### Repository authentication fails

Do not create an unreviewed personal access token workaround.

Inspect:

```bash
ssh -G github-gym-tracker
ssh -vT github-gym-tracker
```

Only the public key may be shared.

### Wrong repository or branch cloned

When no deployment exists, preserve the rejected clone:

```bash
mv /srv/gym-tracker/repo \
  "/srv/gym-tracker/releases/rejected-clone-$(date +%Y%m%d-%H%M%S)"
```

Do not use `rm -rf` casually.

### Existing data found

Stop. Do not merge or overwrite layouts without a reviewed migration plan.

---

## Required report

Create:

```text
docs/server/reports/05-server-filesystem-and-repository-report.md
```

Include:

```markdown
# Stage 5 Server Filesystem and Repository Report

## Executive summary
## Wave A prerequisites
## Pre-existing server state
## Final directory layout
## Ownership and permissions
## Repository authentication method
## Repository remote and branch
## Cloned commit
## Deployment-related repository findings
## Environment and secret conventions
## Operational scripts created
## Git safety verification
## Deviations and deferred decisions
## Exact commands executed
## Recommendations for Stage 6
```

Do not include private key material.

---

## Completion criteria

Stage 5 is complete only when:

- the final `/srv/gym-tracker` layout exists;
- ownership and permissions are verified;
- the secrets directory is restricted;
- the correct repository is cloned;
- the intended branch and commit are recorded;
- the working tree is clean;
- repository access uses no embedded credential;
- deployment-related files have been inspected;
- no application container is running;
- the report is complete.

---

## Stop conditions

Stop and report if:

- an existing deployment or data is discovered;
- repository identity or production branch is uncertain;
- private repository access cannot be established safely;
- a secret is found committed in the repository;
- the working tree is unexpectedly dirty;
- the repository requires an architecture materially different from the expected stack.

Do not continue to Stage 6.
