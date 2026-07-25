# Grafana Dashboard Guide for `gym-prod`

This guide explains the three production dashboards in ordinary language. The dashboards help answer **what is unhealthy and where to look next**; they do not automatically prove the root cause of a problem.

## Open Grafana

On the MacBook, keep this command running in a terminal:

```bash
ssh -N -L 3001:127.0.0.1:3001 gym-prod
```

Open `http://127.0.0.1:3001` and sign in as `operator`. The password is the one chosen during Stage 9. Press `Ctrl+C` in the tunnel terminal when finished.

Choose a time range in the upper-right corner. **Last 15 minutes** is useful for a problem happening now; **Last 6 hours** or **Last 24 hours** is better for spotting a trend. A value of `0` can be completely normal when the app is idle.

## Which dashboard should I open first?

| Symptom | First dashboard | What to check |
| --- | --- | --- |
| The app is unavailable or requests fail | Service overview | API availability, PostgreSQL connectivity, targets up, 5xx rate |
| The app feels slow | Service overview | p95/p99 latency, slowest routes, request rate, API CPU and memory |
| The whole server feels slow | Host and containers | CPU, load, memory, swap, disk I/O, disk free space |
| Saving or loading data fails | PostgreSQL | Availability, connections, deadlocks, long transactions, cache hit ratio |
| Disk space is disappearing | Host and containers | Root filesystem free, disk usage, container filesystem usage |
| A backup failed or is stale | Service overview | Last backup result, latest backup age, duration, dump size, active alerts |
| You only want a quick health check | Service overview | API availability = 1, PostgreSQL connectivity = 1, targets up = 6, backup result = SUCCESS, active alerts = 0 |

## Service overview

This dashboard describes the Gym Tracker application and its API.

- **Request rate** — requests handled per second. Zero is expected when nobody is using the app.
- **2xx rate** — successful responses. This normally rises together with request rate.
- **4xx rate** — requests rejected because of client input, authentication, permissions, or a missing page/resource. Occasional 4xx responses are normal; a sudden sustained rise may mean a UI or login problem.
- **5xx rate** — server-side failures. This should normally stay at zero and is the strongest first signal of an application fault.
- **In-flight requests** — requests being processed right now. Brief non-zero values are normal; a value that remains elevated can indicate stalled or overloaded work.
- **Current release** — the exact application revision being measured. It should match the intended deployed Git commit.
- **API latency percentiles** — request duration. `p50` is the typical request, `p95` means 95% completed at or below that duration, and `p99` shows the slowest 1%. A sustained p95 or p99 increase matters more than one brief spike.
- **Response rate by status class** — the same success/error rates shown together for comparison.
- **Slowest normalized routes (p95)** — the API route patterns with the slowest p95 response. IDs are replaced by route placeholders, so personal identifiers do not become metric labels.
- **API process uptime / API container uptime** — time since the API process or its container started. An unexpected reset can indicate a restart or crash.
- **API availability** — `1` means Prometheus can scrape the API; `0` means it cannot. It proves metrics reachability, not that every user action works.
- **PostgreSQL connectivity** — `1` means the database exporter can connect to PostgreSQL; `0` needs investigation.
- **Prometheus targets up** — the expected value is `6`: Prometheus, API, Node Exporter, cAdvisor, PostgreSQL Exporter, and Alertmanager.
- **Active critical alerts / Active warning alerts** — current firing Prometheus alerts by severity. Both should normally be `0`; open the relevant dashboard and follow the alert's first-action instruction when either rises.
- **Last backup result** — `SUCCESS` means the latest required attempt created and verified an encrypted off-machine Restic snapshot. `FAILED` means the MacBook may have been asleep or another required backup step failed.
- **Latest backup age** — time since the most recent successful off-machine snapshot. Yellow begins after 30 hours and red after 48 hours; the approved RPO is 24 hours.
- **Latest backup duration** — total duration of the latest completed attempt, including the logical dump, encrypted transfer, and repository metadata check.
- **Latest PostgreSQL dump** — size of the logical dump inside the latest successful snapshot. Trend changes are useful; this is not a storage-capacity limit.
- **API process CPU / memory** — resources used by Fastify. Watch for a sustained rise that does not fall when traffic falls.
- **API restarts (best effort)** — inferred from cAdvisor observations. A non-zero value deserves inspection, but zero cannot conclusively prove that no restart occurred.

The reverse-proxy request-rate panel planned for Stage 9 is absent because Caddy metrics were not enabled. The API request rate is currently the authoritative application traffic measure.

## Host and containers

This dashboard describes the Mac mini and each Docker service.

