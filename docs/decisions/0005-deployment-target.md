# ADR 0005 - Deployment Target

## Status

Accepted

## Context

The MVP now has authenticated browser flows for workout logging, history, and analytics. The next project risk is getting the existing Next.js, Fastify, and PostgreSQL stack online for a small set of testers without introducing a second application architecture.

The repo already has production-like Docker targets for the web app, API, and migration runner. The deployment target should use that existing packaging, support managed PostgreSQL, require secure runtime environment variables, and keep backups and basic service health visible.

## Decision

Use Render as the first small-batch deployment target:

- Run `apps/web` as a Docker-backed Render Web Service using the existing `web` Docker target.
- Run `apps/api` as a Docker-backed Render Web Service using the existing `api` Docker target.
- Run database migrations as a Render job or one-off service using the existing `migrate` Docker target before API deploys that require schema changes.
- Use Render PostgreSQL for the first managed database.
- Set `API_BASE_URL` on the web service to the deployed API `/api/v1` URL.
- Set `AUTH_COOKIE_SECURE=true` and production-only secrets through Render environment variables, not checked-in files.
- Enable managed PostgreSQL backups and service health/log monitoring before inviting testers.

Do not add Render configuration files in this ADR. Deployment config should be added in a later focused slice after the target is recorded and the required runtime variables are known.

## Consequences

The first deployment can reuse the repo's existing Docker build path instead of adding Vercel-specific or platform-specific application code. The web app can keep using same-origin Next.js proxy routes, while the server side talks to the deployed API through `API_BASE_URL`.

Render keeps hosting, managed Postgres, logs, and backups in one place for the first tester batch. The tradeoff is that the web and API will be separate services, so deployment ordering, migration jobs, and environment variable hygiene must be documented carefully before real users are invited.
