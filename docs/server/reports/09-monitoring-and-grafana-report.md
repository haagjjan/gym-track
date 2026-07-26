# Stage 9 Monitoring and Grafana Report

- **Target:** `gym-prod`
- **Execution date:** 2026-07-22
- **Execution boundary:** Stage 9 only
- **Compose project:** `gym-tracker`
- **Application snapshot:** `c168dd9f31dc953724d4b62a47f16c22f77be01a`
- **Final state:** healthy after monitoring restart and host reboot
- **Exposure boundary:** Grafana on `127.0.0.1:3001`; other monitoring endpoints container-internal

## Executive summary

Stage 9 completed successfully. Prometheus, Grafana, Node Exporter, cAdvisor, and PostgreSQL Exporter are running in the production Compose project. Prometheus reports the five required jobs—`prometheus`, `api`, `node`, `cadvisor`, and `postgres`—as `UP`. Monitoring survived a monitoring-only restart and a controlled host reboot while preserving Prometheus history and Grafana state.

Fastify exports bounded request, response, latency, in-flight, process, environment, and release metrics at `/api/v1/metrics` only when `METRICS_ENABLED=true`. Tests prove route labels are normalized templates and do not contain raw resource identifiers. The deployed endpoint is internal-only.

Grafana provisions one healthy Prometheus datasource and three file-controlled dashboards. Anonymous access, sign-up, analytics, update checks, plugin administration, and automatic plugin preinstallation are disabled. The user authenticated through the SSH tunnel and confirmed that the dashboards render.

Grafana is the only monitoring service published on the host and is bound only to `127.0.0.1:3001`. LAN probes confirmed that internal application and monitoring ports are not reachable. The existing Caddy publication at `192.168.1.57:80` was unchanged.

The PostgreSQL exporter uses a dedicated non-superuser role with `pg_monitor` membership. Live credentials remain in protected files under `/srv/gym-tracker/secrets`; no value is included in this report, Compose, dashboard JSON, or Git.

Stage 10 logging and alerting was not started.

## Preconditions and inputs

Wave B was complete and accepted. Stage 9 reconfirmed:

- a clean server checkout at the recorded application snapshot;
- healthy PostgreSQL, API, Next.js, and Caddy services;
- Caddy as the only LAN application listener;
- no host publication for PostgreSQL, API, or Next.js;
- the Docker-aware firewall policy present;
- Docker operations still requiring sudo;
- approved production data present;
- active T2 kernel `7.1.3-1-t2-resolute`.

Primary inputs were the Stage 4, 6, 7, and 8 reports, the Stage 9 execution document, and the current server handoff. Completed reports were authoritative where earlier plans differed.

## API metrics audit and implementation

The deployed registry exposes:

```text
gym_progress_tracker_http_requests_total
gym_progress_tracker_http_responses_total
gym_progress_tracker_http_request_duration_seconds
gym_progress_tracker_http_requests_in_flight
gym_progress_tracker_build_info
gym_progress_tracker_process_*
```

Default labels are limited to service, environment, and release. HTTP labels are limited to method, normalized Fastify route template, and status class. Users, emails, sessions, request IDs, workout IDs, and exercise IDs are not labels. The metrics request itself is excluded from request metrics.

Automated coverage verifies opt-in registration, process metrics, build identity, normalized parameters, absence of raw test identifiers, bounded response classes, in-flight cleanup, and endpoint exclusion. The complete API suite passed:

```text
155 passed
0 failed
```

The live endpoint exported 36 metric families. It is scraped internally at `api:4000/api/v1/metrics` and has no host publication.

## Selected images and immutable digests

| Service | Versioned image | Immutable digest |
| --- | --- | --- |
| Prometheus | `docker.io/prom/prometheus:v3.5.2` | `sha256:f0a6cf785cde2d1e9b201ae1921391eab7fcbb08ce64d8a9d840c087c09b8355` |
| Grafana | `docker.io/grafana/grafana:13.1.0` | `sha256:6ea068891652aa6a65ca9065c26b89de939653803c836426970305c11fd00534` |
| Node Exporter | `docker.io/prom/node-exporter:v1.11.1` | `sha256:fbd8062b4529e166e902bd62cd93de2f48b36d50af942620d419657265bc20b1` |
| cAdvisor | `ghcr.io/google/cadvisor:v0.57.0` | `sha256:1742bab953d9d9ab166cba24604a9488efdff7d73dc6d18a087c09a1bcd6cb9d` |
| PostgreSQL Exporter | `quay.io/prometheuscommunity/postgres-exporter:v0.19.1` | `sha256:a0c79a8210d1079760ebeb3fa5c07659bc3ceb9ccc8bb921ba1073ef6fd4164f` |

