# Stage 3 — Access and Network Hardening

## Objective

Harden SSH, firewall, and routing while preserving tested primary and fallback access.

This is the highest lockout-risk stage in Wave A.

## Dependencies

Stages 1 and 2 must be complete and reviewed.

Required inputs:

- [`../reports/01-host-baseline-audit-report.md`](../reports/01-host-baseline-audit-report.md)
- [`../reports/02-os-admin-foundation-report.md`](../reports/02-os-admin-foundation-report.md)

---

## Target access model

```text
Primary:
ssh gym-prod
→ 192.168.1.57
→ enp4s0

Fallback:
ssh gym-prod-wifi
→ 192.168.86.178
→ wlp3s0
```

Expected local networks:

```text
Fiber Box LAN: 192.168.1.0/24
Google Nest LAN: 192.168.86.0/24
```

The Google Nest router may NAT clients from `192.168.86.0/24` when they connect to `192.168.1.57`. Do not assume the server sees the original MacBook address on the Ethernet path.

---

## Scope

- verify both access paths;
- inspect effective OpenSSH settings;
- enforce key authentication;
- disable direct root SSH login;
- disable password and keyboard-interactive SSH authentication after successful safety tests;
- retain SSH port forwarding for later Grafana tunnels;
- restrict UFW SSH access to intended local networks and interfaces;
- remove broad IPv4/IPv6 SSH allowance only after replacement rules work;
- determine and, when necessary, correct route preference;
- verify the host is not intentionally acting as a router before Docker;
- audit listening ports;
- reboot and retest;
- produce a report.

---

## Explicitly out of scope

Do not:

- install Docker;
- configure application ports;
- expose HTTP, HTTPS, Grafana, Prometheus, or PostgreSQL;
- add public port forwarding;
- change Fiber Box or Google Nest routing;
- disable Wi-Fi;
- change SSH port from 22;
- disable SSH TCP forwarding, because SSH tunnels will be used later;
- install fail2ban unless separately approved;
- configure external VPN or tunnel access;
- modify T2/kernel/boot configuration.

---

## Mandatory safety protocol

1. Keep the original SSH session open.
2. Open a second client terminal before every high-risk change.
3. Add replacement access rules before deleting old rules.
4. Validate SSH configuration before reload.
5. Reload SSH; do not restart it unnecessarily.
6. Test a fresh key-only session before disabling password authentication.
7. Test Ethernet and Wi-Fi aliases separately.
8. Never close the last known-good session until all verification passes.
9. If Codex cannot initiate client-side sessions itself, pause and request that the user run the tests.

---

## Implementation steps

### 1. Verify current primary session path

From the active SSH session:

```bash
echo "$SSH_CONNECTION"
ip -4 -br address
nmcli device status
```

The third field of `SSH_CONNECTION` is the server-side destination address.

For the Ethernet alias it should be:

```text
192.168.1.57
```

### 2. Verify client-side aliases

From separate MacBook terminals:

```bash
ssh gym-prod
ssh gym-prod-wifi
```

In each session:

```bash
echo "$SSH_CONNECTION"
hostname
whoami
```

Expected server-side addresses:

```text
gym-prod       → 192.168.1.57
gym-prod-wifi  → 192.168.86.178
```

Do not proceed unless both work, or unless the user explicitly accepts losing the Wi-Fi fallback.

### 3. Verify key-only authentication

From the MacBook:

```bash
ssh \
  -o PreferredAuthentications=publickey \
  -o PasswordAuthentication=no \
  gym-prod
```

Repeat for:

```bash
ssh \
  -o PreferredAuthentications=publickey \
  -o PasswordAuthentication=no \
  gym-prod-wifi
```

A prompt for the local private-key passphrase is acceptable. A prompt for the Linux account password means key-only authentication is not proven.

### 4. Inspect SSH configuration and permissions

Run on the server:

```bash
sudo sshd -t
sudo sshd -T | grep -E \
  '^(port|addressfamily|listenaddress|permitrootlogin|passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication|allowtcpforwarding|gatewayports|permittunnel|x11forwarding|usepam)'
```

Inspect source files:

```bash
sudo grep -RInE \
  '^[[:space:]]*(Include|Port|AddressFamily|ListenAddress|PermitRootLogin|PasswordAuthentication|KbdInteractiveAuthentication|PubkeyAuthentication|AllowUsers|AllowGroups|AllowTcpForwarding|GatewayPorts|PermitTunnel|X11Forwarding|UsePAM)' \
  /etc/ssh/sshd_config /etc/ssh/sshd_config.d 2>/dev/null
```

