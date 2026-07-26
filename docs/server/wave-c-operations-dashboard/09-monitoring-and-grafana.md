# Stage 9 — Monitoring and Grafana

## Objective

Deploy a private metrics and dashboard stack for the Gym Tracker.

The stage must provide useful visibility into:

- Fastify/API availability and performance;
- host CPU, memory, disk, network, and uptime;
- Docker container health and resource usage;
- PostgreSQL health, connections, transactions, and database size;
- Prometheus target health;
- the currently deployed application version.

Grafana must remain accessible only through a localhost binding and SSH tunnel.

---

## Dependencies

Wave B must be complete and reviewed.

Required inputs:

- [`../reports/08-reverse-proxy-and-private-lan-access-report.md`](../reports/08-reverse-proxy-and-private-lan-access-report.md)
- the final Compose project and service names;
- the deployed Git commit and image tags;
- verified Fastify health endpoint;
- verified PostgreSQL role model;
- Docker and firewall behavior documented during Wave A and Wave B.

---

## Scope

- inspect existing application metrics support;
- create the monitoring filesystem structure;
- select and pin Prometheus, Grafana, Node Exporter, cAdvisor, and PostgreSQL Exporter images;
- create a least-privilege PostgreSQL monitoring role;
- add internal monitoring networks;
- deploy Prometheus and exporters;
- bind Grafana only to `127.0.0.1:3001`;
- provision the Prometheus datasource;
- provision three initial dashboards;
- prepare Node Exporter’s textfile collector for later backup metrics;
- validate targets, dashboards, restart behavior, and reboot behavior;
- create the Stage 9 report.

---

## Explicitly out of scope

Do not:

- expose monitoring services to the LAN or internet;
- enable anonymous Grafana access;
- add public authentication, domains, or HTTPS;
- add Alertmanager or notification channels yet;
- add Loki unless separately approved;
- install host agents from unverified scripts;
- grant PostgreSQL Exporter superuser privileges;
- publish Prometheus, Node Exporter, cAdvisor, or PostgreSQL Exporter ports to the host;
- commit Grafana passwords or database connection strings;
- change application business functionality.

If the API lacks a production-safe metrics endpoint, document the missing prerequisite and stop before claiming Stage 9 completion.

---

## Safety constraints

- Use pinned image tags or digests; never use `latest`.
- Keep monitoring traffic on internal Docker networks.
- Publish only Grafana, and only on `127.0.0.1:3001`.
- Store live credentials under `/srv/gym-tracker/secrets`.
- Provision dashboards and datasources from files without embedded credentials.
- Use read-only host mounts wherever possible.
- Treat Docker socket and host filesystem mounts as sensitive.
- Do not run cAdvisor with more privilege than the selected image actually requires.
- Do not expose user-identifying labels or unbounded high-cardinality application metrics.
- Do not include usernames, exercise names, session IDs, email addresses, or request IDs as Prometheus labels.

---

## Target services

| Service | Purpose | Host publication |
|---|---|---|
| Prometheus | Metrics storage and query | None |
| Grafana | Dashboards | `127.0.0.1:3001` only |
| Node Exporter | Host metrics | None |
| cAdvisor | Container metrics | None |
| PostgreSQL Exporter | Database metrics | None |
| Fastify metrics endpoint | Application metrics | Internal Docker network only |

Planned Prometheus jobs:

```text
prometheus
api
node
cadvisor
postgres
```

---

## Preferred filesystem structure

```text
/srv/gym-tracker/deploy/monitoring/
├── prometheus/
│   ├── prometheus.yml
│   └── rules/
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   └── dashboards/
│   └── dashboards/
└── README.md

/srv/gym-tracker/data/
├── prometheus/
├── grafana/
└── node-exporter-textfile/
```

---

## Implementation steps

### 1. Inspect current application and Compose state

Run:

```bash
cd /srv/gym-tracker/deploy/compose

sudo docker compose ps
sudo docker compose config
sudo ss -lntup
```

Inspect the repository for existing metrics support:

```bash
cd /srv/gym-tracker/repo

grep -RInE \
  'prom-client|prometheus|metrics|histogram|counter|gauge|/metrics' \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  . | head -300
```

Determine:

- whether `prom-client` or equivalent instrumentation exists;
- the metrics endpoint path;
- whether the endpoint is authenticated or internal-only;
- which default Node.js process metrics are exported;
- whether HTTP request count, duration, and status metrics exist;
- whether database and health metrics are already exposed;
- whether metric labels have bounded cardinality.

The API should expose at least:

- request count by method, normalized route, and status class;
- request-duration histogram by method and normalized route;
- process CPU and memory metrics;
- application/build version information;
- health/readiness state where appropriate.

Do not use raw URL paths containing IDs as labels.

### 2. Handle missing API metrics safely

If the repository lacks a suitable metrics endpoint:

1. do not invent metrics solely in host configuration;
2. document the exact missing instrumentation;
3. create a separate, reviewed application-code task;
4. require tests for route normalization and secret exclusion;
5. redeploy the application through the established Stage 7 process;
6. verify the endpoint is reachable only from the monitoring network.

Stage 9 is not complete while the required `api` scrape target is absent.

### 3. Create monitoring directories

Run:

```bash
install -d -m 0750 \
  /srv/gym-tracker/deploy/monitoring/prometheus/rules \
  /srv/gym-tracker/deploy/monitoring/grafana/provisioning/datasources \
  /srv/gym-tracker/deploy/monitoring/grafana/provisioning/dashboards \
  /srv/gym-tracker/deploy/monitoring/grafana/dashboards

sudo install -d -o admin-gym -g gym-tracker -m 0750 \
  /srv/gym-tracker/data/prometheus \
  /srv/gym-tracker/data/grafana \
  /srv/gym-tracker/data/node-exporter-textfile
```

Set final ownership according to the container image users after inspecting their UID/GID requirements.

Do not make monitoring data world-readable or world-writable.

### 4. Select and pin images

Select stable tags or digests for:

```text
prom/prometheus
grafana/grafana
prom/node-exporter
gcr.io/cadvisor/cadvisor
prometheuscommunity/postgres-exporter
```

Do not use floating tags.

For every image:

```bash
sudo docker pull '<image>:<tag>'
sudo docker image inspect '<image>:<tag>' \
  --format '{{index .RepoDigests 0}}'
```

Record tags and digests in the report.

### 5. Create a least-privilege PostgreSQL exporter role

Preferred role:

```text
gym_tracker_monitor
```

Requirements:

- login allowed;
- no superuser;
- no database creation;
- no role creation;
- no replication privilege unless explicitly required;
- membership in PostgreSQL’s built-in `pg_monitor` role;
- connect permission only to required databases.

Example intent:

```sql
CREATE ROLE gym_tracker_monitor LOGIN PASSWORD '<secret>';
GRANT pg_monitor TO gym_tracker_monitor;
GRANT CONNECT ON DATABASE gym_tracker TO gym_tracker_monitor;
```

Adapt to the installed PostgreSQL version and exporter requirements.

Generate the password outside Git and create:

```text
/srv/gym-tracker/secrets/postgres-exporter-url
```

Set:

```bash
chmod 0600 /srv/gym-tracker/secrets/postgres-exporter-url
```

Do not print the URL or password.

### 6. Create the monitoring network

Add a dedicated Docker network to the existing Compose project:

```yaml
networks:
  monitoring:
    internal: true
```

Attach:

- Prometheus;
- Node Exporter;
- cAdvisor;
- PostgreSQL Exporter;
- API;
- Grafana, where datasource access requires it.

The API should remain on its existing application networks as well.

PostgreSQL Exporter must also reach the database network.

Do not publish exporter ports to the host.

### 7. Configure Node Exporter

Use read-only host mounts and the least privilege required by the selected image.

Typical arguments:

```text
--path.procfs=/host/proc
--path.sysfs=/host/sys
--path.rootfs=/rootfs
--collector.filesystem.mount-points-exclude=<reviewed-regex>
--collector.textfile.directory=/var/lib/node-exporter/textfile
```

Typical mounts:

```text
/proc:/host/proc:ro
/sys:/host/sys:ro
/:/rootfs:ro,rslave
/srv/gym-tracker/data/node-exporter-textfile:/var/lib/node-exporter/textfile:ro
```

Do not publish port `9100` to the host.

Verify that container and pseudo filesystems are excluded from misleading host disk panels.

### 8. Configure cAdvisor

Inspect the selected image’s documented requirements.

Use only required mounts, commonly:

```text
/:/rootfs:ro
/var/run:/var/run:ro
/sys:/sys:ro
/var/lib/docker:/var/lib/docker:ro
/dev/disk:/dev/disk:ro
```

Add devices or elevated privilege only when the image cannot collect required metrics otherwise, and document the reason.

Do not expose port `8080` to the host.

Verify that container names, service labels, CPU, memory, network, restart, and filesystem metrics are available.

### 9. Configure PostgreSQL Exporter

Requirements:

- use the monitoring role;
- read the datasource from a secret file or generated restricted environment file;
- join `monitoring` and `database` networks;
- publish no host port;
- add a health check where supported;
- avoid custom queries containing sensitive row data.

