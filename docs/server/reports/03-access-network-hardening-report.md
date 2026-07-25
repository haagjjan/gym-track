# Stage 3 Access and Network Hardening Report

- **Target:** `gym-prod`
- **Execution started:** 2026-07-21 13:26 CEST
- **Controlled reboot:** 2026-07-21 13:42 CEST
- **Final privileged verification:** 2026-07-21 13:44 CEST
- **Execution boundary:** Stage 3 only

## Executive summary

Stage 3 completed successfully after one fully recovered execution incident. OpenSSH now permits only the `admin-gym` account, requires the established public key, disables direct root login, disables password and keyboard-interactive authentication, disables X11 and tunnel-device forwarding, and retains TCP forwarding for later private SSH tunnels. Both the Ethernet and Wi-Fi aliases pass fresh key-only tests, including after a controlled reboot, while a password-only client is rejected.

UFW now permits SSH only from the intended IPv4 LAN on each intended interface. The broad IPv4 and IPv6 OpenSSH rules were removed only after the replacement rules and both fresh access paths had passed. Ethernet remained the preferred outbound path without a NetworkManager change, IPv4 and IPv6 packet forwarding remained disabled, every listener was accounted for, and no application, database, container, or dashboard port was present.

During the first hardening helper run, a temporary-file cleanup defect removed `/dev/null`. New SSH connections reset during key exchange, but the required original SSH session remained open. The new drop-in was moved out of the active configuration, `/dev/null` was recreated as the standard root-owned `1:3` character device with mode `0666`, SSH was validated and reloaded, and both access paths recovered. The faulty helper was corrected and not reused. The hardening was then applied by a smaller helper without cleanup logic. The final controlled reboot recreated and preserved the correct `/dev/null` device, both SSH paths passed, package integrity passed, and zero units were failed.

The active kernel remains `7.1.3-1-t2-resolute`, and all recorded Apple/T2 packages remain installed at their Stage 2 versions. Stage 4 was not started.

## Access paths tested

The following access model was proven before changes, after SSH hardening, after UFW narrowing, and after reboot:

| Alias | Server destination | Interface | Result |
|---|---|---|---|
| `gym-prod` | `192.168.1.57:22` | `enp4s0` | Fresh key-only session passed |
| `gym-prod-wifi` | `192.168.86.178:22` | `wlp3s0` | Fresh key-only session passed |

The client source addresses were within the intended `192.168.1.0/24` and `192.168.86.0/24` networks. Exact client addresses are omitted because the rules are deliberately subnet-based and the client DHCP address is not a stable server requirement.

The original visible SSH session remained open through the SSH and UFW changes. It provided the recovery path during the `/dev/null` incident. New independent sessions were used for every acceptance test.

## SSH key-only verification

Before making changes, explicit public-key-only sessions passed through both aliases with password and keyboard-interactive authentication disabled on the client. A local private-key passphrase prompt, if required by the MacBook key agent, is distinct from the Linux account password; no Linux account password was requested.

After hardening and after reboot:

- public-key-only authentication passed through both aliases;
- hostname was `gym-prod` and user was `admin-gym`;
- a password-only client exited with status `255` and the server advertised only `publickey` authentication;
- the private key, its passphrase, and `authorized_keys` content were never read, copied, logged, or added to the repository.

## Effective SSH settings before

The pre-change configuration passed `sshd -t`. Selected effective settings were:

```text
port 22
addressfamily any
listenaddress [::]:22
listenaddress 0.0.0.0:22
usepam yes
permitrootlogin prohibit-password
pubkeyauthentication yes
passwordauthentication yes
kbdinteractiveauthentication no
x11forwarding yes
gatewayports no
allowtcpforwarding yes
permittunnel no
```

No `AllowUsers` restriction was effective. The source configuration explicitly set keyboard-interactive authentication off, PAM on, and X11 forwarding on; password authentication and root policy otherwise used their package defaults.

SSH path permissions were already secure and did not require correction:

```text
/home/admin-gym/.ssh                 0700 admin-gym:admin-gym
/home/admin-gym/.ssh/authorized_keys 0600 admin-gym:admin-gym
```

The home directory itself was mode `0750` and owned by `admin-gym:admin-gym`.

## SSH drop-in created

Created as root-owned mode `0644`:

```text
/etc/ssh/sshd_config.d/90-gym-prod-hardening.conf
```

Content:

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

The file was absent before Stage 3, so no previous custom file needed a backup. It was validated with `sshd -t` before SSH was reloaded. During incident recovery, the newly created file was temporarily moved to `/tmp`, then reinstalled only after `/dev/null` and both original access paths were healthy.

