# Gym Tracker Server — Current Situation Handoff

**Status date:** 2026-07-22

**Purpose:** Provide Codex with an accurate description of the current server state before any further administration work begins.

> This document is a status handoff only. It does not define the next implementation scope.

## Current operational addendum — through Stage 11

This addendum supersedes the historical application, package, and monitoring statements in Sections 12 through 19 below. Those sections are retained as the original pre-deployment handoff; the completed stage reports are the detailed source of truth.

Current verified state:

| Area | Current state |
| --- | --- |
| Host | Ubuntu 26.04 LTS on active T2 kernel `7.1.3-1-t2-resolute` |
| Application snapshot | `73dcc1086802abbf2cbd96e8b1f99502b4c543b1` |
| Server repository | `/srv/gym-tracker/repo`, clean at the deployed snapshot |
| Application access | Private LAN HTTP at `192.168.1.57:80` through Caddy |
| Direct app ports | Next.js `3000`, Fastify `4000`, and PostgreSQL `5432` have no host publication |
| Database | PostgreSQL 17.10, persistent, healthy, and populated with the approved production-account migration |
| Monitoring | Prometheus, Alertmanager, Grafana, Node Exporter, cAdvisor, and PostgreSQL Exporter running under the `gym-tracker` Compose project |
| Prometheus targets | `prometheus`, `api`, `node`, `cadvisor`, `postgres`, and `alertmanager` all `UP` |
| Alerting | 27 Prometheus rules; firing and resolved Telegram delivery proven for application, host, and backup failure paths |
| Logs | Structured API/BFF logs, Caddy query redaction, conservative PostgreSQL diagnostics, and bounded review scripts |
| Grafana | Loopback-only at `127.0.0.1:3001`; accessed through an SSH tunnel |
| Grafana dashboards | `gpt-service-overview`, `gpt-host-containers`, and `gpt-postgresql` provisioned from files |
| Backups | Restic 0.18.1 encrypted SFTP repository on the restricted MacBook destination; 24-hour RPO and 4-hour RTO targets |
| Restore evidence | Newest encrypted snapshot restored into isolated PostgreSQL and configuration targets; both passed |
| Backup scheduling | Four daily backup opportunities and weekly retention/check maintenance; both timers enabled and active |
| Host reboot verification | Stage 11 passed on boot ID `49f6200b-34f9-4bf8-971f-d8e3e803d4b8`; zero failed units |

`systemctl is-system-running` still reports `starting` because the pre-existing `plymouth-quit-wait.service` job remains activating after boot. Docker, the application, SSH, the backup timers, and the Stage 11 verifier all started successfully; diagnose Plymouth only in a separate host-maintenance scope.

The MacBook cannot connect directly to monitoring or internal application ports on either server LAN address. Grafana is the only monitoring service with a host publication, and that publication is loopback-only. The application proxy remains the only private-LAN application publication.

Stage 9 added bounded Fastify request, response, latency, process, and release metrics. Stage 10 added structured request lifecycle logs with validated request IDs, normalized routes, release identity, and sensitive-field redaction. Metrics and alerts do not label users, email addresses, sessions, workouts, exercises, or requests. The production metrics endpoint remains reachable only through the internal monitoring network.

Stage 11 added validated PostgreSQL logical dumps, root-only configuration staging, encrypted off-machine Restic snapshots, retention, backup metrics and alerts, isolated database and configuration restoration tests, and recovery runbooks. The backup and maintenance timers survived reboot. The destination is writable rather than immutable and the MacBook is not always awake, so the repeated daily windows and 30/48-hour stale-backup alerts remain important controls.

Live monitoring and Telegram credentials are protected under `/srv/gym-tracker/secrets` and are not recorded in Git or this document. Grafana anonymous access and sign-up are disabled. Plugin installation and automatic plugin preinstallation are disabled. The PostgreSQL exporter uses the non-superuser `gym_tracker_monitor` role with `pg_monitor` membership and no database-creation, role-creation, replication, or bypass-RLS privilege. Alertmanager publishes no host port; it uses an internal monitoring network plus a dedicated single-service bridge for outbound Telegram HTTPS.