Live Compose uses the full version tag and digest for every image. No floating tag is used. cAdvisor uses GHCR because the official project directs releases from v0.53.0 onward there.

## Monitoring network design

Prometheus, API, Node Exporter, cAdvisor, PostgreSQL Exporter, and Grafana share an internal `monitoring` network. PostgreSQL Exporter also joins the database network; API retains its application/database memberships.

Grafana additionally joins an ordinary `monitoring-access` bridge. On this host, Docker did not create a loopback listener for a service attached only to internal networks. The access bridge exists only for `127.0.0.1:3001`; it does not publish Prometheus or an exporter.

## PostgreSQL monitoring role

Role: `gym_tracker_monitor`.

```text
LOGIN                    yes
INHERIT                  yes
pg_monitor membership    yes
connection limit         2
SUPERUSER                no
CREATEDB                 no
CREATEROLE               no
REPLICATION              no
BYPASSRLS                 no
```

The role can connect and read monitoring views. A negative test proved it cannot create an application table. Its password was generated outside Git and stored only in protected host/container secret files. PostgreSQL Exporter produced 927–929 samples; bounded log review found no password or complete connection URL.

## Prometheus configuration

```text
scrape interval       15 seconds
evaluation interval   15 seconds
retention time        30 days
retention size        5 GB
external instance     gym-prod
external environment  production
```

Jobs use Docker service names: `prometheus`, `api`, `node`, `cadvisor`, and `postgres`. Prometheus has no host publication and persists below `/srv/gym-tracker/data/prometheus`. `promtool check config` passed before installation.

## Exporter configuration

### Node Exporter

Host `/proc`, `/sys`, and root filesystem mounts are read-only. Container, pseudo, and Docker filesystems are excluded from host filesystem panels. `/srv/gym-tracker/data/node-exporter-textfile` is prepared for later backup metrics. Port `9100` is not published.

### cAdvisor

cAdvisor uses the upstream-documented Linux mounts and `/dev/kmsg`. The selected runtime requires privileged mode; the exception is confined to this exporter and documented in Compose. Host mounts are read-only. Port `8080` is not published. It identified all ten production Compose services.

### PostgreSQL Exporter

The exporter reads its password from a protected file, uses the dedicated role, and publishes no host port. The long-running-transactions collector is enabled without query text or application rows.

## Grafana security and persistence

Final publication: `127.0.0.1:3001 -> 3000/tcp`.

```text
anonymous access             disabled
user sign-up                 disabled
analytics reporting          disabled
update checks                disabled
plugin administration        disabled
automatic plugin preinstall  disabled
```

The administrator username is `operator`. Its password is provided through `GF_SECURITY_ADMIN_PASSWORD__FILE`, not Compose, arguments, provisioning, or dashboards.

The pinned image runs as effective UID/GID `472:0`. Final state uses Grafana data `472:0` mode `0750`, configuration directories `root:0` mode `0750`, configuration files `root:0` mode `0440`, and the container secret `root:0` mode `0440`. Grafana's database persisted through restart and reboot.

## Provisioned datasource and dashboards

Datasource:

```text
UID       gpt-prometheus
type      Prometheus
URL       http://prometheus:9090
default   yes
health    OK
```

| UID | Dashboard | Panels |
| --- | --- | ---: |
| `gpt-service-overview` | Service overview | 17 |
| `gpt-host-containers` | Host and containers | 14 |
| `gpt-postgresql` | PostgreSQL | 18 |

Authenticated API checks confirmed the datasource and every dashboard. A payload scan confirmed neither live monitoring secret occurs in dashboard JSON.

Representative point-in-time results—not alert thresholds—were:

```text
Prometheus targets up       5
API availability            1
PostgreSQL availability     1
API process CPU             approximately 0.8%
API process memory          approximately 87 MB
root filesystem free        approximately 438 GB
network error rate          0
active DB connections       0
idle DB connections         1
maximum DB connections      100
cache hit ratio             approximately 99.7%
temporary-file rate         0
WAL size                    approximately 32 MiB
```

Panel meanings and troubleshooting order are documented in `docs/server/GRAFANA-DASHBOARD-GUIDE.md`.

## Prometheus target verification

```text
api          UP
cadvisor     UP
node         UP
postgres     UP
prometheus   UP
```

Further checks confirmed 36 API metric families, more than 900 PostgreSQL samples, ten cAdvisor Compose services, and a release matching the deployed SHA.

## Host publication and access audit

Relevant listeners:

```text
127.0.0.1:3001       Grafana
192.168.1.57:80      Caddy application proxy
```

No host publication exists for Next.js `3000`, Fastify `4000`, PostgreSQL `5432`, cAdvisor `8080`, Prometheus `9090`, Node Exporter `9100`, or PostgreSQL Exporter `9187`.

MacBook probes confirmed ports `3000`, `3001`, `4000`, `5432`, `8080`, `9090`, `9100`, and `9187` were blocked on `192.168.1.57`. Port 80 remained reachable. No UFW, router, DNS, IPv6, public-domain, HTTPS, or public-tunnel change was made.

## SSH-tunnel and UI verification

The MacBook used:

```bash
ssh -N -L 3001:127.0.0.1:3001 gym-prod
```

`http://127.0.0.1:3001` presented the normal login. The user signed in, opened the dashboards, and confirmed the UI and panels work. Anonymous `/api/search` returned HTTP `401`.

Automated in-app-browser control was unavailable in the active tool environment, so visual acceptance was performed directly by the user. Authenticated API checks independently verified datasource health, dashboard UIDs, panel counts, settings, and secret absence.

## Restart and reboot verification

`/srv/gym-tracker/scripts/restart-monitoring.sh` restarts only the five monitoring services. It does not restart PostgreSQL or application services. After restart all targets returned to `UP`, Prometheus retained its earliest sample, and the Grafana database inode was preserved. The existing `restart.sh` remains application-only.

Boot transition:

```text
before  81ee7a34-0051-46ca-b631-b1ac8fba90f7
after   17e9d1d6-079a-4c48-96b2-3e896f63b947
```

After reboot, the T2 kernel, Docker, containerd, SSH, UFW, and Docker firewall were active. Targets, datasource, dashboards, layout, application login, repository SHA/status, and both SSH aliases passed. Zero systemd units were failed.

Production data remained one user, 106 workout sessions, and 736 sets. No personal row content was inspected or copied. Prometheus history and Grafana state persisted.

## Files created or changed

Production monitoring paths:

```text
/srv/gym-tracker/deploy/monitoring/
/srv/gym-tracker/data/prometheus/
/srv/gym-tracker/data/grafana/
/srv/gym-tracker/data/node-exporter-textfile/
```

Secret filenames, without values:

```text
/srv/gym-tracker/secrets/grafana-admin-password
/srv/gym-tracker/secrets/grafana-admin-password-container
/srv/gym-tracker/secrets/postgres-monitor-password
/srv/gym-tracker/secrets/postgres-monitor-password-container
```

Other production files changed or added:

```text
/srv/gym-tracker/deploy/compose/compose.yaml
/srv/gym-tracker/scripts/start.sh
/srv/gym-tracker/scripts/stop.sh
/srv/gym-tracker/scripts/status.sh
/srv/gym-tracker/scripts/restart-monitoring.sh
/srv/gym-tracker/scripts/check-layout.sh
/srv/gym-tracker/state/deployment.env
/srv/gym-tracker/state/stage9-post-reboot-audit.txt
```

Stage 8 Compose and scripts remain under `/srv/gym-tracker/releases`.

Application/operations source used by Stage 9 includes the API metrics/environment files, `compose.monitoring.yaml`, and `ops/monitoring`. Documentation added or updated:

```text
docs/server/GRAFANA-DASHBOARD-GUIDE.md
docs/server/reports/09-monitoring-and-grafana-report.md
docs/status/server-status-gym-prod.md
ops/monitoring/README.md
```

