# Stage 10 — Logging and Alerting Report

**Server:** `gym-prod`

**Completed:** 2026-07-22

**Application snapshot:** `73dcc1086802abbf2cbd96e8b1f99502b4c543b1`

**Notification destination:** Private Telegram chat

**Result:** Passed

## Executive summary

Stage 10 completed successfully. Production application logs now use bounded structured fields, Caddy redacts selected sensitive query parameters, PostgreSQL records slow statements and lock diagnostics without parameter values or error-statement text, and four operator log-review scripts are installed. Docker and journal retention remain bounded.

Prometheus loads 23 version-controlled alert rules and sends them to Alertmanager `0.32.1`. Alertmanager is not host-published. It uses the internal monitoring network for Prometheus traffic and a dedicated single-service bridge for outbound HTTPS to Telegram. Its bot token and private chat ID exist only as protected server files and Docker secret copies.

The operator confirmed firing and resolved Telegram messages for both a synthetic rule and the real `GymTrackerNodeExporterDown` rule. Monitoring restart and host reboot verification passed. The final host exposes only private-LAN port `80`; Grafana remains loopback-only and Alertmanager port `9093` is not published. Production row-count state was hashed before the change and matched after deployment and reboot.

Stage 11 was not started.

## Existing log audit

Observed before mutation:

- Stage 9 was complete and all five original Prometheus targets were healthy.
- The application was live at `192.168.1.57:80`.
- Docker used bounded `json-file` logs with `max-size=10m` and `max-file=3` on every inspected container.
- The journal was bounded to 1 GiB and 30 days and used approximately 152 MiB during the initial audit.
- Exact deployed-secret matches in the inspected 24-hour logs were zero.
- PostgreSQL slow-statement and lock-wait logging were not yet enabled.
- Caddy used JSON access logs but did not yet filter selected query parameters.
- The operator approved Telegram and created a private bot through `@BotFather` before deployment.

The current application was captured through a temporary Git index and local-only bundle. The real local index, `main`, and working tree were not changed. Nothing was pushed and no ordinary development commit was created.

## Observed facts and assumptions

### Observed facts

- Server repository HEAD is `73dcc1086802abbf2cbd96e8b1f99502b4c543b1` and the checkout is clean.
- API and web images use tag `73dcc1086802` and report the full snapshot as their release.
- Alertmanager image, configuration, container identity, health, persistence, and Telegram delivery were verified.
- Six Prometheus jobs are `UP`: `prometheus`, `api`, `node`, `cadvisor`, `postgres`, and `alertmanager`.
- Prometheus loaded 23 alert rules after restart and reboot.
- Both synthetic and real-rule firing/resolution notifications were confirmed by the operator.
- Exact deployed-secret matches in the final bounded log audit were zero.
- The production row-count hash matched after deployment and reboot.
- The boot ID changed from `17e9d1d6-079a-4c48-96b2-3e896f63b947` to `2a05ea32-e155-4b92-a282-c52d342f2dee`.
- Final failed systemd unit count is zero.
- Final Ethernet port audit found only `80` open. Ports `3000`, `3001`, `4000`, `5432`, `8080`, `9090`, `9093`, `9100`, and `9187` were closed from the MacBook. Wi-Fi port `9093` was also closed.

### Assumptions and interpretation

- Suspicious-pattern matches in PostgreSQL, Caddy, and Grafana are review signals, not confirmed leaks. The exact-secret comparison was authoritative for deployed secret files and returned zero. Matched log lines and values were deliberately not copied into this report.
- The `GymTrackerRepeatedContainerRestarts` warning for proxy and Grafana was expected after repeated controlled configuration restarts during Stage 10. It did not indicate an application outage and should clear when the 30-minute lookback ages out.
- The operator's `done` response after the directed Grafana check is treated as completion of the visual panel review. Provisioned JSON independently contains both alert panels.

## Sensitive-data audit

The final bounded audit found no exact matches for any deployed secret. The heuristic pattern scan reported review signals only:

| Service | Suspicious-pattern count |
| --- | ---: |
| PostgreSQL | 1 |
| API | 0 |
| Web | 0 |
| Caddy proxy | 6 |
| Prometheus | 0 |
| Grafana | 12 |
| Node Exporter | 0 |
| cAdvisor | 0 |
| PostgreSQL Exporter | 0 |
| Alertmanager | 0 |

