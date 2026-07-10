# Agent Entrypoint

This repo is a gym progress tracker web app. Treat this file as the compact
startup guide for Claude, Fable, Codex, and similar coding agents.

## First Reads

1. `AGENTS.md`
2. `CODEBASE.md`
3. `README.md`
4. `ARCHITECTURE.md`
5. `ENGINEERING.md`
6. `CONTRIBUTING.md`
7. The relevant `.claude/memory/*.md` and `.claude/skills/*.md` file for the task.

## Ground Rules

- Preserve existing user work. This repo may have a dirty worktree.
- Keep changes small and tied to an existing requirement, doc, or ADR.
- Do not change stack, auth strategy, API style, database policy, or deployment direction
  without an ADR in `docs/decisions/`.
- Do not edit app source, package scripts, dependencies, SQL migrations, or environment
  files unless the task explicitly requires it.
- There is no Prisma schema in the current repo. Database schema lives in SQL migrations
  under `apps/api/db/migrations`, with Kysely types in `apps/api/src/db/database.ts`.
- Never commit secrets. Use `.env.example` for public environment variable documentation.

## Common Checks

For most implementation work, run the smallest relevant subset from
`.claude/skills/how-to-run-checks.md`. For documentation-only changes, at minimum run:

```sh
git diff --check
```
