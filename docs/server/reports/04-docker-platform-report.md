# Stage 4 Docker Platform Report

- **Target:** `gym-prod`
- **Execution started:** 2026-07-21 14:02 CEST
- **Controlled reboot:** 2026-07-21 14:15 CEST
- **Final privileged verification:** 2026-07-21 14:18 CEST
- **Execution boundary:** Stage 4 only

## Executive summary

Stage 4 completed successfully. Docker Engine, the Docker CLI, containerd, Buildx, and the Docker Compose plugin were installed from Docker's official Ubuntu `resolute/stable` apt repository. Docker and containerd are active, enabled, and healthy after a controlled reboot. No pre-existing runtime, container data, application state, or conflicting package was present or overwritten.

Docker Engine 29.6.2, containerd 2.2.6, Buildx 0.35.0, and Compose 5.3.1 passed version and daemon checks. The daemon uses the default `/var/lib/docker` data root, the `overlayfs` containerd snapshotter, systemd cgroups, AppArmor, seccomp, and the `json-file` logging driver. Container logs are bounded at 10 MB per file and three files per container.

The `hello-world` execution test passed. A temporary Nginx Compose service responded on `127.0.0.1:18080`; `ss` confirmed a loopback-only listener, and independent MacBook tests against both server LAN addresses timed out. The test container, Compose network, volumes, port binding, and temporary Compose directory were removed. Two downloaded test images remain, using approximately 94 MB; no destructive image prune was run.

Docker enabled IPv4 forwarding and created its expected IPv4/IPv6 firewall chains. IPv6 forwarding remains disabled, `DOCKER-USER` remains empty, and no production filtering policy was invented. The two Stage 3 SSH UFW rules remain unchanged. No container port is published after cleanup or reboot.

The active kernel remains `7.1.3-1-t2-resolute`; Apple/T2 packages are unchanged; Ethernet remains the preferred outbound route; both key-only SSH aliases work after reboot; package integrity passes; Docker logged no boot warning or error; and zero system units are failed. No Gym Tracker, PostgreSQL, monitoring, reverse proxy, or application service was deployed. Wave B was not started.

## Pre-existing runtime audit

The preflight observed:

- Ubuntu 26.04 LTS, codename `resolute`;
- architecture `amd64`;
- active kernel `7.1.3-1-t2-resolute`;
- approximately 416 GB available on the root filesystem;
- approximately 29 GiB memory available;
- no failed system unit;
- valid SSH configuration and both key-only aliases working;
- the intended Stage 3 UFW rules only;
- Ethernet as the preferred route;
- `/dev/null` as a healthy root-owned `1:3` character device with mode `0666`.

No executable or package match existed for:

```text
docker
podman
containerd
runc
```

The `docker.service` and `containerd.service` units did not exist. The following paths were absent:

```text
/var/lib/docker
/var/lib/containerd
/etc/docker
/etc/docker/daemon.json
/etc/apt/keyrings/docker.asc
/etc/apt/sources.list.d/docker.sources
```

The `docker` group did not exist. No existing image, container, volume, network, runtime configuration, or data root needed preservation or migration.

## Packages removed or retained

No package was removed or purged.

The reviewed simulation proposed:

```text
0 upgraded
7 newly installed
0 removed
16 not upgraded
```

The five requested Docker platform packages brought two reviewed additions:

- `docker-ce-rootless-extras`, recommended by Docker CE but not configured for rootless operation;
- `pigz`, Ubuntu's parallel gzip implementation used during image operations.

`dkms` remains installed despite apt reporting it as automatically installed and no longer required. No `autoremove` was run. The 16 unrelated available or phased package updates were not combined with Stage 4. No T2, firmware, kernel, OpenSSH, UFW, NetworkManager, boot, or EFI package was removed or replaced.

## Docker apt source

Prerequisites were already installed:

```text
ca-certificates 20260601~26.04.1
curl            8.18.0-1ubuntu2.3
```

Docker's public signing key was downloaded over HTTPS from:

```text
https://download.docker.com/linux/ubuntu/gpg
```

Observed public-key fingerprint:

```text
9DC8 5822 9FC7 DD38 854A E2D8 8D81 803C 0EBF CD88
```

The root-owned mode `0644` key is stored at:

```text
/etc/apt/keyrings/docker.asc
```

The root-owned mode `0644` deb822 source is:

```text
/etc/apt/sources.list.d/docker.sources
```

Content:

