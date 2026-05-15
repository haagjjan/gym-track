# AGENTS.md

This file defines how Codex and other coding agents must work in this repo.

## Project Context

This project is a gym progress tracker web app. The current repo is in the planning and architecture phase, before application code has been introduced.

Read these files before implementing feature work:

1. `docs/00-workflow.md` - project roadmap and phase order
2. `docs/01-requirements.md` - MVP product requirements and user flows
3. `docs/02-query-list.md` - DB-driven query requirements
4. `docs/03-data-model-notes.md` - data model rules and tradeoffs
5. `ARCHITECTURE.md` - module boundaries and dependency rules
6. `CONTRIBUTING.md` - implementation workflow and review gates

## Working Rules

- Keep changes small, focused, and tied to a clear requirement or decision.
- Preserve user changes. Do not revert, rewrite, or clean up unrelated files.
- Do not generate speculative code, placeholder systems, unused abstractions, or broad refactors.
- Prefer simple, explicit implementation over clever architecture.
- Match existing naming, formatting, and documentation style unless there is an approved reason to change it.
- Do not introduce a new stack, framework, service, database, auth method, or cross-cutting pattern without an ADR in `docs/decisions/`.
- Update documentation in the same change when behavior, workflow, data shape, API contracts, or architecture changes.
- Keep secrets out of the repo. Never commit `.env`, credentials, tokens, database dumps, or personal data.

## Implementation Flow

For non-trivial changes:

1. Read the relevant source-of-truth docs.
2. Identify the smallest safe change.
3. Check whether an ADR is required.
4. Implement only the agreed scope.
5. Add or update tests appropriate to the risk.
6. Run the relevant checks.
7. Summarize what changed, what was tested, and any remaining risk.

Trivial typo or formatting fixes do not need an ADR, but they still need a clean diff.

## Quality Bar

Before handing work back:

- `git status --short` should show only intended changes.
- `git diff --check` must pass.
- Relevant tests or checks must be run when a toolchain exists.
- New files must have a clear purpose and owner.
- Public interfaces, schemas, endpoints, and workflow rules must be documented.

## Current Constraints

- The product requirements are still draft-stage.
- The tech stack has not been selected yet.
- Application source code should not be added until the stack decision is recorded.
- Database schema work should be driven by `docs/02-query-list.md` and `docs/03-data-model-notes.md`.
