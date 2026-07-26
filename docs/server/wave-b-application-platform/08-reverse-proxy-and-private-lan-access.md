# Stage 8 — Reverse Proxy and Private LAN Access

## Objective

Provide one controlled private LAN entry point for the Gym Tracker while keeping PostgreSQL, Fastify, and internal service ports private.

Verify the complete application from the MacBook and phone.

No public internet exposure is permitted in this stage.

---

## Dependencies

Stage 7 must be complete and reviewed.

Required inputs:

- [`../reports/07-gym-tracker-deployment-report.md`](../reports/07-gym-tracker-deployment-report.md)
- confirmed web and API service names and ports;
- confirmed Next.js BFF behavior;
- working Ethernet address `192.168.1.57`;
- tested primary and fallback SSH access;
- Docker firewall findings from Wave A.

---

## Scope

- select and pin a reverse-proxy image;
- add the proxy to the single Compose project;
- preserve the Next.js BFF as the browser-facing boundary;
- bind one HTTP entry point to the Ethernet address only;
- configure proxy headers, timeouts, request limits, and logs;
- configure Docker-aware firewall controls;
- remove unnecessary temporary test publications;
- test from server, MacBook, and phone;
- verify authentication, cookies, and mobile behavior;
- verify internal ports remain unreachable;
- verify restart and reboot behavior;
- produce the Stage 8 report.

---

## Explicitly out of scope

Do not:

- expose the application publicly;
- configure router port forwarding;
- create public DNS;
- configure public HTTPS or Let’s Encrypt;
- add HSTS over HTTP;
- configure Cloudflare Tunnel, Tailscale, VPN, or zero-trust access;
- expose Grafana, Prometheus, PostgreSQL, or Fastify;
- bind the proxy to all IPv4 or IPv6 interfaces;
- publish the application on the Wi-Fi interface without separate review;
- begin Wave C;
- change Google Nest or Fiber Box topology.

---

## Preferred proxy

Preferred default:

```text
Caddy
```

Reasons:

- concise configuration;
- straightforward reverse proxying;
- simple future migration to HTTPS;
- good forwarded-header behavior;
- clear configuration validation.

Reuse an existing reviewed proxy configuration if the repository already contains one.

Do not deploy multiple reverse proxies.

---

## Target request flow

```text
Client browser
    |
    v
Caddy on 192.168.1.57:80
    |
    v
Next.js web service
    |
    v
Next.js BFF routes
    |
    v
Fastify API
    |
    v
PostgreSQL
```

Fastify should not be directly browser-accessible when the BFF is designed to handle authentication and cookie forwarding.

---

## Network policy

Initial private entry point:

```text
http://192.168.1.57/
```

Publish only:

```text
192.168.1.57:80
```

Do not publish:

```text
0.0.0.0:80
[::]:80
192.168.86.178:80
```

Google Nest clients may reach `192.168.1.57` through the existing routed topology.

The source address observed by the server may be the Google Nest router’s upper-network address rather than the original client address. Verify rather than assume.

---

## Docker firewall warning

Docker-published ports can bypass normal assumptions about UFW because Docker creates packet-filtering rules.

Stage 8 must therefore use:

1. explicit binding to `192.168.1.57`;
2. one published proxy service only;
3. inspection of Docker-generated rules;
4. deliberate `DOCKER-USER` filtering where required;
5. tests from intended and unintended paths.

Do not rely on `ufw allow 80` alone.

---

## Implementation steps

### 1. Inspect current listeners and publications

Run:

```bash
cd /srv/gym-tracker/deploy/compose

sudo docker compose ps
sudo docker compose config
sudo ss -lntup
sudo iptables -S DOCKER-USER 2>/dev/null || true
sudo iptables -t nat -S
sudo ufw status verbose
```

Confirm:

- PostgreSQL has no published port;
- API and web test ports are loopback-only;
- no reverse proxy already conflicts with port 80;
- SSH rules remain intact.

### 2. Select and pin the proxy image

Select a stable Caddy image tag or digest.

Do not use:

```text
caddy:latest
```

Pull and record the digest:

```bash
sudo docker pull 'caddy:<selected-tag>'

sudo docker image inspect 'caddy:<selected-tag>' \
  --format '{{index .RepoDigests 0}}'
```

### 3. Create proxy configuration

Preferred path:

```text
/srv/gym-tracker/deploy/config/caddy/Caddyfile
```

Create:

```bash
install -d -m 0750 \
  /srv/gym-tracker/deploy/config/caddy
```

Initial HTTP-only pattern:

```caddyfile
:80 {
    encode zstd gzip

    request_body {
        max_size 10MB
    }

    reverse_proxy web:<web-container-port>

    header {
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
        -Server
    }

    log {
        output stdout
        format json
    }
}
```

Adapt:

- web service name;
- web container port;
- request-size needs;
- application-specific headers.

Do not add HSTS over HTTP.

Do not route browser API paths directly to Fastify unless repository inspection proves this is required.

Validate before deployment:

```bash
sudo docker run --rm \
  -v /srv/gym-tracker/deploy/config/caddy/Caddyfile:/etc/caddy/Caddyfile:ro \
  'caddy:<selected-tag>' \
  caddy validate --config /etc/caddy/Caddyfile
```

### 4. Add the proxy service

Add `proxy` to the existing Compose project.

Requirements:

- pinned image;
- frontend network only;
- read-only Caddyfile mount;
- optional persistent state under `/srv/gym-tracker/data/proxy`;
- restart policy;
- health check;
- publication only on the Ethernet address.

Required publication:

```yaml
ports:
  - "192.168.1.57:80:80"
```

Do not publish port 443 yet.

Do not join the database network.

### 5. Remove unnecessary temporary publications

Once the proxy reaches `web` internally:

- remove the web localhost publication if no longer operationally needed;
- remove the API localhost publication unless retained briefly for explicit debugging;
- keep internal Docker networks.

Validate:

```bash
sudo docker compose config
```

The only intended LAN-facing application publication should be:

```text
192.168.1.57:80
```

### 6. Start and validate locally

Run:

```bash
sudo docker compose up -d proxy web api
sudo docker compose ps
sudo docker compose logs --tail=200 proxy
```

From the server:

```bash
curl -v http://192.168.1.57/
curl -fsS http://192.168.1.57/ >/dev/null
```

Verify:

- application response;
- no redirect loop;
- correct forwarded headers;
- no direct API port dependency;
- JSON access logs;
- no secrets in logs.

### 7. Observe the real client source path

From the MacBook:

```bash
curl -v http://192.168.1.57/
```

On the server, inspect proxy logs and, if needed:

```bash
sudo tcpdump -ni enp4s0 'tcp port 80'
```

Record whether the observed source is:

- the MacBook’s original `192.168.86.x` address;
- the Google Nest router’s upstream `192.168.1.x` address;
- another routed or NAT address.

Stop packet capture after the test.

### 8. Establish Docker-aware filtering

Create an idempotent script:

```text
/srv/gym-tracker/scripts/apply-docker-firewall.sh
```

Policy:

- permit established and related traffic;
- permit TCP port 80 through `enp4s0` from the trusted upper LAN;
- deny other forwarded traffic to the published proxy port;
- preserve Docker’s required chains;
- avoid interference with container egress and internal networks;
- avoid blocking host SSH traffic.

Because Google Nest traffic may appear NATed on the upper network, the initial trusted source may be:

```text
192.168.1.0/24
```

Do not guess a narrower rule until the observed source is known.

The script must:

- check whether equivalent rules already exist;
- insert only required rules in `DOCKER-USER`;
- be safe to run repeatedly;
- support a check or status mode;
- contain comments;
- avoid flushing the chain.

Never run:

```bash
iptables -F
iptables -t nat -F
```

Do not disable Docker iptables management.

Persist the reviewed rules with the host’s chosen firewall-persistence method or a dedicated systemd oneshot unit ordered after Docker.

Persistence must be tested after reboot.

### 9. Retain UFW host policy

UFW continues to protect host services such as SSH.

Do not add broad UFW application rules when the service is Docker-published and controlled by explicit bind plus Docker-aware filtering.

Verify:

```bash
sudo ufw status verbose
sudo iptables -S DOCKER-USER
sudo iptables -t nat -S
sudo ss -lntup
```

### 10. Test from the MacBook

Open:

```text
http://192.168.1.57/
```

Verify:

- initial page;
- login;
- protected page;
- BFF-backed request;
- create, read, update, and delete only with disposable test data;
- logout;
- refresh after login;
- no CORS or origin errors;
- no direct Fastify URL visible to the browser.

Inspect browser developer tools for request host, response codes, cookies, redirects, and failed resources.

Do not record authentication cookies.

### 11. Test from the phone

Connect the phone to `Haag_74`.

Open:

```text
http://192.168.1.57/
```

Verify:

- page loads;
- mobile layout;
- login and logout;
- API-backed pages;
- active workout resume behavior where safe;
- no desktop-only localhost assumption.

Do not test from mobile data. Public access is out of scope.

### 12. Verify internal-port isolation

From the MacBook:

```bash
nc -vz 192.168.1.57 5432
nc -vz 192.168.1.57 <api-container-port>
nc -vz 192.168.1.57 <web-container-port>
```

Expected:

- port 80 succeeds;
- PostgreSQL fails;
- direct Fastify fails;
- direct Next.js fails when temporary publication is removed.

On the server:

```bash
sudo ss -lntup
sudo docker compose ps

sudo docker port \
  "$(sudo docker compose ps -q postgres)"

sudo docker port \
  "$(sudo docker compose ps -q api)"

sudo docker port \
  "$(sudo docker compose ps -q web)"

sudo docker port \
  "$(sudo docker compose ps -q proxy)"
```

Only the proxy should have a LAN publication.

### 13. Verify application security behavior

Confirm:

- production mode;
- no hard-coded Render URL;
- correct trusted proxy behavior;
- correct original host handling;
- no stack traces or secrets returned to clients;
- request-size limit works;
- appropriate security headers are present.

Because Wave B uses HTTP on a private LAN, cookie `Secure` behavior requires deliberate review.

Do not weaken the future public HTTPS configuration globally just to support private HTTP. Use an environment-specific LAN configuration.

### 14. Restart verification

Run:

```bash
sudo docker compose restart proxy web api
```

Verify:

```bash
curl -fsS http://192.168.1.57/ >/dev/null
sudo docker compose ps
```

Check logs for startup loops.

### 15. Reboot verification

Before reboot:

```bash
sudo docker compose ps
sudo ss -lntup
sudo iptables -S DOCKER-USER
```

Reboot:

```bash
sudo reboot
```

Reconnect:

```bash
ssh gym-prod
```

Verify:

```bash
cd /srv/gym-tracker/deploy/compose

sudo docker compose ps
curl -fsS http://192.168.1.57/ >/dev/null
sudo ss -lntup
sudo ufw status verbose
sudo iptables -S DOCKER-USER
```

Retest from MacBook and phone.

Firewall persistence is not proven until post-reboot rules match the reviewed policy.

### 16. Update deployment state

Update:

```text
/srv/gym-tracker/state/deployment.env
```

Add:

```text
LAN_URL=http://192.168.1.57/
PROXY_IMAGE=<pinned-image>
LAN_ENABLED_AT=<ISO-8601 timestamp>
```

Do not add credentials.

---

## Rollback and recovery

### Proxy configuration fails

Keep API, web, and PostgreSQL running.

Validate:

```bash
sudo docker compose logs --tail=300 proxy

sudo docker run --rm \
  -v /srv/gym-tracker/deploy/config/caddy/Caddyfile:/etc/caddy/Caddyfile:ro \
  'caddy:<selected-tag>' \
  caddy validate --config /etc/caddy/Caddyfile
```

Revert to the last valid Caddyfile.

### Firewall rules block application access

Keep the original SSH session open.

Inspect:

```bash
sudo iptables -S DOCKER-USER
sudo iptables -t nat -S
sudo ufw status verbose
```

Remove only newly added identified rules.

Do not flush Docker or UFW chains.

### LAN access works but authentication fails

Inspect:

- browser headers;
- cookie attributes;
- trusted proxy settings;
- BFF target;
- original host and protocol handling;
- API and web logs.

Do not expose Fastify directly as a shortcut.

### Reboot loses firewall policy

Stop or unpublish the proxy until persistence is corrected.

Do not leave the service broadly exposed.

---

## Required report

Create:

```text
docs/server/reports/08-reverse-proxy-and-private-lan-access-report.md
```

Include:

```markdown
# Stage 8 Reverse Proxy and Private LAN Access Report

## Executive summary
## Selected proxy image and digest
## Final request topology
## Proxy configuration
## Compose publication changes
## Observed Google Nest client source path
## UFW and DOCKER-USER policy
## Firewall-persistence method
## LAN URL
## MacBook functional tests
## Phone functional tests
## Authentication and cookie findings
## Internal-port isolation tests
## Security-header and request-limit checks
## Restart and reboot verification
## Files changed
## Deviations and deferred work
## Exact commands executed
## Wave B completion assessment
## Recommendations for Wave C
```

Do not include cookies, tokens, credentials, or user data.

---

## Completion criteria

Stage 8 is complete only when:

- one pinned reverse-proxy service exists;
- only the proxy is LAN-published;
- publication is bound to `192.168.1.57`;
- PostgreSQL and Fastify remain private;
- Docker-aware firewall policy is reviewed and persistent;
- the application works from MacBook and phone;
- authentication and BFF behavior work;
- no public access exists;
- restart and reboot tests pass;
- deployment state is updated;
- the report is complete.

---

## Stop conditions

Stop and report if:

- Docker-aware filtering cannot be made reliable;
- the proxy binds to all interfaces or IPv6 unexpectedly;
- PostgreSQL or Fastify becomes LAN-accessible;
- authentication requires unsafe cookie weakening;
- the BFF architecture cannot function behind the proxy;
- Google Nest clients cannot reach the Ethernet address reliably;
- application access works only through public exposure;
- firewall policy does not survive reboot;
- client tests reveal data corruption or migration problems.

Do not continue into Wave C.
