# Stage 1 — Host Baseline Audit

## Objective

Inspect and document the actual state of `gym-prod` before making administrative changes.

This stage is intentionally read-only except for creating its report in the repository.

## Current known state

Read before starting:

- [`../server-status-gym-prod.md`](../server-status-gym-prod.md)
- [`../SERVER-SETUP-INDEX.md`](../SERVER-SETUP-INDEX.md)

Known high-level state:

- Ubuntu 26.04 LTS, T2-compatible kernel;
- Mac mini 2018, Intel x86_64, 32 GB RAM;
- primary Ethernet address `192.168.1.57`;
- fallback Wi-Fi address last observed as `192.168.86.178`;
- SSH key access and UFW active;
- sleep-related targets masked;
- no application deployment confirmed.

Treat this as context, not as a substitute for inspection.

---

## Scope

Audit:

- identity, OS, kernel, boot, and T2 support;
- CPU, memory, disk, filesystems, and SSD state;
- network interfaces, routes, DNS, IPv4, and IPv6;
- SSH and firewall configuration;
- active, enabled, failed, and listening services;
- package sources, pending updates, held packages, and reboot state;
- time zone and synchronization;
- power and sleep configuration;
- relevant recent errors;
- presence of administrative and deployment tools;
- any pre-existing Docker, database, or application state.

Create a complete report.

---

## Explicitly out of scope

Do not:

- install, upgrade, remove, or purge packages;
- reboot;
- change networking;
- change UFW;
- change SSH;
- enable or disable services;
- modify Netplan or NetworkManager profiles;
- create Docker configuration;
- clone or deploy the Gym Tracker;
- change router settings;
- modify T2 firmware, kernel, bootloader, or EFI configuration.

---

## Preconditions

- Codex is connected through a working SSH session.
- The repository containing these documents is accessible.
- `server-status-gym-prod.md` has been read.
- No unrelated maintenance is in progress.
- Sudo access is available for read-only privileged inspection where needed.

---

## Safety constraints

- Use read-only commands.
- Do not “fix” findings during this stage.
- Do not pipe downloaded scripts into a shell.
- Do not reveal secrets in the report.
- Redact public IPv6 addresses to a useful prefix if the repository is not private.
- Do not dump private SSH keys, `/etc/shadow`, environment secrets, browser data, or credential stores.
- If a command is unavailable, record that fact rather than installing it.

---

## Required inspection

### 1. Identity, OS, and kernel

Run:

```bash
hostnamectl
cat /etc/os-release
uname -a
uname -r
dpkg --print-architecture
uptime
```

Record:

- hostname;
- OS version and codename;
- active kernel;
- architecture;
- boot time and uptime.

Inspect installed kernel and T2-related packages:

```bash
dpkg-query -W -f='${Package}\t${Version}\n' \
  | grep -Ei '(^linux-|t2|apple|firmware)' \
  | sort
```

Also inspect:

```bash
apt-mark showhold
```

Do not infer that a generic Ubuntu kernel is safe merely because it appears in package metadata.

### 2. CPU and memory

Run:

```bash
lscpu
free -h
swapon --show
```

Record:

- CPU model, cores, and virtualization support;
- total and available memory;
- whether swap exists and its size.

### 3. Storage and filesystems

Run:

```bash
lsblk -e7 -o NAME,PATH,SIZE,TYPE,FSTYPE,FSVER,MOUNTPOINTS,UUID,MODEL
findmnt
df -hT
df -i
sudo du -xhd1 / 2>/dev/null | sort -h
```

Inspect the NVMe device and TRIM state without changing them:

```bash
systemctl status fstrim.timer --no-pager
systemctl is-enabled fstrim.timer
systemctl is-active fstrim.timer
```

If `smartctl` exists:

```bash
command -v smartctl
sudo smartctl -a /dev/nvme0 2>&1 || true
```

If it does not exist, record that storage-health tooling is absent.

### 4. Network interfaces and connection profiles

Run:

```bash
ip -br link
ip -br address
nmcli device status
nmcli connection show
```

For the two expected interfaces:

```bash
nmcli device show enp4s0
nmcli device show wlp3s0
nmcli connection show netplan-enp4s0
```

Identify the actual Wi-Fi connection profile name before querying it.

Record:

- link state;
- addresses;
- MAC addresses in a redacted form if appropriate;
- DHCP/autoconnect state;
- route metrics;
- DNS sources.

### 5. Routing and DNS

Run:

```bash
ip route
ip -6 route
ip rule
ip route get 1.1.1.1
resolvectl status
```

Determine, without changing anything:

- which interface is the default IPv4 route;
- which source address is used for outbound IPv4;
- whether a default IPv6 route exists;
- whether Ethernet or Wi-Fi currently has the lower route metric;
- which DNS servers are active.

Do not assume Ethernet is preferred until the command output proves it.

### 6. SSH configuration

Run:

```bash
systemctl is-active ssh
systemctl is-enabled ssh
sudo sshd -t
sudo sshd -T
```

Inspect configuration sources:

```bash
sudo grep -RInE \
  '^[[:space:]]*(Include|Port|AddressFamily|ListenAddress|PermitRootLogin|PasswordAuthentication|KbdInteractiveAuthentication|PubkeyAuthentication|AllowUsers|AllowGroups|X11Forwarding|AllowTcpForwarding|GatewayPorts|PermitTunnel)' \
  /etc/ssh/sshd_config /etc/ssh/sshd_config.d 2>/dev/null
```

Inspect permissions without printing key contents:

```bash
stat -c '%A %a %U:%G %n' \
  "$HOME" "$HOME/.ssh" "$HOME/.ssh/authorized_keys"
```

Record effective settings for at least:

- `PermitRootLogin`;
- `PasswordAuthentication`;
- `KbdInteractiveAuthentication`;
- `PubkeyAuthentication`;
- `AllowTcpForwarding`;
- `X11Forwarding`;
- `AddressFamily`;
- listening port and addresses.

### 7. Firewall and packet forwarding

Run:

```bash
sudo ufw status verbose
sudo ufw status numbered
sudo iptables -S
sudo ip6tables -S
sysctl net.ipv4.ip_forward
sysctl net.ipv6.conf.all.forwarding
```

Record:

- UFW defaults;
- all current inbound allowances;
- whether SSH is broadly exposed;
- IPv4 and IPv6 forwarding state.

Do not change any rules.

### 8. Listening ports and processes

Run:

```bash
sudo ss -lntup
sudo lsof -nP -i 2>/dev/null || true
```

Map every listening TCP/UDP port to:

- process;
- bind address;
- expected or unexpected purpose.

Pay special attention to services bound to:

```text
0.0.0.0
::
192.168.1.57
192.168.86.178
```

### 9. Services and failures

Run:

```bash
systemctl --failed --no-pager
systemctl list-unit-files --state=enabled --no-pager
systemctl list-units --type=service --state=running --no-pager
```

Record:

- failed units;
- enabled services;
- unexpected server or desktop services;
- SSH, NetworkManager, UFW, time-sync, and trim state.

Do not disable anything.

### 10. Time and synchronization

Run:

```bash
timedatectl
systemctl status systemd-timesyncd --no-pager 2>/dev/null || true
systemctl status chrony --no-pager 2>/dev/null || true
```

Record:

- configured timezone;
- local and UTC time;
- NTP synchronization state;
- active synchronization provider.

### 11. Power and sleep prevention

Run:

```bash
systemctl is-enabled \
  sleep.target \
  suspend.target \
  hibernate.target \
  hybrid-sleep.target
```

All four are expected to be `masked`. Record deviations.

### 12. Packages, repositories, and update state

Run:

```bash
apt-cache policy
grep -RhsE '^[[:space:]]*(deb|Types:|URIs:|Suites:|Components:|Signed-By:)' \
  /etc/apt/sources.list /etc/apt/sources.list.d 2>/dev/null
apt list --upgradable 2>/dev/null
test -f /var/run/reboot-required && cat /var/run/reboot-required || echo "No reboot-required marker"
test -f /var/run/reboot-required.pkgs && cat /var/run/reboot-required.pkgs || true
```

Record:

- official and third-party repositories;
- pending package updates;
- held packages;
- reboot requirement;
- any source that appears stale, unsigned, or unexpected.

Do not run `apt update` during this read-only stage.

### 13. Existing tools and platforms

Check without installing:

```bash
for cmd in \
  git curl wget jq rsync unzip zip tree tmux htop btop ethtool \
  smartctl dig traceroute tcpdump ncdu \
  docker podman containerd node corepack pnpm psql; do
  if command -v "$cmd" >/dev/null 2>&1; then
    printf '%-12s %s\n' "$cmd" "$(command -v "$cmd")"
  else
    printf '%-12s %s\n' "$cmd" "NOT INSTALLED"
  fi
done
```

If Docker-related commands exist, inspect without altering:

```bash
docker version 2>&1 || true
docker compose version 2>&1 || true
sudo systemctl status docker --no-pager 2>&1 || true
sudo ls -la /var/lib/docker 2>/dev/null || true
```

If PostgreSQL exists, inspect service and version without connecting to unknown databases.

### 14. Recent high-severity logs

Run:

```bash
sudo journalctl -p 0..3 -b --no-pager
sudo journalctl -u ssh -b --no-pager | tail -100
sudo journalctl -u NetworkManager -b --no-pager | tail -150
```

Summarize meaningful errors. Do not paste large repetitive logs into the report.

---

## Required report

Create:

```text
docs/server/reports/01-host-baseline-audit-report.md
```

Use this structure:

```markdown
# Stage 1 Host Baseline Audit Report

## Executive summary
## Identity and OS
## T2 kernel and firmware
## CPU and memory
## Storage and filesystems
## Network interfaces
## Routing and DNS
## SSH
## Firewall and forwarding
## Listening ports
## Active, enabled, and failed services
## Time synchronization
## Power and sleep state
## Package sources and updates
## Installed administration tools
## Existing Docker/database/application state
## Significant log findings
## Differences from server-status-gym-prod.md
## Risks and blockers
## Recommended Stage 2 adjustments
## Exact commands executed
```

Include concise output excerpts where useful. Do not include secrets.

---

## Completion criteria

Stage 1 is complete only when:

- all required areas were inspected;
- no changes were made outside the report;
- the report clearly distinguishes confirmed facts from assumptions;
- T2-specific kernel and firmware state is documented;
- the actual default route is documented;
- every listening port is accounted for;
- pending updates and reboot state are documented;
- Stage 2 risks and prerequisites are explicit.

---

## Stop conditions

Stop and report immediately if:

- the active kernel does not appear T2-compatible;
- root filesystem health appears degraded;
- disk space is critically low;
- SSH, UFW, or NetworkManager is failing;
- unexpected Docker/database/application data already exists;
- a package source or installed platform suggests that later stages would overwrite existing state;
- inspection reveals a condition requiring immediate human intervention.

Do not continue to Stage 2.
