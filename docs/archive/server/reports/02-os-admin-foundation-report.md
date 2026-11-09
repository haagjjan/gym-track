# Stage 2 OS Administration Foundation Report

- **Target:** `gym-prod`
- **Execution started:** 2026-07-20 18:32 CEST
- **Controlled reboot:** 2026-07-20 approximately 19:00 CEST
- **Final verification:** 2026-07-21 12:59 CEST
- **Execution boundary:** Stage 2 only

## Executive summary

Stage 2 completed successfully. Ubuntu package metadata was refreshed, the proposed upgrade and tool transactions were simulated and reviewed, five security updates were applied, seven missing administration tools and their dependencies were installed, maintenance drop-ins were created, journald retention was bounded, and the host passed a controlled reboot.

The server remains on the T2-compatible kernel `7.1.3-1-t2-resolute`. The T2 kernel image, headers, meta-package, Apple firmware helper, and T2 audio package remained installed at their original versions. No kernel, firmware, bootloader, NetworkManager, UFW, or T2 package was removed or replaced. No `autoremove` was run.

After reboot:

- both `ssh gym-prod` and `ssh gym-prod-wifi` work with the established key;
- SSH and UFW are active, with their existing access policy unchanged;
- Ethernet and Wi-Fi use their expected addresses and Ethernet remains the preferred outbound route;
- chrony is synchronized;
- periodic TRIM is active and enabled;
- all sleep targets remain masked;
- package integrity checks pass;
- there are zero failed system units;
- NVMe SMART overall health passes.

Stage 3 was not started.

## Pre-change state

At 2026-07-20 18:32 CEST:

- hostname: `gym-prod`;
- active kernel: `7.1.3-1-t2-resolute`;
- root filesystem: 458 GB usable, 19 GB used, 416 GB available;
- memory: approximately 30 GiB total and 29 GiB available;
- failed system units: none;
- package-manager integrity: clean;
- no active apt or dpkg transaction;
- SSH access: working through both Ethernet and Wi-Fi aliases;
- Ethernet address: `192.168.1.57/24`;
- Wi-Fi address: `192.168.86.178/24`;
- preferred outbound path: Ethernet;
- timezone: `Europe/Zurich`;
- NTP: synchronized through chrony;
- periodic TRIM: active and enabled, initially reporting `NeedDaemonReload=yes`;
- sleep, suspend, hibernate, and hybrid-sleep targets: masked;
- journal disk use: 53.3 MB, with no local retention drop-in;
- unattended-upgrades package: installed;
- periodic package-list refresh and unattended upgrades: already enabled;
- no reboot-required marker.

The existing `/etc/apt/apt.conf.d/20auto-upgrades` already contained the two required daily periodic settings and did not need modification.

## Repository and upgrade review

`apt update` completed successfully and refreshed metadata from:

- the official Ubuntu Resolute release, updates, backports, and security repositories;
- the existing T2 Ubuntu repository endpoints.

There were no signature, release, or transport errors.

After refresh, seven packages were listed as upgradeable. The reviewed full-upgrade simulation proposed:

```text
5 upgraded
0 newly installed
0 removed
2 deferred by Ubuntu phasing
```

The five immediate upgrades were security updates for OpenSSH, `build-essential`, and `libxfont2`. The simulation did not touch:

- the active or installed T2 kernels;
- Apple/T2 firmware packages;
- bootloader or EFI packages;
- NetworkManager;
- UFW package state;
- Docker or application software.

`dkms` was reported as automatically installed and no longer required. It was deliberately retained because automatic removal was out of scope and could affect T2 or hardware support.

The two deferred packages are:

```text
python3-software-properties 0.120 -> 0.120.1
software-properties-common 0.120 -> 0.120.1
```

They remained deferred by Ubuntu phasing after Stage 2 and are not a package-integrity failure.

## Packages upgraded

The following reviewed security updates were applied:

| Package | Previous version | Installed version |
|---|---|---|
| `openssh-client` | `1:10.2p1-2ubuntu3.4` | `1:10.2p1-2ubuntu3.5` |
| `openssh-server` | `1:10.2p1-2ubuntu3.4` | `1:10.2p1-2ubuntu3.5` |
| `openssh-sftp-server` | `1:10.2p1-2ubuntu3.4` | `1:10.2p1-2ubuntu3.5` |
| `build-essential` | `12.12ubuntu2.26.04.1` | `12.12ubuntu2.26.04.2` |
| `libxfont2` | `1:2.0.6-2` | `1:2.0.6-2ubuntu0.2` |