Verify exporter logs contain no password or full connection URL.

### 10. Configure Prometheus

Create:

```text
/srv/gym-tracker/deploy/monitoring/prometheus/prometheus.yml
```

Initial settings should include:

- global scrape interval appropriate for a small private server, such as `15s` or `30s`;
- evaluation interval matching operational needs;
- explicit scrape jobs;
- rule-file directory;
- external labels identifying `gym-prod` and the production environment;
- no embedded secrets.

Required jobs:

```yaml
scrape_configs:
  - job_name: prometheus
  - job_name: api
  - job_name: node
  - job_name: cadvisor
  - job_name: postgres
```

Use Docker service names, not host IPs.

Configure initial retention conservatively, for example:

```text
--storage.tsdb.retention.time=15d
--storage.tsdb.retention.size=5GB
```

These values are starting limits and must be checked against actual cardinality and disk use.

Prometheus must not have a host-published port.

Validate configuration before startup:

```bash
sudo docker run --rm \
  -v /srv/gym-tracker/deploy/monitoring/prometheus:/etc/prometheus:ro \
  '<prometheus-image>' \
  promtool check config /etc/prometheus/prometheus.yml
```

### 11. Configure Grafana secrets and storage

Create a random administrator password:

```text
/srv/gym-tracker/secrets/grafana-admin-password
```

Set:

```bash
chmod 0600 /srv/gym-tracker/secrets/grafana-admin-password
```

Grafana requirements:

- persistent data under `/srv/gym-tracker/data/grafana`;
- anonymous access disabled;
- sign-up disabled;
- administrator password sourced from a secret file where supported;
- no public URL assumption;
- publication only on `127.0.0.1:3001`;
- internal access to Prometheus by service name.

Required publication:

```yaml
ports:
  - "127.0.0.1:3001:3000"
```

Do not bind to any LAN address.

### 12. Provision the Prometheus datasource

Create a datasource provisioning file under:

```text
/srv/gym-tracker/deploy/monitoring/grafana/provisioning/datasources/
```

Requirements:

- stable UID such as `prometheus-main`;
- internal URL such as `http://prometheus:9090`;
- default datasource enabled;
- editable setting deliberately chosen;
- no credentials embedded.

Validate provisioning through Grafana logs and API after startup.

### 13. Provision dashboard loading

Create a dashboard provider under:

```text
/srv/gym-tracker/deploy/monitoring/grafana/provisioning/dashboards/
```

Load dashboards from:

```text
/srv/gym-tracker/deploy/monitoring/grafana/dashboards/
```

Provisioned dashboards should be file-controlled and reproducible.

Do not rely only on manual dashboard edits stored in Grafana’s database.

### 14. Create the initial dashboards

Create three dashboards with these stable identifiers:

```text
gpt-service-overview
gpt-host-containers
gpt-postgresql
```

#### `gpt-service-overview`

Include:

- current deployed commit or version;
- API up/down state;
- request rate;
- response status distribution;
- p50, p95, and p99 latency where histogram data supports it;
- active requests where available;
- process CPU and memory;
- API container restarts;
- PostgreSQL connectivity;
- reverse-proxy request rate if metrics are available;
- Prometheus target health summary.

#### `gpt-host-containers`

Include:

- host uptime;
- CPU usage and load;
- memory and swap;
- root filesystem free space;
- disk I/O;
- network throughput and errors;
- per-container CPU and memory;
- container restart counts;
- Docker storage growth;
- optional temperature only if a reliable T2-compatible metric source exists.

Do not fabricate temperature panels when no trustworthy sensor metric exists.

#### `gpt-postgresql`

Include:

- exporter and database availability;
- active, idle, and maximum connections;
- transaction rate;
- commits and rollbacks;
- database size;
- cache-hit ratio where meaningful;
- locks and deadlocks;
- long-running sessions where safely available;
- temporary-file activity;
- checkpoint or WAL behavior where exporter metrics support it.

Avoid displaying query text or user data.

### 15. Add Compose services

Extend the existing Compose project with:

```text
prometheus
grafana
node-exporter
cadvisor
postgres-exporter
```

Requirements:

- pinned images;
- correct networks;
- persistent data paths;
- health checks where practical;
- `restart: unless-stopped`;
- no host publication except Grafana localhost;
- inherited Docker log rotation;
- no unnecessary `privileged: true`.

Validate:

```bash
cd /srv/gym-tracker/deploy/compose
sudo docker compose config
```

Inspect the rendered output for secrets and accidental publications.

### 16. Start the monitoring stack

