# Stage 4 — Docker Platform

## Objective

Install and validate Docker Engine, Buildx, and the Docker Compose plugin as the server’s container foundation.

Do not deploy the Gym Tracker in this stage.

## Dependencies

Stages 1–3 must be complete and reviewed.

Required inputs:

- [`../reports/01-host-baseline-audit-report.md`](../reports/01-host-baseline-audit-report.md)
- [`../reports/02-os-admin-foundation-report.md`](../reports/02-os-admin-foundation-report.md)
- [`../reports/03-access-network-hardening-report.md`](../reports/03-access-network-hardening-report.md)

---

## Scope

- inspect for conflicting or existing container runtimes;
- install Docker Engine from Docker’s official Ubuntu apt repository;
- install Docker CLI, containerd, Buildx, and Compose plugin;
- enable and verify Docker services;
- configure bounded container log rotation;
- decide and document Docker CLI privilege model;
- test image pulling and container execution;
- test a loopback-only published port;
- inspect Docker firewall and forwarding effects;
- remove test containers;
- reboot and verify persistence;
- produce the Stage 4 report.

---

## Explicitly out of scope

Do not:

- deploy the Gym Tracker;
- clone the application repository;
- create PostgreSQL, Prometheus, Grafana, or application containers;
- expose a container port on `0.0.0.0`, `::`, `192.168.1.57`, or `192.168.86.178`;
- create production Docker networks or volumes;
- move Docker’s data root;
- disable Docker firewall management;
- set `"iptables": false` or `"ip6tables": false`;
- create public firewall rules;
- add reverse proxy, domain, HTTPS, VPN, or tunnel configuration;
- destroy pre-existing Docker data;
- install Docker Desktop or use the convenience installation script.

---

## Current platform requirement

The host is expected to be:

```text
Ubuntu 26.04 LTS
x86_64 / amd64
```

Docker currently supports the official Ubuntu 26.04 release through its apt repository, but Codex must still inspect the host codename and repository output rather than hard-code assumptions.

---

## Safety constraints

- Stop if an existing Docker installation, images, volumes, or containers are found unexpectedly.
- Do not purge `/var/lib/docker` or `/var/lib/containerd`.
- Review packages before removing conflicts.
- Published Docker ports can bypass assumptions based on UFW.
- During Wave A, publish test ports only to `127.0.0.1`.
- Do not add `admin-gym` to the `docker` group silently; membership is effectively root-equivalent.
- Preserve SSH access and T2 support.
- Validate JSON before restarting Docker.

---

## Implementation steps

### 1. Preflight inspection

Run:

```bash
cat /etc/os-release
dpkg --print-architecture
uname -r
df -h /
free -h
```

Expected architecture:

```text
amd64
```

Inspect existing runtimes and packages:

```bash
command -v docker || true
command -v podman || true
command -v containerd || true
command -v runc || true

dpkg-query -W -f='${Package}\t${Version}\n' 2>/dev/null \
  | grep -E '^(docker|containerd|runc|podman)' \
  | sort || true

sudo systemctl status docker --no-pager 2>&1 || true
sudo systemctl status containerd --no-pager 2>&1 || true
sudo ls -la /var/lib/docker 2>/dev/null || true
sudo ls -la /var/lib/containerd 2>/dev/null || true
```

If meaningful pre-existing data exists, stop and report.

### 2. Review conflicting packages

Potential conflicts include:

```text
docker.io
docker-compose
docker-compose-v2
docker-doc
podman-docker
containerd
runc
```

List installed matches first.

Remove only confirmed conflicting packages and only when there is no pre-existing state to preserve.

Do not use a broad purge command without reviewing its exact transaction.

Example review:

```bash
sudo apt-get -s remove \
  docker.io docker-compose docker-compose-v2 docker-doc \
  podman-docker containerd runc
```

If none are installed, no removal is required.

### 3. Add Docker’s official apt key

Ensure prerequisites:

```bash
sudo apt update
sudo apt install ca-certificates curl
```

