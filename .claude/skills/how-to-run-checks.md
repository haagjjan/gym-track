# Skill: How To Run Checks

Use this when deciding which validation commands to run in this repo.

## Quick Rule

Run the smallest check set that matches the change. Always run `git diff --check`
before handoff unless there is no diff.

## Docs-Only Changes

For Markdown or ignore-file changes that do not alter app behavior:

```sh
git diff --check
```

Do not run the full app test suite just to validate documentation wording unless the
change also affects generated docs, package scripts, or CI config.

## General App Changes

Broad gate:

```sh
pnpm check
```

This runs:

```sh
pnpm type-check
pnpm lint
pnpm test
pnpm build
```

Use the broad gate after cross-cutting changes, shared API/type changes, auth changes,
or anything that could break both apps.

## Focused Commands

Use these when the task is scoped:

```sh
pnpm type-check
pnpm lint
pnpm test
pnpm build
```

Package-specific examples:

```sh
pnpm --filter @gym-progress-tracker/api type-check
pnpm --filter @gym-progress-tracker/api test
pnpm --filter @gym-progress-tracker/web type-check
pnpm --filter @gym-progress-tracker/web build
```

## Database And API Integration

Run database integration checks when persistence behavior, SQL migrations,
repositories, auth/session storage, workout logging, CSV import/export, or analytics
queries change.

Typical local sequence:

```sh
pnpm db:start
pnpm migrate:up
pnpm test:integration
```

Use `.env.example` as the public variable reference. Do not print real local secrets.

## Browser Smoke

Run the web smoke test when auth, routing, session launch/logging, history, progress,
mobile layout, or core UI shell behavior changes.

Typical sequence:

```sh
pnpm start
pnpm smoke:web
pnpm stop
```

`pnpm smoke:web` expects the web app to be reachable at `WEB_BASE_URL` or
`http://localhost:3000`. Playwright uses Chromium.

## Migration Checks

If adding or changing migrations:

```sh
pnpm db:start
pnpm migrate:up
pnpm migrate:down
pnpm migrate:up
pnpm test:integration
```

Do not change existing applied migrations casually. Add a new SQL migration unless the
project owner explicitly asks for a rewrite before anything has shipped.

## Before Handoff

Check:

```sh
git status --short
git diff --check
```

If tests were skipped, say why. Good reasons include docs-only changes, missing local
services, or checks being disproportionate to a non-behavioral edit.