Run:

```bash
sudo docker compose up -d \
  node-exporter \
  cadvisor \
  postgres-exporter \
  prometheus \
  grafana
```

Inspect:

```bash
sudo docker compose ps
sudo docker compose logs --tail=200 prometheus
sudo docker compose logs --tail=200 grafana
sudo docker compose logs --tail=200 node-exporter
sudo docker compose logs --tail=200 cadvisor
sudo docker compose logs --tail=200 postgres-exporter
```

### 17. Verify Prometheus targets

Query Prometheus from inside its container or monitoring network.

Confirm all required jobs are `UP`:

```text
prometheus
api
node
cadvisor
postgres
```

Verify scrape errors, label cardinality, and metric availability.

Prometheus must not be reachable through a host port.

### 18. Verify Grafana through an SSH tunnel

From the MacBook:

```bash
ssh -L 3001:127.0.0.1:3001 gym-prod
```

Open:

```text
http://127.0.0.1:3001
```

Verify:

- anonymous access is disabled;
- administrator login works;
- Prometheus datasource is healthy;
- all three dashboards are provisioned;
- panels load without errors;
- no dashboard contains secrets;
- data corresponds to `gym-prod` and the deployed stack.

### 19. Verify host publications

Run:

```bash
sudo ss -lntup
sudo docker compose ps
sudo ufw status verbose
sudo iptables -S DOCKER-USER
```

Expected monitoring publication:

```text
127.0.0.1:3001
```

There must be no LAN listener for:

```text
3000
3001
9090
9100
9187
8080
```

From the MacBook, attempts to reach these ports on `192.168.1.57` must fail.

### 20. Restart and reboot verification

Restart:

```bash
sudo docker compose restart \
  prometheus grafana node-exporter cadvisor postgres-exporter
```

Verify all targets and dashboards again.

Before reboot:

```bash
sudo docker compose ps
sudo ss -lntup
```

Reboot:

```bash
sudo reboot
```

Reconnect and verify:

```bash
cd /srv/gym-tracker/deploy/compose
sudo docker compose ps
sudo ss -lntup
```

Reopen the SSH tunnel and verify dashboards after reboot.

Confirm Prometheus historical data and Grafana configuration persist.

---

## Rollback and recovery

### Prometheus configuration fails

Validate with `promtool`, restore the previous file, and restart only Prometheus.

Do not delete the Prometheus data directory to solve a configuration problem.

### Grafana fails to start

Inspect:

```bash
sudo docker compose logs --tail=300 grafana
```

Check data-directory ownership, provisioning syntax, and secret-file access.

Do not enable anonymous access as a workaround.

### cAdvisor requires excessive privilege

Stop and document the missing metrics.

Do not grant broad privilege without understanding the requirement and reviewing alternatives.

### Exporter leaks a credential

Stop the exporter, rotate the credential, remove affected logs where safely possible, and report the incident without reproducing the secret.

---

## Required report

Create:

```text
docs/server/reports/09-monitoring-and-grafana-report.md
```

Include:

```markdown
# Stage 9 Monitoring and Grafana Report

## Executive summary
## Wave B prerequisites
## API metrics audit
## Selected images and digests
## Monitoring network design
## PostgreSQL monitoring role
## Prometheus configuration and retention
## Exporter configuration
## Grafana security and persistence
## Provisioned datasource
## Provisioned dashboards
## Prometheus target verification
## Host-publication audit
## SSH-tunnel verification
## Restart and reboot verification
## Files changed
## Deviations and deferred work
## Exact commands executed
## Recommendations for Stage 10
```

Do not include credentials or complete connection URLs.

---

## Completion criteria

Stage 9 is complete only when:

- all images are pinned;
- all five Prometheus jobs are healthy;
- PostgreSQL Exporter uses a least-privilege role;
- no monitoring service is LAN- or publicly exposed;
- Grafana is bound only to `127.0.0.1:3001`;
- the Prometheus datasource is provisioned;
- all three dashboards are provisioned from files;
- dashboards show meaningful current data;
- Node Exporter textfile collection is prepared;
- persistent metrics and Grafana state survive reboot;
- the report is complete.

---

## Stop conditions

Stop and report if:

- API metrics are absent or unsafe;
- exporter credentials require excessive privileges;
- a monitoring port becomes LAN-accessible;
- Grafana anonymous access is enabled;
- cAdvisor requires unexplained broad privilege;
- metric cardinality appears unbounded;
- dashboards require sensitive user data;
- Prometheus storage grows unexpectedly during validation;
- monitoring data or configuration does not survive reboot.

Do not continue to Stage 10.
