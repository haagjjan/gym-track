# Stage 1 Host Baseline Audit Report

- **Target:** `gym-prod`
- **Audit date:** 2026-07-20
- **Audit window:** approximately 17:54–18:07 CEST
- **Execution boundary:** Stage 1 only

## Executive summary

The Stage 1 baseline audit completed successfully. The server was inspected over the primary Ethernet SSH path as `admin-gym`; privileged commands were run only after interactive sudo authentication by the administrator. No server configuration, package, service, firewall, network, boot, Docker, database, or application change was made.

No Stage 1 stop condition was found:

- Ubuntu 26.04 LTS is running the expected T2 kernel, `7.1.3-1-t2-resolute`.
- The T2 kernel image, headers, meta-package, Apple firmware helper, and T2 audio package are installed.
- SSH, NetworkManager, UFW, time synchronization, and periodic TRIM are active; no system units are currently failed.
- Ethernet is the preferred IPv4 route with metric 100; Wi-Fi remains connected as a metric-600 fallback.
- The root filesystem is 5% used with 416 GB available and no inode pressure.
- No Docker, PostgreSQL, Gym Tracker deployment, or `/srv` application state exists.

Important findings for later reviewed stages:

- generic Ubuntu HWE kernels and meta-packages coexist with the T2 kernel, so Stage 2 package work must be simulated and reviewed carefully;
- SSH listens on all IPv4 and IPv6 addresses, password authentication is enabled, X11 forwarding is enabled, and UFW allows SSH from anywhere on both address families;
- Ethernet has a global IPv6 prefix and a default IPv6 route, so potential inbound IPv6 SSH exposure is real at the host-policy layer, although upstream reachability was not tested;
- `smartctl`/`smartmontools` is absent, so NVMe SMART health could not be inspected;
- `fstrim.timer` is enabled and active but reports `NeedDaemonReload=yes`;
- current-boot logs contain T2/Apple ACPI, Bluetooth firmware, Wi-Fi P2P, and desktop Snap warnings that should be reviewed without replacing T2 support.

Stage 2 may be planned after this report is reviewed. It must not be executed blindly.

## Identity and OS

Observed facts:

| Item | Observed value |
|---|---|
| Hostname | `gym-prod` |
| Primary account | `admin-gym` |
| Hardware | Apple Macmini8,1 (2018 Mac mini) |
| OS | Ubuntu 26.04 LTS, Resolute Raccoon |
| Architecture | `x86_64` / `amd64` |
| Active kernel | `7.1.3-1-t2-resolute` |
| Boot time | 2026-07-19 15:31:42 CEST |
| Audit-time uptime | approximately 1 day, 2 hours, 35 minutes |

The boot command line names `/boot/vmlinuz-7.1.3-1-t2-resolute`, confirming that the active boot image is the T2 kernel.

## T2 kernel and firmware

Confirmed relevant packages include:

- `linux-image-7.1.3-1-t2-resolute` `7.1.3-1`;
- `linux-headers-7.1.3-1-t2-resolute` `7.1.3-1`;
- `linux-t2` `7.1.3-1-resolute`;
- `apple-firmware-script` `1.4-3`;
- `apple-t2-audio-config` `0.4.2`;
- Ubuntu firmware packages, including Broadcom wireless firmware.

No packages are held with `apt-mark`.

Generic Ubuntu kernel packages are also installed, including `linux-generic-hwe-26.04`, `linux-image-generic-hwe-26.04`, and `linux-image-7.0.0-28-generic`. Their presence is not itself a failure, but Stage 2 must not assume a generic kernel is a safe replacement or automatically remove fallback/T2 packages.

The active kernel is T2-compatible, so the T2 stop condition was not triggered.

## CPU and memory

Observed facts:

- Intel Core i5-8500B at 3.00 GHz;
- 6 physical cores, 1 thread per core;
- Intel VT-x virtualization is available;
- approximately 30 GiB usable RAM, with 29 GiB available during the audit;
- 8 GiB swap file, unused during the audit.

The kernel vulnerability summary reported mitigations for the major speculative-execution classes but reported Gather Data Sampling as vulnerable. Kernel remediation must remain subordinate to T2 boot compatibility.

## Storage and filesystems

