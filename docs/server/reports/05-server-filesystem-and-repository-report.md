# Stage 5 Server Filesystem and Repository Report

- **Target:** `gym-prod`
- **Execution date:** 2026-07-21
- **Execution boundary:** Stage 5 only
- **Source snapshot tag:** `gym-prod-snapshot-20260721-1`
- **Source snapshot commit:** `c168dd9f31dc953724d4b62a47f16c22f77be01a`

## Executive summary

Stage 5 completed successfully. The server had no pre-existing Gym Tracker deployment or application data. A dedicated `gym-tracker` system group and the reviewed `/srv/gym-tracker` directory layout were created with separate source, deployment configuration, secrets, persistent data, backups, logs, scripts, releases, and state paths.

The complete current non-ignored MacBook working tree was captured without committing or resetting `main`. A temporary Git index produced an immutable local-only snapshot commit and tag. The real Git index, current branch, `main` commit, staged state, modified files, and untracked files remained unchanged. Nothing was pushed by Codex, so the snapshot did not change GitHub history or the contribution graph.

The verified Git bundle was transferred to `gym-prod` and retained as a release artifact. The server has a clean checkout of the snapshot on `codex/gym-prod-snapshot-20260721-1`. Its parent is the current GitHub `main` commit, and the repository's `origin` uses a server-generated, repository-scoped, read-only GitHub deploy key. The private key never left the server and was never printed.

No application image was built, no container was started, no production secret was generated, no migration was run, and no port was published. Docker, containerd, SSH, and UFW remain active. No container or failed system unit was present during final verification. Sudo authorization was invalidated after the privileged checks.

## Wave A prerequisites

Observed before Stage 5:

- Stages 1 through 4 were complete and reviewed.
- The active kernel remained the T2-compatible `7.1.3-1-t2-resolute` baseline recorded by Wave A.
- Docker Engine and Compose were installed and healthy.
- Docker access remained sudo-only; `admin-gym` was not added to the `docker` group.
- The Stage 3 SSH and UFW access model remained in place.
- `/srv` was empty.
- `/opt` contained only the expected containerd state.
- No existing Gym Tracker path, Git checkout, application listener, or database state was found under the inspected locations.
- No apt daily, apt upgrade, or firmware-refresh maintenance unit was active. The normal `unattended-upgrade-shutdown --wait-for-signal` helper remained idle for shutdown coordination.

## Observed facts and explicit assumptions

Observed facts:

- Canonical repository: `github.com/haagjjan/gym-track`.
- The repository is private.
- Intended long-lived branch: `main`.
- GitHub `main` resolved to `e4222f14dc8089de13f6fcca18de294d1f45fa87` when authenticated from `gym-prod`.
- The MacBook working tree contained the complete application version requested for deployment, including non-ignored modified and untracked files.
- The snapshot contains 512 files and 215 changes relative to its parent: 168 additions, 43 modifications, and 4 deletions.
- Secret-marker inspection found no private-key material or known live-token pattern. The only secret-like source names were ordinary application/CSS token modules.
- Two included documentation artifacts are approximately 23 MB and 24 MB; neither contains a detected credential.

Decisions and assumptions:

- Per the owner's instruction, the complete current non-ignored working tree is the Stage 5 production source.
- The deployment snapshot is intentionally local-only and must not be pushed without a separate explicit decision.
- The snapshot's neutral `deployment-snapshot@localhost.invalid` identity is operational metadata, not project authorship.
- Ignored files were excluded by Git. This prevents normal local secrets and generated artifacts from entering the snapshot.
- Render configuration remains in the repository as an alternative. ADR 0009 records `gym-prod` as the active private deployment target.

## Pre-existing server state

The Stage 5 preflight observed:

```text
/srv                     empty
/srv/gym-tracker         absent
/opt/containerd          present, expected Docker/containerd state
gym-tracker group        absent
existing Gym Tracker Git checkout or data path  none
containers               none
unexpected TCP listener  none
failed system units      none
```

Installed tools relevant to this stage:

```text
Git             2.53.0
Docker Engine   29.6.2
Docker Compose  5.3.1
```

Host Node.js and pnpm are not installed. Repository inspection confirmed they are not required on the host because the Docker build stages provide Node.js and pnpm.

## Final directory layout

```text
/srv/gym-tracker/
├── repo/
├── deploy/
│   ├── compose/
│   ├── env/
│   └── config/
├── secrets/
├── data/
│   ├── postgres/
│   ├── app/
│   └── proxy/
├── backups/
├── logs/
├── scripts/
├── releases/
└── state/
```

Permanent Stage 5 files outside the checkout:

```text
/srv/gym-tracker/deploy/env/README.md
/srv/gym-tracker/releases/gym-progress-tracker-gym-prod-snapshot-20260721-1.bundle
/srv/gym-tracker/scripts/check-layout.sh
/srv/gym-tracker/scripts/show-source.sh
/srv/gym-tracker/state/deployment.env
/srv/gym-tracker/state/source-record.txt
```

## Ownership and permissions

The system group is:

```text
gym-tracker:x:972:admin-gym
```

New login sessions for `admin-gym` include the group. The shared tmux server was created before the group change, so it should be replaced after Stage 5 before relying on supplementary group membership in that pane.

Verified directory policy:

| Path class | Owner/group | Mode |
| --- | --- | ---: |
| Collaborative base, deploy, data, backup, log, script, release, state, and repository directories | `admin-gym:gym-tracker` | `2775` |
| PostgreSQL and proxy data directories | `admin-gym:gym-tracker` | `0750` |
| Live secrets directory | `admin-gym:gym-tracker` | `0700` |
| Deployment metadata and environment policy files | `admin-gym:gym-tracker` | `0640` |
| Operational inspection scripts | `admin-gym:gym-tracker` | `0750` |
| Retained release bundle | `admin-gym:gym-tracker` | `0640` |

No world-writable path exists under `/srv/gym-tracker`. `namei` confirmed that the complete paths to `secrets/` and `data/postgres/` preserve the intended restrictions.

## Repository authentication method

A dedicated Ed25519 deploy key was generated on `gym-prod`:

```text
Private key: /home/admin-gym/.ssh/gym_tracker_repo_ed25519
Public key:  /home/admin-gym/.ssh/gym_tracker_repo_ed25519.pub
SSH alias:   github-gym-tracker
```

The private key has mode `0600`, remains only on the server, and was never displayed or copied. The public key was registered by the owner as the repository's `gym-prod read-only` deploy key with write access disabled.

The SSH alias uses `IdentitiesOnly yes` and strict host-key checking. GitHub's published Ed25519 host key was pinned and independently resolved to:

```text
SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU
```

