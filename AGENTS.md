# AGENTS.md

This file defines how Codex and other coding agents must work in this repo.

## Project Context

This project is a gym progress tracker web app. The current repo is in the planning and architecture phase, before application code has been introduced.

Read these files before implementing feature work:

1. `docs/00-workflow.md` - project roadmap and phase order
2. `docs/01-requirements.md` - MVP product requirements and user flows
3. `docs/02-query-list.md` - DB-driven query requirements
4. `docs/03-data-model-notes.md` - data model rules and tradeoffs
5. `ENGINEERING.md` - TypeScript/PostgreSQL code quality rules
6. `ARCHITECTURE.md` - module boundaries and dependency rules
7. `CONTRIBUTING.md` - implementation workflow and review gates

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

- The product requirements are still draft-stage.
- The stack direction is TypeScript for application code and PostgreSQL SQL for database work.
- Exact framework, migration-tool, auth, API-contract, and deployment choices still require ADRs before implementation.
- Application source folders should not be added as empty scaffolding.
- Database schema work should be driven by `docs/02-query-list.md` and `docs/03-data-model-notes.md`.