The internal drive is an approximately 466 GiB Apple NVMe SSD:

| Device | Filesystem | Mount | Size | Use |
|---|---|---|---:|---:|
| `/dev/nvme0n1p1` | FAT32 | `/boot/efi` | 300 MiB | 3% |
| `/dev/nvme0n1p2` | ext4 | `/` | 458 GiB usable | 5% |

Root filesystem state:

- 19 GiB used;
- 416 GiB available;
- 1% inode use;
- largest top-level usage: `/usr` 6.4 GiB, `/var` 3.6 GiB, `/home` 134 MiB;
- no unexpected separate application, database, Docker, or backup filesystem.

`fstrim.timer` is enabled and active, with the next weekly run scheduled. Systemd reports that the timer definition changed on disk and `NeedDaemonReload=yes`; this must be reconciled in Stage 2 before relying on the loaded definition.

`smartctl` is not installed. Filesystem capacity and mount state appear healthy, but device-level NVMe SMART health remains unverified.

## Network interfaces

Both intended interfaces are connected:

| Interface | Connection | Address | State | Effective IPv4 metric |
|---|---|---|---|---:|
| `enp4s0` | `netplan-enp4s0` | `192.168.1.57/24` | connected, carrier present | 100 |
| `wlp3s0` | `Haag_74` | `192.168.86.178/24` | connected | 600 |

MAC addresses were inspected but are intentionally omitted from this report.

Both profiles use DHCP and autoconnect. Ethernet is marked as the current default IPv4 connection. Wi-Fi remains available as the fallback. `t2_ncm` is present but has no carrier and is not an intended production interface.

Ethernet also has global IPv6 addresses within an ISP-assigned `/64` prefix and a link-local address. Wi-Fi has ULA and link-local IPv6 addresses. Complete host addresses and the global prefix are omitted; the prefix was removed on 2026-08-08 ahead of public release, per the redaction rule in [`../wave-a-host-fundation/01-host-baseline-audit.md`](../wave-a-host-fundation/01-host-baseline-audit.md).

## Routing and DNS

IPv4 routing is confirmed as:

```text
default via 192.168.1.1 dev enp4s0 src 192.168.1.57 metric 100
default via 192.168.86.1 dev wlp3s0 src 192.168.86.178 metric 600
```

`ip route get 1.1.1.1` selects `enp4s0` with source `192.168.1.57`. Ethernet is therefore the preferred outbound IPv4 path.

A default IPv6 route exists through Ethernet. There are no custom policy-routing rules beyond the standard local, main, and default tables.

DNS is provided through `systemd-resolved`:

- Ethernet DNS: `192.168.1.1`, search domain `home`, preferred default route;
- Wi-Fi DNS: `192.168.86.1`, search domain `lan`.

DNS-over-TLS is disabled and DNSSEC is reported as unsupported by the active upstream configuration.

## SSH

SSH is active and enabled. `sshd -t` completed successfully.

Permissions are appropriate:

```text
~/.ssh                  0700 admin-gym:admin-gym
~/.ssh/authorized_keys  0600 admin-gym:admin-gym
```

The home directory is `0750 admin-gym:admin-gym`.

Relevant effective SSH settings:

| Setting | Effective value |
|---|---|
| Port | 22 |
| Address family | any |
| Listen addresses | `0.0.0.0:22`, `[::]:22` |
| Permit root login | `prohibit-password` |
| Password authentication | yes |
| Keyboard-interactive authentication | no |
| Public-key authentication | yes |
| TCP forwarding | yes |
| Gateway ports | no |
| Tunnel devices | no |
| X11 forwarding | yes |
| AllowUsers/AllowGroups | not configured |

The source configuration explicitly includes `/etc/ssh/sshd_config.d/*.conf`, disables keyboard-interactive authentication, and enables X11 forwarding. No Stage 3 hardening drop-in exists yet.

Audit logs show successful public-key sessions for `admin-gym`. Key fingerprints and client details are intentionally omitted.

## Firewall and forwarding

UFW is active with low-volume logging:

```text
Default incoming: deny
Default outgoing: allow
Default routed: disabled
```

Current inbound application rules are:

```text
OpenSSH      ALLOW IN Anywhere
OpenSSH (v6) ALLOW IN Anywhere (v6)
```

