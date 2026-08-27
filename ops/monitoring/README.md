# Private Monitoring

This directory owns the source-controlled Prometheus and Grafana foundation. It is an operations surface for one owner, not a user-facing product dashboard.

## Metric sources

| Dashboard | Authoritative sources | Refresh |
| --- | --- | --- |
| Service overview | Fastify `prom-client`, cAdvisor, Node Exporter textfiles, and Prometheus alert state | 15 seconds |
| Host and containers | `node_exporter` and cAdvisor | 15 seconds |
| PostgreSQL | `postgres_exporter` with `pg_monitor` | 15 seconds |

The API metrics use only bounded labels: service, environment, release, method, normalized route template, and HTTP status class. The dashboards never depend on user, request, session, workout, or exercise identifiers.

Prometheus retains 30 days by default. Alertmanager retains notification and silence state for five days so restarts do not immediately repeat alerts. Grafana provisions one Prometheus data source and these stable dashboard UIDs:

- `gpt-service-overview`
- `gpt-host-containers`
- `gpt-postgresql`

## One-time setup

Copy the monitoring path variables from `.env.example` into the local `.env`; the values are file paths, not passwords. Then create the ignored secret directory:

```sh
mkdir -p ops/monitoring/secrets
chmod 700 ops/monitoring/secrets
```

Create a strong Grafana password file without putting the value in shell history:

```sh
printf 'Grafana password: '
read -r -s GRAFANA_PASSWORD
printf '\n'
printf '%s' "$GRAFANA_PASSWORD" > ops/monitoring/secrets/grafana_admin_password
chmod 600 ops/monitoring/secrets/grafana_admin_password
unset GRAFANA_PASSWORD
```

Create the least-privilege PostgreSQL monitoring role against the running local database:

```sh
docker compose up -d postgres
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < ops/monitoring/postgres/create-monitoring-role.sql
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

At the `psql` prompt, run `\\password gym_progress_monitor`, enter a new monitoring password twice, then run `\\q`. Place the same value in its ignored Docker secret file:

```sh
printf 'PostgreSQL monitoring password: '
read -r -s POSTGRES_MONITOR_PASSWORD
printf '\n'
printf '%s' "$POSTGRES_MONITOR_PASSWORD" > ops/monitoring/secrets/postgres_monitor_password
chmod 600 ops/monitoring/secrets/postgres_monitor_password
unset POSTGRES_MONITOR_PASSWORD
```

If `.env` already uses custom password-file paths, write the files there instead. Never commit either file.

The overlay also requires a private Telegram bot token and destination chat ID. Create the bot through Telegram's official `@BotFather`, open the new bot, and send it `/start`. Production setup retrieves the private chat ID after that message and writes both values directly to protected files. For local use, create the two ignored files named by `ALERTMANAGER_TELEGRAM_BOT_TOKEN_FILE` and `ALERTMANAGER_TELEGRAM_CHAT_ID_FILE`, each containing only its value with mode `600`. Never paste either value into Git, documentation, command arguments, or chat.

## Start and access

Set `APP_RELEASE` to the Git SHA or tag being deployed. Then validate and start the combined application/monitoring model:

```sh
pnpm ops:monitoring:config
pnpm ops:monitoring:start
```

Grafana listens only on `http://127.0.0.1:3001` by default. Use the configured `GRAFANA_ADMIN_USER` and the file-backed password. For remote owner access, keep the binding on loopback and use the private access method selected for the host, such as an SSH tunnel:

```sh
ssh -L 3001:127.0.0.1:3001 operator@production-host
```

Do not publish Grafana, Prometheus, exporter, PostgreSQL, or API ports through a router or public tunnel.

## Production deployment on `gym-prod`

The production copies are installed under `/srv/gym-tracker/deploy/monitoring`. Prometheus, Node Exporter, cAdvisor, PostgreSQL Exporter, and the API metrics endpoint remain on internal Docker networks. Alertmanager keeps its Prometheus path on that internal network and joins a dedicated single-service bridge only for outbound HTTPS delivery to Telegram; it publishes no host port. Grafana is the sole monitoring service with a host publication, fixed to `127.0.0.1:3001`.

Use an SSH tunnel from the administrator MacBook:

```sh
ssh -N -L 3001:127.0.0.1:3001 gym-prod-remote
```

`gym-prod-remote` uses the owner-only Cloudflare Access SSH path documented by
[ADR 0017](../../docs/decisions/0017-secure-remote-administration.md). When the MacBook is on
the private home LAN, the existing `gym-prod` alias remains a direct recovery alternative.

Then open `http://127.0.0.1:3001` and sign in as `operator`. The password remains only in the protected production secret files. Anonymous access, sign-up, plugin installation, plugin preinstallation, analytics reporting, and update checks are disabled.

Production operator commands:

```sh
/srv/gym-tracker/scripts/status.sh
/srv/gym-tracker/scripts/restart-monitoring.sh
/srv/gym-tracker/scripts/check-layout.sh
```

`restart-monitoring.sh` restarts only Prometheus, Alertmanager, Grafana, Node Exporter, cAdvisor, and PostgreSQL Exporter. It does not restart PostgreSQL or the application services. The normal `restart.sh` remains application-only.

Prometheus evaluates 31 version-controlled rules under `ops/monitoring/prometheus/rules`, including four Stage 11 backup rules and four lifecycle/email liveness rules. Alertmanager groups notifications by alert, component, and severity. A warning repeats after six hours, a critical alert after one hour, and a resolved notification is sent when the condition clears. A critical alert inhibits a simultaneous warning for the same component.

For a plain-language explanation of every production dashboard and panel, read [`docs/server/GRAFANA-DASHBOARD-GUIDE.md`](../../docs/server/GRAFANA-DASHBOARD-GUIDE.md).

## Verification

Check the Compose services and the Prometheus target report:

```sh
docker compose -f compose.yaml -f compose.monitoring.yaml ps
docker compose -f compose.yaml -f compose.monitoring.yaml exec prometheus wget -qO- 'http://localhost:9090/api/v1/targets?state=active'
```

All six scrape jobs (`prometheus`, `api`, `node`, `cadvisor`, `postgres`, and `alertmanager`) should be healthy. Generate a few app requests, then confirm the three dashboards populate, both active-alert panels and all four backup panels are present, and the Service overview release matches the deployed Git revision.

## Known boundaries

- `node_exporter` is configured for a native Linux Docker host. On Docker Desktop for macOS, host panels describe the Docker virtual machine rather than the physical Mac.
- cAdvisor does not provide a fully reliable Docker restart counter. The restart panel is explicitly best-effort; use container logs and Docker state for incident confirmation.
- The PostgreSQL long-running-transaction collector is enabled, but it intentionally does not expose query text.
- Telegram is the only notification destination. Its bot token and private chat ID are file-backed Docker secrets and Alertmanager has no host-published port.
- Loki and Sentry are not deployed. Logs stay local and bounded until centralized querying has a demonstrated need.
- Backup status comes only from the atomically written Node Exporter textfile. The warning age is 30 hours and the critical age is 48 hours around the approved 24-hour RPO.
- Public uptime monitoring remains later work. Private remote owner access is provisioned
  through the owner-only `gym-prod-remote` Cloudflare Access SSH path.