```text
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: resolute
Components: stable
Architectures: amd64
Signed-By: /etc/apt/keyrings/docker.asc
```

`apt-get update` downloaded Docker's signed `resolute` InRelease and stable `amd64` package index without signature, release, or transport error. Pre-install and post-reboot `apt-cache policy` resolved every installed Docker platform package to `https://download.docker.com/linux/ubuntu resolute/stable amd64`.

Inspecting the public key with GnuPG created a new `/root/.gnupg` containing only the generated public keybox and trust database. Those inspection-only files and the empty directory were removed after confirming no unknown state existed. The public apt keyring remained in its intended location.

## Installed package versions

Final installed packages:

| Package | Version | Origin |
|---|---|---|
| `docker-ce` | `5:29.6.2-1~ubuntu.26.04~resolute` | Docker official repository |
| `docker-ce-cli` | `5:29.6.2-1~ubuntu.26.04~resolute` | Docker official repository |
| `containerd.io` | `2.2.6-1~ubuntu.26.04~resolute` | Docker official repository |
| `docker-buildx-plugin` | `0.35.0-1~ubuntu.26.04~resolute` | Docker official repository |
| `docker-compose-plugin` | `5.3.1-1~ubuntu.26.04~resolute` | Docker official repository |
| `docker-ce-rootless-extras` | `5:29.6.2-1~ubuntu.26.04~resolute` | Docker official repository |
| `pigz` | `2.8-1build1` | Ubuntu Resolute |

Reported component versions:

```text
Docker client and server  29.6.2, API 1.55
containerd                2.2.6
runc                      1.3.6
docker-init               0.19.0
Docker Buildx             0.35.0
Docker Compose            5.3.1
```

## Docker and containerd service state

Before and after reboot:

```text
docker.service      active, enabled
docker.socket       active, enabled
containerd.service  active, enabled
```

The package-owned unit files are under `/usr/lib/systemd/system/`, with standard enablement links created under `/etc/systemd/system/`. Docker's local API uses the default Unix socket; no TCP daemon socket or remote Docker API listener was configured.

Post-reboot `docker info` reported:

- zero containers;
- two test images;
- `overlayfs` with the containerd snapshotter;
- systemd cgroup driver and cgroup v2;
- AppArmor, seccomp, and cgroup namespaces enabled;
- swarm inactive;
- default runtime `runc`;
- default data root `/var/lib/docker`;
- iptables firewall backend;
- experimental mode disabled.

The current-boot Docker journal contained no warning, error, critical, alert, or emergency entry.

## Docker privilege model

The Stage 4 privilege policy is:

```text
Use sudo for Docker daemon operations.
Do not add admin-gym to the docker group.
```

The package created an empty group:

```text
docker:x:973:
```

`admin-gym` is not a member. This remained true after reboot, and unprivileged `docker ps` failed as expected. The user was not granted root-equivalent daemon access silently. Rootless Docker was not configured despite installation of the optional support package.

## daemon.json configuration

Created as root-owned mode `0644`:

```text
/etc/docker/daemon.json
```

Content:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Validation passed with both:

```bash
python3 -m json.tool /etc/docker/daemon.json
dockerd --validate --config-file=/etc/docker/daemon.json
```

Docker restarted successfully with the file and remained healthy after reboot. The Compose test container's effective log configuration independently reported `json-file`, `max-size=10m`, and `max-file=3`.

No `iptables`, `ip6tables`, data-root, remote listener, registry mirror, or live-restore override was added. In particular, firewall management was not disabled.

## hello-world result

`docker run --rm hello-world` pulled `hello-world:latest` from Docker Hub, created an `amd64` container, executed it successfully, printed Docker's success message, and removed the container.

The image remains available locally. There is no stopped `hello-world` container because `--rm` was used.

## Compose loopback-port test

A temporary Compose file outside the repository defined one `nginx:alpine` service with:

```yaml
ports:
  - "127.0.0.1:18080:80"
restart: "no"
```

Verification while running:

- `docker compose up -d` completed successfully;
- the container was healthy enough to serve the default Nginx page;
- `curl http://127.0.0.1:18080/` matched the expected response;
- Compose reported `127.0.0.1:18080->80/tcp`;
- `ss` showed `docker-proxy` listening only on `127.0.0.1:18080`;
- Docker's NAT rule matched destination `127.0.0.1/32` only;
- a MacBook request to `192.168.1.57:18080` timed out;
- a MacBook request to `192.168.86.178:18080` timed out;
- the container inherited the configured 10 MB × 3-file JSON log policy.