The underlying IPv4 and IPv6 filter policies are UFW-managed, with input and forward defaults set to drop and output set to accept. No Docker chains exist.

Packet forwarding is disabled:

```text
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0
```

The host is not currently configured as a router. Stage 3 must replace broad SSH rules only after interface-scoped rules and both fresh access paths have been proven.

## Listening ports

Every listener observed during the audit is accounted for:

| Protocol/address | Port | Process | Purpose |
|---|---:|---|---|
| TCP `0.0.0.0`, `[::]` | 22 | `sshd`/systemd | SSH on all IPv4 and IPv6 addresses |
| UDP `0.0.0.0`, `[::]` | 5353 | `avahi-daemon` | multicast DNS/service discovery |
| TCP/UDP loopback | 53 | `systemd-resolved` | local DNS stub resolver |
| UDP loopback | 323 | `chronyd` | local chrony command/monitor socket |
| TCP loopback | 631 | `cupsd` | local-only printing service |

NetworkManager also had expected DHCP client sockets for the two active interfaces. No application, database, Docker, dashboard, or unexpected high-port listener was found.

## Active, enabled, and failed services

There are zero currently failed system units.

Core expected services are active, including:

- SSH;
- NetworkManager and `wpa_supplicant`;
- chrony;
- UFW;
- systemd-resolved and journald;
- unattended-upgrades shutdown helper;
- thermal management.

The installation retains desktop-oriented services such as GDM, Avahi, Bluetooth, CUPS, ModemManager, fwupd, Snap, and power-management components. `openvpn.service` and SSSD-related units are enabled generically but no active VPN, SSSD integration, or associated network listener was observed. Stage 2 explicitly forbids removing desktop packages merely because they appear unnecessary.

## Time synchronization

Time configuration is healthy:

- timezone: `Europe/Zurich`;
- system clock synchronized: yes;
- NTP service: active;
- provider: chrony, active and enabled;
- hardware clock stored in UTC.

No timezone change is needed in Stage 2.

## Power and sleep state

All required sleep-related targets are masked:

```text
sleep.target
suspend.target
hibernate.target
hybrid-sleep.target
```

No power or sleep change was made.

## Package sources and updates

Active package sources are:

- official Ubuntu Resolute, updates, backports, and security repositories through the Swiss mirror and Ubuntu security service;
- the T2 Ubuntu repository through both its project site and its GitHub release endpoint, signed by the configured T2 repository key.

`ubuntu.sources.curtin.orig` contains installer-era source text but has an `.orig` suffix and is not an active apt source. No effective duplicate Ubuntu source was identified.

The existing package cache reports two upgrades:

- `python3-software-properties` `0.120` to `0.120.1`;
- `software-properties-common` `0.120` to `0.120.1`.

No `apt update` was run, so this is a cache-based point-in-time result. No packages are held, and no reboot-required marker exists.

## Installed administration tools

Confirmed installed tools include:

```text
git curl wget ca-certificates gnupg jq rsync unzip zip
bash-completion lsof htop btop ethtool dig tcpdump
```

Confirmed absent Stage 2 targets include:

```text
tree tmux ncdu smartmontools traceroute ripgrep needrestart
```

The `dnsutils` meta-package is not installed, although `dig` is available through the installed Bind utilities. `unattended-upgrades` is installed; its detailed policy remains a Stage 2 inspection item.

## Existing Docker/database/application state

Confirmed absent:

- `docker`, `podman`, and `containerd` commands;
- `docker.service`;
- `/var/lib/docker`;
- PostgreSQL command and service;
- Node.js, Corepack, and pnpm;
- content under `/srv`;
- Gym Tracker containers, database, deployment, or application listeners.

No existing state would currently be overwritten by the planned later stages. Stage 4 must still repeat its preflight because this fact can change.

## Significant log findings

Current-boot priority 0–3 logs contain:

- recurring Apple/T2 ACPI table and method errors, plus an IOAPIC lookup error;
- the expected message that reading UEFI Secure Boot certificates is unsupported on T2 Macs;
- an Intel LPSS probe failure and an unrecognized SPI-NOR identifier;
- Bluetooth firmware/baud-rate failures, including a missing `brcm/BCM.hcd` patch file;
- Broadcom Wi-Fi P2P interface creation failures, while the normal Wi-Fi connection itself activates and remains usable;
- recurring transient failures for Snap prompting-client and firmware-notifier user services;
- a transient NetworkManager DNS readiness warning during boot;
- periodic NetworkManager route/DNS preference transitions during lease events, settling back to Ethernet as preferred.

