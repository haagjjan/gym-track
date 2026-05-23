# Deployment Runbook

## Status

Small-batch deployment runbook for the accepted Render target in ADR 0005.

This runbook does not contain production secrets. Store hosted credentials only in Render environment variables and Render-managed database configuration.

## Render Resources

`render.yaml` defines the first production environment:

- `gym-progress-tracker-web` - Docker web service for the Next.js app.
- `gym-progress-tracker-api` - Docker web service for the Fastify API.
- `gym-progress-tracker-db` - Render PostgreSQL database.

The web and API services use Render-specific Dockerfiles because Render Blueprints build Dockerfiles directly and do not select a Compose-style multi-stage target. The files intentionally mirror the existing local Docker targets:

- `Dockerfile.render-web`
- `Dockerfile.render-api`

The Render Blueprint uses:

- `autoDeployTrigger: checksPass` so deploys wait for GitHub checks.
- API `preDeployCommand` to run `node-pg-migrate` before the API starts.
- private database connectivity through `fromDatabase`.
- private API connectivity from web through `API_INTERNAL_HOSTPORT`.
- `ipAllowList: []` on the database so external database connections are blocked by default.

## First Deploy Checklist

1. Confirm `main` is green in GitHub Actions.
2. In Render, create a Blueprint from the repository root `render.yaml`.
3. Review the generated resources before applying:
   - `gym-progress-tracker-web`
   - `gym-progress-tracker-api`
   - `gym-progress-tracker-db`
4. Keep the default service/database names unless every reference in `render.yaml` is updated together.
5. Confirm the deployment region is acceptable for the first tester group. The checked-in config uses `oregon`; change this before first deploy if tester and data residency requirements point elsewhere.
6. Deploy the database first through the Blueprint.
7. Deploy the API and confirm the pre-deploy migration step completes.
8. Deploy the web service after the API health check is passing.
9. Open the web service URL and complete a smoke flow:
   - sign up
   - start a workout
   - create or pick an exercise
   - add one set
   - end the workout
   - open history and detail
   - open analytics

## Production Environment Variables

The Blueprint manages these non-secret values:

| Service | Key | Value |
| --- | --- | --- |
| API | `NODE_ENV` | `production` |
| API | `PORT` | `10000` |
| API | `API_HOST` | `0.0.0.0` |
| API | `API_PORT` | `10000` |
| API | `LOG_LEVEL` | `info` |
| API | `AUTH_COOKIE_NAME` | `gym_progress_session` |
| API | `AUTH_COOKIE_SECURE` | `true` |
| API | `AUTH_SESSION_TTL_DAYS` | `30` |
| API | `DATABASE_URL` | Render `fromDatabase` private connection string |
| Web | `NODE_ENV` | `production` |
| Web | `PORT` | `10000` |
| Web | `WEB_HOST` | `0.0.0.0` |
| Web | `WEB_PORT` | `10000` |
| Web | `API_INTERNAL_HOSTPORT` | Render `fromService` private host and port |

Do not use `.env.example` values for hosted resources. If a future production-only secret is added, define it in Render with `sync: false` or a Render environment group, then document the key name here without committing the value.

## Migration And Release Order

The API service runs this command before each deploy:

```sh
cd apps/api && pnpm exec node-pg-migrate --config-file db/migrate.json up
```

Release steps:

1. Confirm the migration is backward-compatible with the currently deployed API/web when possible.
2. Push to `main` only after local checks and GitHub Actions pass.
3. Let Render deploy after checks pass.
4. Confirm the API deploy log includes a successful migration step.
5. Confirm `GET /api/v1/health` returns `database: "ok"`.
6. Smoke-test the browser flow before inviting testers back in.

Rollback notes:

- For application-only regressions, use Render rollback to the previous successful service deploy.
- For migrations, do not run `migrate down` against tester data unless the rollback has been reviewed. Prefer a forward fix when data has already been written with the new schema.
- For destructive data mistakes, pause writes by suspending the web/API services before restoring or cloning the database.

## Backup And Restore Checks

Before inviting testers:

- Use a paid Render PostgreSQL plan for tester data so point-in-time recovery and on-demand logical exports are available.
- Confirm the database has backups enabled in the Render dashboard.
- Create one on-demand logical export after the first successful smoke flow.
- Record the backup timestamp in a private operator note, not in the repo.
- Perform the first restore test into a separate non-production Render PostgreSQL instance before relying on backups.

Monthly small-batch restore test:

1. Create a fresh restore target database.
2. Restore from a recent backup or point-in-time recovery timestamp.
3. Point a temporary API/web environment at the restored database.
4. Verify login, history, workout detail, and analytics with non-sensitive tester-approved data.
5. Delete the temporary services and database after the test.

## Monitoring Checklist

Before inviting testers, configure Render notifications for:

- service deploy failures
- service health check failures
- high memory or repeated restarts on the API and web services
- PostgreSQL storage approaching the plan limit
- PostgreSQL connection saturation

Daily during the first tester week:

- Review API logs for `500` errors, auth failures that look abnormal, and database connectivity errors.
- Review web logs for proxy `502` responses to the API.
- Check API `/api/v1/health`.
- Check PostgreSQL storage and connection graphs.

Escalation:

1. If the API health check is degraded, pause tester onboarding and inspect database health first.
2. If writes are failing, stop inviting new testers and preserve logs before redeploying.
3. If data loss is suspected, suspend web/API services before restore investigation.
