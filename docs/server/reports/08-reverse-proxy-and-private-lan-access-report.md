# Stage 8 Reverse Proxy and Private LAN Access Report

- **Target:** `gym-prod`
- **Execution date:** 2026-07-21
- **Execution boundary:** Stage 8 only
- **Compose project:** `gym-tracker`
- **Application snapshot:** `c168dd9f31dc953724d4b62a47f16c22f77be01a`
- **LAN origin:** `http://192.168.1.57/`
- **Final state:** healthy after application restart and host reboot
- **Exposure boundary:** private Ethernet IPv4 only

## Executive summary

Stage 8 completed successfully. A pinned Caddy `2.11.4-alpine` container now provides the Gym Tracker's only LAN-facing application entry point at `192.168.1.57:80`. The browser-facing path remains Caddy to Next.js to the Next.js BFF to Fastify to PostgreSQL. Caddy has no route or network path to PostgreSQL, and browser API traffic is not routed directly to Fastify.

The Stage 7 loopback publications for Next.js and Fastify were removed. PostgreSQL, Fastify, and Next.js have no host port publication. MacBook tests confirmed that port 80 succeeds only on the Ethernet address, while ports 3000, 4000, and 5432 fail on both server LAN addresses. Port 80 also fails on the Wi-Fi address. No IPv6, port 443, public DNS, router forwarding, tunnel, VPN, or public exposure was added.

Caddy runs as UID/GID `10001:10001` with a read-only root filesystem, all capabilities dropped except `NET_BIND_SERVICE`, and `no-new-privileges` enabled. The Caddyfile is mounted read-only. Response headers remove server-identifying headers and add the reviewed security policy. An 11,000,000-byte request was rejected with `413`, proving the 10 MB proxy limit.

Docker-aware filtering is implemented through an idempotent `GYM-TRACKER-IN` chain reached first from `DOCKER-USER`. It permits established traffic, permits the trusted upper LAN on `enp4s0` to the original `192.168.1.57:80` destination, permits the server's own test path, and drops every other forwarded source to that publication. A dedicated systemd oneshot reapplies and verifies the policy after Docker starts. The rules survived a controlled host reboot.

The MacBook functional flow passed signup, login, authenticated refresh, same-origin BFF access, disposable workout-template create/read/update/delete, logout, and cookie checks. Phone tests passed on `Haag_74` before and after reboot, including mobile layout, login, authenticated refresh, API-backed pages, workout-resume behavior, and logout. The generated accounts, sessions, action tokens, events, exercise, workout, set data, templates, and cookie jars were removed. The production database returned to zero users.

An ordinary application restart left PostgreSQL running and preserved the migration ledger. The controlled host reboot preserved the Caddy image, all four container IDs, PostgreSQL system identifier, database OID, migration ledger, backup hash, firewall policy, private publication, and both SSH paths. The `grub2-common.service` issue reported in Stage 7 did not recur: the unit completed successfully without any GRUB or bootloader change. Final failed-unit count is zero.

Wave B is technically complete. Wave C was not started.

## Selected proxy image and digest

Selected image:

```text
docker.io/library/caddy:2.11.4-alpine
```

Immutable Compose reference:

```text
docker.io/library/caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648
```

Observed image identity:

```text
Version      v2.11.4
Image ID     sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648
Repo digest  caddy@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648
```

