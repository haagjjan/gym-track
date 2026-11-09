# Gym Tracker Server Setup Index

**Server:** `gym-prod`  
**Primary administrator:** `admin-gym`  
**Current phase:** Wave C complete — private production operations baseline
**Last updated:** 2026-07-22

## Purpose

This index controls the server-setup workflow for the Gym Tracker Mac mini.

Codex must treat every stage document as a separate execution boundary. The existence of later-stage documents is not permission to execute them.

The current factual handoff is:

- [`server-status-gym-prod.md`](../status/server-status-gym-prod.md)

Codex must read that document before executing any stage.

---

## Execution protocol

For every stage:

1. Read the current server-status document.
2. Read the entire stage document before running commands.
3. Confirm that all listed preconditions are satisfied.
4. Inspect before modifying.
5. Keep the current SSH session open during access, firewall, network, or SSH changes.
6. Do not proceed through a failed verification.
7. Do not make unrelated changes.
8. Do not continue to the next stage.
9. Write the required stage report.
10. Stop and wait for review.

Codex must not:

- remove T2-specific firmware or packages;
- replace the T2-compatible kernel with a generic kernel intentionally;
- alter the bootloader or Secure Boot configuration;
- deploy the Gym Tracker during Wave A;
- expose application or dashboard ports;
- create public DNS, port forwarding, tunnels, or external access;
- commit secrets;
- commit or push changes unless separately instructed.

---

## Stage status

| Wave | Stage | Document | Status | Execution permission |
|---|---:|---|---|---|
| Current state | 0 | [`server-status-gym-prod.md`](../status/server-status-gym-prod.md) | Complete through Stage 11 | Read only |
| A | 1 | [`01-host-baseline-audit.md`](./wave-a-host-fundation/01-host-baseline-audit.md) | Complete | Read only |
| A | 2 | [`02-os-admin-foundation.md`](./wave-a-host-fundation/02-os-admin-foundation.md) | Complete | Read only |
| A | 3 | [`03-access-network-hardening.md`](./wave-a-host-fundation/03-access-network-hardening.md) | Complete | Read only |
| A | 4 | [`04-docker-platform.md`](./wave-a-host-fundation/04-docker-platform.md) | Complete | Read only |
| B | 5–8 | [`wave-b-application-platform/README.md`](./wave-b-application-platform/README.md) | Complete | Read only |
| C | 9–11 | [`wave-c-operations-dashboard/README.md`](./wave-c-operations-dashboard/README.md) | Complete | Read only |

Update this table only after a stage has been reviewed and accepted.

---

## Wave A outcome

Wave A prepares the Mac mini as a reliable container host without deploying the application.

At the Wave A checkpoint, the server should be:

- audited and documented;
- updated without damaging T2 support;
- equipped with essential administration tools;
- configured for reliable time, logs, trimming, and security updates;
- reachable through tested SSH key authentication;
- protected by deliberate SSH and UFW policy;
- using Ethernet as the intended primary route while retaining Wi-Fi fallback;
- running a verified Docker Engine and Compose installation;
- free of Gym Tracker application containers and production data.

---

## Completed Wave B outcome

Wave B established:

- server filesystem conventions;
- repository access and deployment structure;
- secrets and persistent data separation;
- PostgreSQL;
- Gym Tracker application containers;
- reverse proxy and private LAN access.

Stages 5 through 8 are complete. Their reports are the source of truth for the active private application platform.

---

## Completed Wave C outcome

Wave C established:

- Prometheus and exporters;
- Grafana dashboard provisioning;
- application and host observability;
- structured logging and initial alerts;
- backups, restore testing, and recovery documentation.

Stages 9 through 11 are complete. Their reports are the source of truth for monitoring, alerting, backup, restoration, and recovery.

---

## Reports

Each executed stage must create a report under:

```text
docs/server/reports/
```

Expected filenames:

```text
01-host-baseline-audit-report.md
02-os-admin-foundation-report.md
03-access-network-hardening-report.md
04-docker-platform-report.md
05-server-filesystem-and-repository-report.md
06-postgresql-foundation-report.md
07-gym-tracker-deployment-report.md
08-reverse-proxy-and-private-lan-access-report.md
09-monitoring-and-grafana-report.md
10-logging-and-alerting-report.md
11-backup-restore-and-disaster-recovery-report.md
```

Reports must not contain:

- passwords;
- private SSH keys;
- API keys;
- tokens;
- database passwords;
- private environment files;
- complete secret values.

Reports may include non-secret host configuration, package versions, command output summaries, and redacted diagnostics.

---

## Global stop conditions

Stop immediately and report before continuing if any action would:

- remove or replace the active T2 kernel;
- remove Apple/T2 firmware support;
- remove `openssh-server`, NetworkManager, or UFW unexpectedly;
- disable both Ethernet and Wi-Fi access;
- make a valid second SSH session impossible;
- require unknown router, DNS, domain, or public exposure changes;
- reveal or commit a secret;
- destroy existing Docker data, application data, or databases;
- deviate materially from the current stage scope.