Stage 9 evidence is in [`../server/reports/09-monitoring-and-grafana-report.md`](../server/reports/09-monitoring-and-grafana-report.md). Stage 10 evidence is in [`../server/reports/10-logging-and-alerting-report.md`](../server/reports/10-logging-and-alerting-report.md). Stage 11 evidence is in [`../server/reports/11-backup-restore-and-disaster-recovery-report.md`](../server/reports/11-backup-restore-and-disaster-recovery-report.md). The operator-oriented panel explanation is in [`../server/GRAFANA-DASHBOARD-GUIDE.md`](../server/GRAFANA-DASHBOARD-GUIDE.md), and recovery procedures are in [`../server/disaster-recovery.md`](../server/disaster-recovery.md), [`../server/restore-postgresql.md`](../server/restore-postgresql.md), and [`../server/restore-full-service.md`](../server/restore-full-service.md).

---

## 1. Server identity

| Property | Current value |
|---|---|
| Role | Primary home-hosted Gym Tracker server |
| Hostname | `gym-prod` |
| Main Linux user | `admin-gym` |
| Hardware | Mac mini 2018 |
| CPU | Intel Core i5, 3.0 GHz, 6 cores |
| RAM | 32 GB DDR4 |
| Internal storage | Approximately 500 GB SSD |
| Architecture | `x86_64` |
| Operating mode | Headless, remotely administered over SSH |
| Physical location | Beside the home router and NETGEAR switch |

A second 2018 Intel Mac mini with 8 GB RAM exists but has not yet been configured. It is intended for a later backup or staging role.

---

## 2. Operating system and disk layout

The machine runs a T2-compatible Ubuntu installation:

```text
Ubuntu 26.04 LTS
GNU/Linux 7.1.3-1-t2-resolute x86_64
```

Installer image:

```text
ubuntu-26.04-7.0.9-t2-resolute.iso
```

Installation facts:

- Ubuntu-only installation.
- macOS was removed.
- Secure Boot was disabled in macOS Recovery.
- External boot was allowed.
- The installer USB was created with balenaEtcher.
- The internal SSD is approximately 500 GB.

Observed partition layout:

```text
/dev/nvme0n1p1
- approximately 314 MB
- VFAT
- mounted at /boot/efi
- existing EFI partition reused

/dev/nvme0n1p2
- approximately 499 GB
- ext4
- mounted at /
- formatted during installation
```

No separate `/home`, `/var`, Docker, application-data, or backup partition has been created.

---

## 3. T2-specific hardware support

Internal Apple Wi-Fi and Bluetooth initially did not work.

Firmware was installed with:

```bash
get-apple-firmware get_from_online
```

Supporting packages such as `dmg2img` were installed during that process.

Current result:

- internal Wi-Fi works;
- Bluetooth firmware was extracted and installed;
- the internal Wi-Fi interface is `wlp3s0`.

This is not a generic PC Ubuntu installation. Kernel, firmware, bootloader, and hardware-driver changes must account for Apple T2 support.

---

## 4. SSH access

OpenSSH is installed and working.

Verified service state:

```text
systemctl is-active ssh
active

systemctl is-enabled ssh
enabled
```

SSH starts automatically after boot and works without a graphical desktop login.

### Authentication

A dedicated Ed25519 key pair exists on the MacBook:

```text
Private key: ~/.ssh/gym_prod_ed25519
Public key:  ~/.ssh/gym_prod_ed25519.pub
```

The public key is installed for `admin-gym` in:

```text
~/.ssh/authorized_keys
```

The private key:

- is passphrase-protected;
- is stored only on the MacBook;
- has been added to the macOS Keychain;
- was successfully tested with password fallback disabled.

Password-based SSH authentication has not intentionally been disabled yet. It remains available as an early recovery mechanism.

The sudo password is still required for privileged commands. No password is included in this document.

---

## 5. MacBook SSH aliases

The MacBook uses these intended entries in `~/.ssh/config`:

```sshconfig
Host gym-prod
    HostName 192.168.1.57
    User admin-gym
    IdentityFile ~/.ssh/gym_prod_ed25519
    IdentitiesOnly yes
    AddKeysToAgent yes
    UseKeychain yes

Host gym-prod-wifi
    HostName 192.168.86.178
    User admin-gym
    IdentityFile ~/.ssh/gym_prod_ed25519
    IdentitiesOnly yes
    AddKeysToAgent yes
    UseKeychain yes
```