There are no failed system units, and SSH, Ethernet, Wi-Fi, DNS, and time synchronization are currently operational. These messages are therefore recorded as investigation items rather than immediate Stage 1 stop conditions. The Bluetooth firmware errors mean current Bluetooth functionality should not be inferred solely from the earlier handoff.

## Differences from server-status-gym-prod.md

The audit resolves or updates these previously uncertain items:

- Ethernet is confirmed as the preferred outbound IPv4 route.
- A global Ethernet IPv6 prefix and default IPv6 route exist.
- UFW currently permits broad IPv6 SSH in addition to broad IPv4 SSH.
- Password-based SSH remains enabled; root SSH is limited to non-password mechanisms rather than fully disabled.
- X11 forwarding remains enabled.
- Docker, PostgreSQL, Node.js, pnpm, application services, and `/srv` deployment state are confirmed absent.
- Two package upgrades are visible in the existing apt cache.
- Generic HWE kernel packages coexist with the active T2 kernel.
- Wi-Fi is currently using `192.168.86.178`; a host-side DHCP lease does not independently prove the router reservation.
- Bluetooth-related errors are present in the current boot despite the earlier firmware-installation history.
- The server retains a full set of desktop-oriented services even though it is operated headlessly.

## Risks and blockers

No critical blocker prevents Stage 2 planning after review.

Material risks and limitations:

1. T2 boot support can be lost if package operations replace or remove the active kernel, T2 meta-package, Apple firmware support, or required boot components.
2. Generic kernel meta-packages are installed, so package simulation output must be reviewed line by line before upgrading.
3. SSH is broadly allowed over IPv4 and IPv6; public IPv6 reachability beyond the host was not tested.
4. Password authentication, X11 forwarding, and unrestricted SSH users remain enabled pending Stage 3.
5. NVMe SMART health is unknown because `smartctl` is absent.
6. `fstrim.timer` requires a systemd daemon reload to reconcile the loaded unit definition.
7. Bluetooth and other T2/Apple boot warnings need cautious investigation; they do not justify generic-kernel replacement.
8. No application backup or restore state exists, which is expected before deployment but must be addressed in later waves.

## Recommended Stage 2 adjustments

1. Record the active T2 boot image again immediately before package work.
2. Run `apt update`, then review `apt list --upgradable` and `apt-get -s full-upgrade`; stop on any T2, firmware, boot, NetworkManager, OpenSSH, or UFW removal/replacement risk.
3. Do not run `autoremove`; preserve T2 and fallback kernel packages.
4. Install only missing administration packages after reviewing the exact transaction. Account for `dnsutils` being functionally present through Bind tooling.
5. Install `smartmontools`, then collect NVMe health without running destructive tests.
6. Reconcile `fstrim.timer` with `systemctl daemon-reload`, then re-verify its enabled/active state and schedule.
7. Inspect and configure unattended-upgrades and journal retention as documented; do not enable automatic reboot.
8. Keep the current timezone and chrony provider.
9. Record the Bluetooth, ACPI, IOAPIC, LPSS, P2P, and Snap warnings. Defer unrelated remediation unless the audit of Stage 2 package changes proves it necessary and T2-safe.
10. Preserve SSH, UFW, Ethernet, and Wi-Fi behavior through the controlled Stage 2 reboot. Leave SSH/UFW hardening for Stage 3.

## Exact commands executed

All remote commands were executed through `ssh gym-prod` with strict host-key checking. The private key and sudo password were never printed or stored. The privileged collection used an in-memory command payload after the administrator entered the sudo password directly in a local terminal. Commands in the privileged blocks below ran inside one `sudo bash` process, so they did not repeat a `sudo` prefix individually.

Preflight and identity:

```bash
hostname
whoami
echo "$SSH_CONNECTION"
ps aux | grep -E '[a]pt|[d]pkg|[u]nattended'
df -h /
sudo -n true
hostnamectl
cat /etc/os-release
uname -a
uname -r
dpkg --print-architecture
uptime
uptime -s
who -b
cat /proc/cmdline
```

