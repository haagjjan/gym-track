# ADR 0015 - Staging Environment On The Production Host

## Status

Accepted for implementation on 2026-08-06.

## Context

Releases and migrations currently move from a developer laptop directly to the only database
holding real user data. Automated tests run against ephemeral CI databases and an ephemeral
Compose stack, neither of which exercises the deployed edge path.

That gap is not theoretical. The 2026-08-06 operational-readiness audit found three defects
that are invisible to CI and only appear behind a real edge: the `APP_ENV=private-lan` bypass
that disables every production assertion in `apps/api/src/shared/env.ts` and
`apps/web/src/request-security.ts`; client-IP attribution that trusts a browser-supplied
`cf-connecting-ip` header in `apps/web/src/shared/bff-client-attribution.ts`; and statically
prerendered legal routes that freeze placeholder controller text into the built image.

The public-beta migration is also destructive in reverse: its Down section drops five tables
and eighteen `users` columns. Applying it to production without a rehearsal is the single
highest-consequence action remaining before launch.

The `gym-prod` host has six cores, approximately 30 GiB RAM and 416 GB free disk, so a second
stack is not a capacity problem.

## Decision

Run staging as a second Docker Compose project on the existing `gym-prod` Mac mini, published
at `staging.gymtrack.ch` behind Cloudflare Access restricted to the operator.

- Compose project `gym-tracker-staging`, separate from production's `gym-tracker`, giving
  separate networks, volumes and container names.
- Its own PostgreSQL container, volume, database name and credentials. Production data is
  never restored into it.
- `APP_ENV=staging` with `NODE_ENV=production`, so staging is treated as a production
  deployment by the environment validators and must satisfy the HTTPS, secure-cookie,
  `BFF_CLIENT_IP_SECRET` and `SUPPORT_EMAIL` requirements to boot at all.
- Its own `BFF_CLIENT_IP_SECRET`, `AUTH_COOKIE_NAME` and host port bindings.
- Synthetic data only.
- Excluded from the production backup set and from production alerting.
- Memory limits on every staging container so staging cannot starve production.

Every release and every migration reaches production only after passing through staging.

## Consequences

Rehearsal becomes possible: migrations, rollbacks, the admin bootstrap procedure, the
invitation lifecycle and the rendered legal pages can all be validated against a
production-shaped edge before production sees them. Choosing `APP_ENV=staging` rather than a
development label means the environment contract is exercised rather than bypassed, which is
the specific failure the audit identified.

The cost is a shared failure domain. Staging runs on the same host, the same disk and the same
Cloudflare tunnel as production, so a host-level failure takes both. Memory limits bound the
resource risk but not the correlation. This is accepted because the alternative — isolation on
separate hardware — would sacrifice fidelity to the exact edge path where the known defects
live, and because the spare Mac mini is reserved as a recovery host.

Staging must never page the operator. Excluding it from production alerting means staging
outages are discovered by use rather than by notification, which is the correct trade for a
non-production environment.

Superseding this ADR would be appropriate if the beta outgrows one host, or if staging is ever
required to hold real user data — which this decision forbids.