Usage:

```bash
ssh gym-prod
ssh gym-prod-wifi
```

`gym-prod` is the primary Ethernet path.

`gym-prod-wifi` is the fallback Wi-Fi path.

An earlier syntax error joined `UseKeychain yes` and an `Include` directive into `yesInclude`. That error was corrected, the SSH config was validated, and the aliases worked afterward.

---

## 6. Firewall and sleep state

UFW is active.

Last verified rules:

```text
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
OpenSSH (v6)               ALLOW       Anywhere (v6)
```

Configured policy:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw enable
```

Meaning:

- unsolicited inbound traffic is denied by default;
- outbound traffic is allowed;
- SSH is currently allowed from any reachable IPv4 or IPv6 source.

The SSH rule has not yet been restricted to private subnets.

The following sleep-related systemd targets were masked:

```text
sleep.target
suspend.target
hibernate.target
hybrid-sleep.target
```

A remote reboot was successfully tested during the Wi-Fi phase. Ubuntu rebooted, Wi-Fi reconnected, SSH returned, and UFW remained active.

A final reboot specifically after creating the Ethernet DHCP reservation was not explicitly documented and should not be assumed.

---

## 7. Physical network equipment

The server is connected through:

```text
NETGEAR ProSAFE Plus GS105E
```

Relevant facts:

- five-port Gigabit Ethernet switch;
- correct replacement power adapter is now in use;
- Mac mini is connected with Cat 6 Ethernet;
- switch is connected to the upper Fiber Box network;
- switch is not behind the Google Nest LAN.

Verified link state:

```text
Speed: 1000Mb/s
Duplex: Full
Link detected: yes
```

---

## 8. Home-network topology

There are two routed IPv4 networks.

### Upper network — Fiber Box W7

```text
Router: Fiber Box W7
Management IP: 192.168.1.1
LAN: 192.168.1.0/24
SSID: Box_W7-8FCE83
```

The Fiber Box:

- is the upper router;
- provides DHCP for `192.168.1.x`;
- connects to the internet/fiber service;
- has its own active Wi-Fi;
- has the NETGEAR switch connected on its LAN side;
- has the Google Nest router connected downstream.

### Downstream network — Google Nest mesh

```text
LAN: 192.168.86.0/24
SSID: Haag_74
Expected gateway: 192.168.86.1
```

The Google Nest system operates as a routed downstream network, not merely as transparent access points.

The MacBook normally connects through `Haag_74`.

Observed MacBook addresses have included values such as:

```text
192.168.86.134
```

The exact MacBook DHCP address should not be assumed stable.

### Simplified topology

```text
Internet
  |
Fiber Box W7
192.168.1.0/24
  |-----------------------------|
  |                             |
NETGEAR GS105E             Google Nest router
  |                        192.168.86.0/24
gym-prod Ethernet                |
192.168.1.57               MacBook and mesh clients
```

This creates two routing/NAT layers for devices behind Google Nest.

The current topology works for Google-network clients initiating connections to the Mac mini’s upper-network Ethernet address.

---

## 9. Mac mini network interfaces

The Mac mini is dual-homed.

### Ethernet

```text
Interface: enp4s0
Connection profile: netplan-enp4s0
Address: 192.168.1.57/24
Network: Fiber Box LAN
```

Verified profile properties:

```text
connection.autoconnect: yes
ipv4.method: auto
```

The profile was originally configured as:

```text
ipv4.method: link-local
```

which caused:

```text
169.254.37.118/16
```

That was corrected with NetworkManager so the interface now obtains an address through DHCP.

The Fiber Box recognizes:

```text
gym-prod
192.168.1.57
```

A DHCP reservation for `192.168.1.57` was successfully created in the Fiber Box for the Ethernet MAC address.

Ubuntu itself remains configured for DHCP; no manual static IP was set inside Ubuntu.

The Ethernet MAC can be read with:

```bash
cat /sys/class/net/enp4s0/address
```

The exact MAC is intentionally not included here.

### Wi-Fi

```text
Interface: wlp3s0
SSID: Haag_74
Address: 192.168.86.178/24
Network: Google Nest LAN
```

Google Home sees this Wi-Fi interface.

Google Home does not show the Ethernet interface because Ethernet belongs to the upper `192.168.1.x` network.

A DHCP reservation for `192.168.86.178` was discussed but was not confirmed. Do not assume the Wi-Fi address is reserved.

### Other interfaces

Observed:

```text
lo
p2p-dev-wlp3s0
t2_ncm
```

`p2p-dev-wlp3s0` is the Wi-Fi Direct/P2P companion interface.

`t2_ncm` is T2-related and is not the intended production Ethernet interface.

---

## 10. Verified cross-network SSH path

The MacBook, while connected to the Google Nest `192.168.86.x` network, successfully connected to:

```text
192.168.1.57
```

Effective path:

```text
MacBook
  |
