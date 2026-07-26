# Wave C — Operations, Monitoring, and Recovery

**Status:** Complete — Stages 9, 10, and 11 verified on `gym-prod`

**Target server:** `gym-prod`

**Primary administrator:** `admin-gym`

## Purpose

Wave C turns the privately working Gym Tracker deployment into an observable, diagnosable, backed-up, and recoverable service.

It adds:

- host, container, database, and application metrics;
- Prometheus;
- Grafana;
- Node Exporter;
- cAdvisor;
- PostgreSQL Exporter;
- structured and bounded logs;
- initial alerting;
- scheduled encrypted backups;
- off-machine backup copies;
- restoration tests;
- disaster-recovery documentation.

Wave C does not make the service public. External access, public DNS, HTTPS, and SaaS launch readiness remain separate future work.

---

## Required context

Before executing any Wave C stage, read:

- [`../../status/server-status-gym-prod.md`](../../status/server-status-gym-prod.md)
- [`../SERVER-SETUP-INDEX.md`](../SERVER-SETUP-INDEX.md)
- [`../reports/04-docker-platform-report.md`](../reports/04-docker-platform-report.md)
- [`../reports/06-postgresql-foundation-report.md`](../reports/06-postgresql-foundation-report.md)
- [`../reports/07-gym-tracker-deployment-report.md`](../reports/07-gym-tracker-deployment-report.md)
- [`../reports/08-reverse-proxy-and-private-lan-access-report.md`](../reports/08-reverse-proxy-and-private-lan-access-report.md)

The completed reports are the source of truth when they differ from earlier plans.

---

## Stage order

| Stage | Document | Purpose |
|---:|---|---|
| 9 | [`09-monitoring-and-grafana.md`](./09-monitoring-and-grafana.md) | Deploy metrics collection, exporters, Grafana, and provisioned dashboards |
| 10 | [`10-logging-and-alerting.md`](./10-logging-and-alerting.md) | Standardize logs, establish alert rules, and verify notification delivery |
| 11 | [`11-backup-restore-and-disaster-recovery.md`](./11-backup-restore-and-disaster-recovery.md) | Implement encrypted backups, off-machine copies, restoration tests, and recovery runbooks |

Stages must be executed in order.

The presence of later-stage documents is not permission to execute them.

---

## Expected Wave C outcome

After Wave C:

- application availability and latency are visible;
- host CPU, memory, disk, network, and uptime are visible;
- container state and resource consumption are visible;
- PostgreSQL health, connections, transactions, and size are visible;
- Grafana dashboards are provisioned from files;
- Grafana remains private and is reached through an SSH tunnel;
- logs are structured, bounded, and useful for diagnosis;
- important failures produce tested alerts;
- PostgreSQL and operational configuration are backed up automatically;
- backups are encrypted and copied off the primary server;
- backup age and success are monitored;
- database and configuration restoration have been tested;
- a disaster-recovery runbook exists;
- the complete stack survives restart and reboot.

---

## Target observability topology

```text
Fastify metrics ───────────────┐
Node Exporter ─────────────────┤
cAdvisor ──────────────────────┤
PostgreSQL Exporter ───────────┤
Prometheus self-metrics ───────┤
                               v
                         Prometheus
                          /          \
                         v            v
                  Alertmanager     Grafana
                       |               |
                       v               v
              private Telegram   SSH tunnel
```

Current Prometheus jobs:

```text
prometheus
api
node
cadvisor
postgres
alertmanager
```

Current Grafana dashboards:

```text
gpt-service-overview
gpt-host-containers
gpt-postgresql
```

Initial Grafana host binding:

```text
127.0.0.1:3001
```

---

## Global safety constraints

During Wave C, Codex must not:

- expose Grafana, Prometheus, exporters, Alertmanager, Loki, or PostgreSQL to the LAN or internet;
- publish monitoring ports on `0.0.0.0`, `::`, `192.168.1.57`, or `192.168.86.178`;
- weaken the existing reverse-proxy or application firewall policy;
- place monitoring or backup credentials in Git;
- place secrets directly in dashboard JSON, Prometheus configuration, or alert rules;
- log passwords, tokens, cookies, authorization headers, or sensitive workout/user data;
- delete PostgreSQL data, Docker volumes, or backups;
- run `docker compose down --volumes`;
- use floating image tags such as `latest`;
- rely on same-disk backups as the only backup;
- claim recovery is proven without performing a restoration test;
- expose public dashboards or enable anonymous Grafana access;
- change public DNS, router forwarding, or external access;
- begin a public launch.

When uncertain, stop and report rather than guessing.

---

## Preferred monitoring filesystem layout

```text
/srv/gym-tracker/
├── deploy/
│   └── monitoring/
│       ├── prometheus/
│       │   ├── prometheus.yml
│       │   └── rules/
│       ├── grafana/
│       │   ├── provisioning/
│       │   │   ├── datasources/
│       │   │   └── dashboards/
│       │   └── dashboards/
│       └── alertmanager/
├── data/
│   ├── prometheus/
│   ├── grafana/
│   └── alertmanager/
├── secrets/
│   ├── grafana-admin-password
│   ├── postgres-exporter-url
│   └── alerting-*
├── logs/
├── backups/
└── scripts/
```

Live secret values remain outside Git.

Provisioning templates and sanitized dashboard definitions may be committed when they contain no secrets or private identifiers that should remain private.

---

## Access-safety rule

Monitoring services should be accessed in this order:

1. container-internal networking;
2. localhost-only host binding where human access is required;
3. SSH tunnel from the MacBook;
4. no LAN or public publication.

Expected Grafana access:

```bash
ssh -L 3001:127.0.0.1:3001 gym-prod
```

Then open:

```text
http://127.0.0.1:3001
```

---

## Reporting

Each stage must create a report under:

```text
docs/server/reports/
```

Expected Wave C reports:

```text
09-monitoring-and-grafana-report.md
10-logging-and-alerting-report.md
11-backup-restore-and-disaster-recovery-report.md
```

Each report must include:

- executive summary;
- preconditions and inputs;
- exact image tags and digests;
- configuration files created or changed;
- secret filenames without values;
- health and verification results;
- restart and reboot results;
- failed, skipped, or deferred work;
- rollback state;
- exact commands executed.

Reports must not include passwords, private keys, API keys, notification tokens, complete database URLs, cookies, user data, or backup contents.

---

## Wave C completion boundary

Wave C ended after Stage 11 was executed, restored, reboot-verified, and reported on 2026-07-22. The completion evidence is in [`../reports/11-backup-restore-and-disaster-recovery-report.md`](../reports/11-backup-restore-and-disaster-recovery-report.md).

At that point the product is suitable for sustained private use and provides a sound operational foundation for a later controlled beta.

Do not proceed directly to public exposure.