Verify permissions:

```bash
stat -c '%A %a %U:%G %n' \
  "$HOME" "$HOME/.ssh" "$HOME/.ssh/authorized_keys"
```

Expected secure values:

```text
~/.ssh                  700
~/.ssh/authorized_keys  600
owner                    admin-gym:admin-gym
```

Correct only if needed:

```bash
chmod 700 "$HOME/.ssh"
chmod 600 "$HOME/.ssh/authorized_keys"
chown -R admin-gym:admin-gym "$HOME/.ssh"
```

### 5. Create an OpenSSH hardening drop-in

Create:

```text
/etc/ssh/sshd_config.d/90-gym-prod-hardening.conf
```

Recommended content:

```sshconfig
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
UsePAM yes

X11Forwarding no
PermitTunnel no
GatewayPorts no

AllowTcpForwarding yes
AllowUsers admin-gym
```

Rationale:

- root SSH login is disabled;
- user login requires the established key;
- PAM remains available for account/session handling;
- X11 and tunnel-device forwarding are unnecessary;
- TCP forwarding remains available for later SSH tunnels such as private Grafana access;
- only `admin-gym` may log in through SSH.

Do not set `AllowTcpForwarding no`.

Back up any existing custom file before replacing it.

Create with restrictive permissions:

```bash
sudo install -m 0644 /dev/null \
  /etc/ssh/sshd_config.d/90-gym-prod-hardening.conf
```

Write the content, then validate:

```bash
sudo sshd -t
```

If validation fails, restore/remove the new drop-in before doing anything else.

Review effective settings:

```bash
sudo sshd -T | grep -E \
  '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication|allowtcpforwarding|gatewayports|permittunnel|x11forwarding|usepam|allowusers)'
```

### 6. Reload SSH safely

Use:

```bash
sudo systemctl reload ssh
```

Do not close the original session.

From a new MacBook terminal, test:

```bash
ssh \
  -o PreferredAuthentications=publickey \
  -o PasswordAuthentication=no \
  gym-prod
```

Then test Wi-Fi fallback the same way.

Only continue after successful fresh sessions.

### 7. Inspect current UFW rules

Run:

```bash
sudo ufw status verbose
sudo ufw status numbered
```

Expected broad rules may include:

```text
OpenSSH ALLOW Anywhere
OpenSSH (v6) ALLOW Anywhere (v6)
```

Do not delete them yet.

### 8. Add interface-scoped local SSH rules

Add the Ethernet rule:

```bash
sudo ufw allow in on enp4s0 \
  from 192.168.1.0/24 \
  to any port 22 proto tcp \
  comment 'SSH Fiber Box LAN'
```

Add the Wi-Fi fallback rule:

```bash
sudo ufw allow in on wlp3s0 \
  from 192.168.86.0/24 \
  to any port 22 proto tcp \
  comment 'SSH Google Nest LAN'
```

These rules deliberately permit:

- Ethernet SSH from the upper local LAN;
- Wi-Fi SSH from the Google Nest LAN.

Review:

```bash
sudo ufw status numbered
```

### 9. Test replacement firewall rules before deleting broad rules

Open new client sessions through both aliases.

If both work, identify the broad `OpenSSH Anywhere` rules by their current UFW rule numbers.

Delete only the broad rules, from highest rule number to lowest:

```bash
sudo ufw delete <rule-number>
```

Do not use stale rule numbers copied from a previous listing.

After each deletion:

```bash
sudo ufw status numbered
```

Final intended inbound SSH rules:

```text
22/tcp on enp4s0 from 192.168.1.0/24
22/tcp on wlp3s0 from 192.168.86.0/24
```

There should be no broad IPv6 SSH allowance unless a specific local IPv6 access requirement has been approved.

Because default incoming policy is deny, deleting the broad IPv6 SSH rule should block unsolicited inbound IPv6 SSH traffic at the host.

Enable low-volume UFW logging:

```bash
sudo ufw logging low
```

### 10. Verify route preference

Run:

```bash
ip route
ip route get 1.1.1.1
nmcli -f NAME,TYPE,DEVICE,AUTOCONNECT,IP4.ROUTE-METRIC,IP6.ROUTE-METRIC connection show
```