Cleanup used `docker compose down --volumes --remove-orphans`, then removed the known Compose file and empty temporary directory. Final state before and after reboot:

```text
containers:      0
custom networks: 0
local volumes:   0
port 18080:      no listener
```

The standard Docker `bridge`, `host`, and `none` networks remain as expected.

## Firewall and packet-forwarding findings

Before Docker:

```text
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0
```

After Docker installation and after reboot:

```text
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 0
```

Docker created its expected iptables chains, including `DOCKER`, `DOCKER-BRIDGE`, `DOCKER-CT`, `DOCKER-FORWARD`, `DOCKER-INTERNAL`, and `DOCKER-USER`, plus matching IPv6 chain structure. The `FORWARD` path enters `DOCKER-USER` before Docker forwarding chains. `DOCKER-USER` is intentionally empty because Wave A has no approved production container-port policy.

While the Compose test ran, Docker created a loopback-specific DNAT rule for port 18080 and forwarding state for the temporary bridge. After cleanup and after reboot, the test bridge and DNAT rule were absent. Only the default `docker0` masquerade rule remained. `docker0` had `172.17.0.1/16` and was down with no container attached.

UFW remained active with low logging and these only explicit inbound rules:

```text
22/tcp on enp4s0 from 192.168.1.0/24
22/tcp on wlp3s0 from 192.168.86.0/24
```

With forwarding now active, UFW reports routed traffic as `deny` rather than `disabled`; its intended deny policy remains. No UFW application or Docker port rule was added.

Docker-published ports can traverse Docker-managed forwarding before ordinary UFW expectations apply. Later stages must bind ports deliberately and add reviewed Docker-aware policy when external publication is approved. UFW alone must not be treated as protection for a published container port.

All post-reboot listeners are accounted for:

| Protocol/address | Port | Process | Explanation |
|---|---:|---|---|
| TCP `0.0.0.0`, `[::]` | 22 | `sshd` and systemd | SSH, restricted by the Stage 3 UFW rules |
| UDP `0.0.0.0`, `[::]` | 5353 | `avahi-daemon` | Existing multicast DNS/service discovery |
| TCP/UDP loopback | 53 | `systemd-resolved` | Local DNS stub resolver |
| UDP loopback | 323 | `chronyd` | Local chrony control socket |
| TCP loopback | 631 | `cupsd` | Local-only printing service |

No Docker proxy, application, database, HTTP, HTTPS, dashboard, metrics, or unexpected high-port listener remained.

## Docker disk usage

Final Docker accounting:

```text
Images          2 total, 0 active, 93.61 MB
Containers      0
Local volumes   0
Build cache     0
```

Filesystem-level use:

```text
/var/lib/docker      240 KB
/var/lib/containerd   90 MB
root filesystem      416 GB available, 5% used
```

The retained images are `hello-world:latest` and `nginx:alpine`. They are small, known Stage 4 artifacts and can support later smoke checks. No `docker system prune`, image deletion, volume deletion outside the known Compose project, or data-root movement was performed.

## Reboot verification

Pre-reboot boot ID:

```text
de193bb7-57e5-41d2-9602-e0f923f5f041
```

Post-reboot boot ID:

```text
c3a9f304-d89e-4210-9ea7-de5a80a310aa
```

The new boot began at 2026-07-21 14:15:06 CEST. After startup:

- `ssh gym-prod` passed with the key over Ethernet;
- `ssh gym-prod-wifi` passed with the key over Wi-Fi;
- SSH was active and enabled;
- Docker, Docker socket activation, and containerd were active and enabled;
- Docker Engine, Compose, and Buildx returned their installed versions;
- daemon JSON validation passed;
- zero containers, custom networks, and local volumes existed;
- port 18080 was absent;
- no unintended listener existed;
- IPv4 forwarding and Docker chains persisted;
- IPv6 forwarding remained disabled;
- UFW retained the two intended SSH rules;
- Ethernet remained the preferred outbound path;
- the active T2 kernel and relevant packages were unchanged;
- `/dev/null` remained the correct `1:3` character device;
- `dpkg --audit` and `apt-get check` passed;
- zero units were failed;
- Docker logged no warning-or-higher event in the new boot.

## Configuration files created or changed

Created deliberately:

```text
/etc/apt/keyrings/docker.asc
/etc/apt/sources.list.d/docker.sources
/etc/docker/daemon.json
```

Created or managed by the installed packages:

```text
/usr/lib/systemd/system/docker.service
/usr/lib/systemd/system/docker.socket
/usr/lib/systemd/system/containerd.service
/etc/systemd/system/multi-user.target.wants/docker.service
/etc/systemd/system/multi-user.target.wants/containerd.service
/etc/systemd/system/sockets.target.wants/docker.socket
/var/lib/docker
/var/lib/containerd
docker group entry with no members
```

Docker also manages runtime interfaces, routes, sysctls, sockets, and iptables/ip6tables chains while the daemon is active. No manual NetworkManager, UFW rule, SSH, T2, kernel, firmware, bootloader, Docker data-root, router, DNS, application, database, reverse-proxy, or monitoring configuration was changed.

The public-key inspection-only `/root/.gnupg` directory was removed after confirming it contained no unrelated state. Stage 4 execution helpers and raw transcripts were kept outside the repository and removed during final handoff cleanup.

## Deviations and deferred decisions

No unresolved Stage 4 failure remains.

Documented deviations and deferred work:

1. Docker's current repository candidate was Engine 29.6.2 rather than the earlier example version in Docker documentation; apt origin and compatibility were verified live.
2. Docker's default recommendations added `docker-ce-rootless-extras` and `pigz`. Rootless mode was not enabled.
3. Sixteen unrelated package updates were available but not applied. Stage 4 installed only the reviewed Docker transaction.
4. `dkms` remains installed and no `autoremove` was run.
5. Docker enabled IPv4 forwarding and created standard firewall chains. No speculative production `DOCKER-USER` policy was created before application port requirements exist.
6. The two test images were retained; no destructive prune was needed or authorized.
7. `admin-gym` remains outside the Docker group. Any future membership change requires explicit approval because daemon access is root-equivalent.
8. Live restore, rootless Docker, IPv6 container networking, remote Docker API access, registry mirrors, alternate runtimes, and a moved data root remain unconfigured.
9. Application deployment, persistent production networks/volumes, PostgreSQL, reverse proxy, monitoring, domains, HTTPS, VPN, tunnels, backups, and external port policy belong to later separately approved work.
10. Existing Avahi and CUPS services remain documented but were not removed.

## Exact commands executed

Commands were run through the established SSH aliases. Privileged helpers were transferred as temporary files and invoked with `sudo` only in the administrator's visible SSH terminal. The sudo password was entered directly by the administrator and was never transmitted through chat, stored, or included in output.

Preflight and conflict inspection:

```bash
cat /etc/os-release
dpkg --print-architecture
uname -r
df -h /
free -h
command -v docker podman containerd runc
dpkg-query -W '<docker, containerd, runc, and podman package patterns>'
systemctl status docker --no-pager
systemctl status containerd --no-pager
stat /var/lib/docker /var/lib/containerd /etc/docker /etc/docker/daemon.json
find /var/lib/docker /var/lib/containerd -mindepth 1 -maxdepth 2
id admin-gym
getent group docker
dpkg --audit
apt-get check
ss -lntup
ufw status verbose
ip route get 1.1.1.1
sysctl net.ipv4.ip_forward net.ipv6.conf.all.forwarding
```

Repository creation and transaction review:

```bash
apt-get update
dpkg-query -W ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl --proto '=https' --tlsv1.2 -fsSL \
  https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc.stage4
gpg --show-keys --with-fingerprint /etc/apt/keyrings/docker.asc.stage4
install -o root -g root -m 0644 \
  /etc/apt/keyrings/docker.asc.stage4 \
  /etc/apt/keyrings/docker.asc
unlink /etc/apt/keyrings/docker.asc.stage4
install -o root -g root -m 0644 /dev/null \
  /etc/apt/sources.list.d/docker.sources
apt-get update
apt-cache policy docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
apt-get -s install docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
```

Reviewed installation, service verification, and daemon configuration:

```bash
DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=l \
  apt-get -y -o Dpkg::Options::=--force-confold install \
  docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
dpkg --audit
apt-get check
systemctl enable --now containerd
systemctl enable --now docker
systemctl is-active docker containerd
systemctl is-enabled docker containerd
docker version
docker info
docker compose version
docker buildx version
id admin-gym
getent group docker
install -o root -g root -m 0755 -d /etc/docker
install -o root -g root -m 0644 /dev/null /etc/docker/daemon.json
python3 -m json.tool /etc/docker/daemon.json
dockerd --validate --config-file=/etc/docker/daemon.json
systemctl restart docker
```

