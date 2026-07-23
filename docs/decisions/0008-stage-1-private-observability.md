# ADR 0008 - Stage 1 Private Observability

## Status

Accepted

## Context

The first remote deployment needs enough operational visibility for one owner to answer whether the API, host, containers, and PostgreSQL are healthy. The existing Render decision provides hosted service checks and logs, but the home-hosted Stage 1 plan also requires private, source-controlled metrics and Grafana dashboards.

Static dashboard definitions are not useful without real metric producers. The monitoring slice therefore needs API instrumentation, infrastructure exporters, a metrics store, and reproducible dashboard provisioning. It must not make PostgreSQL, metrics endpoints, or operator tooling public, and it must not silently replace the accepted Render deployment target before the owner chooses the final production host and access model.

## Decision

Add an opt-in Docker Compose monitoring overlay with:

- Prometheus for a default 30-day metrics retention window.
- Grafana OSS with file-provisioned Prometheus data source and dashboards.
- `node_exporter` for Linux host metrics.
- cAdvisor for Docker container metrics.
- `postgres_exporter` using a dedicated PostgreSQL monitoring login with the built-in `pg_monitor` role.
- A disabled-by-default Fastify Prometheus endpoint with default Node.js metrics, normalized-route HTTP metrics, and bounded environment/release identity.

Prometheus, exporters, and the API metrics endpoint stay on a private Docker network. Grafana is the only monitoring service with a host port, and that port binds to loopback by default. Public access, remote tunnels, real credentials, and notification destinations remain owner-controlled deployment configuration.

Provision three compact dashboards from version-controlled files:

1. Service overview.
2. Host and containers.
3. PostgreSQL.

This decision extends ADR 0005; it does not supersede or remove the Render configuration. Loki, Sentry, alert delivery, backup monitoring, and public uptime monitoring remain separate Stage 1 batches.

## Consequences

The monitoring stack can be reviewed, recreated, and updated with the application repository. Dashboard panels use real, named metric sources and stable UIDs rather than manual Grafana state.

Linux host metrics require a native Linux production host. On Docker Desktop for macOS, exporter metrics describe the Docker virtual machine rather than the physical Mac, so host-level verification remains pending until the owner confirms the Stage 1 host. Grafana credentials and the PostgreSQL monitoring password must be supplied outside Git before the overlay starts.

The API metrics endpoint is intentionally unavailable unless monitoring is enabled. Any deployment that exposes the API publicly must keep it disabled or add an independently reviewed protection layer.