Existing SSH configuration was preserved. The OpenSSH package refreshed its UFW application profile and reloaded UFW; the existing broad OpenSSH IPv4/IPv6 rules remained in place.

## Packages installed

Only previously missing administration tools were requested:

| Package | Installed version |
|---|---|
| `tree` | `2.3.1-1` |
| `tmux` | `3.6a-2ubuntu0.1` |
| `ncdu` | `1.22-1build1` |
| `smartmontools` | `7.5-2` |
| `traceroute` | `1:2.1.6-1build1` |
| `ripgrep` | `15.1.0-1ubuntu1` |
| `needrestart` | `3.11-1ubuntu2` |

Six supporting Perl packages were installed as dependencies:

```text
libintl-perl
libintl-xs-perl
libmodule-find-perl
libproc-processtable-perl
libsort-naturally-perl
libterm-readkey-perl
```

The existing `bind9-dnsutils` package already provided `dig`, so no redundant DNS tool package was installed. All other target administration tools were already present.

For a concise explanation of every intentionally managed administration, diagnostic, maintenance, networking, and T2-support tool referenced by this server setup, see [`../SERVER-TOOLS.md`](../SERVER-TOOLS.md). That reference distinguishes administrator-facing commands such as `ncdu`, `smartctl`, and `rg` from supporting packages that are normally used indirectly.

## T2/kernel preservation checks

Before package work, after package work, after reboot, and at final verification:

```text
active kernel: 7.1.3-1-t2-resolute
```

The following relevant packages remained installed and unchanged:

```text
apple-firmware-script                 1.4-3
apple-t2-audio-config                 0.4.2
linux-headers-7.1.3-1-t2-resolute    7.1.3-1
linux-image-7.1.3-1-t2-resolute      7.1.3-1
linux-t2                              7.1.3-1-resolute
```

Generic HWE and fallback kernel packages observed in Stage 1 were not removed. `needrestart` reported that the running kernel and processor microcode were up to date.

## Timezone and synchronization

No time configuration change was necessary.

Final state:

- timezone: `Europe/Zurich`;
- system clock synchronized: yes;
- NTP service: active;
- active provider: chrony;
- `systemd-timesyncd`: inactive, so no second time-sync provider was installed or enabled;
- RTC: UTC.

## Unattended-upgrades configuration

The existing file was inspected and left unchanged:

```text
/etc/apt/apt.conf.d/20auto-upgrades
```

It contains:

```text
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
```

The following root-owned `0644` drop-in was created atomically:

```text
/etc/apt/apt.conf.d/60gym-prod-unattended-upgrades
```

Content:

```text
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "false";
```

The default Ubuntu allowed-origin policy includes the base Resolute pocket, Resolute security, and inactive ESM patterns. ESM was not enabled. The T2 repository does not match an allowed unattended-upgrade origin.

`unattended-upgrade --dry-run --debug` exited successfully. It found no package eligible for unattended installation and no pending automatic removals. The two phased `resolute-updates` packages were correctly not selected.

## Journal retention configuration

Initial journal use was 53.3 MB.

The following root-owned `0644` drop-in was created atomically:

```text
/etc/systemd/journald.conf.d/90-gym-prod-retention.conf
```

Content:

```ini
[Journal]
SystemMaxUse=1G
MaxRetentionSec=30day
Compress=yes
```

`systemd-analyze cat-config systemd/journald.conf` confirmed the drop-in in the effective configuration. `systemd-journald` was restarted and remained active. Journal use was 53.3 MB immediately after restart and 67.9 MB at post-reboot verification, below the configured bound.

## SSD TRIM state

`systemctl daemon-reload` reconciled the previously reported stale unit definition.

Final state:

```text
fstrim.timer: active
fstrim.timer: enabled
NeedDaemonReload=no
```

The timer had completed a scheduled run on 2026-07-20 and was scheduled again for 2026-07-27. A manual `fstrim -av` was not run because the periodic timer had run recently and was healthy.

After installing `smartmontools`, the Apple NVMe device reported:

- overall SMART health: passed;
- critical warning: none;
- temperature during inspection: 39°C;
- lifetime percentage used: 2%;
- media/data integrity errors: 0;
- error-log entries: 0.