Create the keyring directory:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
```

Download Docker’s official signing key:

```bash
sudo curl -fsSL \
  https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
```

Make it readable by apt:

```bash
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

Record the key fingerprint or package-source verification in the report.

### 4. Add Docker’s official apt source

Create:

```text
/etc/apt/sources.list.d/docker.sources
```

Using:

```bash
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

Then:

```bash
sudo apt update
apt-cache policy docker-ce
```

Confirm that:

- the suite matches the actual Ubuntu codename;
- packages come from Docker’s official repository;
- apt reports no signature errors.

### 5. Install Docker Engine and plugins

Review the proposed transaction:

```bash
sudo apt-get -s install \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin
```

Then install:

```bash
sudo apt install \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin
```

### 6. Verify services and versions

Run:

```bash
sudo systemctl enable --now docker
sudo systemctl enable --now containerd

systemctl is-active docker
systemctl is-enabled docker
systemctl is-active containerd
systemctl is-enabled containerd

sudo docker version
sudo docker info
sudo docker compose version
sudo docker buildx version
```

Record exact versions.

### 7. Choose the Docker privilege model

Default Wave A policy:

```text
Use sudo for Docker commands.
Do not add admin-gym to the docker group automatically.
```

Reason:

- access to the Docker daemon is effectively root-level access.

Verify current membership:

```bash
id admin-gym
getent group docker
```

If the user later explicitly approves Docker-group membership:

```bash
sudo usermod -aG docker admin-gym
```

The user must log out and back in before it applies. This is not the default action in this stage.

### 8. Configure container log rotation

Inspect existing daemon configuration:

```bash
sudo test -f /etc/docker/daemon.json \
  && sudo cat /etc/docker/daemon.json \
  || echo "No existing daemon.json"
```

Do not overwrite unknown existing settings.

Create or merge:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Recommended file:

```text
/etc/docker/daemon.json
```

Validate JSON:

```bash
sudo python3 -m json.tool /etc/docker/daemon.json >/dev/null
```

Validate Docker daemon configuration when supported:

```bash
sudo dockerd --validate --config-file=/etc/docker/daemon.json
```

Restart:

```bash
sudo systemctl restart docker
systemctl is-active docker
```

Do not add:

```json
"iptables": false
```

Docker bridge networking depends on Docker-managed firewall rules unless a complete replacement design exists.

### 9. Run the standard execution test

Run:

```bash
sudo docker run --rm hello-world
```

This verifies:

- daemon access;
- registry access;
- image download;
- container creation;
- process execution;
- cleanup.

### 10. Test Compose

Create a temporary directory outside the repository:

```bash
tmpdir="$(mktemp -d)"
cd "$tmpdir"
```

Create `compose.yaml`:

```yaml
services:
  test:
    image: nginx:alpine
    ports:
      - "127.0.0.1:18080:80"
    restart: "no"
```

Start:

```bash
sudo docker compose up -d
```

Verify:

```bash
sudo docker compose ps
curl -fsS http://127.0.0.1:18080/ >/dev/null
sudo ss -lntp | grep 18080
```

The port must be bound only to:

```text
127.0.0.1:18080
```

It must not be bound to:

```text
0.0.0.0:18080
[::]:18080
192.168.1.57:18080
192.168.86.178:18080
```

Remove:

```bash
sudo docker compose down --volumes --remove-orphans
cd /
rm -rf "$tmpdir"
```

### 11. Inspect Docker networking and firewall effects

Run:

```bash
sysctl net.ipv4.ip_forward
sysctl net.ipv6.conf.all.forwarding

sudo iptables -S
sudo iptables -S DOCKER-USER 2>/dev/null || true
sudo iptables -t nat -S
sudo ip6tables -S

