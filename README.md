# Gym Progress Tracker

Gym Progress Tracker is a planned web app for logging strength workouts, tracking exercise progress, and reviewing weekly training volume.

The repository is currently in the foundation and specification phase. It intentionally contains documentation, workflow rules, and architecture decisions only. Application code, database migrations, workspace files, and app folders will be added later in focused implementation commits.

## Current Status

- GitHub remote is connected.
- Repository hygiene checks run through GitHub Actions.
- MVP requirements, query needs, data model notes, schema draft, and API contract are documented.
- The accepted stack is TypeScript, PostgreSQL, Next.js App Router, Fastify, pnpm workspaces, Kysely, Zod, and owned email/password auth.
- No app implementation has started yet.

## Key Documents

- `AGENTS.md` - working rules for Codex and coding agents
- `ARCHITECTURE.md` - architecture boundaries and future repo shape
- `ENGINEERING.md` - TypeScript/PostgreSQL engineering standards
- `CONTRIBUTING.md` - contribution workflow and review gates
- `docs/git-pipeline.md` - Git branch, PR, and repository check workflow
- `docs/00-workflow.md` - project roadmap
- `docs/01-requirements.md` - MVP requirements and user flows
- `docs/02-query-list.md` - DB-driven query requirements
- `docs/03-data-model-notes.md` - accepted data modeling rules
- `docs/04-schema-draft.md` - MVP PostgreSQL schema draft
- `docs/05-api-contract.md` - MVP REST API contract
- `docs/decisions/` - architecture decision records

## Next Decisions

Before implementation starts, decide:

- migration tooling
- password hashing library
- session storage details
- local development setup
- deployment target
- first TypeScript workspace scaffold plan

## Local Checks

For docs-only changes, run:

```sh
git diff --check
git status --short
```

Build, lint, type-check, and test commands will be added after the TypeScript workspace exists.