Google Nest Wi-Fi
  |
Google Nest router
  |
Fiber Box 192.168.1.x network
  |
NETGEAR GS105E
  |
gym-prod enp4s0
```

The SSH host key for `192.168.1.57` matched the same Ubuntu SSH server previously known at `192.168.86.178`.

Connecting to `192.168.1.57` reaches `enp4s0`; it does not silently redirect to the Wi-Fi interface.

---

## 11. Intended access model

```text
Primary:
ssh gym-prod
→ 192.168.1.57
→ enp4s0
→ Gigabit Ethernet

Fallback:
ssh gym-prod-wifi
→ 192.168.86.178
→ wlp3s0
→ Google Nest Wi-Fi
```

Wi-Fi remains enabled intentionally as a recovery path for:

- switch failure;
- cable failure;
- upper-router configuration changes;
- Ethernet DHCP problems;
- temporary relocation.

The current default-route metrics were not captured in the conversation.

Do not assume Ethernet is the preferred outbound route without checking:

```bash
ip route
ip route get 1.1.1.1
```

---

## 12. Known installed utilities

Known installed or used:

```text
openssh-server / SSH service
ufw
NetworkManager / nmcli
htop
btop
ethtool
get-apple-firmware
dmg2img
systemctl
journalctl
ip
hostname
whoami
nano
cat
grep
```

The presence or configuration of the following has not been verified:

```text
Docker Engine
Docker Compose plugin
containerd
Git
Node.js
Corepack
pnpm
PostgreSQL
Prisma
Prometheus
Grafana
cAdvisor
Node Exporter
Postgres Exporter
fail2ban
unattended-upgrades configuration
backup tooling
application deployment directories
```

Some packages may already exist as Ubuntu defaults or dependencies, but Codex must inspect rather than assume.

---

## 13. Package/update state

The last observed login message reported:

```text
0 updates can be applied immediately.
1 additional security update can be applied with ESM Apps.
Expanded Security Maintenance for Applications is not enabled.
```

This was only a point-in-time observation.

Ubuntu Pro / ESM Apps has not been enabled.

---

## 14. Application deployment state

The Gym Tracker application has not yet been deployed to this Mac mini.

No confirmed server deployment exists for:

- Next.js frontend;
- Fastify API;
- PostgreSQL;
- Prisma migrations;
- Docker containers;
- reverse proxy;
- internal DNS;
- HTTPS;
- public domain;
- VPN;
- external administration;
- production secrets;
- monitoring;
- centralized logging;
- backups;
- restore testing.

No repository location or persistent application directory structure has been established on the server.

No ports other than SSH have intentionally been opened through UFW.

---

## 15. Gym Tracker repository context

The application repository currently uses:

```text
Monorepo:
- pnpm workspace
- Turborepo

Frontend:
- Next.js 15 App Router
- React 19
- Tailwind CSS v4
- TanStack Query
- Recharts
- Three.js via react-three-fiber and drei
- Space Grotesk and JetBrains Mono
- approximately 25 Next.js BFF proxy routes forwarding cookies to Fastify

Backend:
- Fastify
- Zod

Database:
- PostgreSQL
- Prisma