The full `smartctl -a` command returned status 4 because the Apple controller rejected one optional error-information log page. The health data itself was available and passed; a focused post-reboot `smartctl -H` exited 0. Device serial information was intentionally omitted.

## Sleep-target state

All targets remained masked before and after reboot:

```text
sleep.target
suspend.target
hibernate.target
hybrid-sleep.target
```

No sleep-target change was required.

## Reboot reason and result

No `/var/run/reboot-required` marker existed. A controlled reboot was still performed because:

- the Stage 2 runbook requires reboot validation;
- OpenSSH had been upgraded and restarted;
- journald and systemd maintenance configuration had changed;
- `needrestart` listed `plymouth-start.service` and one GDM greeter session as using older binaries.

The server rebooted at approximately 19:00 CEST on 2026-07-20 and returned through the primary Ethernet alias within one minute. Fresh Ethernet and Wi-Fi sessions both succeeded. No local recovery or router change was needed.

## Post-reboot verification

Confirmed after reboot and again during final verification:

- hostname: `gym-prod`;
- active kernel: `7.1.3-1-t2-resolute`;
- system failed units: 0;
- SSH: active and enabled;
- `sshd -t`: successful;
- UFW: active with its pre-existing broad OpenSSH IPv4/IPv6 rules;
- Ethernet: connected at `192.168.1.57/24`;
- Wi-Fi: connected at `192.168.86.178/24`;
- `ssh gym-prod`: successful;
- `ssh gym-prod-wifi`: successful;
- outbound IPv4: Ethernet through `192.168.1.1`, source `192.168.1.57`;
- timezone and NTP: correct and synchronized;
- TRIM: active and enabled;
- sleep targets: masked;
- maintenance files: root-owned `0644` and persistent;
- `dpkg --audit`: no findings;
- `apt-get check`: successful;
- SMART health: passed.

## Failed or deferred items

No unresolved Stage 2 failure remains.

Execution deviations and deferred work:

1. Two read-only helper commands (`apt list --upgradable` and `systemd-analyze cat-config`) invoked terminal pagers and suspended. Each SSH helper session was closed safely; no package transaction or partial configuration was active. The commands were rerun with pager-safe methods.
2. Immediately after the OpenSSH package transaction, an in-session `sshd -t` briefly reported that `/run/sshd` was missing. The updated systemd unit then created its `RuntimeDirectory=sshd`, validated the configuration, and restarted SSH successfully. Fresh connections through both aliases passed without manual recovery.
3. `python3-software-properties` and `software-properties-common` remain deferred by Ubuntu phasing.
4. `dkms` remains installed despite being reported as no longer required. It must not be automatically removed without a separate T2 dependency review.
5. The T2/Apple ACPI, Bluetooth, Wi-Fi P2P, and desktop Snap warnings from Stage 1 were not modified; they remain documented investigation items.
6. SSH authentication and UFW policy were intentionally not hardened in Stage 2.

## Configuration files created or changed

Created:

```text
/etc/apt/apt.conf.d/60gym-prod-unattended-upgrades
/etc/systemd/journald.conf.d/90-gym-prod-retention.conf
```

Inspected but unchanged:

```text
/etc/apt/apt.conf.d/20auto-upgrades
/etc/apt/apt.conf.d/50unattended-upgrades
/etc/ssh/sshd_config
/etc/ssh/sshd_config.d/
```

Both new files were absent before Stage 2, so no pre-existing custom file required a backup. Package-owned OpenSSH service files and the OpenSSH UFW application profile were updated by the reviewed Ubuntu security package; no custom SSH or UFW policy was changed.

## Exact commands executed

Commands were run over the established SSH aliases. Privileged command groups ran inside `sudo bash` only after the administrator entered the sudo password directly in a local terminal. Passwords, private keys, SSH fingerprints, device serial numbers, and complete private diagnostics are not included in this report.

Preflight and review:

```bash
date --iso-8601=seconds
uname -r
hostnamectl
df -h /
free -h
systemctl --failed --no-pager
ps aux | grep -E '[a]pt|[d]pkg|[u]nattended'
dpkg-query -W -f='${Package}\t${Version}\n' | grep -Ei '(^linux-|t2|apple|firmware)' | sort
ssh gym-prod
ssh gym-prod-wifi
dpkg --audit
apt update
apt list --upgradable
apt-get -s full-upgrade
apt-get -s install tree tmux ncdu smartmontools traceroute ripgrep needrestart
apt-mark showhold
```