No business behavior, schema, user/workout data, router, UFW, NetworkManager, kernel, firmware, bootloader, public DNS, or external access was changed.

## Deviations, corrections, and deferred work

1. **Prometheus image metadata reported `nobody`.** The first helper stopped rather than guessing an owner. It was corrected to run `id` in each pinned image; preparation then passed.
2. **Grafana's effective group is `0`.** Runtime identity is `472:0`, not the initially assumed `472:472`. The first start could not read protected files and fell back to its initial database credential state. No service was exposed. Ownership and `operator` password were corrected without argument exposure.
3. **Grafana attempted optional plugin downloads.** The read-only image produced non-fatal errors. Automatic preinstallation and plugin administration were disabled, generated plugin data was removed from the live path, and only Grafana was recreated.
4. **The reboot helper omitted shell `-e`.** Two root-level Git commands were rejected by Git ownership protection, but the helper printed a pass line. The check was rerun as `admin-gym` and passed. The persistent audit contains the correction.
5. **Grafana needs an ordinary access bridge.** `monitoring-access` is required for this host's Docker loopback-publication behavior. It caused no LAN publication.
6. **Reverse-proxy request rate is deferred.** Caddy metrics are not enabled; the dashboard uses Fastify request rate.
7. **Temperature is omitted.** No trustworthy T2-compatible source was validated.
8. **Restart panels are best-effort.** cAdvisor start-time changes cannot prove every restart.
9. **Stages 10 and 11 are deferred.** No alerting, log, backup, off-machine copy, or restore-test work started.
10. **Private candidate evidence is retained.** `/home/admin-gym/codex-stage9-candidate` remains mode `0700`. Some evidence is root-owned. It was not removed through a new sudo prompt used only for cleanup; it can be removed during the next authorized privileged window.

## Rollback state

Rollback inputs remain at:

```text
/srv/gym-tracker/releases/compose-stage8-private-lan.yaml
/srv/gym-tracker/releases/scripts-stage8/
```

Rollback would stop monitoring, restore Stage 8 Compose/scripts, and recreate only services whose network/environment changed. PostgreSQL/application data, Caddy state, and images must not be removed. Monitoring data and secrets should remain until review; `docker compose down --volumes` must not be used. Rollback was not executed because checks passed.

## Exact commands executed

Secrets, keys, cookies, complete database URLs, personal data, MAC addresses, and sensitive IPv6 values are omitted. Placeholders represent repeated or redacted arguments.

