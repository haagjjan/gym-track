# Wave A — Host Foundation

**Status:** Ready for sequential execution  
**Target server:** `gym-prod`  
**Primary user:** `admin-gym`

## Purpose

Wave A prepares the Mac mini as a secure, maintainable, and verified Docker host.

It does **not** deploy the Gym Tracker application, PostgreSQL, Grafana, Prometheus, or any public-facing service.

Codex must execute each stage separately and stop after completing its required verification and report.

---

## Required context

Before starting any Wave A stage, read:

- [`../server-status-gym-prod.md`](../server-status-gym-prod.md)
- [`../SERVER-SETUP-INDEX.md`](../SERVER-SETUP-INDEX.md)

The status document describes the currently known server, network, SSH, firewall, T2-Ubuntu, and hardware state.

The setup index defines the execution order and current authorization boundary.

---

## Stage order

| Stage | Document | Purpose |
|---:|---|---|
| 1 | [`01-host-baseline-audit.md`](./01-host-baseline-audit.md) | Inspect and document the actual server state without making significant changes |
| 2 | [`02-os-admin-foundation.md`](./02-os-admin-foundation.md) | Update Ubuntu and establish the base administration tooling and maintenance configuration |
| 3 | [`03-access-network-hardening.md`](./03-access-network-hardening.md) | Harden SSH, UFW, routing, and network access without causing lockout |
| 4 | [`04-docker-platform.md`](./04-docker-platform.md) | Install and verify Docker Engine, Buildx, containerd, and Docker Compose |

The stages are dependent and must be executed in order.

Codex must not start a later stage merely because its document exists.

---

## Expected Wave A outcome

After all four stages are completed and reviewed, `gym-prod` should be:

- fully audited and documented;
- updated without damaging T2-specific support;
- equipped with essential administration and diagnostic tools;
- configured for reliable time synchronization;
- configured for bounded system-log retention;
- configured for unattended security updates without automatic reboot;
- configured for periodic SSD trimming;
- protected by deliberate SSH and UFW rules;
- reachable through tested Ethernet and Wi-Fi fallback paths;
- using Ethernet as the intended primary outbound connection;
- running Docker Engine and Docker Compose reliably;
- verified after a controlled reboot;
- free of Gym Tracker application, database, and monitoring deployments.

---

## Global safety constraints

During Wave A, Codex must not:

- remove T2-specific firmware or packages;
- intentionally replace the T2-compatible kernel with a generic kernel;
- change the bootloader, EFI layout, or Secure Boot configuration;
- disable both Ethernet and Wi-Fi access;
- close the final working SSH session before testing a replacement session;
- deploy the Gym Tracker application;
- install or configure PostgreSQL, Prometheus, Grafana, or a reverse proxy;
- expose new public or LAN application ports;
- configure domains, HTTPS, router port forwarding, VPNs, or external tunnels;
- delete unknown Docker, database, or application data;
- commit secrets, credentials, private keys, or environment files;
- make unrelated repository or operating-system changes.

When uncertain, Codex must stop and report rather than guess.

---

## Access-safety rule

For any SSH, UFW, routing, NetworkManager, or network-interface change:

1. Keep the current working SSH session open.
2. Open a second terminal session.
3. Apply and validate the change.
4. Test a fresh primary SSH connection.
5. Test the fallback SSH connection where applicable.
6. Close the original session only after both validation and recovery access are proven.

Current intended aliases:

```bash
ssh gym-prod
ssh gym-prod-wifi
```

## Reporting

Each stage must create a report under:

```text
docs/server/reports/
```

Expected Wave A reports:

```text
01-host-baseline-audit-report.md
02-os-admin-foundation-report.md
03-access-network-hardening-report.md
04-docker-platform-report.md
```

Each report must include:

- an executive summary;
- observed pre-change state;
- changes made;
- files created or modified;
- package and service versions where relevant;
- verification results;
- reboot results where required;
- failed, skipped, or deferred work;
- risks and unresolved questions;
- exact commands executed.

Reports must not contain passwords, tokens, private keys, API keys, database credentials, or complete secret values.

---

## Wave A completion boundary

Wave A ends after Stage 4 has been executed, verified, reported, and reviewed.

Do not continue into Wave B.

Wave B will separately cover:

- server filesystem structure;
- repository access;
- secrets and persistent data;
- PostgreSQL;
- Gym Tracker deployment;
- reverse proxy;
- private LAN application access.