Reviewed package application:

```bash
DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=l \
  apt-get -y -o Dpkg::Options::=--force-confold full-upgrade
dpkg --audit
apt-get check
sshd -t
systemctl is-active ssh
systemctl is-enabled ssh
ufw status
ip route get 1.1.1.1
DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=l \
  apt-get -y -o Dpkg::Options::=--force-confold install \
  tree tmux ncdu smartmontools traceroute ripgrep needrestart
dpkg --audit
apt-get check
smartctl -a /dev/nvme0
apt-get -s full-upgrade
```

Maintenance configuration and validation:

```bash
cat /etc/apt/apt.conf.d/20auto-upgrades
sed -n '1,180p' /etc/apt/apt.conf.d/50unattended-upgrades
apt-config dump
mktemp /etc/apt/apt.conf.d/.60gym-prod-unattended-upgrades.XXXXXX
chown root:root <apt-temp-file>
chmod 0644 <apt-temp-file>
mv -T <apt-temp-file> /etc/apt/apt.conf.d/60gym-prod-unattended-upgrades
install -d -m 0755 /etc/systemd/journald.conf.d
mktemp /etc/systemd/journald.conf.d/.90-gym-prod-retention.XXXXXX
chown root:root <journal-temp-file>
chmod 0644 <journal-temp-file>
mv -T <journal-temp-file> /etc/systemd/journald.conf.d/90-gym-prod-retention.conf
stat -c '%A %a %U:%G %n' \
  /etc/apt/apt.conf.d/60gym-prod-unattended-upgrades \
  /etc/systemd/journald.conf.d/90-gym-prod-retention.conf
unattended-upgrade --dry-run --debug
journalctl --disk-usage
SYSTEMD_PAGER=cat systemd-analyze --no-pager cat-config systemd/journald.conf
systemctl restart systemd-journald
systemctl is-active systemd-journald
systemctl daemon-reload
systemctl is-enabled fstrim.timer
systemctl is-active fstrim.timer
systemctl show fstrim.timer -p NeedDaemonReload -p ActiveState -p UnitFileState
systemctl list-timers fstrim.timer --all
systemctl is-enabled sleep.target suspend.target hibernate.target hybrid-sleep.target
timedatectl
systemctl is-active systemd-timesyncd
systemctl is-active chrony
needrestart -r l
```

Pre-reboot, reboot, and post-reboot verification:

```bash
sshd -t
ufw status verbose
systemctl is-active ssh
systemctl is-enabled ssh
nmcli device status
ip -4 -br address
ip route get 1.1.1.1
systemctl --failed --no-pager
dpkg --audit
apt-get check
sudo reboot
hostname
whoami
uname -r
uptime
ssh gym-prod
ssh gym-prod-wifi
timedatectl
systemctl is-active fstrim.timer
systemctl is-enabled sleep.target suspend.target hibernate.target hybrid-sleep.target
smartctl -H /dev/nvme0
apt-get -s full-upgrade
```

No `autoremove`, package purge, kernel replacement, network change, SSH policy change, UFW policy change, or application deployment command was run.

## Recommendations for Stage 3

1. Read and review this report before any access or firewall change.
2. Keep an established primary SSH session open and test independent Ethernet and Wi-Fi sessions before and after every high-risk change.
3. Preserve `AllowTcpForwarding yes` for later private Grafana tunneling.
4. Replace broad SSH firewall rules only after the interface-scoped rules are installed and tested.
5. Account explicitly for the global Ethernet IPv6 address/default route before removing the broad IPv6 rule.
6. Disable password authentication, direct root login, and X11 forwarding only after key-only access succeeds through both aliases.
7. Preserve the current Ethernet metric-100 preferred route and Wi-Fi metric-600 fallback unless live inspection proves a change is necessary.
8. Do not autoremove `dkms`, generic fallback kernels, T2 packages, or firmware as part of Stage 3.
9. Leave the two phased package updates for a later reviewed Ubuntu maintenance run; do not combine them with SSH/UFW hardening opportunistically.
10. Stop after the Stage 3 report; do not begin Docker installation without separate review and authorization.
