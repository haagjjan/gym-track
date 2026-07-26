# Stage 10 — Logging and Alerting

## Objective

Make failures diagnosable and important conditions visible without exposing secrets or creating excessive operational complexity.

This stage standardizes application and infrastructure logs, establishes an initial alerting path, and proves that alerts can be delivered and cleared.

---

## Dependencies

Stage 9 must be complete and reviewed.

Required inputs:

- [`../reports/09-monitoring-and-grafana-report.md`](../reports/09-monitoring-and-grafana-report.md)
- healthy Prometheus targets;
- provisioned Grafana datasource and dashboards;
- working Fastify, Next.js, PostgreSQL, reverse proxy, and Docker stack;
- a user-approved notification destination for operational alerts.

---

## Scope

- audit current logs and sensitive-data exposure;
- standardize Fastify structured logging;
- standardize Next.js server logging;
- retain reverse-proxy JSON access logs;
- configure useful PostgreSQL logs without exposing row data;
- verify Docker and system-journal retention;
- create operational log-review scripts;
- choose and deploy the initial alerting component;
- create initial Prometheus alert rules;
- configure one private notification destination;
- test alert firing, delivery, grouping, resolution, and persistence;
- create the Stage 10 report.

---

## Explicitly out of scope

Do not:

- expose logs, Alertmanager, Grafana, or Prometheus publicly;
- deploy Loki merely because centralized logging is possible;
- store complete request or response bodies by default;
- log passwords, tokens, cookies, authorization headers, database URLs, or secrets;
- log sensitive workout or user-profile data unless explicitly required and reviewed;
- create paging policies intended for a public 24/7 SaaS operation;
- create public status pages;
- configure backup-age alerts before Stage 11 exports backup metrics;
- use production outages as the primary alert test;
- send alerts to a channel without user approval.

The initial design deliberately uses Docker logs, systemd journal, PostgreSQL logs, and structured service logs. Loki can be evaluated later if cross-service log querying becomes necessary.

---

## Safety constraints

- Redact secrets before logs are emitted, not only when displayed.
- Use bounded log retention.
- Avoid high-volume debug logging in production.
- Do not include user-specific values in Prometheus alert labels.
- Store notification credentials under `/srv/gym-tracker/secrets`.
- Do not embed tokens in Git-controlled Alertmanager or Grafana files.
- Test alerts with temporary synthetic rules where possible.
- Remove synthetic test rules after validation.
- Do not restart the full application stack when only a logging or alerting service needs reload.

---

## Logging model

Preferred flow:

```text
Fastify stdout/stderr ─────────┐
Next.js stdout/stderr ─────────┤
Caddy JSON stdout ─────────────┤
Exporter/monitoring logs ──────┤
                              v
                    Docker json-file logs
                    with bounded rotation

Host services ────────────────> systemd journal
PostgreSQL internal logs ─────> container logs
```

At this stage, logs remain local to `gym-prod` and are inspected through SSH and operational scripts.

---

## Initial alerting model

Preferred:

```text
Prometheus rules
       |
       v
Alertmanager
       |
       v
Approved notification channel
```

Grafana may display alert state, but Prometheus rule evaluation and Alertmanager should remain the primary initial alert path unless the completed Stage 9 architecture already standardizes on Grafana-managed alerting.

Do not run two competing alerting systems for the same conditions without a clear reason.

---

## Implementation steps

### 1. Audit current logging behavior

Inspect recent logs:

```bash
cd /srv/gym-tracker/deploy/compose

sudo docker compose logs --tail=300 api
sudo docker compose logs --tail=300 web
sudo docker compose logs --tail=300 proxy
sudo docker compose logs --tail=300 postgres
sudo docker compose logs --tail=200 prometheus
sudo docker compose logs --tail=200 grafana
```

Inspect host journal usage:

```bash
journalctl --disk-usage
sudo journalctl -p 0..3 -b --no-pager
```

Check Docker logging configuration:

```bash
sudo docker info --format '{{json .LoggingDriver}}'
sudo cat /etc/docker/daemon.json
```

Audit for accidental sensitive values:

```bash
sudo docker compose logs --no-color 2>/dev/null \
  | grep -Ei \
  'authorization:|bearer |password=|token=|cookie:|set-cookie:|database_url|postgresql://' \
  | head -100
```