sudo ufw status verbose
sudo ss -lntup
```

Document:

- whether Docker enabled IPv4 forwarding;
- Docker-created chains;
- current `DOCKER-USER` state;
- confirmation that no test port remains exposed;
- confirmation that SSH UFW rules remain intact.

Important policy for later waves:

> Do not rely on UFW alone to protect a Docker-published port. Bind ports explicitly to localhost or a deliberate host address, and define Docker-aware filtering when external publication is introduced.

Do not create a speculative `DOCKER-USER` production policy in Wave A because no application port policy exists yet.

### 12. Inspect disk use

Run:

```bash
sudo docker system df
sudo du -sh /var/lib/docker /var/lib/containerd 2>/dev/null
df -h /
```

Do not run destructive prune commands.

### 13. Pre-reboot verification

Run:

```bash
systemctl is-active docker
systemctl is-enabled docker
systemctl is-active containerd
systemctl is-enabled containerd
sudo docker ps -a
sudo docker system df
sudo ufw status
systemctl is-active ssh
ip route get 1.1.1.1
```

There should be no running test container.

### 14. Controlled reboot

Run:

```bash
sudo reboot
```

Reconnect:

```bash
ssh gym-prod
```

Keep the fallback alias available:

```bash
ssh gym-prod-wifi
```

### 15. Post-reboot verification

Run:

```bash
hostname
uname -r
systemctl is-active ssh
sudo ufw status
systemctl is-active docker
systemctl is-enabled docker
systemctl is-active containerd
systemctl is-enabled containerd
sudo docker version
sudo docker info
sudo docker compose version
sudo docker buildx version
sudo docker ps -a
sudo docker system df
sudo ss -lntup
ip route get 1.1.1.1
```

Optionally rerun:

```bash
sudo docker run --rm hello-world
```

Confirm T2 kernel and networking remain intact.

---

## Rollback and recovery

### Docker fails to start after daemon configuration

Inspect:

```bash
sudo journalctl -u docker -n 200 --no-pager
sudo dockerd --validate --config-file=/etc/docker/daemon.json
```

Restore the previous `daemon.json` or remove only the new file, then:

```bash
sudo systemctl restart docker
```

### Repository configuration fails

Remove only the newly created Docker source/key files:

```text
/etc/apt/sources.list.d/docker.sources
/etc/apt/keyrings/docker.asc
```

Then:

```bash
sudo apt update
```

Do not remove unrelated apt sources.

### SSH or networking fails after reboot

Try:

```bash
ssh gym-prod-wifi
```

Docker installation must not be “fixed” by resetting router/network configuration.

---

## Required report

Create:

```text
docs/server/reports/04-docker-platform-report.md
```

Include:

```markdown
# Stage 4 Docker Platform Report

## Executive summary
## Pre-existing runtime audit
## Packages removed or retained
## Docker apt source
## Installed package versions
## Docker and containerd service state
## Docker privilege model
## daemon.json configuration
## hello-world result
## Compose loopback-port test
## Firewall and packet-forwarding findings
## Docker disk usage
## Reboot verification
## Configuration files created or changed
## Deviations and deferred decisions
## Exact commands executed
## Wave A completion assessment
```

---

## Completion criteria

Stage 4 is complete only when:

- no pre-existing container state was overwritten;
- Docker packages come from the intended official repository;
- Docker and containerd are active and enabled;
- Engine, Compose, and Buildx report valid versions;
- log rotation is configured and valid;
- privilege model is explicit;
- `hello-world` succeeds;
- Compose succeeds with a loopback-only test port;
- all test containers, networks, volumes, and temporary files are removed;
- Docker firewall behavior is documented;
- no unintended listening port exists;
- SSH, UFW, T2 kernel, Ethernet, and fallback access survive reboot;
- the Stage 4 report is complete.

---

## Stop conditions

Stop and report if:

- meaningful existing Docker data is found;
- Docker packages would replace critical T2 or networking packages;
- apt repository validation fails;
- Docker cannot start with a valid default configuration;
- the test port is reachable beyond loopback;
- SSH/UFW rules are disrupted;
- reboot breaks T2 kernel, network, or remote access;
- cleanup cannot return the host to a no-test-container state.

Do not begin Wave B.