Testing/deployment related:
- Playwright
- existing Dockerfile
- existing Render configuration
```

The intended rollout is:

1. private home-hosted testing;
2. small private beta;
3. later wider SaaS availability.

---

## 16. Monitoring context

A later monitoring design exists for:

```text
Prometheus
Grafana
Node Exporter
cAdvisor
PostgreSQL exporter
```

Intended Grafana binding:

```text
127.0.0.1:3001
```

Planned Prometheus scrape jobs:

```text
prometheus
api
node
cadvisor
postgres
```

Planned dashboards:

```text
gpt-service-overview
gpt-host-containers
gpt-postgresql
```

None of this monitoring stack has been installed on the Mac mini yet.

---

## 17. Security caveats

Known open conditions:

1. Password-based SSH authentication is still enabled as an early recovery path.
2. UFW allows OpenSSH from `Anywhere` and `Anywhere (v6)`.
3. Public IPv6 reachability has not been assessed.
4. The server is dual-homed on two routed networks.
5. Docker firewall behavior has not been assessed because Docker is not yet confirmed installed.
6. No public ports have intentionally been forwarded.
7. No domain, HTTPS, VPN, or zero-trust access layer exists.
8. No backup or restore procedure exists.
9. No production secrets have been created on the server.
10. No audit of unnecessary listening services has been recorded.

---

## 18. Confirmed working state

```text
[confirmed] Ubuntu boots on the 2018 T2 Mac mini
[confirmed] Hostname is gym-prod
[confirmed] User admin-gym exists
[confirmed] Internal Wi-Fi works after Apple firmware installation
[confirmed] Wi-Fi connects to Haag_74
[confirmed] SSH is active
[confirmed] SSH is enabled at boot
[confirmed] Dedicated Ed25519 authentication works
[confirmed] Key is passphrase-protected
[confirmed] macOS Keychain integration works
[confirmed] SSH works without graphical login
[confirmed] Remote reboot worked during the Wi-Fi phase
[confirmed] UFW is active
[confirmed] OpenSSH is allowed through UFW
[confirmed] Sleep-related targets are masked
[confirmed] Ethernet interface enp4s0 is recognized
[confirmed] Ethernet profile uses DHCP
[confirmed] Ethernet autoconnect is enabled
[confirmed] Ethernet receives 192.168.1.57/24
[confirmed] 192.168.1.57 is reserved in the Fiber Box
[confirmed] Wi-Fi address 192.168.86.178 is reserved in the Google Nest
[confirmed] Ethernet negotiates at 1000 Mb/s full duplex
[confirmed] Ethernet link detection reports yes
[confirmed] SSH works through 192.168.1.57
[confirmed] ssh gym-prod targets Ethernet
[confirmed] ssh gym-prod-wifi targets Wi-Fi
[confirmed] SSH config syntax was repaired and validated
[confirmed] Server operates headlessly beside the router
```

---

## 19. Not confirmed — do not assume

```text
[not confirmed] Ethernet is the preferred outbound default route
[not confirmed] Final reboot after Ethernet DHCP reservation
[not confirmed] Public IPv6 SSH is blocked
[not confirmed] Password SSH is disabled
[not confirmed] Docker is installed
[not confirmed] Git is installed and configured
[not confirmed] Node.js, Corepack, or pnpm are installed
[not confirmed] Gym Tracker repository exists on the server
[not confirmed] Any application service is running
[not confirmed] Any database exists
[not confirmed] Any backup system exists
[not confirmed] Any monitoring service exists
[not confirmed] Any domain, reverse proxy, HTTPS, or external access exists
```

---

## 20. Operational caution

The server is reachable through two interfaces:

```text
192.168.1.57   enp4s0   Ethernet
192.168.86.178 wlp3s0   Wi-Fi
```

Network, SSH, firewall, Netplan, NetworkManager, IPv6, or routing changes can remove one or both access paths.

During any future networking or access-control change:

- keep the current SSH session open;
- test a second independent SSH session before closing the first;
- preserve the Wi-Fi fallback until Ethernet and the new configuration are proven.

Because this is T2-Ubuntu, kernel replacement, firmware cleanup, bootloader changes, Secure Boot changes, or aggressive removal of hardware-related packages may break Mac mini hardware support.