```bash
# Local inspection and API verification
rg --files docs/server docs/status ops/monitoring apps/api
sed -n '<reviewed ranges>' docs/server/wave-c-operations-dashboard/09-monitoring-and-grafana.md
sed -n '<reviewed ranges>' docs/server/reports/08-reverse-proxy-and-private-lan-access-report.md
git status --short
git rev-parse HEAD
rg -n 'prom-client|prometheus|metrics|histogram|counter|gauge|/metrics' apps/api ops compose*.yaml
pnpm --filter @gym-progress-tracker/api test
pnpm --filter @gym-progress-tracker/api type-check

# Server preflight and transfer
ssh -o BatchMode=yes gym-prod '<identity, route, service, repository, listener, Compose, sudo checks>'
ssh -o BatchMode=yes gym-prod-wifi '<identity and recovery checks>'
scp <reviewed files> gym-prod:/home/admin-gym/codex-stage9-candidate/

# Images, preparation, installation
sudo docker pull '<versioned-image>@<digest>'
sudo docker image inspect '<versioned-image>@<digest>'
sudo docker run --rm --network none --entrypoint /usr/bin/id '<versioned-image>@<digest>'
sudo /home/admin-gym/codex-stage9-candidate/stage9-server.sh prepare
sudo docker run --rm --network none --entrypoint /bin/promtool \
  -v /srv/gym-tracker/deploy/monitoring/prometheus:/etc/prometheus:ro \
  '<pinned-prometheus-image>' check config /etc/prometheus/prometheus.yml
docker compose -p gym-tracker -f <candidate-compose> --profile operations config --quiet
sudo /home/admin-gym/codex-stage9-candidate/stage9-server.sh start
sudo /home/admin-gym/codex-stage9-candidate/fix-grafana-ownership.sh
sudo /home/admin-gym/codex-stage9-candidate/install-dashboards.sh
sudo /home/admin-gym/codex-stage9-candidate/install-operations.sh
bash -n /srv/gym-tracker/scripts/{start,stop,status,restart-monitoring,check-layout}.sh
/srv/gym-tracker/scripts/check-layout.sh

# Runtime and security verification
sudo docker compose -p gym-tracker -f /srv/gym-tracker/deploy/compose/compose.yaml config --quiet
sudo docker compose -p gym-tracker -f /srv/gym-tracker/deploy/compose/compose.yaml ps
sudo docker compose -p gym-tracker -f /srv/gym-tracker/deploy/compose/compose.yaml images
sudo docker port <each-container>
sudo docker network inspect <reviewed-project-networks>
sudo docker compose -p gym-tracker -f <compose> logs --tail=200 <monitoring-service>
sudo ss -H -lntup
sudo ufw status verbose
sudo iptables -S DOCKER-USER
sudo /srv/gym-tracker/scripts/apply-docker-firewall.sh check
sudo docker exec <prometheus> wget -qO- 'http://localhost:9090/api/v1/targets?state=active'
sudo docker exec <prometheus> wget -qO- 'http://api:4000/api/v1/metrics'
sudo docker exec <exporter> wget -qO- 'http://localhost:<port>/metrics'
python3 /home/admin-gym/codex-stage9-candidate/verify-grafana.py
bash /home/admin-gym/codex-stage9-candidate/dashboard-query-check.sh

# Password reset from standard input
docker compose -p gym-tracker -f <compose> run --rm --no-deps -T grafana \
  grafana cli admin reset-admin-password --password-from-stdin

# MacBook access audit and tunnel
for port in 3000 3001 4000 5432 8080 9090 9100 9187; do
  nc -z -w 2 192.168.1.57 "$port"
done
nc -z -w 2 192.168.1.57 80
ssh -N -L 3001:127.0.0.1:3001 gym-prod

# Restart, persistence, and reboot
/srv/gym-tracker/scripts/restart-monitoring.sh
bash /home/admin-gym/codex-stage9-candidate/check-persistence.sh
sudo /home/admin-gym/codex-stage9-candidate/install-post-reboot-audit.sh
sudo /home/admin-gym/codex-stage9-candidate/prepare-reboot.sh
sudo systemctl reboot
ssh -o BatchMode=yes gym-prod '<post-reboot checks>'
ssh -o BatchMode=yes gym-prod-wifi '<post-reboot identity>'
git -C /srv/gym-tracker/repo rev-parse HEAD
git -C /srv/gym-tracker/repo status --short
/srv/gym-tracker/scripts/check-layout.sh
systemctl --failed --no-legend --plain
```

The sudo password was entered directly in the attached server terminal only when the normal timestamp required it. No passwordless sudo, Docker-group membership, persistent root shell, or reusable privileged service was created. The one-time reboot audit service and script self-removed.

## Stage 9 completion assessment

All five pinned monitoring services run and survive reboot; targets are `UP`; API metrics are bounded, tested, internal-only, and release-aware; retention is bounded; the database role is least-privilege; Grafana is loopback-only; its datasource and dashboards are provisioned; secrets are absent from dashboards; persistence is proven; internal ports remain unavailable from the LAN; application data is intact; the T2 kernel/firewall boundary are unchanged; zero failed units remain; and the guide, report, and handoff are complete.

Stage 9 is complete pending review. Stage 10 has not started.

## Recommendations for Stage 10

1. Preserve the current network and publication boundary.
2. Use bounded service labels and normalized routes; never include personal or authentication data.
3. Add actionable alerts for target loss, API 5xx, sustained latency, low disk, PostgreSQL unavailability/pressure, and monitoring failure.
4. Corroborate best-effort restart metrics with Docker state and bounded logs.
5. Test notification delivery without storing tokens in Git or reports.
6. Keep logs bounded; do not add Loki without separate approval.
7. Monitor the Docker firewall unit and all five scrape targets.
8. Do not begin Stage 11 while Stage 10 is under review.
