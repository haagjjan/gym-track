# Production Log Review

Stage 10 keeps production logs in Docker's bounded `json-file` logs and the bounded systemd journal. It does not add a central log store or create unbounded files under `/srv/gym-tracker/logs`.

## Installed commands

The deployment installs these scripts under `/srv/gym-tracker/scripts`:

| Command | Default scope | Purpose |
| --- | --- | --- |
| `logs-recent.sh` | API, web, proxy, PostgreSQL; last 30 minutes; 500 lines | Review the events immediately before and during a problem. |
| `logs-errors.sh` | All services; last 2 hours; 1,000 lines | Filter for high-signal error and unhealthy events. |
| `logs-follow.sh` | API, web, proxy; last 10 minutes, then live | Follow a problem while reproducing it. Stop with `Ctrl+C`. |
| `log-audit.sh` | All services; last 24 hours; 2,000 lines each | Count suspicious patterns and fail if an exact deployed secret appears. It never prints secret values. |
| `prune-container-logs.sh` | Every container labelled as the `gym-tracker` Compose project | Remove rotated files and truncate each active `json-file` log. `--dry-run` validates every resolved path without changing logs. |

Each script accepts an optional list of service names. For example:

```sh
/srv/gym-tracker/scripts/logs-recent.sh api web
/srv/gym-tracker/scripts/logs-errors.sh postgres postgres-exporter
/srv/gym-tracker/scripts/logs-follow.sh proxy
```

Supported names are `postgres`, `api`, `web`, `proxy`, `prometheus`, `grafana`, `node-exporter`, `cadvisor`, `postgres-exporter`, and `alertmanager`.

## Sudo behavior

Docker administration remains privileged because membership in the Docker group is effectively root access. Run `sudo -v` once before a focused review; subsequent script calls normally reuse that short-lived sudo ticket. Do not add a passwordless Docker rule merely to remove these prompts.

## Privacy and interpretation

Application logs use JSON with service, environment, release, request ID, normalized route, status, and duration fields. They intentionally omit request and response bodies, email addresses, cookies, authorization headers, session tokens, database URLs, raw SQL parameters, and workout notes.

The audit's suspicious-pattern count is a review signal, not proof of leakage. Product words such as `token` can occur in a safe error description. An `exact_secret_match=yes` result is the critical condition: stop copying logs, rotate the affected credential, correct the logging path, and record the incident without reproducing the value.

Docker retains at most three 10 MiB files per container. The journal is limited to 1 GiB and 30
days. The root-owned `gym-tracker-log-retention.timer` additionally runs every Monday and removes
all Docker log content for the Gym Tracker Compose project, giving application logs a strict
seven-day maximum even when low traffic never triggers size rotation. A persistent timer runs the
missed job after downtime. Use the scripts instead of redirecting long-running log streams to
persistent files.

Install or refresh the retention job from a reviewed checkout:

```sh
sudo install -o root -g root -m 0750 \
  ops/logging/scripts/prune-container-logs.sh \
  /srv/gym-tracker/scripts/prune-container-logs.sh
sudo install -o root -g root -m 0644 \
  ops/logging/systemd/gym-tracker-log-retention.service \
  /etc/systemd/system/gym-tracker-log-retention.service
sudo install -o root -g root -m 0644 \
  ops/logging/systemd/gym-tracker-log-retention.timer \
  /etc/systemd/system/gym-tracker-log-retention.timer
sudo systemd-analyze verify \
  /etc/systemd/system/gym-tracker-log-retention.service \
  /etc/systemd/system/gym-tracker-log-retention.timer
sudo systemctl daemon-reload
sudo /srv/gym-tracker/scripts/prune-container-logs.sh --dry-run
sudo systemctl enable --now gym-tracker-log-retention.timer
```

The first destructive run is deliberate evidence collection: run `log-audit.sh` first, retain
only its sanitized counts, start `gym-tracker-log-retention.service`, then verify every current
service returns an empty `docker logs` result before allowing new logs to accumulate.
