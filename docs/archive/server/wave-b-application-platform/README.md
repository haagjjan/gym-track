# Wave B — Application Platform

**Status:** Complete — Stages 5 through 8 verified on `gym-prod`
**Target server:** `gym-prod`
**Primary administrator:** `admin-gym`

## Purpose

Wave B establishes the private production application platform for the Gym Tracker.

It covers:

- the permanent server filesystem structure;
- repository access and deployment metadata;
- separation of source code, secrets, persistent data, and backups;
- PostgreSQL;
- the Next.js and Fastify application services;
- one controlled private LAN entry point.

Wave B does **not** expose the Gym Tracker publicly and does not deploy the monitoring dashboard. Monitoring, alerting, and formal backup operations belong to Wave C.

---

## Required context

Before executing any Wave B stage, read:

- [`../../status/server-status-gym-prod.md`](../../status/server-status-gym-prod.md)
- [`../SERVER-SETUP-INDEX.md`](../SERVER-SETUP-INDEX.md)
- [`../reports/01-host-baseline-audit-report.md`](../reports/01-host-baseline-audit-report.md)
- [`../reports/02-os-admin-foundation-report.md`](../reports/02-os-admin-foundation-report.md)
- [`../reports/03-access-network-hardening-report.md`](../reports/03-access-network-hardening-report.md)
- [`../reports/04-docker-platform-report.md`](../reports/04-docker-platform-report.md)

The Wave A reports are the source of truth when they differ from earlier planning assumptions.

---

## Stage order

| Stage | Document | Purpose |
|---:|---|---|
| 5 | [`05-server-filesystem-and-repository.md`](./05-server-filesystem-and-repository.md) | Establish the host layout, repository access, ownership, secrets boundaries, and deployment metadata |
| 6 | [`06-postgresql-foundation.md`](./06-postgresql-foundation.md) | Deploy private persistent PostgreSQL, create roles, and prove backup and restoration |
| 7 | [`07-gym-tracker-deployment.md`](./07-gym-tracker-deployment.md) | Build and run the Fastify and Next.js services privately on the server |
| 8 | [`08-reverse-proxy-and-private-lan-access.md`](./08-reverse-proxy-and-private-lan-access.md) | Add one controlled LAN entry point and verify the complete application from client devices |

Stages must be executed in order. The existence of a later-stage document is not permission to execute it.

---

## Expected Wave B outcome

After all four stages are complete:

- `/srv/gym-tracker` has a deliberate structure;
- repository files are separated from runtime state;
- credentials and environment values remain outside Git;
- the deployed Git commit is recorded;
- PostgreSQL runs persistently with no LAN-facing database port;
- migrations are deliberate and separate from ordinary service startup;
- Fastify and Next.js run as Compose-managed services;
- the browser reaches only the reverse proxy;
- PostgreSQL, Fastify, and internal service ports remain private;
- the application works from the MacBook and phone over the home network;
- the stack survives restart and reboot;
- no public port forwarding, domain, or external tunnel exists.

---

## Global safety constraints

During Wave B, Codex must not:

- modify T2 firmware, kernel, bootloader, or EFI configuration;
- remove working SSH, UFW, Ethernet, or Wi-Fi fallback access;
- copy the MacBook’s private SSH key to the server;
- commit passwords, tokens, private keys, `.env` files, database dumps, or secret files;
- use floating production image tags such as `latest`;
- publish PostgreSQL to the host network;
- expose Fastify directly to the LAN without reviewed architectural need;
- run destructive Docker commands or delete persistent volumes;
- run `docker compose down --volumes` against production;
- apply an unreviewed destructive database migration;
- expose HTTP or HTTPS publicly;
- change router port forwarding, public DNS, domains, or tunnel configuration;
- begin Wave C monitoring work.

When uncertain, stop and report rather than guessing.

---

## Preferred service flow

```text
Private LAN client
        |
        v
Reverse proxy
        |
        v
Next.js web / BFF
        |
        v
Fastify API
        |
        v
PostgreSQL
```

The existing Next.js BFF architecture should remain the browser-facing API boundary unless repository inspection proves otherwise.

---

## Preferred host layout

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

Repository-controlled templates may live under the repository, but live secrets and runtime data must not.

---

## Reporting

Each stage must create a report under:

```text
docs/server/reports/
```

Expected Wave B reports:

```text
05-server-filesystem-and-repository-report.md
06-postgresql-foundation-report.md
07-gym-tracker-deployment-report.md
08-reverse-proxy-and-private-lan-access-report.md
```

Reports must record decisions, changes, versions, verification, rollback state, and exact commands, but never secret values.

---

## Wave B completion boundary

Wave B ends after Stage 8 has been executed, verified, reported, and reviewed.

Do not continue into Wave C.