Runtime and loopback-only Compose tests:

```bash
docker run --rm hello-world
install -o root -g root -m 0755 -d /tmp/gym-stage4-compose-test
docker compose -f /tmp/gym-stage4-compose-test/compose.yaml up -d
docker compose -f /tmp/gym-stage4-compose-test/compose.yaml ps
curl -fsS http://127.0.0.1:18080/
ss -lntp
docker inspect --format '{{json .HostConfig.LogConfig}}' \
  gym-stage4-compose-test-test-1
curl --connect-timeout 3 http://192.168.1.57:18080/
curl --connect-timeout 3 http://192.168.86.178:18080/
sysctl net.ipv4.ip_forward net.ipv6.conf.all.forwarding
iptables -S
iptables -S DOCKER-USER
iptables -t nat -S
ip6tables -S
ufw status verbose
```

Controlled test cleanup and pre-reboot verification:

```bash
docker compose -f /tmp/gym-stage4-compose-test/compose.yaml \
  down --volumes --remove-orphans
unlink /tmp/gym-stage4-compose-test/compose.yaml
rmdir /tmp/gym-stage4-compose-test
docker ps -a
docker network ls
docker volume ls
docker system df
du -sh /var/lib/docker /var/lib/containerd
df -h /
ss -lntup
iptables -S DOCKER-USER
iptables -t nat -S
ip6tables -S DOCKER-USER
ufw status verbose
sshd -t
systemctl is-active ssh docker containerd
systemctl is-enabled ssh docker containerd
ip route get 1.1.1.1
dpkg --audit
apt-get check
systemctl --failed --no-pager
unlink /root/.gnupg/pubring.kbx
unlink /root/.gnupg/trustdb.gpg
rmdir /root/.gnupg
```

Reboot and post-reboot verification:

```bash
cat /proc/sys/kernel/random/boot_id
uptime -s
sudo reboot
ssh gym-prod
ssh gym-prod-wifi
systemctl is-active ssh docker containerd docker.socket
systemctl is-enabled ssh docker containerd docker.socket
docker version
docker info
docker compose version
docker buildx version
docker ps -a
docker network ls
docker volume ls
docker image ls
docker system df
dockerd --validate --config-file=/etc/docker/daemon.json
ss -lntup
sysctl net.ipv4.ip_forward net.ipv6.conf.all.forwarding
iptables -S DOCKER-USER
iptables -t nat -S
ip6tables -S DOCKER-USER
ufw status verbose
nmcli device status
ip -4 -br address
ip route get 1.1.1.1
dpkg-query -W '<recorded T2 packages>'
dpkg --audit
apt-get check
systemctl --failed --no-pager
journalctl -u docker -b -p warning..alert --no-pager
```

No package removal, `autoremove`, Docker prune, Docker-group membership change, public port publication, remote Docker API, application deployment, private key, password, token, MAC address, sensitive IPv6 address, or secret value was introduced.

## Wave A completion assessment

All four Wave A execution stages now have reports:

```text
01-host-baseline-audit-report.md
02-os-admin-foundation-report.md
03-access-network-hardening-report.md
04-docker-platform-report.md
```

The Wave A technical outcome is satisfied:

- the host is audited and documented;
- Ubuntu maintenance and essential administration tooling are established;
- T2 kernel and hardware support are preserved;
- time, logs, TRIM, unattended security updates, and sleep prevention are verified;
- SSH is key-only and restricted to `admin-gym`;
- UFW permits SSH only through the two intended local paths;
- Ethernet is primary and Wi-Fi remains a tested fallback;
- Docker Engine, containerd, Buildx, and Compose are installed and verified;
- container log growth is bounded;
- Docker firewall and forwarding effects are documented;
- no test container, custom network, local volume, temporary Compose file, or published port remains;
- no Gym Tracker application, database, monitoring stack, production secret, or public service was deployed.

Wave A execution is complete pending review and acceptance of this report. Do not begin Wave B merely because its planning documents exist. Wave B requires separate authorization and must define filesystem ownership, repository access, secrets, persistent data, PostgreSQL, application deployment, reverse proxy, private LAN exposure, and Docker-aware port policy deliberately.

The existing documentation path mismatches remain noted but unrepaired: the factual status handoff is under `docs/status/`, and the actual Wave A directory is `wave-a-host-fundation`. Updating the setup index and stage-status table should occur only after Stage 4 and Wave A are reviewed and accepted.