The expected value was taken from [GitHub's official SSH key fingerprint documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints).

Authentication returned GitHub's expected successful-authentication/no-shell message. `git ls-remote` succeeded for `HEAD` and `refs/heads/main`. No personal access token or embedded remote credential was used.

## Repository remote and branch

Final server repository state:

```text
Remote:        github-gym-tracker:haagjjan/gym-track.git
Branch:        codex/gym-prod-snapshot-20260721-1
Snapshot tag:  gym-prod-snapshot-20260721-1
Origin main:   e4222f14dc8089de13f6fcca18de294d1f45fa87
```

The snapshot branch deliberately has no upstream branch because it is not published to GitHub. The `origin` fetch refspec is restricted to `main`, which can be fetched read-only for provenance and future reviewed releases.

## Cloned commit

```text
Snapshot commit:  c168dd9f31dc953724d4b62a47f16c22f77be01a
Parent commit:    e4222f14dc8089de13f6fcca18de294d1f45fa87
Tree:             9cd2803ee6e53e825e0719f88d3fce6757b3e994
Bundle SHA-256:   707440f0b3864850aa229eacfbabfc6326ed1f457dedd3b72873638d38f80555
```

The local tag, server tag, server checkout, tree object, and verified bundle resolve to the same snapshot commit. The MacBook remained on `main` at its original commit throughout snapshot creation. The real index and working-state hashes were unchanged before and after the operation.

## Deployment-related repository findings

Repository packaging:

- pnpm workspace with `pnpm@10.11.0`.
- Declared runtime requirement: Node.js `>=22.0.0` and pnpm `>=10.0.0`.
- `Dockerfile` provides `migrate`, `api`, and `web` targets from `node:22-bookworm-slim`.
- `Dockerfile.render-api`, `Dockerfile.render-web`, and `render.yaml` remain for the retained Render alternative.
- `compose.monitoring.yaml` exists but belongs to later monitoring work and was not used.

Database and migration behavior:

- PostgreSQL base image: `postgres:17-alpine`.
- Migration tool: `node-pg-migrate` `^8.0.4`.
- Migration configuration: `apps/api/db/migrate.json`.
- Migration target runs `node-pg-migrate ... up` as a separate container target.
- No Prisma schema or Prisma dependency exists.

Network behavior in the base development Compose file:

- PostgreSQL publishes to host loopback port `5432`.
- Fastify publishes to host loopback port `4000`.
- Next.js publishes port `3000` on all host interfaces unless overridden.
- API health endpoint: `/api/v1/health`.
- Next.js supports `API_INTERNAL_HOSTPORT` for the internal API target.

The base Compose file is not safe to use unchanged for production. Stage 6 must remove the PostgreSQL host publication, and Stage 7 must ensure the web service is loopback-only until the reverse proxy is reviewed. The Dockerfiles also do not declare a non-root runtime `USER`; this must be reviewed during the deployment design rather than changed during Stage 5.

## Environment and secret conventions

`/srv/gym-tracker/deploy/env/README.md` records that:

- live secret values belong under `/srv/gym-tracker/secrets`;
- checked-in `.env.example` files contain placeholders only;
- production `.env` files must never be committed;
- secret files use mode `0600`;
- reports name secret files but never record their values;
- secret values should not be placed directly in shell command lines when avoidable.

No production database password, application credential, cookie secret, environment file, database dump, or private key was added to the repository or report.

`state/deployment.env` contains only the non-secret Compose project name and empty deployment fields. Those fields remain empty because Stage 5 cloned source but did not deploy the application.

## Operational scripts created

`/srv/gym-tracker/scripts/show-source.sh` reports:

- safe origin URL;
- current source branch;
- exact commit;
- tags pointing at the commit;
- working-tree status.

`/srv/gym-tracker/scripts/check-layout.sh` verifies:

- every required Stage 5 directory exists;
- required directory owner/group values;
- restrictive modes for secrets, PostgreSQL data, and proxy data;
- absence of world-writable paths;
- clean tracked, staged, and untracked repository state.

Both scripts use `set -euo pipefail`, contain no credentials, have mode `0750`, and passed from a fresh SSH login.

## Git safety verification

Final verification passed:

- server working tree clean;
- server index clean;
- no untracked server-generated file inside the checkout;
- correct branch, tag, commit, parent, and tree;
- correct read-only origin;
- no project-level author, signing, or credential configuration;
- `git diff --check` clean on the server checkout;
- `git fsck --no-dangling` successful;
- no tracked private-key marker or secret-like credential file;
- no MacBook branch movement, reset, stash, or real-index mutation;
- no GitHub push by Codex.

The source snapshot audit reported pre-existing trailing whitespace in several Markdown changes. Those bytes were preserved as requested. They do not dirty the server checkout or affect the application, but should be normalized if those documents are later committed through the ordinary project history.

## Deviations and deferred decisions

1. The runbook's normal private-repository path assumes the production source already exists as one remote commit. The owner identified the complete non-ignored dirty working tree as the production version, so an immutable local-only snapshot commit and verified Git bundle were used. This preserves a clean, auditable server checkout without batch-committing or resetting `main`.
2. The snapshot branch is intentionally not a GitHub branch. It is retained locally and on the server with an annotated tag and release bundle. Future ordinary project commits can continue on `main` without inheriting the deployment snapshot commit.
3. The Wave B draft mentions Prisma. The actual accepted application stack uses `node-pg-migrate`; no Prisma command was run or invented.
4. The base Compose file is development-oriented and cannot be used unchanged in Stages 6 or 7 because of its host port publications and placeholder credentials.
5. Render deployment assets were inspected and retained. They were not modified or removed.
6. Host Node.js and pnpm were not installed because Docker owns the production build/runtime toolchain.
7. The shared tmux session predates the new supplementary group. A new SSH login was used to verify group membership, and the interactive session should be recreated before Stage 6.

## Rollback state

No rollback was required. Before any application deployment, the recoverable Stage 5 state is:

- the exact source remains recoverable from the retained bundle and local-only tag;
- a rejected checkout can be moved under `releases/` without deleting it;
- the read-only GitHub deploy key can be revoked in repository settings;
- no application or database data exists to migrate or restore;
- the directory structure can remain safely unused if Wave B pauses.

Do not delete the release bundle or deploy key casually. Revoke repository access before removing the server key if the deployment path is abandoned.

## Exact commands executed

Sensitive values and private key material are omitted. The public deploy key itself is not repeated in this report.

MacBook repository and snapshot audit:

```bash
git remote get-url origin
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git rev-list --left-right --count origin/main...HEAD
git status --short
GIT_TERMINAL_PROMPT=0 git ls-remote --exit-code origin HEAD refs/heads/main

GIT_INDEX_FILE="$temporary_index" git read-tree HEAD
GIT_INDEX_FILE="$temporary_index" git add -A
GIT_INDEX_FILE="$temporary_index" git ls-files
GIT_INDEX_FILE="$temporary_index" git diff --cached --check
GIT_INDEX_FILE="$temporary_index" git write-tree
git commit-tree "$snapshot_tree" -p "$original_main_commit"
git update-ref refs/heads/codex/gym-prod-snapshot-20260721-1 "$snapshot_commit"
git tag -a gym-prod-snapshot-20260721-1 "$snapshot_commit"
git bundle create /tmp/gym-progress-tracker-gym-prod-snapshot-20260721-1.bundle \
  codex/gym-prod-snapshot-20260721-1 gym-prod-snapshot-20260721-1
git bundle verify /tmp/gym-progress-tracker-gym-prod-snapshot-20260721-1.bundle
```

Transfer and repository authentication:

```bash
scp /tmp/gym-progress-tracker-gym-prod-snapshot-20260721-1.bundle gym-prod:/home/admin-gym/
sha256sum /home/admin-gym/gym-progress-tracker-gym-prod-snapshot-20260721-1.bundle
ssh-keygen -t ed25519 -N '' \
  -f ~/.ssh/gym_tracker_repo_ed25519 \
  -C gym-prod-read-only-deploy-key
chmod 600 ~/.ssh/gym_tracker_repo_ed25519 ~/.ssh/config ~/.ssh/known_hosts
chmod 644 ~/.ssh/gym_tracker_repo_ed25519.pub
ssh-keygen -lf ~/.ssh/known_hosts -E sha256
ssh -G github-gym-tracker
ssh -T github-gym-tracker
git ls-remote github-gym-tracker:haagjjan/gym-track.git HEAD refs/heads/main
```

Shared privileged terminal and layout:

```bash
tmux new-session -d -s codex-admin -c "$HOME"
sudo -v
sudo groupadd --system gym-tracker
sudo usermod -aG gym-tracker admin-gym
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
sudo install -d -o admin-gym -g gym-tracker -m 0750 \
  /srv/gym-tracker/data/{postgres,proxy}
sudo install -d -o admin-gym -g gym-tracker -m 0700 \
  /srv/gym-tracker/secrets
sudo docker ps -a
```

Clone, source metadata, and verification:

```bash
git clone --origin origin \
  --branch codex/gym-prod-snapshot-20260721-1 \
  --single-branch \
  /home/admin-gym/gym-progress-tracker-gym-prod-snapshot-20260721-1.bundle \
  /srv/gym-tracker/repo
git -C /srv/gym-tracker/repo remote set-url origin \
  github-gym-tracker:haagjjan/gym-track.git
git -C /srv/gym-tracker/repo config --unset-all remote.origin.fetch
git -C /srv/gym-tracker/repo config --add remote.origin.fetch \
  '+refs/heads/main:refs/remotes/origin/main'
git -C /srv/gym-tracker/repo branch --unset-upstream
git -C /srv/gym-tracker/repo fetch origin --prune
mv /home/admin-gym/gym-progress-tracker-gym-prod-snapshot-20260721-1.bundle \
  /srv/gym-tracker/releases/
chmod 0640 /srv/gym-tracker/releases/gym-progress-tracker-gym-prod-snapshot-20260721-1.bundle
chgrp gym-tracker /srv/gym-tracker/releases/gym-progress-tracker-gym-prod-snapshot-20260721-1.bundle

/srv/gym-tracker/scripts/show-source.sh
/srv/gym-tracker/scripts/check-layout.sh
git -C /srv/gym-tracker/repo status --short --branch
git -C /srv/gym-tracker/repo diff --check
git -C /srv/gym-tracker/repo fsck --no-dangling
find /srv/gym-tracker -maxdepth 3 -printf '%M %u:%g %p\n' | sort
namei -l /srv/gym-tracker/secrets
namei -l /srv/gym-tracker/data/postgres
ss -H -lnt
systemctl --failed --no-legend --plain
sudo systemctl is-active docker containerd ssh ufw
sudo -k
sudo -n true  # failed as expected after invalidation
```

Cleanup used explicit `unlink` calls for the known MacBook bundle copy and the three known user-owned server helper/output files. No user cleanup command was required. The verified release bundle under `/srv/gym-tracker/releases` was intentionally retained.

## Recommendations for Stage 6

1. Reconnect the interactive SSH/tmux session before Stage 6 so the new `gym-tracker` supplementary group is active in that shell.
2. Design a host-specific Compose file under `/srv/gym-tracker/deploy/compose`; do not modify or run the base development Compose file directly.
3. Use PostgreSQL 17 with an exact reviewed image version or digest rather than an unbounded floating reference.
4. Do not publish PostgreSQL to any host interface, including loopback, unless a reviewed maintenance need is documented.
5. Use `/srv/gym-tracker/data/postgres` for persistent data and `/srv/gym-tracker/backups` only as local backup staging.
6. Generate database credentials directly into mode-`0600` files under `/srv/gym-tracker/secrets` without printing them.
7. Use the repository's actual one-shot `node-pg-migrate` target; do not run Prisma commands.
8. Prove a logical backup and restoration into a separate test target before accepting Stage 6.
9. Keep the web, API, reverse proxy, monitoring overlay, and all application migrations stopped until their ordered stages authorize them.

Stage 6 was not started.
