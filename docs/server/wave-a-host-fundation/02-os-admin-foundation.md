# Stage 2 — OS Administration Foundation

## Objective

Bring Ubuntu into a clean, maintainable administration state without deploying Docker or the Gym Tracker.

## Dependency

Stage 1 must be complete and reviewed.

Required input:

- [`../reports/01-host-baseline-audit-report.md`](../reports/01-host-baseline-audit-report.md)

Codex must adapt this stage to the audit. Do not execute blindly if the audit identifies conflicts.

---

## Scope

- refresh package metadata;
- safely apply Ubuntu updates;
- preserve the active T2-compatible kernel and firmware;
- install essential administration and diagnostic tools;
- verify timezone and NTP;
- configure unattended Ubuntu security updates without automatic reboot;
- configure bounded system-journal retention;
- verify periodic SSD trimming;
- verify sleep targets remain masked;
- perform a controlled reboot when safe;
- verify core services and access after reboot;
- create the Stage 2 report.

---

## Explicitly out of scope

Do not:

- install Docker;
- install Node.js, pnpm, PostgreSQL, Prometheus, or Grafana;
- deploy the application;
- change SSH authentication policy;
- tighten UFW rules;
- change route metrics;
- remove desktop packages merely because they appear unnecessary;
- enable Ubuntu Pro or ESM;
- install a generic kernel intentionally;
- remove T2 firmware, T2 kernel packages, or boot components;
- configure automatic reboot after unattended upgrades.

---

## Preconditions

- Stage 1 report exists and has no unresolved critical blocker.
- Both `ssh gym-prod` and the fallback access path are known.
- A current SSH session is open.
- Sudo access is available.
- At least 10 GB of root-filesystem space is free.
- No package-manager process is already running.

Check:

```bash
ps aux | grep -E '[a]pt|[d]pkg|[u]nattended'
df -h /
```

---

## Safety constraints

- Record the active kernel before package work.
- Simulate upgrades before applying them.
- Stop if an upgrade proposes removing T2, boot, networking, SSH, or firmware packages.
- Keep the current SSH session open through reboot preparation.
- Do not enable automatic reboot.
- Use configuration drop-ins instead of editing vendor-owned defaults where possible.
- Back up any configuration file before modifying it.

---

## Implementation steps

### 1. Record pre-change state

Run:

```bash
date --iso-8601=seconds
uname -r
hostnamectl
df -h /
free -h
systemctl --failed --no-pager
```

Capture installed T2 and kernel packages:

```bash
dpkg-query -W -f='${Package}\t${Version}\n' \
  | grep -Ei '(^linux-|t2|apple|firmware)' \
  | sort
```

Save the output in the report before changing packages.

### 2. Refresh package metadata

Run:

```bash
sudo apt update
```

Explain in the report:

- `apt update` refreshes repository metadata;
- it does not itself install upgrades.

Review warnings. Stop on repository signature, release, or transport errors.

### 3. Review and simulate the upgrade

List available upgrades:

```bash
apt list --upgradable
```

Simulate a full upgrade:

```bash
sudo apt-get -s full-upgrade
```

Inspect the simulation for:

- packages to remove;
- kernel changes;
- T2 packages;
- Apple firmware;
- bootloader/EFI packages;
- NetworkManager;
- OpenSSH;
- UFW.

Stop for review if the simulation proposes removal or replacement that could break T2 boot or remote access.

### 4. Apply the safe upgrade

When the simulation is safe:

```bash
sudo apt full-upgrade
```

Do not use `-y` until the proposed transaction has been reviewed.

Afterward:

```bash
sudo dpkg --audit
sudo apt-get check
```

Do not run `autoremove` automatically. T2-related or fallback kernel packages must not be removed casually.

### 5. Install essential administration tools

First determine which packages are missing.

Target package set:

```text
git
curl
wget
ca-certificates
gnupg
jq
rsync
unzip
zip
tree
tmux
bash-completion
lsof
ncdu
smartmontools
dnsutils
traceroute
tcpdump
ripgrep
needrestart
```

Existing tools such as `htop`, `btop`, and `ethtool` should remain.

Install only missing packages:

```bash
sudo apt install \
  git curl wget ca-certificates gnupg jq rsync unzip zip tree tmux \
  bash-completion lsof ncdu smartmontools dnsutils traceroute tcpdump \
  ripgrep needrestart
```

If the audit proves some packages are already installed, `apt` may retain them without change.

Do not add third-party repositories in this stage.

### 6. Verify timezone and time synchronization

Run:

```bash
timedatectl
```

Expected operational state:

- correct local timezone;
- `System clock synchronized: yes`;
- NTP enabled.

The expected user timezone is likely `Europe/Zurich`, but do not change it based only on assumption. If the configured timezone is different, report and request confirmation before changing it.

Identify the active time-sync provider:

```bash
systemctl is-active systemd-timesyncd 2>/dev/null || true
systemctl is-active chrony 2>/dev/null || true
```

Do not install a second time-sync daemon when one already works.

### 7. Configure unattended Ubuntu security updates

Inspect current state:

```bash
dpkg -l unattended-upgrades
cat /etc/apt/apt.conf.d/20auto-upgrades 2>/dev/null || true
grep -RIn 'Unattended-Upgrade' /etc/apt/apt.conf.d
```

Use Ubuntu archive security updates only. Do not automatically include third-party repositories.

Ensure periodic updates are enabled through `/etc/apt/apt.conf.d/20auto-upgrades`:

```text
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
```

If modification is required:

```bash
sudo cp -a /etc/apt/apt.conf.d/20auto-upgrades \
  /etc/apt/apt.conf.d/20auto-upgrades.before-gym-prod 2>/dev/null || true
```

Create or update the file atomically.

Create a custom drop-in rather than editing `50unattended-upgrades`:

```text
/etc/apt/apt.conf.d/60gym-prod-unattended-upgrades
```

Content:

```text
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "false";
```

The second setting is deliberately conservative because this machine relies on T2-compatible kernel support.

Validate:

```bash
sudo unattended-upgrade --dry-run --debug
```

Summarize the dry run; do not paste excessive debug output.

### 8. Configure journal retention

Inspect current usage:

```bash
journalctl --disk-usage
```

Create:

```text
/etc/systemd/journald.conf.d/90-gym-prod-retention.conf
```

Recommended initial content:

```ini
[Journal]
SystemMaxUse=1G
MaxRetentionSec=30day
Compress=yes
```

Before creating:

```bash
sudo install -d -m 0755 /etc/systemd/journald.conf.d
```

Validate and apply:

```bash
sudo systemd-analyze cat-config systemd/journald.conf
sudo systemctl restart systemd-journald
journalctl --disk-usage
```

A journald restart should not terminate SSH.

### 9. Verify periodic SSD trimming

Run:

```bash
systemctl is-enabled fstrim.timer
systemctl is-active fstrim.timer
systemctl list-timers fstrim.timer --all
```

If disabled:

```bash
sudo systemctl enable --now fstrim.timer
```

Do not run destructive storage tests.

A manual non-destructive trim may be run once:

```bash
sudo fstrim -av
```

Record the result.

### 10. Reconfirm sleep prevention

Run:

```bash
systemctl is-enabled \
  sleep.target \
  suspend.target \
  hibernate.target \
  hybrid-sleep.target
```

Expected: all `masked`.

If not, reapply:

```bash
sudo systemctl mask \
  sleep.target \
  suspend.target \
  hibernate.target \
  hybrid-sleep.target
```

### 11. Check reboot requirement

Run:

```bash
test -f /var/run/reboot-required \
  && cat /var/run/reboot-required \
  || echo "No reboot-required marker"

test -f /var/run/reboot-required.pkgs \
  && cat /var/run/reboot-required.pkgs \
  || true
```

A reboot is recommended after kernel or foundational library updates.

### 12. Pre-reboot verification

Before reboot:

```bash
sudo sshd -t
sudo ufw status
systemctl is-active ssh
systemctl is-enabled ssh
nmcli device status
ip -4 -br address
```

Keep the current session open until the reboot command.

### 13. Controlled reboot

When safe:

```bash
sudo reboot
```

Wait for the machine to return.

Reconnect through the primary Ethernet alias:

```bash
ssh gym-prod
```

The user or controlling client must also retain knowledge of:

```bash
ssh gym-prod-wifi
```

for fallback.

### 14. Post-reboot verification

Run:

```bash
hostname
whoami
uname -r
uptime
systemctl --failed --no-pager
systemctl is-active ssh
systemctl is-enabled ssh
sudo ufw status
nmcli device status
ip -4 -br address
ip route get 1.1.1.1
timedatectl
systemctl is-active fstrim.timer
systemctl is-enabled \
  sleep.target suspend.target hibernate.target hybrid-sleep.target
sudo dpkg --audit
sudo apt-get check
```

Compare the active kernel with installed T2 package state.

---

## Rollback and recovery

### Package transaction failure

Do not reboot while `dpkg` is incomplete.

Use only as indicated by package-manager output:

```bash
sudo dpkg --configure -a
sudo apt-get -f install
```

Re-run:

```bash
sudo dpkg --audit
sudo apt-get check
```

### SSH unavailable after reboot

Try the fallback alias:

```bash
ssh gym-prod-wifi
```

If both paths fail, use the local monitor and keyboard. Do not change router topology as an initial reaction.

### Time-sync or journald issue

Restore the backed-up file or remove only the newly created drop-in, then restart the affected service.

---

## Required report

Create:

```text
docs/server/reports/02-os-admin-foundation-report.md
```

Include:

```markdown
# Stage 2 OS Administration Foundation Report

## Executive summary
## Pre-change state
## Repository and upgrade review
## Packages upgraded
## Packages installed
## T2/kernel preservation checks
## Timezone and synchronization
## Unattended-upgrades configuration
## Journal retention configuration
## SSD TRIM state
## Sleep-target state
## Reboot reason and result
## Post-reboot verification
## Failed or deferred items
## Configuration files created or changed
## Exact commands executed
## Recommendations for Stage 3
```

Do not commit package-manager logs containing secrets or unrelated private data.

---

## Completion criteria

Stage 2 is complete only when:

- package metadata is current;
- safe Ubuntu updates were applied;
- T2 boot and hardware support remain intact;
- required administration tools are installed;
- time synchronization is healthy;
- unattended security updates are enabled without automatic reboot;
- journal retention is bounded;
- periodic TRIM is active;
- sleep targets remain masked;
- SSH, UFW, Ethernet, and fallback networking survive reboot;
- package-manager integrity checks pass;
- the Stage 2 report is complete.

---

## Stop conditions

Stop and report if:

- an upgrade proposes removing T2/kernel/firmware packages;
- the active T2 kernel is replaced unexpectedly;
- networking or SSH packages would be removed;
- package sources fail signature validation;
- `dpkg` cannot be returned to a consistent state;
- root filesystem health or free space becomes unsafe;
- primary and fallback SSH access cannot be recovered.

Do not continue to Stage 3.