## Effective SSH settings after

The final post-reboot configuration passed `sshd -t`. Selected effective settings were:

```text
port 22
addressfamily any
listenaddress [::]:22
listenaddress 0.0.0.0:22
usepam yes
permitrootlogin no
pubkeyauthentication yes
passwordauthentication no
kbdinteractiveauthentication no
x11forwarding no
gatewayports no
allowtcpforwarding yes
allowusers admin-gym
permittunnel no
```

SSH remains active and enabled. TCP forwarding remains intentionally available for later loopback-bound administration tunnels such as private Grafana access. Gateway ports remain disabled, so a forwarded port is not made remotely reachable by default.

## UFW rules before

Pre-change state:

```text
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)

OpenSSH       ALLOW IN  Anywhere
OpenSSH (v6)  ALLOW IN  Anywhere (v6)
```

The two rules allowed SSH from any source that could route to the host over IPv4 or IPv6.

## UFW rules after

The replacement rules were added before either broad rule was deleted. Fresh key-only sessions then passed over Ethernet and Wi-Fi. The current numbered rule list was inspected immediately before deletion; the broad IPv6 rule was removed first at the then-current highest rule number, followed by the broad IPv4 rule.

Final post-reboot state:

```text
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)

22/tcp on enp4s0  ALLOW IN  192.168.1.0/24   # SSH Fiber Box LAN
22/tcp on wlp3s0  ALLOW IN  192.168.86.0/24  # SSH Google Nest LAN
```

There is no broad OpenSSH application-profile rule and no broad IPv6 SSH rule. Both replacement paths passed again after rule deletion and after reboot.

## IPv6 exposure decision

No local IPv6 SSH requirement was approved for this stage. The broad `OpenSSH (v6) ALLOW IN Anywhere (v6)` rule was therefore removed. `sshd` still listens on the IPv6 wildcard address because `AddressFamily any` was not changed, but UFW's default incoming deny policy has no IPv6 SSH exception. This preserves ordinary OpenSSH address-family behavior without granting unsolicited inbound IPv6 SSH access.

No sensitive global IPv6 address is included in this report.

## Route metrics and preferred outbound path

Kernel routes before and after hardening, and after reboot, were:

```text
Ethernet default via 192.168.1.1 on enp4s0, metric 100
Wi-Fi default via 192.168.86.1 on wlp3s0, metric 600
```

`ip route get 1.1.1.1` selected `enp4s0` with source `192.168.1.57`. NetworkManager profile values displayed `-1`, meaning automatic metrics, while the resulting DHCP routes had the desired effective metrics. Because Ethernet was already preferred reliably, no NetworkManager connection profile or route metric was changed.

## Packet-forwarding state

Before changes and after reboot:

```text
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0
```

The host is not intentionally acting as an IPv4 or IPv6 router. No forwarding or NAT rule was created. Docker may deliberately change forwarding behavior in Stage 4, which must be reviewed separately.

## Listening-port audit

Every post-reboot listener is accounted for:

| Protocol/address | Port | Process | Explanation |
|---|---:|---|---|
| TCP `0.0.0.0`, `[::]` | 22 | `sshd` and systemd | OpenSSH listener; UFW restricts accepted inbound traffic to the two intended IPv4 interface/subnet rules |
| UDP `0.0.0.0`, `[::]` | 5353 | `avahi-daemon` | Existing multicast DNS/service discovery listener documented in Stage 1 |
| TCP/UDP loopback | 53 | `systemd-resolved` | Local DNS stub resolver only |
| UDP loopback | 323 | `chronyd` | Local chrony command and monitoring socket only |
| TCP loopback | 631 | `cupsd` | Local-only printing service |

There is no Gym Tracker, PostgreSQL, Docker, HTTP, HTTPS, Grafana, Prometheus, or unexpected high-port listener. Avahi and CUPS are existing Ubuntu desktop services; removing unused desktop discovery or printing components requires a separate least-service review and was not combined with access hardening.

## Reboot and recovery tests

### Recovered execution incident

The first privileged hardening helper correctly:

1. recorded forwarding, listener, route, and permission state;
2. created and validated the SSH drop-in;
3. reloaded SSH successfully;
4. added both interface-scoped UFW replacement rules while retaining the broad rules.

Its exit cleanup then incorrectly changed its temporary-file variable to `/dev/null` and executed `rm -f` through a cleanup trap. This removed the `/dev/null` device node. Fresh SSH sessions over both aliases established TCP and then reset during key exchange.