Do not copy matched secret values into the report.

If leakage is found:

1. stop the affected logging path where practical;
2. rotate exposed credentials;
3. correct redaction;
4. document the incident without reproducing the value.

### 2. Define a common log schema

For structured application logs, standard fields should include where applicable:

```text
timestamp
level
service
environment
version
request_id
method
normalized_route
status_code
duration_ms
error_type
error_code
```

Do not include by default:

```text
password
authorization header
cookie values
request body
response body
email address
session token
database URL
raw SQL parameters
exercise notes or health-related free text
```

Request IDs may be logged as event fields but must not become Prometheus labels.

### 3. Standardize Fastify logging

Inspect the existing Fastify logger configuration.

Requirements:

- JSON logs in production;
- ISO timestamp or documented epoch format;
- service name `api`;
- deployed version/commit available;
- request ID generated or propagated;
- normalized route rather than raw URL where possible;
- request duration and status code;
- stack trace for unexpected server errors;
- redaction of sensitive headers and fields;
- no normal request body logging;
- configurable log level with production default such as `info`.

Fastify/Pino redaction should cover at least:

```text
req.headers.authorization
req.headers.cookie
res.headers.set-cookie
password
token
secret
DATABASE_URL
```

Adapt paths to the actual log object structure.

Required repository changes must be made through the normal code-review and deployment process, not by editing built container files.

Add tests proving that representative credentials are absent from emitted logs.

### 4. Standardize Next.js server logging

Inspect server-side Next.js and BFF logs.

Requirements:

- production logs go to stdout/stderr;
- service name `web`;
- deployed version recorded;
- BFF proxy errors include request ID, upstream service, status, and duration;
- authorization and cookie values are never logged;
- browser console logging is not treated as server observability;
- development-only verbose logs are disabled in production.

Do not log forwarded cookies while diagnosing BFF behavior.

### 5. Retain reverse-proxy JSON logs

Caddy should continue logging to stdout in JSON.

Log fields should support:

- timestamp;
- request method;
- URI without sensitive query parameters where possible;
- response status;
- response size;
- duration;
- client address as required for operations;
- upstream service result.

Review query strings. Sensitive query parameters must be avoided or redacted at the application design level.

Do not store authorization headers or cookies.

### 6. Configure PostgreSQL logs

Use a conservative production configuration.

Recommended principles:

- log connections and disconnections only if volume remains manageable;
- log errors and slow statements;
- log lock waits;
- log checkpoints when useful;
- include process ID, database, user, application name, and session identifier;
- do not log every statement;
- do not log statement parameters containing user data;
- avoid `log_statement = all`;
- avoid broad parameter logging.

Possible starting values, adapted to actual version and workload:

```text
log_min_duration_statement = 1000ms
log_lock_waits = on
deadlock_timeout = 1s
log_checkpoints = on
```

Apply through a reviewed PostgreSQL configuration method compatible with the container deployment.

Reload PostgreSQL where supported instead of restarting it unnecessarily.

### 7. Verify retention boundaries

Confirm Docker log rotation from Wave A:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Inspect actual container log settings:

```bash
for id in $(sudo docker compose ps -q); do
  sudo docker inspect "$id" \
    --format '{{.Name}} {{json .HostConfig.LogConfig}}'
done
```

Confirm journal retention remains bounded:

```bash
systemd-analyze cat-config systemd/journald.conf
journalctl --disk-usage
```

Do not create unbounded host log files in `/srv/gym-tracker/logs`.

### 8. Create log-review scripts

Create:

```text
/srv/gym-tracker/scripts/logs-recent.sh
/srv/gym-tracker/scripts/logs-errors.sh
/srv/gym-tracker/scripts/logs-follow.sh
/srv/gym-tracker/scripts/log-audit.sh
```

Requirements:

- `set -euo pipefail`;
- fixed Compose directory and project;
- support service selection;
- use bounded time windows and line counts by default;
- never print secret files;
- `log-audit.sh` checks for suspicious credential patterns without echoing complete matches;
- scripts must not alter logs.

Set:

```bash
chmod 0750 /srv/gym-tracker/scripts/log*.sh
```

### 9. Select and pin Alertmanager

Select a stable pinned image for:

```text
prom/alertmanager
```

Pull and record digest:

```bash
sudo docker pull 'prom/alertmanager:<selected-tag>'
sudo docker image inspect 'prom/alertmanager:<selected-tag>' \
  --format '{{index .RepoDigests 0}}'
```

Do not use `latest`.

### 10. Choose one notification channel

The user must approve one channel before credentials are configured.

Possible initial channels:

- a dedicated email address;
- Slack webhook;
- Discord webhook;
- Telegram bot/chat;
- another supported private channel.

Create secret files such as:

```text
/srv/gym-tracker/secrets/alerting-email-password
/srv/gym-tracker/secrets/alerting-webhook-url
/srv/gym-tracker/secrets/alerting-telegram-token
```

Create only files needed by the selected channel.

Set mode `0600` and do not commit or print values.

If no notification channel is approved, configure local alert evaluation but do not claim Stage 10 completion.

### 11. Configure Alertmanager

Create:

```text
/srv/gym-tracker/deploy/monitoring/alertmanager/alertmanager.yml
```

Configuration must define:

- route grouping;
- group wait, group interval, and repeat interval;
- severity handling;
- one approved receiver;
- inhibition so critical alerts suppress redundant warnings where appropriate;
- resolved notifications;
- no embedded credentials.

Use a generated runtime configuration or supported environment/secret mechanism when the receiver requires a secret value.

Persist Alertmanager state under:

```text
/srv/gym-tracker/data/alertmanager
```

Alertmanager must join the monitoring network and have no host-published port.

Validate configuration with `amtool` or the image’s built-in validation tools before startup.

### 12. Connect Prometheus to Alertmanager

Add Alertmanager to Prometheus configuration using the internal Docker service name.

Example intent:

```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

Prometheus and Alertmanager must communicate only over the monitoring network.

Validate with `promtool` before reload.

### 13. Create initial alert rules

Create version-controlled rule files under:

```text
/srv/gym-tracker/deploy/monitoring/prometheus/rules/
```

Use stable alert names and useful annotations.

Initial rule groups should cover:

#### Availability

- API scrape target down;
- PostgreSQL exporter/database down;
- Node Exporter down;
- cAdvisor down;
- reverse proxy or web health unavailable when a metric exists.

#### Host capacity

- root filesystem low free space;
- sustained high memory pressure;
- sustained high CPU/load;
- excessive swap usage where swap exists;
- filesystem read-only or serious node errors where metrics support it.

#### Containers

- important container absent or stopped;
- repeated container restarts;
- sustained container memory pressure;
- container CPU saturation where meaningful.

#### Application

- elevated HTTP 5xx rate;
- elevated p95 request latency;
- zero traffic alert only when traffic is normally expected;
- API process restart or unavailable health metric.

#### PostgreSQL

- connection usage above a reviewed percentage;
- deadlocks increasing;
- long-running transaction/session threshold;
- database size growth warning only after a baseline exists.

Avoid thresholds that create constant noise on a small private server.

Every alert must include:

```text
summary
description
severity
service or component
suggested first diagnostic action
```

Do not include user identifiers or secret values.

### 14. Validate alert rules

Run:

```bash
sudo docker run --rm \
  -v /srv/gym-tracker/deploy/monitoring/prometheus:/etc/prometheus:ro \
  '<prometheus-image>' \
  promtool check rules /etc/prometheus/rules/*.yml
```

Also validate the full Prometheus configuration.

### 15. Deploy Alertmanager and reload Prometheus

Add `alertmanager` to the existing Compose project with:

- pinned image;
- monitoring network only;
- persistent state;
- restricted configuration mount;
- restart policy;
- health check where practical;
- no host-published port.

Deploy:

```bash
cd /srv/gym-tracker/deploy/compose
sudo docker compose up -d alertmanager prometheus
```

Inspect:

```bash
sudo docker compose ps
sudo docker compose logs --tail=200 alertmanager
sudo docker compose logs --tail=200 prometheus
```

### 16. Test alert delivery safely

Create a temporary synthetic alert rule such as a continuously true vector expression.

Requirements:

- clear name indicating test only;
- severity `info` or `warning`;
- short `for` duration;
- no production outage;
- no user data.

Verify:

1. Prometheus evaluates the alert as pending and then firing;
2. Alertmanager receives it;
3. the approved notification destination receives it;
4. grouping and formatting are understandable;
5. removing the test rule produces a resolved notification where configured.

Remove the synthetic test rule immediately after validation and reload Prometheus.

Record delivery timestamps without recording tokens or full message metadata that contains private information.

### 17. Test a real rule non-destructively

Where possible, test one real rule by temporarily lowering a threshold or pausing a non-critical exporter rather than stopping the application or database.

Restore the normal threshold or service immediately after validation.

Do not intentionally corrupt data, fill the disk, or stop PostgreSQL for testing.

### 18. Verify alert visibility in Grafana

Through the existing SSH tunnel, confirm that alert state is visible in Grafana dashboards or alert views.

Add summary panels where useful:

- active critical alerts;
- active warning alerts;
- target health;
- recent container restarts.

Do not duplicate full alert management unnecessarily.

### 19. Verify host publications

Run:

```bash
sudo ss -lntup
sudo docker compose ps
sudo ufw status verbose
sudo iptables -S DOCKER-USER
```

Alertmanager must not be host- or LAN-accessible.

From the MacBook, attempts to reach port `9093` on `192.168.1.57` must fail.

### 20. Restart and reboot verification

Restart only logging/alerting-related services where possible:

```bash
sudo docker compose restart prometheus alertmanager
```

Verify rule loading and delivery state.

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
sudo docker compose logs --tail=100 alertmanager
sudo docker compose logs --tail=100 prometheus
```

Confirm:

- Alertmanager state persists as designed;
- Prometheus rules load;
- no test alert remains;
- notification configuration still works;
- monitoring ports remain private;
- application and database remain healthy.

---

## Rollback and recovery

### Logging change causes service failure

Revert the application configuration or image to the last known-good deployment.

Do not remove logging entirely as a shortcut; return to the previous safe configuration.

### Secret appears in logs

1. stop the affected emission path;
2. rotate the secret;
3. correct redaction;
4. assess local log retention and access;
5. document the incident without reproducing the secret.

### Alertmanager configuration fails

Validate the file, restore the previous version, and restart only Alertmanager.

Prometheus metrics collection should remain operational even while notification delivery is repaired.

### Alert storm occurs

Use Alertmanager silencing or temporarily disable the specific noisy rule.

Do not disable the complete monitoring stack.

Then tune threshold, duration, labels, or grouping based on observed behavior.

---

## Required report

Create:

```text
docs/server/reports/10-logging-and-alerting-report.md
```

Include:

```markdown
# Stage 10 Logging and Alerting Report

## Executive summary
## Existing log audit
## Sensitive-data audit
## Fastify logging changes
## Next.js and BFF logging changes
## Reverse-proxy logging
## PostgreSQL logging configuration
## Retention verification
## Operational log scripts
## Selected alerting architecture
## Alertmanager image and digest
## Notification channel and secret filenames
## Alert rules created
## Synthetic alert test
## Real-rule validation
## Grafana alert visibility
## Host-publication audit
## Restart and reboot verification
## Files changed
## Deviations and deferred work
## Exact commands executed
## Recommendations for Stage 11
```

Do not include notification tokens, passwords, complete webhook URLs, cookies, or user data.

---

## Completion criteria

Stage 10 is complete only when:

- application and proxy logs are structured and useful;
- sensitive values are redacted;
- PostgreSQL logs support diagnosis without broad statement logging;
- Docker and journal retention remain bounded;
- operational log scripts exist;
- Alertmanager or the approved equivalent is deployed privately;
- initial alert rules validate and load;
- one approved notification channel works;
- a synthetic alert fires, delivers, and resolves;
- at least one real rule is validated safely;
- no monitoring or alerting port is LAN-accessible;
- the stack survives reboot;
- the report is complete.

---

## Stop conditions

Stop and report if:

- logs contain credentials or sensitive user data;
- required redaction cannot be proven;
- alert delivery requires committing a secret;
- no notification channel is approved;
- alerts produce uncontrolled noise;
- Alertmanager becomes LAN- or publicly accessible;
- application logging changes break production behavior;
- rule evaluation materially overloads the server;
- configuration does not survive reboot.

Do not continue to Stage 11.