The fully versioned Alpine tag was selected from the [official Caddy Docker image](https://hub.docker.com/_/caddy). No floating `latest`, major-only, or minor-only tag is used by the live Compose definition.

The image was validated before installation, including:

- Caddyfile adaptation and validation;
- execution as `10001:10001`;
- read-only root filesystem;
- writable isolated `/data` and `/config` paths;
- binding container port 80 with only `NET_BIND_SERVICE`;
- availability of the health-check client included in the image.

## Final request topology

```text
MacBook or phone on the private home network
    |
    | HTTP to 192.168.1.57:80
    v
Caddy proxy
    | gym-tracker_frontend
    v
Next.js web service
    | same-origin /api route handlers
    | gym-tracker_application
    v
Fastify API
    | gym-tracker_database
    v
PostgreSQL
```

Final service network membership:

| Service | Networks | Host publication |
| --- | --- | --- |
| `proxy` | `frontend` | `192.168.1.57:80 -> 80/tcp` |
| `web` | `frontend`, `application` | None |
| `api` | `application`, `database` | None |
| `postgres` | `database` | None |
| `migrate` | `database`; operations profile only | None |

Final network properties:

| Network | Docker internal | Members |
| --- | ---: | --- |
| `gym-tracker_frontend` | No | Caddy and Next.js |
| `gym-tracker_application` | No | Next.js and Fastify |
| `gym-tracker_database` | Yes | Fastify and PostgreSQL |

Caddy is not attached to the application or database networks. Fastify is not attached to the frontend network. PostgreSQL remains reachable only from Fastify and the explicit migration service on the internal database network.

## Proxy configuration

Live Caddyfile:

```text
/srv/gym-tracker/deploy/config/caddy/Caddyfile
```

Configuration decisions:

- global Caddy administration endpoint disabled;
- automatic HTTPS disabled because Stage 8 is deliberately private HTTP only;
- listener inside the container on port 80;
- `zstd` and `gzip` response encoding;
- maximum request body size of 10 MB;
- reverse proxy only to `web:3000`;
- upstream dial timeout of 5 seconds;
- upstream response-header timeout of 60 seconds;
- upstream keepalive of 30 seconds;
- JSON access logs to standard output;
- no HSTS over HTTP;
- no direct Fastify route;
- no port 443 listener publication.

Response-header policy:

```text
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

The following identifying headers are removed:

```text
Server
X-Powered-By
Via
```

Final response inspection confirmed the three security headers and confirmed that none of those identifying headers was returned.

Configuration ownership:

```text
0755  root:10001  /srv/gym-tracker/deploy/config/caddy
0440  root:10001  /srv/gym-tracker/deploy/config/caddy/Caddyfile
```

The directory grants path traversal only. The Caddyfile remains readable only by root and numeric GID `10001`. The directory mode was changed from the initially planned `0750` to `0755` so the unprivileged layout checker can stat the protected file; no secret is stored in the directory.

Caddy runtime state:

```text
/srv/gym-tracker/data/proxy/data
/srv/gym-tracker/data/proxy/config
```

Both top-level runtime directories are owned by `10001:10001` with mode `0750`. Caddy-created state beneath them uses mode `0700` for directories and `0600` for files.

## Compose publication changes

The live definition remains:

```text
/srv/gym-tracker/deploy/compose/compose.yaml
```

Removed Stage 7 publications:

```text
127.0.0.1:3000 -> web:3000
127.0.0.1:4000 -> api:4000
```

Added Stage 8 publication:

```text
192.168.1.57:80 -> proxy:80
```

Final `docker port` results:

```text
postgres  no mapping
api       no mapping
web       no mapping
proxy     80/tcp -> 192.168.1.57:80
```

The Caddy image declares container ports 443, 443/UDP, and 2019 in its metadata. Those declarations are not host publications. Host socket inspection and Docker port inspection confirm that only IPv4 `192.168.1.57:80` is published.

The Stage 7 Compose definition is preserved for rollback:

```text
/srv/gym-tracker/releases/compose-stage7-loopback.yaml
```

## Observed Google Nest client source path

The MacBook was connected to `Haag_74` with a downstream `192.168.86.x` address. Its route to `192.168.1.57` used the Google Nest gateway and the MacBook's Wi-Fi interface.

A uniquely identified request was made from the MacBook to the Caddy listener. Caddy observed:

```text
Client-side source       192.168.86.x
Caddy-observed source    192.168.1.200
Destination host         192.168.1.57
```

The Google Nest therefore source-NATs downstream client traffic to its upper-network address. Caddy logs after reboot contained only:

- `127.0.0.1` for container-local health checks;
- `192.168.1.57` for server-originated verification;
- `192.168.1.200` for Google Nest client traffic.

The initial trusted source must remain `192.168.1.0/24`; narrowing it to the MacBook's downstream address would break routed/NATed clients.

No packet capture needed to remain running after the access-log evidence was obtained.

## UFW and DOCKER-USER policy

UFW was not changed in Stage 8. Final host policy remains:

```text
Status: active
Default: deny incoming, allow outgoing, deny routed

22/tcp on enp4s0 from 192.168.1.0/24
22/tcp on wlp3s0 from 192.168.86.0/24
```

No broad UFW HTTP rule was added. The Docker publication is controlled through its explicit host-address bind and the `DOCKER-USER` path.

Final IPv4 policy:

```text
-N DOCKER-USER
-A DOCKER-USER -j GYM-TRACKER-IN

-N GYM-TRACKER-IN
-A GYM-TRACKER-IN -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A GYM-TRACKER-IN -s 192.168.1.0/24 -i enp4s0 -p tcp \
  -m conntrack --ctorigdst 192.168.1.57 --ctorigdstport 80 -j ACCEPT
-A GYM-TRACKER-IN -s 192.168.1.57/32 -p tcp \
  -m conntrack --ctorigdst 192.168.1.57 --ctorigdstport 80 -j ACCEPT
-A GYM-TRACKER-IN -p tcp \
  -m conntrack --ctorigdst 192.168.1.57 --ctorigdstport 80 -j DROP
-A GYM-TRACKER-IN -j RETURN
```

The policy:

- does not flush or replace Docker-managed chains;
- does not change Docker's iptables management;
- returns unrelated forwarded traffic to Docker's normal processing;
- does not affect host SSH input handling;
- does not add an IPv6 application publication;
- is safe to apply repeatedly.

Final Docker DNAT contains only the Stage 8 application rule for the reviewed ports:

```text
192.168.1.57:80 -> current proxy-container IPv4:80
```

No corresponding NAT rule exists for 3000, 4000, 5432, the Wi-Fi address, wildcard IPv4, or IPv6.

## Firewall-persistence method

Idempotent policy script:

```text
/srv/gym-tracker/scripts/apply-docker-firewall.sh
```

Supported modes:

```text
apply
check
status
```

The script is root-owned, group-readable/executable by `gym-tracker`, mode `0750`. It checks for existing equivalent rules before adding anything and never flushes `DOCKER-USER` or another shared chain.

Persistence unit:

```text
/etc/systemd/system/gym-tracker-docker-firewall.service
```

The root-owned mode-`0644` oneshot unit:

- requires and starts after `docker.service`;
- waits for `network-online.target`;
- runs `apply` and then `check`;
- remains active after a successful application;
- is enabled under `multi-user.target`.

Post-reboot verification confirmed:

```text
unit enabled
unit active
DOCKER-USER jump present
all five GYM-TRACKER-IN rules present in reviewed order
```

The temporary one-time post-reboot audit unit and script self-removed after use. Their failed transient record was cleared after the recorded audit-context error was reviewed. No temporary systemd unit remains.

## LAN URL

```text
http://192.168.1.57/
```

Deployment state records:

```text
LAN_URL=http://192.168.1.57/
PROXY_IMAGE=docker.io/library/caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648
PROXY_IMAGE_ID=sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648
LAN_ENABLED_AT=2026-07-21T20:05:38+02:00
```

The value is a private literal IPv4 origin. No private DNS name, public DNS record, domain, HTTPS certificate, router forwarding, or external tunnel was configured.

## MacBook functional tests

The MacBook was connected to the Google Nest network and accessed only the private Caddy origin.

Initial Stage 8 flow:

```text
Login page                              200
Signup through Next.js BFF             201
Current-user lookup                     200
Logout after signup                     200
Login                                   200
Authenticated page refresh              200
Create disposable workout template      201
Read disposable workout template        200
Update disposable workout template      200
Delete disposable workout template      200
Read after delete                        404
Final logout                             200
Current-user lookup after logout         401
```

Post-reboot MacBook flow:

```text
Ethernet SSH alias                       passed
Wi-Fi SSH alias                          passed
LAN login page                           200
Persisted disposable-account login       200
Current-user BFF lookup                  200
Protected Progress page                  200
Logout                                   200
```

The browser-facing and curl-facing hosts remained `192.168.1.57`. No direct Fastify URL was required or exposed.

The disposable MacBook account, template, sessions, action token, events, and cookie jar were removed. The first direct account-deletion attempt revealed the schema's deliberate `NO ACTION` user-session foreign key and changed nothing. A reviewed transaction then removed the exact generated account's dependent rows before deleting the user.

## Phone functional tests

The user tested from a phone connected to `Haag_74`, not mobile data.

Before reboot:

- LAN page loaded;
- mobile layout rendered;
- login succeeded;
- authenticated refresh succeeded;
- API-backed History/Progress behavior worked;
- temporary workout/resume behavior worked;
- logout succeeded.

After reboot:

- the same private URL loaded;
- the persisted disposable account could log in;
- authenticated refresh and API-backed pages worked;
- logout succeeded.

The user noted that some UI/UX details need readjustment. Those observations are real follow-up work but were not expanded into Stage 8 infrastructure scope because no specific UI change was approved in this stage.

Phone testing created one disposable user-owned exercise and one workout with dependent rows. A final transaction selected the exact generated phone account, asserted that it was the only live user, removed the associated sets, session exercises, workout, template relations, muscle assignments, exercise, sessions, action token, events, and user, then committed. Final results:

```text
Live users                  0
Stage 8 test identifiers    0
```

No test credential, session cookie, action token, or user identifier is included in this report.

## Authentication and cookie findings

The private LAN flow deliberately remains HTTP-only because public or private HTTPS is explicitly outside Stage 8.

Observed session-cookie attributes:

```text
HttpOnly   yes
SameSite   Lax
Path       /
Secure     no
```

The cookie value was never printed or recorded. `Secure` is false only for this reviewed private HTTP environment. The production variable inventory now states that a future HTTPS change must enable secure cookies in the same reviewed change.

Application environment decisions:

```text
NODE_ENV=production
APP_BASE_URL=http://192.168.1.57
AUTH_COOKIE_SECURE=false
API_TRUST_PROXY=false
```

`API_TRUST_PROXY=false` remains correct for the deployed architecture: Caddy connects only to Next.js, and the Next.js BFF originates requests to Fastify without forwarding the browser's client-IP headers. Enabling Fastify proxy trust would not reconstruct the original client path and could give false confidence. Caddy provides the authoritative LAN client source logs in Stage 8.

No `NEXT_PUBLIC_API_BASE_URL` is configured. Browser calls remain same-origin BFF calls.

No production email provider exists. `LOG_LEVEL=warn` remains in force so the fallback mailer does not record verification or reset action links. Disposable private tests worked, but real-user onboarding remains deferred until a mail provider or another reviewed product decision exists.

## Internal-port isolation tests

MacBook port results before and after reboot were identical:

| Address | Port | Expected role | Result |
| --- | ---: | --- | --- |
| `192.168.1.57` | 80 | Caddy | Open |
| `192.168.1.57` | 3000 | Next.js direct | Blocked |
| `192.168.1.57` | 4000 | Fastify direct | Blocked |
| `192.168.1.57` | 5432 | PostgreSQL direct | Blocked |
| `192.168.86.178` | 80 | Wi-Fi application path | Blocked |
| `192.168.86.178` | 3000 | Next.js direct | Blocked |
| `192.168.86.178` | 4000 | Fastify direct | Blocked |
| `192.168.86.178` | 5432 | PostgreSQL direct | Blocked |

Final relevant host listener:

```text
192.168.1.57:80  docker-proxy for Caddy
```

There is no host listener for application ports 3000, 4000, or 5432.

## Security-header and request-limit checks

Final login-page response:

```text
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Permissions-Policy: camera=(), microphone=(), geolocation=()
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
```

Confirmed absent:

```text
Server
X-Powered-By
Via
Strict-Transport-Security
```

HSTS is intentionally absent over HTTP.

Request-limit test:

```text
Uploaded body size   11,000,000 bytes
Configured maximum  10 MB
Response             413
```

The oversized body was rejected at the proxy boundary. No real credential, cookie, or personal data was used in the test.

Caddy access logs are structured JSON and were checked for client address, host, URI, method, and status. Docker's existing `json-file` rotation policy continues to bound container logs.

Exact live database secrets and authentication action-token URL patterns were compared against the application logs. No match was found.

## Restart and reboot verification

### Application restart

The proxy, web, and API services were restarted together. PostgreSQL was not restarted.

Results:

```text
PostgreSQL start timestamp  unchanged
Migration rows              5
Migration-state hash        3884c7595f53f3187a6539f1b71be7db
LAN login page              200
Unauthenticated BFF lookup  401
Firewall check              passed
All four services           healthy
```

No migration service ran.

### Controlled host reboot

Pre-reboot boot ID:

```text
110989a5-4481-4604-a4f3-3be7bcc01846
```

Post-reboot boot ID:

```text
81ee7a34-0051-46ca-b631-b1ac8fba90f7
```

The Wi-Fi recovery alias returned first. Ethernet already had its reserved address and connected profile when inspected through Wi-Fi, and the primary Ethernet SSH alias returned moments later. Both paths then passed repeatedly.

Post-reboot state:

```text
Kernel                  7.1.3-1-t2-resolute
Docker                  active
containerd              active
SSH                     active
UFW                     active
Docker firewall unit    active, enabled
PostgreSQL              healthy
API                     healthy
Web                     healthy
Proxy                   healthy
Failed units            0
```

Persistence checks:

```text
PostgreSQL system identifier  7664993968341856291
gym_tracker database OID      16392
Migration rows                5
Migration-state hash          3884c7595f53f3187a6539f1b71be7db
Post-migration backup hash    41b99dd0e280eb84a12df3897a1800f7f6b65ab5ccb805704a0db77575f5aa37
Final live users              0
```

All four container IDs and exact image IDs were preserved across reboot. Their start timestamps changed as expected when Docker restarted the existing containers.

Firewall rules, the explicit Ethernet publication, UFW policy, network memberships, and image digest matched their pre-reboot values. MacBook and phone tests passed again.

The Stage 7 GRUB finding improved without intervention:

```text
grub2-common.service  inactive/dead after successful completion
Result                success
```

No `grub-editenv`, bootloader, EFI, kernel, package, or service-file change was made.

The one-time automatic audit reached all application, firewall, port, and database checks but returned a nonzero status when its immediate-boot Git check treated the source checkout as unavailable. Shortly afterward the same checkout was present, clean, and passed both `git status` and the complete layout checker. The one-time files self-removed, their failed state was reset, and the final privileged audit passed with zero failed units. This was an audit-helper timing/context issue, not application or repository loss.

PostgreSQL logs contain the earlier expected foreign-key error from the first pre-reboot disposable-account cleanup attempt. A bounded scan from the actual post-reboot PostgreSQL start found no `PANIC`, `FATAL`, or `ERROR` entry.

## Files changed

Permanent Stage 8 server paths created:

```text
/srv/gym-tracker/deploy/config/caddy/
/srv/gym-tracker/deploy/config/caddy/Caddyfile
/srv/gym-tracker/data/proxy/data/
/srv/gym-tracker/data/proxy/config/
/srv/gym-tracker/releases/compose-stage7-loopback.yaml
/srv/gym-tracker/scripts/apply-docker-firewall.sh
/etc/systemd/system/gym-tracker-docker-firewall.service
```

Caddy created its normal protected runtime state below the two proxy data directories, including its autosaved adapted configuration, instance identifier, storage-lock directory, and last-clean marker.

Permanent server files updated:

```text
/srv/gym-tracker/deploy/compose/compose.yaml
/srv/gym-tracker/deploy/env/required-variables.md
/srv/gym-tracker/scripts/status.sh
/srv/gym-tracker/scripts/start.sh
/srv/gym-tracker/scripts/stop.sh
/srv/gym-tracker/scripts/restart.sh
/srv/gym-tracker/scripts/check-layout.sh
/srv/gym-tracker/state/deployment.env
```

Operational-script changes:

- `start.sh` starts PostgreSQL, API, web, and proxy;
- `stop.sh` stops proxy before the internal services;
- `restart.sh` restarts API, web, and proxy but not PostgreSQL;
- `status.sh` reports the proxy image and publication;
- `check-layout.sh` verifies Stage 8 configuration, permissions, rollback state, firewall unit, and deployment metadata.

The layout check records the modes of the protected Caddy runtime directories, then prunes their contents during its separate world-writable-path scan because the administrator account is intentionally not numeric UID/GID `10001`. The final unprivileged check passes without permission warnings.

Local repository file created:

```text
docs/server/reports/08-reverse-proxy-and-private-lan-access-report.md
```

No application source, Dockerfile, migration, lockfile, Git checkout, UFW file, NetworkManager profile, router setting, DNS setting, kernel, firmware, bootloader, database schema, or real-user row was changed.

All temporary Stage 8 helper scripts, outputs, cookie jars, test payloads, one-time systemd files, audit files, and tmux sessions were removed. The root shell was closed.

## Deviations and deferred work

1. **Frontend bridge cannot remain Docker-internal.** This host's Docker Engine did not create a host listener when the proxy's every attached network was `internal: true`, matching the behavior already found for Stage 7 loopback publications. The first proxy container became internally healthy but no port-80 host socket existed. No unintended exposure occurred. The stateless web and proxy containers were stopped and removed, `gym-tracker_frontend` was recreated as an ordinary project bridge, and only those containers were recreated. Caddy still joins only the frontend bridge and cannot reach Fastify or PostgreSQL directly.
2. **Initial numeric-group installation stopped safely.** GNU `install` rejected numeric group `10001` as a group name. Execution stopped after creating only the intended Stage 7 rollback copy. Ownership handling was changed to install first and apply an explicit numeric `chown`; the controlled retry succeeded.
3. **Private HTTP cookie exception remains.** `AUTH_COOKIE_SECURE=false` is necessary for this private HTTP-only stage. HTTPS, secure cookies, and any domain decision must be one later reviewed change.
4. **API proxy trust remains disabled.** The reverse proxy terminates at Next.js, not Fastify, and the current BFF does not forward the client address. Caddy access logs are the source of the Stage 8 client path.
5. **No real email provider exists.** Signup and action-link workflows are not ready for real-user onboarding. `LOG_LEVEL=warn` remains a safety measure, not a mail solution.
6. **Caddy frontend network has ordinary bridge egress.** This is required for Docker's host publication behavior on this server. Container membership and firewall publication, rather than an `internal` flag, provide the frontend boundary.
7. **Caddy directory traversal is non-secret.** The config directory uses mode `0755` so the unprivileged layout checker can stat the protected Caddyfile. The file remains root-owned, group `10001`, and mode `0440`.
8. **Disposable cleanup follows real schema constraints.** User foreign keys use `NO ACTION`, so account cleanup must delete dependent rows first. The first direct delete failed safely. Final transactions removed exact generated accounts and their dependent data, then verified zero users.
9. **The first final log assertion was over-broad.** A 30-minute PostgreSQL window included the already reviewed cleanup error. The audit was rerun from the exact post-reboot PostgreSQL start timestamp and passed with no warning-level database incident.
10. **The temporary post-reboot Git assertion was transient.** All infrastructure and data checks had passed before that helper exited. Final root and unprivileged layout/repository checks passed, and zero failed units remain.
11. **Phone UI/UX follow-up exists.** The user observed adjustment opportunities during real mobile use. No speculative UI implementation was mixed into the server stage.
12. **Public access remains out of scope.** No TLS, HSTS, public DNS, port forwarding, Cloudflare Tunnel, Tailscale, VPN, or Wi-Fi publication was added.
13. **Monitoring remains disabled.** Wave C was not started.

## Exact commands executed

Secret values, generated test credentials, cookie values, MAC addresses, complete IPv6 addresses, and personal data are omitted.

Documentation and preflight:

```bash
rg --files docs/server docs/status
sed -n '<ranges>' docs/server/wave-b-application-platform/08-reverse-proxy-and-private-lan-access.md
sed -n '<ranges>' docs/server/reports/07-gym-tracker-deployment-report.md
ssh -o BatchMode=yes gym-prod '<identity, route, listener, Compose, service, and sudo checks>'
git show c168dd9f31dc:<deployed-source-path>
git grep '<BFF and proxy settings>' c168dd9f31dc -- apps/web apps/api
```

Privileged access was established in a temporary user-owned tmux session. The administrator entered the sudo password directly in the attached local terminal. The password was never transmitted, printed, or stored.

Initial live inspection:

```bash
docker compose -p gym-tracker -f /srv/gym-tracker/deploy/compose/compose.yaml config --quiet
docker compose -p gym-tracker -f /srv/gym-tracker/deploy/compose/compose.yaml ps
docker compose -p gym-tracker -f /srv/gym-tracker/deploy/compose/compose.yaml images
docker port <container-id>
docker network inspect gym-tracker_frontend gym-tracker_application gym-tracker_database
ss -H -lntup
ufw status verbose
iptables -S DOCKER-USER
iptables -t nat -S
ip6tables -S DOCKER-USER
systemctl --failed --no-legend --plain
curl -fsS http://127.0.0.1:4000/api/v1/health
curl -fsS http://127.0.0.1:3000/login
```

Caddy selection and validation:

```bash
docker pull docker.io/library/caddy:2.11.4-alpine
docker image inspect docker.io/library/caddy:2.11.4-alpine
docker run --rm --network none --entrypoint /usr/bin/caddy \
  docker.io/library/caddy:2.11.4-alpine version
docker run --rm --network none --user 10001:10001 --read-only \
  --tmpfs /tmp:<reviewed-options> \
  --tmpfs /data:<reviewed-options> \
  --tmpfs /config:<reviewed-options> \
  -v <candidate-Caddyfile>:/etc/caddy/Caddyfile:ro \
  <pinned-image> caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker run -d --network none --user 10001:10001 --read-only \
  --cap-drop ALL --cap-add NET_BIND_SERVICE \
  --security-opt no-new-privileges:true \
  <reviewed mounts> <pinned-image>
```

Installation and startup:

```bash
install -d <reviewed ownership and modes> /srv/gym-tracker/deploy/config/caddy
install -d <reviewed ownership and modes> \
  /srv/gym-tracker/data/proxy/data /srv/gym-tracker/data/proxy/config
install <reviewed ownership and modes> <candidate files> <live paths>
docker compose -p gym-tracker -f <candidate-compose> --profile operations config --quiet
systemctl daemon-reload
systemctl enable --now gym-tracker-docker-firewall.service
/srv/gym-tracker/scripts/apply-docker-firewall.sh check
docker compose -p gym-tracker -f /srv/gym-tracker/deploy/compose/compose.yaml \
  up -d postgres api web proxy
```

Frontend-network correction:

```bash
docker compose -p gym-tracker -f <compose> stop proxy web
docker compose -p gym-tracker -f <compose> rm -f proxy web
docker network rm gym-tracker_frontend
docker compose -p gym-tracker -f <compose> up -d web proxy
```

Only stateless web/proxy containers and their frontend network were removed. No volume, PostgreSQL container, database network, application network, image, or persistent data was removed.

LAN, source-path, header, request-limit, and isolation tests:

```bash
route -n get 192.168.1.57
curl -fsS http://192.168.1.57/login
curl -D - -o /dev/null http://192.168.1.57/login
head -c 11000000 /dev/zero | \
  curl -o /dev/null -w '<status and uploaded size>' \
  -H 'Content-Type: application/octet-stream' --data-binary @- \
  http://192.168.1.57/api/auth/login
nc -z -w 2 192.168.1.57 80
nc -z -w 2 192.168.1.57 3000
nc -z -w 2 192.168.1.57 4000
nc -z -w 2 192.168.1.57 5432
nc -z -w 2 192.168.86.178 80
nc -z -w 2 192.168.86.178 3000
nc -z -w 2 192.168.86.178 4000
nc -z -w 2 192.168.86.178 5432
docker logs <proxy-container>
```

Functional tests used generated non-personal credentials, mode-`0600` cookie jars, JSON bodies provided through standard input, and only the Caddy origin:

```bash
curl -c <temporary-cookie-jar> -H 'Content-Type: application/json' \
  --data-binary @- http://192.168.1.57/api/auth/signup
curl -b <temporary-cookie-jar> http://192.168.1.57/api/auth/me
curl -b <temporary-cookie-jar> -X POST http://192.168.1.57/api/auth/logout
curl -b <temporary-cookie-jar> -H 'Content-Type: application/json' \
  --data-binary @- http://192.168.1.57/api/auth/login
curl -b <temporary-cookie-jar> -H 'Content-Type: application/json' \
  --data-binary @- http://192.168.1.57/api/workout-templates
curl -b <temporary-cookie-jar> \
  http://192.168.1.57/api/workout-templates/<generated-id>
curl -b <temporary-cookie-jar> -X PATCH -H 'Content-Type: application/json' \
  --data-binary @- http://192.168.1.57/api/workout-templates/<generated-id>
curl -b <temporary-cookie-jar> -X DELETE \
  http://192.168.1.57/api/workout-templates/<generated-id>
```

Disposable database cleanup used a transaction, exact generated-account selection, count assertions, dependent-row deletion in foreign-key order, final user deletion, and residue counts. No wildcard deletion was run without an exact-count guard.

Restart and reboot:

```bash
docker compose -p gym-tracker -f <compose> restart proxy web api
docker inspect <containers>
docker exec <postgres> psql -U postgres -d gym_tracker -Atc '<ledger and identity queries>'
curl -fsS http://192.168.1.57/login
/srv/gym-tracker/scripts/apply-docker-firewall.sh check
systemctl reboot
ssh -o BatchMode=yes gym-prod '<post-reboot identity>'
ssh -o BatchMode=yes gym-prod-wifi '<post-reboot identity>'
```

Post-reboot privileged verification:

```bash
systemctl is-active docker containerd ssh ufw gym-tracker-docker-firewall.service
systemctl is-enabled gym-tracker-docker-firewall.service
systemctl --failed --no-legend --plain
systemctl status grub2-common.service --no-pager --full
docker compose -p gym-tracker -f <compose> ps
docker port <each-service-container>
docker network inspect <three-project-networks>
iptables -S DOCKER-USER
iptables -S GYM-TRACKER-IN
iptables -t nat -S
ufw status verbose
ss -H -lntup '<application-port filter>'
/srv/gym-tracker/scripts/check-layout.sh
git -C /srv/gym-tracker/repo status --short --branch
docker logs gym-tracker-postgres-1 --since <post-reboot-start>
```

Temporary files were removed through exact known paths and the `codex-stage8-*` temporary prefix. Both tmux root shells were exited after their checks. No passwordless sudo policy, Docker-group membership, persistent root shell, or reusable privileged helper was created.

Final unprivileged layout-check correction and verification:

```bash
sha256sum /srv/gym-tracker/scripts/check-layout.sh
sed -i '<exact reviewed find-expression replacement>' \
  /srv/gym-tracker/scripts/check-layout.sh
bash -n /srv/gym-tracker/scripts/check-layout.sh
/srv/gym-tracker/scripts/check-layout.sh
```

## Wave B completion assessment

Wave B's required technical outcome is satisfied:

- `/srv/gym-tracker` has deliberate source, deploy, secret, data, backup, release, script, and state boundaries;
- the server checkout remains clean at the recorded snapshot;
- live secrets remain outside Git and are absent from rendered Compose and logs;
- PostgreSQL is persistent and has no host publication;
- migrations remain explicit and do not run during ordinary start, restart, or reboot;
- API, web, and proxy use the reviewed Compose project;
- only Caddy is published to the private LAN;
- Caddy binds only `192.168.1.57:80`;
- browser traffic passes through Next.js and its BFF;
- Fastify, Next.js, and PostgreSQL direct ports are blocked from both LAN addresses;
- the Docker-aware policy is explicit, idempotent, persistent, and proven after reboot;
- UFW retains only the two scoped SSH rules;
- the application works from MacBook and phone before and after reboot;
- authentication, cookies, refresh, BFF requests, CRUD, request limits, and headers were tested;
- test users and data were removed;
- application restart and host reboot passed;
- the T2 kernel is unchanged;
- zero host units are failed;
- the Stage 7 GRUB failure did not recur;
- no public exposure exists;
- the Stage 8 report is complete.

Wave B execution is complete pending review and acceptance of this report.

Do not begin Wave C merely because its planning directory exists.

## Recommendations for Wave C

1. Keep Wave C private and preserve the Stage 8 LAN boundary. Do not publish Prometheus, exporters, Grafana, PostgreSQL, Fastify, or Next.js directly.
2. Bind Grafana to loopback and use the already retained SSH forwarding policy for administration unless a separately reviewed private proxy route is approved.
3. Treat Caddy logs as the current client-source record because Google Nest NAT hides downstream addresses and the BFF does not forward them to Fastify.
4. Monitor the `gym-tracker-docker-firewall.service`, `DOCKER-USER` jump, proxy health, and the single `192.168.1.57:80` listener.
5. Add backup scheduling and restore evidence without deleting the Stage 6/7 checkpoints.
6. Keep `LOG_LEVEL=warn` until a real mail provider is configured; do not onboard real users with undeliverable verification/reset actions.
7. Plan HTTPS and `AUTH_COOKIE_SECURE=true` together as a later explicit stage. Do not add HSTS before HTTPS exists.
8. Capture the phone UI/UX observations in a separate product review with screenshots and exact reproduction steps before changing application code.
9. Review whether the frontend bridge's required non-internal property needs additional container-egress policy. Do not reattach Caddy to the application or database networks as a shortcut.
10. Continue pinning Caddy by full version and digest. Test a candidate update with the same non-root, read-only, config-validation, header, request-limit, restart, and firewall checks.
11. Retain the successful GRUB result as evidence, but continue checking failed units after future maintenance reboots because the Stage 7 recordfail issue occurred once.
12. Consider a later reviewed Dockerfile hardening change for encoded non-root users and smaller runtime images; do not combine it with Wave C monitoring deployment.

Wave C was not started.