Kernel, hardware, and storage:

```bash
dpkg-query -W -f='${Package}\t${Version}\n' | grep -Ei '(^linux-|t2|apple|firmware)' | sort
apt-mark showhold
lscpu
free -h
swapon --show
lsblk -e7 -o NAME,PATH,SIZE,TYPE,FSTYPE,FSVER,MOUNTPOINTS,UUID,MODEL
findmnt
df -hT
df -i
du -xhd1 / 2>/dev/null | sort -h
systemctl status fstrim.timer --no-pager
systemctl is-enabled fstrim.timer
systemctl is-active fstrim.timer
systemctl show fstrim.timer -p NeedDaemonReload -p ActiveState -p UnitFileState
command -v smartctl
```

Network, routing, and DNS:

```bash
ip -br link
ip -br address
nmcli device status
nmcli connection show
nmcli device show enp4s0
nmcli device show wlp3s0
nmcli connection show netplan-enp4s0
nmcli -t -f NAME,TYPE,DEVICE connection show --active
nmcli connection show Haag_74
ip route
ip -6 route
ip rule
ip route get 1.1.1.1
resolvectl status
```

SSH, firewall, forwarding, and listeners:

```bash
systemctl is-active ssh
systemctl is-enabled ssh
sshd -t
sshd -T
grep -RInE '^[[:space:]]*(Include|Port|AddressFamily|ListenAddress|PermitRootLogin|PasswordAuthentication|KbdInteractiveAuthentication|PubkeyAuthentication|AllowUsers|AllowGroups|X11Forwarding|AllowTcpForwarding|GatewayPorts|PermitTunnel)' /etc/ssh/sshd_config /etc/ssh/sshd_config.d
stat -c '%A %a %U:%G %n' "$HOME" "$HOME/.ssh" "$HOME/.ssh/authorized_keys"
ufw status verbose
ufw status numbered
iptables -S
ip6tables -S
sysctl net.ipv4.ip_forward
sysctl net.ipv6.conf.all.forwarding
ss -lntup
lsof -nP -i
```

Services, time, power, packages, and platforms:

```bash
systemctl --failed --no-pager
systemctl list-unit-files --state=enabled --no-pager
systemctl list-units --type=service --state=running --no-pager
timedatectl
systemctl status systemd-timesyncd --no-pager
systemctl status chrony --no-pager
systemctl is-enabled sleep.target suspend.target hibernate.target hybrid-sleep.target
apt-cache policy
grep -RhsE '^[[:space:]]*(deb|Types:|URIs:|Suites:|Components:|Signed-By:)' /etc/apt/sources.list /etc/apt/sources.list.d
grep -RInE '^[[:space:]]*(deb|Types:|URIs:|Suites:|Components:|Signed-By:)' /etc/apt/sources.list /etc/apt/sources.list.d
apt list --upgradable
test -f /var/run/reboot-required && cat /var/run/reboot-required || echo 'No reboot-required marker'
test -f /var/run/reboot-required.pkgs && cat /var/run/reboot-required.pkgs
dpkg-query -W -f='${binary:Package}\t${db:Status-Abbrev}\t${Version}\n' git curl wget ca-certificates gnupg jq rsync unzip zip tree tmux bash-completion lsof ncdu smartmontools dnsutils traceroute tcpdump ripgrep needrestart unattended-upgrades
for cmd in git curl wget jq rsync unzip zip tree tmux htop btop ethtool smartctl dig traceroute tcpdump ncdu docker podman containerd node corepack pnpm psql; do command -v "$cmd"; done
docker version
docker compose version
systemctl status docker --no-pager
ls -la /var/lib/docker
psql --version
systemctl status postgresql --no-pager
find /srv -mindepth 1 -maxdepth 3 -printf '%M %u:%g %p\n'
```

Logs:

```bash
journalctl -p 0..3 -b --no-pager
journalctl -u ssh -b --no-pager | tail -100
journalctl -u NetworkManager -b --no-pager | tail -150
```

Expected non-zero results were recorded for absent tools and services; they were not corrected during Stage 1.