PostgreSQL, Caddy, and Grafana were the three services requiring manual classification. No matched line or value is reproduced here. The deployed-secret comparison, application redaction tests, Caddy marker test, and Telegram configuration review all passed.

## Alertmanager image and digest

| Component | Exact image or release |
| --- | --- |
| API | `gym-tracker-api:73dcc1086802` |
| Web | `gym-tracker-web:73dcc1086802` |
| Alertmanager | `docker.io/prom/alertmanager:v0.32.1@sha256:51a825c2a40acc3e338fdd00d622e01ec090f72be2b3ea46be0839cd47a4d286` |
| Prometheus | `docker.io/prom/prometheus:v3.5.2@sha256:f0a6cf785cde2d1e9b201ae1921391eab7fcbb08ce64d8a9d840c087c09b8355` |
| Grafana | `docker.io/grafana/grafana:13.1.0@sha256:6ea068891652aa6a65ca9065c26b89de939653803c836426970305c11fd00534` |
| Caddy | `docker.io/library/caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648` |

Alertmanager's declared `nobody` identity was resolved and verified as UID/GID `65534:65534`. It runs read-only with all capabilities dropped, `no-new-privileges`, a bounded temporary filesystem, and persistent state under `/srv/gym-tracker/data/alertmanager`.

## Fastify logging changes

Production API request events contain:

```text
timestamp
level
service
environment
version
event
request_id
method
normalized_route
status_code
duration_ms
error_type       # failures only
error_code       # failures only
error_stack      # unexpected failures only, message line removed
```

Fastify default request logging is disabled in favor of the reviewed lifecycle event. Caller request IDs are accepted only when they match the safe bounded character set; otherwise a UUID is generated. The response returns `x-request-id`. A deterministic production check proved the ID was present in the emitted log.

The Pino redaction list covers request bodies, authorization, cookies, set-cookie, passwords, tokens, secrets, email destinations, database URLs, and session-token forms. Representative redaction and request-log tests passed.

## Next.js and BFF logging changes

The web service emits JSON only for BFF failures. It propagates a validated request ID and records the safe upstream name, normalized target path, status, duration, and error classification. It does not record forwarded cookies, authorization values, raw identifiers, response bodies, or exception messages.

## Mail fallback

Production no-provider email behavior no longer prints recipient addresses, message content, or action links. Development retains its intentional local preview behavior. Resend failures record only a status classification, not provider response content.

## Reverse-proxy logging

Caddy continues to log JSON to stdout. Its filter redacts values for:

```text
token
code
reset_token
verification_token
state
```

The filter uses Caddy's documented `request>uri` query filter. A unique synthetic query marker was sent after the proxy restart; the raw marker was absent and the `REDACTED` replacement was present. Caddy's default redaction for authorization and cookie headers remains enabled.

## PostgreSQL logging configuration

The following values were applied with `ALTER SYSTEM` and activated through `pg_reload_conf()` without a database restart:

```text
log_min_duration_statement = 1000ms
log_lock_waits = on
deadlock_timeout = 1s
log_checkpoints = on
log_statement = none
log_parameter_max_length = 0
log_parameter_max_length_on_error = 0
log_min_error_statement = panic
log_error_verbosity = terse
log_duration = off
log_connections = off
log_disconnections = off
log_line_prefix = '%m [%p] %q%u@%d/%a session=%c '
```

The API PostgreSQL pool sets `application_name=gym-tracker-api`. A controlled `SELECT pg_sleep(1.1)` proved slow-statement logging. Application queries remain parameterized, parameter values are disabled, ordinary error statement text is suppressed, and terse errors omit detail fields that commonly contain row values.

The prior settings were captured as executable rollback SQL without application data.

## Retention verification

Final bounded retention:

| Store | Boundary |
| --- | --- |
| Docker container logs | Three files of 10 MiB per container |
| systemd journal | 1 GiB and 30 days |
| Prometheus metrics | 30 days and 5 GB |
| Alertmanager state | 120 hours |

## Operational log scripts

Installed operator commands:

```text
/srv/gym-tracker/scripts/logs-recent.sh
/srv/gym-tracker/scripts/logs-errors.sh
/srv/gym-tracker/scripts/logs-follow.sh
/srv/gym-tracker/scripts/log-audit.sh
```

They accept only known Compose service names and use bounded time/line windows. `log-audit.sh` never prints secret values. Docker remains privileged; `sudo -v` may be used once before a focused review rather than granting passwordless Docker access.

## Selected alerting architecture

Routing behavior:

```text
group_by: alertname, component, severity
group_wait: 30s
group_interval: 1m
warning repeat: 6h
critical repeat: 1h
send_resolved: true
```

A critical alert inhibits a warning for the same component. Messages contain only status, alert name, severity, component, reviewed summary, reviewed description, and first action. No metric labels contain user, request, session, workout, exercise, email, or token values.

Alertmanager has two networks:

- `gym-tracker_monitoring`, internal, for Prometheus traffic;
- `gym-tracker_alerting-egress`, dedicated to Alertmanager alone, for outbound Telegram HTTPS.

There is no `ports` mapping for Alertmanager. The final check confirmed exactly one container on the egress bridge and no host listener on `9093`.

## Alert rules created

The 23 rules are grouped as follows:

| Group | Rules |
| --- | ---: |
| Availability | 7 |
| Host capacity and integrity | 8 |
| Containers | 2 |
| Application | 3 |
| PostgreSQL | 3 |

Covered conditions include API/PostgreSQL/exporter/Alertmanager availability, proxy/web container absence, root-disk warning and critical thresholds, memory/CPU/load/swap pressure, read-only root filesystem, host/container OOM, repeated container restarts, API 5xx and p95 latency, API process restart, PostgreSQL connection saturation, deadlock, and sustained long transactions.

Every rule includes `severity`, `component`, `summary`, `description`, and `first_action`.

## Synthetic alert test

The temporary rule `GymTrackerStage10SyntheticDelivery` used `vector(1)` with a 15-second hold. The operator confirmed its Telegram `firing` message. The rule file was removed, Prometheus reloaded, and the operator confirmed the `resolved` message. The temporary rule is absent after restart and reboot.

## Real-rule validation

Node Exporter was paused without stopping the application or database. After the real five-minute hold, `GymTrackerNodeExporterDown` fired and its Telegram message was confirmed. Node Exporter was immediately unpaused, returned to `UP`, and the operator confirmed the resolved message.

## Incidental real warning

`GymTrackerRepeatedContainerRestarts` correctly fired for proxy and Grafana because controlled Stage 10 troubleshooting restarted both more than twice inside 30 minutes. The message was useful and contained no sensitive data. It was not miscounted as the synthetic resolution.

## Grafana alert visibility

The Service overview now expects six targets and contains:

```text
Active critical alerts
Active warning alerts
```

The provisioned dashboard JSON was validated. The operator completed the directed tunnel-based panel review. During setup the warning panel could legitimately remain non-zero because of the repeated-restart warning; the critical panel was expected to remain zero.

## Host-publication audit

The final MacBook-to-server scan found only private-LAN port `80` open. Ports `3000`, `3001`, `4000`, `5432`, `8080`, `9090`, `9093`, `9100`, and `9187` were closed on Ethernet; Alertmanager port `9093` was also closed on the Wi-Fi path. Grafana remains bound to server loopback and is reached only through an SSH tunnel.

## Notification channel and secret filenames

Operator copies, mode `0600`, owner `admin-gym:gym-tracker`:

```text
/srv/gym-tracker/secrets/alerting-telegram-bot-token
/srv/gym-tracker/secrets/alerting-telegram-chat-id
```

Container copies, mode `0440`, owner `root:65534`:

```text
/srv/gym-tracker/secrets/alerting-telegram-bot-token-container
/srv/gym-tracker/secrets/alerting-telegram-chat-id-container
```

The token was entered through a silent terminal read. The private chat ID was derived from the operator's `/start` message without printing it. Neither value is stored in Git, this report, shell history, the candidate directory, or the Stage 10 state file.

## Files changed

Important repository paths:

```text
apps/api/src/shared/logger.ts
apps/api/src/shared/request-logging.ts
apps/api/src/shared/mailer.ts
apps/api/src/db/database.ts
apps/web/src/shared/server-logging.ts
apps/web/src/features/auth/auth-api-proxy.ts
apps/web/src/features/analytics/analytics-api-proxy.ts
apps/web/src/features/workouts/workout-api-proxy.ts
compose.monitoring.yaml
ops/logging/
ops/monitoring/alertmanager/alertmanager.yaml
ops/monitoring/prometheus/prometheus.yaml
ops/monitoring/prometheus/rules/alerts.yaml
ops/monitoring/grafana/dashboards/service-overview.json
```

Important live server paths:

```text
/srv/gym-tracker/deploy/compose/compose.yaml
/srv/gym-tracker/deploy/config/caddy/Caddyfile
/srv/gym-tracker/deploy/monitoring/alertmanager/alertmanager.yml
/srv/gym-tracker/deploy/monitoring/prometheus/prometheus.yml
/srv/gym-tracker/deploy/monitoring/prometheus/rules/alerts.yaml
/srv/gym-tracker/deploy/monitoring/grafana/dashboards/service-overview.json
/srv/gym-tracker/data/alertmanager/
/srv/gym-tracker/state/stage10-logging-alerting.env
```

The application schema and migration ledger did not change.

## Restart and reboot verification

| Gate | Result |
| --- | --- |
| API tests | 160 passed |
| Web tests | 23 passed |
| API and web type checks | Passed |
| API and web production builds | Passed |
| Scoped ESLint | Passed |
| Alertmanager configuration | Passed with `amtool` 0.32.1 |
| Prometheus configuration and rules | Passed; 23 rules |
| Combined Compose configuration | Passed |
| Grafana dashboard JSON | Passed |
| Caddy configuration and query redaction | Passed |
| PostgreSQL reload and slow-log check | Passed |
| Exact secret log scan | Zero matches |
| Prometheus targets | 6/6 `UP` |
| Synthetic firing/resolution | Operator confirmed |
| Real firing/resolution | Operator confirmed |
| Monitoring restart | Passed |
| Host reboot | Passed |
| Production row-count hash | Unchanged |
| Failed systemd units | 0 |
| Server repository | Clean |
| Host exposure | Only Ethernet `80`; Grafana loopback-only; Alertmanager unpublished |

## Deviations and deferred work

All failures stopped at explicit gates and were corrected without data loss:

1. Initial `amtool` validation could not read candidate YAML at mode `0640` as UID 65534. Non-secret candidate configuration was changed to mode `0644`; live configuration remains protected at `0440`.
2. Prometheus initially retained its Stage 9 in-memory configuration, so only five jobs appeared. Prometheus was recreated from the validated file with its persistent data bind intact; six jobs then loaded.
3. Caddy initially retained its old in-memory log encoder, causing the synthetic query marker to appear. Proxy restart loaded the validated filter; a unique retry marker was redacted.
4. The first alert-test helper evaluated a local timeout variable before assignment under `set -u`. The declaration was split and shell syntax revalidated.
5. Telegram delivery initially failed because Alertmanager had only an internal Docker network. A dedicated single-service egress bridge was added without publishing a port. Firing and resolution then passed.
6. The first post-restart request-ID assertion raced an asynchronous log write. Final verification used a unique, safe propagated ID and a longer bounded wait; it passed without repeating alert tests.

These corrections explain the controlled proxy, Grafana, Prometheus, and Alertmanager restarts recorded during the stage.

No required Stage 10 work remains deferred. Central log aggregation, public uptime monitoring, backup-derived alerts, and additional notification channels remain deliberately outside this stage.

## Rollback state

Rollback directory:

```text
/srv/gym-tracker/releases/stage10-20260722T120407Z
```

It contains the Stage 9 Compose file, Caddyfile, Prometheus configuration, Service overview dashboard, and executable SQL that restores the prior PostgreSQL logging settings and reloads them. Telegram secret files may be removed only as part of an explicit rollback after Alertmanager is stopped. No rollback was required.

## Exact commands executed

Representative local validation and snapshot commands:

```bash
pnpm --filter @gym-progress-tracker/api test
pnpm --filter @gym-progress-tracker/web test
pnpm --filter @gym-progress-tracker/api type-check
pnpm --filter @gym-progress-tracker/web type-check
pnpm --filter @gym-progress-tracker/api build
pnpm --filter @gym-progress-tracker/web build

docker run --rm --entrypoint /bin/amtool -v "$PWD/ops/monitoring/alertmanager/alertmanager.yaml:/etc/alertmanager/alertmanager.yaml:ro" docker.io/prom/alertmanager:v0.32.1@sha256:51a825c2a40acc3e338fdd00d622e01ec090f72be2b3ea46be0839cd47a4d286 check-config /etc/alertmanager/alertmanager.yaml
docker run --rm --entrypoint /bin/promtool -v "$PWD/ops/monitoring/prometheus:/etc/prometheus:ro" docker.io/prom/prometheus:v3.5.2@sha256:f0a6cf785cde2d1e9b201ae1921391eab7fcbb08ce64d8a9d840c087c09b8355 check config /etc/prometheus/prometheus.yaml
POSTGRES_MONITOR_PASSWORD_FILE=/dev/null GRAFANA_ADMIN_PASSWORD_FILE=/dev/null ALERTMANAGER_TELEGRAM_BOT_TOKEN_FILE=/dev/null ALERTMANAGER_TELEGRAM_CHAT_ID_FILE=/dev/null docker compose -f compose.yaml -f compose.monitoring.yaml config --quiet
git bundle verify /tmp/gym-prod-snapshot-20260722-stage10-v2.bundle
```

Operator entry points:

```bash
sudo /home/admin-gym/codex-stage10-candidate/stage10-server.sh apply
sudo /home/admin-gym/codex-stage10-candidate/stage10-server.sh resume
sudo /home/admin-gym/codex-stage10-candidate/stage10-server.sh finalize
sudo systemctl reboot
sudo /home/admin-gym/codex-stage10-candidate/stage10-server.sh post-reboot
```

Important operations executed inside the reviewed helper are shown in parameterized form because the helper resolved validated candidate paths and container IDs at runtime:

```bash
docker pull <exact-alertmanager-image>
docker compose -p gym-tracker -f <candidate-compose> config --quiet
docker compose -p gym-tracker -f <candidate-compose> build --pull api web
docker compose -p gym-tracker -f <live-compose> up -d --no-build api web proxy alertmanager prometheus grafana
docker compose -p gym-tracker -f <live-compose> up -d --no-deps --force-recreate alertmanager
docker compose -p gym-tracker -f <live-compose> up -d --no-deps --force-recreate prometheus
docker compose -p gym-tracker -f <live-compose> restart proxy grafana
docker compose -p gym-tracker -f <live-compose> restart alertmanager prometheus
docker pause <node-exporter-container>
docker unpause <node-exporter-container>
docker kill --signal HUP <prometheus-container>
psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres
SELECT pg_reload_conf();
/srv/gym-tracker/scripts/log-audit.sh
/srv/gym-tracker/scripts/check-layout.sh
```

The Telegram token was read silently and used by the helper without placing it in command arguments or output. Secret-bearing request construction is intentionally not reproduced here.

## Primary references

- [Prometheus Alertmanager configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [Caddy access-log configuration](https://caddyserver.com/docs/caddyfile/directives/log)
- [PostgreSQL 17 error reporting and logging](https://www.postgresql.org/docs/17/runtime-config-logging.html)
- [Telegram bot creation and private-chat setup](https://core.telegram.org/bots/features#creating-a-new-bot)

## Recommendations for Stage 11

Stage 11 must account for the new state and credentials:

- back up the live Compose, Caddy, Prometheus rules, Alertmanager routing, Grafana provisioning, PostgreSQL settings, state files, and operator scripts;
- never place the Telegram token or chat ID in an unencrypted backup or report;
- decide explicitly whether encrypted secret backups include the Telegram files;
- export authoritative backup success and age metrics before adding backup alerts;
- ensure off-machine copies contain the final alerting-egress topology;
- prove restoration of Alertmanager state and configuration without sending unintended notifications;
- avoid treating same-disk Alertmanager or Prometheus data as a backup.

Stage 10 is complete. Stop here for review before Stage 11.
