# AGENTS.md

This file defines how Codex and other coding agents must work in this repo.

## Project Context

This project is a gym progress tracker web app. The repo has moved from planning into the first implementation foundation: pnpm workspace tooling, Docker Compose local app orchestration, SQL migrations, Fastify API foundation, API auth foundation, workout session API endpoints, exercise library and muscle group lookup API endpoints, workout logging API endpoints, the first Next.js auth UI slice, the first workout logging UI slice, and workout history/detail screens exist. Analytics behavior and deployment are still future implementation work.

Read these files before implementing feature work:

1. `docs/repository-structure.md` - current repo map and local-only file rules
2. `docs/00-workflow.md` - project roadmap and phase progress
3. `docs/01-requirements.md` - MVP product requirements and user flows
4. `docs/02-query-list.md` - DB-driven query requirements
5. `docs/03-data-model-notes.md` - data model rules and tradeoffs
6. `docs/04-schema-draft.md` - ERD-level MVP database schema draft
7. `docs/05-api-contract.md` - MVP REST API contract
8. `docs/07-implementation-pattern.md` - API/web feature-slice implementation pattern
9. `docs/08-next-implementation-plan.md` - fresh-session handoff and next implementation blocks
10. `ENGINEERING.md` - TypeScript/PostgreSQL code quality rules
11. `ARCHITECTURE.md` - module boundaries and dependency rules
12. `CONTRIBUTING.md` - implementation workflow and review gates
13. `docs/git-pipeline.md` - Git, PR, and repository check workflow

## Working Rules

- Keep changes small, focused, and tied to a clear requirement or decision.
- Preserve user changes. Do not revert, rewrite, or clean up unrelated files.
- Do not generate speculative code, placeholder systems, unused abstractions, or broad refactors.
- Prefer simple, explicit implementation over clever architecture.
- Match existing naming, formatting, and documentation style unless there is an approved reason to change it.
- Do not introduce a new stack, framework, service, database, auth method, or cross-cutting pattern without an ADR in `docs/decisions/`.
- Follow `ENGINEERING.md` for size limits, TypeScript rules, SQL rules, folder ownership, and interface boundaries.
- Explain any intentional violation of size, interface, or folder-structure rules in the handoff.
- Update documentation in the same change when behavior, workflow, data shape, API contracts, or architecture changes.
- Keep secrets out of the repo. Never commit `.env`, credentials, tokens, database dumps, or personal data.
- Keep generated local artifacts out of commits. Cookie jars, `.DS_Store`, build output, caches, and TypeScript build metadata should stay ignored or be removed before handoff.
- Use `docs/repository-structure.md` as the source of truth for where files belong before creating or moving folders.
- Use `docs/08-next-implementation-plan.md` to choose the next implementation slice in a fresh session. Do not start later blocks from that file unless the user explicitly asks for them.

## Implementation Flow

For non-trivial changes:

1. Read the relevant source-of-truth docs.
2. Identify the smallest safe change.
3. Check whether an ADR is required.
4. Implement only the agreed scope.
5. Check the engineering size and structure rules before adding new files or abstractions.
6. Add or update tests appropriate to the risk.
7. Run the relevant checks.
8. Summarize what changed, what was tested, and any remaining risk.

Trivial typo or formatting fixes do not need an ADR, but they still need a clean diff.

## Quality Bar

Before handing work back:

- `git status --short` should show only intended changes.
- `git diff --check` must pass.
- Relevant tests or checks must be run when a toolchain exists.
- New files must have a clear purpose and owner.
- New implementation files must fit the size and structure rules in `ENGINEERING.md`, or the exception must be documented.
- Public interfaces, schemas, endpoints, and workflow rules must be documented.

## Current Constraints

- The MVP requirements, schema draft, and API contract are documented but may evolve through focused docs updates or ADRs.
- The accepted stack direction is TypeScript, PostgreSQL, Next.js App Router, Fastify, pnpm workspaces, Kysely, Zod, `node-pg-migrate`, Argon2, DB-backed opaque sessions, and Docker Compose local app orchestration.
- Deployment target and full application CI still need later decisions.
- Application source folders should not be added as empty scaffolding.
- Database schema work should be driven by `docs/02-query-list.md`, `docs/03-data-model-notes.md`, and `docs/04-schema-draft.md`.