- **Host CPU utilization** — percentage of total host processor time in use. Brief spikes are normal; sustained high usage combined with high load can make the server slow.
- **Host load (1m)** — average runnable or waiting work over one minute. The server has six CPU cores, so load near or above `6` for a sustained period deserves attention; load can also rise while tasks wait for disk I/O.
- **Host memory utilization** — RAM currently not considered readily available. Linux deliberately uses spare RAM for cache, so high usage alone is not proof of a problem.
- **Host swap utilization** — swap use. `No data` is expected if the host has no swap configured. Growing swap plus sluggish response can indicate memory pressure.
- **Host uptime** — time since the Mac mini last booted. An unexpected reset means the host rebooted.
- **Root filesystem free / disk usage by filesystem** — remaining capacity and percent used. A steady decline is more important than a single value. Stage 9 observed roughly 438 GB free on `/`.
- **Disk I/O throughput** — bytes read and written per second. Spikes are expected during database activity, image pulls, and maintenance; sustained activity alongside high latency may indicate a storage bottleneck.
- **Network throughput** — bytes received and transmitted by the physical interfaces.
- **Network errors** — receive/transmit errors per second. The expected resting value is zero.
- **Container CPU (% of one core)** — CPU used by each Compose service. A service can exceed 100% on this multi-core host because 100% represents one core.
- **Container memory working set** — actively used memory for each service.
- **Container filesystem usage** — container-layer storage, not the PostgreSQL or Prometheus bind-mounted data directory by itself.
- **Container restarts (best effort)** — inferred start-time changes. Use Docker state and logs to confirm an incident.

Temperature is intentionally omitted because Stage 9 did not find a trustworthy T2-compatible metric source. A made-up or unreliable temperature panel would be worse than no panel.

## PostgreSQL

This dashboard describes the database engine, not individual users or workout contents.

- **Availability** — `1` is reachable and `0` is unavailable.
- **Active connections** — connections executing work now. A low value, including zero, is normal for a lightly used private app.
- **Idle connections** — open connections waiting for work. A small stable number is normal because the API uses a connection pool.
- **Maximum connections** — the PostgreSQL server limit, currently `100`.
- **Connection saturation** — current connections as a percentage of the maximum. A sustained rise toward 100% can cause connection failures.
- **Connections by database** — shows where connections are allocated without showing user rows or query text.
- **Transaction rate / transaction rate by database** — commits and rollbacks per second. Rollbacks can be expected occasionally, but a sustained rise should be correlated with API errors.
- **Database size** — stored database data size. Gradual growth is expected as workouts are recorded; an unexplained rapid jump deserves review.
- **Cache hit ratio** — percentage of reads served from PostgreSQL memory rather than disk. Stage 9 observed about 99.7%; interpret trends over time rather than treating one percentage as a hard pass/fail limit.
- **Lock activity** — locks PostgreSQL is using. Locks are normal; persistent lock buildup combined with slow requests is the warning pattern.
- **Deadlock rate / deadlocks by database** — conflicting transactions PostgreSQL had to abort. The expected normal rate is zero.
- **Oldest active transaction / long-running transactions** — work that has remained open. A steadily aging transaction can hold locks or delay cleanup. Query text is deliberately not exported.
- **Temporary-file throughput / creation** — disk spill caused by operations that did not fit in working memory. Occasional use can be normal; sustained growth alongside slow queries deserves investigation.
- **WAL size** — disk space occupied by PostgreSQL's write-ahead log, which protects durability and recovery. Some WAL is required; watch for unexplained sustained growth rather than expecting zero. Stage 9 observed about 32 MiB.

## A practical two-minute check

1. Open **Service overview** and select **Last 15 minutes**.
2. Confirm API availability and PostgreSQL connectivity are `1` and targets up is `6`.
3. Confirm the last backup result is `SUCCESS`, backup age is below 30 hours, and active alerts are zero.
4. Confirm 5xx rate is zero or near zero and p95 latency has no sustained new spike.
5. Open **Host and containers** and confirm root free space is comfortable, network errors are zero, and CPU/load are not stuck high.
6. Open **PostgreSQL** and confirm availability is `1`, connection saturation is low, and deadlocks are zero.

If a panel says **No data**, first check the selected time range and **Prometheus targets up**. No data can mean the source is unavailable, the metric is not supported, or nothing occurred in that period; it is not automatically an outage.

## What Grafana does not replace

Grafana does not replace application testing, container logs, backups, or restore tests. It shows the authoritative Stage 11 backup metrics, but a backup is accepted only after the documented isolated PostgreSQL and configuration restoration tests pass.
