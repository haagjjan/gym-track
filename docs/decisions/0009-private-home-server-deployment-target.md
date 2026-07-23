# ADR 0009 - Private Home-Server Deployment Target

## Status

Accepted

## Context

ADR 0005 selected Render as the first small-batch deployment target. The project now has a prepared T2 Ubuntu host named `gym-prod`, and the owner has explicitly chosen to continue the private home-server rollout described by the server Wave B runbooks.

The home-server path must reuse the existing application architecture without making PostgreSQL, Fastify, operator tooling, or the application publicly reachable. It also must preserve the checked-in Render configuration until a separate cleanup decision is made.

## Decision

Use `gym-prod` as the active private deployment target for the first operated Gym Tracker environment:

- deploy from a reviewed, immutable Git commit;
- keep host state under `/srv/gym-tracker`, separated into source, configuration, secrets, persistent data, backups, logs, releases, and deployment metadata;
- run PostgreSQL 17, the one-shot `node-pg-migrate` migration target, Fastify, and Next.js with Docker Compose;
- keep PostgreSQL and Fastify off the LAN and expose the application only through a reviewed reverse proxy on the private home network;
- keep live secrets outside Git and avoid embedding credentials in repository remotes or command lines;
- execute and review server stages sequentially using the Wave B runbooks and reports;
- retain `render.yaml`, the Render Dockerfiles, and the Render runbook as a deployment alternative rather than deleting them.

This decision selects the active operated target but does not authorize public DNS, router port forwarding, an internet tunnel, or public HTTP/HTTPS exposure. Those require a later reviewed decision.

## Consequences

The first private environment can reuse the existing Docker targets and same-origin web-to-API boundary on owned hardware. The owner gains direct control over runtime state, while also taking responsibility for host security, upgrades, power and network availability, database durability, backups, restore testing, and release operations.

The repository now has two documented deployment paths. Wave B owns the active private home-server path; the Render files remain available but are not the source of truth for this rollout. Host-specific Compose overrides, credentials, and runtime data must not be added to the application working tree.