The mandatory recovery path worked as designed:

1. the original SSH session remained open;
2. no broad UFW rule had been removed;
3. the new drop-in was moved out of the active configuration;
4. `sshd -t` reported that `/dev/null` could not be opened, identifying the host-level cause;
5. `/dev/null` was recreated with `mknod` as character device major `1`, minor `3`, owned by `root:root`, mode `0666`;
6. the original SSH configuration validated and was reloaded;
7. both fresh key-only aliases recovered;
8. the faulty cleanup logic was corrected locally and that helper was not executed again;
9. a smaller helper without temporary-file cleanup reinstalled the already validated drop-in;
10. both aliases passed before firewall narrowing continued.

No router change, local console, password fallback, package repair, or reinstall was required. After recovery, zero units were failed and the active T2 kernel was unchanged.

### Controlled reboot

Pre-reboot boot ID:

```text
05fb2951-1092-49cd-96a2-9d1683220bc4
```

Post-reboot boot ID:

```text
de193bb7-57e5-41d2-9602-e0f923f5f041
```

The new boot began at 2026-07-21 13:42:40 CEST. After startup:

- both aliases passed fresh key-only tests;
- password-only authentication was rejected;
- SSH was active and enabled;
- the hardening drop-in and intended effective settings persisted;
- UFW retained only the two restricted SSH rules;
- Ethernet and Wi-Fi returned at their expected addresses;
- Ethernet remained the preferred outbound route;
- `/dev/null` was the correct root-owned `1:3` character device with mode `0666`;
- IPv4 and IPv6 forwarding remained disabled;
- all listeners were accounted for;
- zero system units were failed;
- `dpkg --audit` and `apt-get check` passed;
- the active T2 kernel and recorded T2 packages were preserved.

## Configuration files changed

Created:

```text
/etc/ssh/sshd_config.d/90-gym-prod-hardening.conf
```

Changed through UFW's supported command interface:

```text
/etc/ufw/user.rules
/etc/ufw/user6.rules
```

The persistent UFW rule state now contains only the two intended interface-scoped IPv4 SSH allowances. UFW low-volume logging was already enabled and was reaffirmed.

`/dev/null` was recreated during incident recovery but is a kernel device node under `/dev`, not a repository or persistent application configuration file. The controlled reboot independently produced the same correct device type, ownership, numbers, and permissions.

No NetworkManager profile, route metric, router, DNS, kernel, bootloader, firmware, application, database, Docker, or monitoring configuration was changed.

## Deferred security decisions

The following remain intentionally deferred:

1. Docker installation and any Docker-managed forwarding or firewall behavior belong to Stage 4.
2. No application, HTTP, HTTPS, database, dashboard, or monitoring port is approved yet.
3. `fail2ban`, a VPN, public port forwarding, external tunnels, and an SSH port change remain out of scope.
4. Wi-Fi remains enabled as the tested recovery path.
5. SSH TCP forwarding remains enabled for later private administration tunnels; `GatewayPorts no` limits accidental remote exposure.
6. No direct IPv6 SSH allowance exists. A future IPv6 access requirement needs a separately reviewed, source-scoped rule.
7. Existing Avahi and local CUPS services were documented rather than removed. A separate least-service review can decide whether the host still needs them.
8. The two phased Ubuntu updates and `dkms` retention from Stage 2 were not changed.

## Exact commands executed

Commands were run through the established aliases. Privileged helper scripts were transferred as temporary files, inspected by construction, and invoked with `sudo` only in the administrator's visible SSH terminal. The sudo password was entered directly by the administrator and was never transmitted through chat, stored, or included in output.

Preflight and key-only access tests:

```bash
ssh -o BatchMode=yes gym-prod '<identity, kernel, interface, route, service, and process checks>'
ssh -o BatchMode=yes gym-prod-wifi '<identity and interface checks>'
ssh -o PreferredAuthentications=publickey \
  -o PasswordAuthentication=no \
  -o KbdInteractiveAuthentication=no gym-prod
ssh -o PreferredAuthentications=publickey \
  -o PasswordAuthentication=no \
  -o KbdInteractiveAuthentication=no gym-prod-wifi
```

Privileged audit commands:

```bash
date --iso-8601=seconds
hostname
id admin-gym
uname -r
ip -4 -br address
nmcli device status
sshd -t
sshd -T | grep -E '<selected SSH settings>'
grep -RInE '<selected SSH directives>' /etc/ssh/sshd_config /etc/ssh/sshd_config.d
stat -c '%A %a %U:%G %n' /home/admin-gym /home/admin-gym/.ssh /home/admin-gym/.ssh/authorized_keys
ufw status verbose
ufw status numbered
ip route
ip route get 1.1.1.1
nmcli connection show netplan-enp4s0
nmcli connection show Haag_74
sysctl net.ipv4.ip_forward
sysctl net.ipv6.conf.all.forwarding
ss -lntup
systemctl is-active ssh
systemctl is-enabled ssh
systemctl --failed --no-pager
```

SSH hardening and replacement firewall rules:

```bash
mktemp /etc/ssh/sshd_config.d/.90-gym-prod-hardening.conf.XXXXXX
chown root:root <ssh-temp-file>
chmod 0644 <ssh-temp-file>
mv -T <ssh-temp-file> /etc/ssh/sshd_config.d/90-gym-prod-hardening.conf
sshd -t
sshd -T | grep -E '<selected SSH settings>'
systemctl reload ssh
systemctl is-active ssh
systemctl is-enabled ssh
ufw allow in on enp4s0 from 192.168.1.0/24 to any port 22 proto tcp comment 'SSH Fiber Box LAN'
ufw allow in on wlp3s0 from 192.168.86.0/24 to any port 22 proto tcp comment 'SSH Google Nest LAN'
ufw status verbose
ufw status numbered
```

Incident recovery and safe reapplication:

```bash
rm -f /dev/null  # unintended helper cleanup; immediately recovered below
mv /etc/ssh/sshd_config.d/90-gym-prod-hardening.conf \
  /tmp/90-gym-prod-hardening.conf.failed
sshd -t
mknod -m 0666 /dev/null c 1 3
chown root:root /dev/null
sshd -t
systemctl reload ssh
systemctl is-active ssh
ls -l /dev/null
install -o root -g root -m 0644 \
  /tmp/90-gym-prod-hardening.conf.failed \
  /etc/ssh/sshd_config.d/90-gym-prod-hardening.conf
sshd -t
systemctl reload ssh
```

Password rejection and UFW narrowing:

```bash
ssh -o BatchMode=yes \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password,keyboard-interactive \
  -o NumberOfPasswordPrompts=0 gym-prod
ufw status numbered
ufw --force delete 4
ufw status numbered
ufw --force delete 1
ufw logging low
ufw status verbose
ufw status numbered
sshd -t
systemctl is-active ssh
```

Pre-reboot, reboot, and post-reboot verification:

```bash
date --iso-8601=seconds
cat /proc/sys/kernel/random/boot_id
uptime -s
hostname
whoami
uname -r
systemctl is-active ssh
systemctl is-enabled ssh
ip route get 1.1.1.1
systemctl --failed --no-pager
sudo reboot
ssh gym-prod
ssh gym-prod-wifi
stat -c '%A %a %U:%G %t:%T %n' /dev/null
sshd -t
sshd -T | grep -E '<selected SSH settings>'
ufw status verbose
ufw status numbered
nmcli device status
ip -4 -br address
ip route
ip route get 1.1.1.1
sysctl net.ipv4.ip_forward
sysctl net.ipv6.conf.all.forwarding
ss -lntup
systemctl --failed --no-pager
dpkg-query -W '<recorded T2 packages>'
dpkg --audit
apt-get check
```

No private key, password, key fingerprint, MAC address, sensitive IPv6 address, packet capture, or secret value was collected in the repository report.

## Recommendations for Stage 4

1. Review this report and explicitly accept Stage 3 before starting Docker installation.
2. Keep both working SSH paths open during Docker installation and networking verification.
3. Preserve `/etc/ssh/sshd_config.d/90-gym-prod-hardening.conf` and the two current UFW rules.
4. Do not expose the Docker daemon, application, PostgreSQL, Prometheus, Grafana, or container metrics ports.
5. Review Docker's changes to IPv4/IPv6 forwarding and its firewall chains; do not assume UFW alone filters published Docker ports.
6. Re-audit every listener and both aliases before and after the Stage 4 reboot.
7. Preserve the active T2 kernel, Apple/T2 packages, fallback kernels, firmware, and `dkms` unless a separate dependency review approves a change.
8. Confirm `/dev/null` is a root-owned `1:3` character device and zero units are failed in the Stage 4 preflight, as a defense-in-depth check following the resolved Stage 3 incident.
9. Stop after the Stage 4 report; do not begin Wave B without separate authorization.