Desired outbound result:

```text
dev enp4s0
src 192.168.1.57
```

If Ethernet is already preferred, do not change route metrics.

If Wi-Fi is preferred, inspect actual connection names and set deliberate metrics:

```text
Ethernet target metric: 100
Wi-Fi target metric:    600
```

Example only after confirming profile names:

```bash
sudo nmcli connection modify netplan-enp4s0 \
  ipv4.route-metric 100 \
  ipv6.route-metric 100

sudo nmcli connection modify '<wifi-profile-name>' \
  ipv4.route-metric 600 \
  ipv6.route-metric 600
```

Do not deactivate both connections.

Apply one profile at a time while retaining a working session, or defer activation to the controlled reboot.

### 11. Verify non-router state before Docker

Run:

```bash
sysctl net.ipv4.ip_forward
sysctl net.ipv6.conf.all.forwarding
```

Expected before Docker:

```text
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0
```

Record deviations.

Do not create forwarding rules in this stage. Docker may intentionally change forwarding behavior in Stage 4.

### 12. Audit final listening ports

Run:

```bash
sudo ss -lntup
sudo ufw status verbose
```

Every listening service must be explained.

At this checkpoint, no application/database/dashboard port should be intentionally exposed.

### 13. Pre-reboot validation

Run:

```bash
sudo sshd -t
systemctl is-active ssh
systemctl is-enabled ssh
sudo ufw status verbose
nmcli device status
ip route get 1.1.1.1
```

Keep the known-good SSH session open until issuing reboot.

### 14. Controlled reboot and access testing

Reboot:

```bash
sudo reboot
```

After startup, test from separate MacBook terminals:

```bash
ssh gym-prod
ssh gym-prod-wifi
```

On the server, verify:

```bash
hostname
whoami
echo "$SSH_CONNECTION"
systemctl is-active ssh
sudo sshd -T | grep -E \
  '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication|allowtcpforwarding|allowusers)'
sudo ufw status verbose
nmcli device status
ip -4 -br address
ip route get 1.1.1.1
sudo ss -lntup
```

---

## Recovery procedure

### New SSH sessions fail but old session remains open

Use the old session to:

1. inspect `sudo journalctl -u ssh -n 100`;
2. run `sudo sshd -t`;
3. remove or correct only the new drop-in;
4. run `sudo systemctl reload ssh`;
5. re-add a temporary UFW SSH rule if the firewall is the cause.

Temporary emergency rule, only when needed:

```bash
sudo ufw allow OpenSSH
```

Remove it after recovery and retesting.

### Ethernet alias fails

Try:

```bash
ssh gym-prod-wifi
```

Inspect:

```bash
nmcli device status
ip -4 -br address show enp4s0
journalctl -u NetworkManager -b --no-pager | tail -150
```

### Both aliases fail after reboot

Use local monitor and keyboard. Do not reset routers or reinstall Ubuntu.

---

## Required report

Create:

```text
docs/server/reports/03-access-network-hardening-report.md
```

Include:

```markdown
# Stage 3 Access and Network Hardening Report

## Executive summary
## Access paths tested
## SSH key-only verification
## Effective SSH settings before
## SSH drop-in created
## Effective SSH settings after
## UFW rules before
## UFW rules after
## IPv6 exposure decision
## Route metrics and preferred outbound path
## Packet-forwarding state
## Listening-port audit
## Reboot and recovery tests
## Configuration files changed
## Deferred security decisions
## Exact commands executed
## Recommendations for Stage 4
```

---

## Completion criteria

Stage 3 is complete only when:

- fresh key-only SSH sessions work;
- root SSH login is disabled;
- password and keyboard-interactive SSH authentication are disabled;
- SSH TCP forwarding remains available;
- UFW permits SSH only through deliberate local rules;
- broad IPv4/IPv6 SSH rules are removed;
- both primary and fallback aliases work;
- Ethernet is the preferred outbound path or the deviation is explicitly accepted;
- unexpected listening ports are resolved or documented;
- reboot verification succeeds;
- the report is complete.

---

## Stop conditions

Stop immediately if:

- a fresh key-only session fails;
- both network paths cannot be maintained;
- UFW rules cannot be understood confidently;
- the server has unexpected public services;
- changing route metrics risks losing all access;
- SSH validation fails;
- reboot recovery requires undocumented local intervention.

Do not continue to Stage 4.
