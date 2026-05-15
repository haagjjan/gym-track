# Architecture

## Current State

The repository currently contains product and data-planning documentation for a gym progress tracker. Application code has not been introduced yet.

The source-of-truth documents are:

- `docs/00-workflow.md` for roadmap phases
- `docs/01-requirements.md` for MVP scope and user flows
- `docs/02-query-list.md` for query-driven database requirements
- `docs/03-data-model-notes.md` for data rules and modeling decisions
- `ENGINEERING.md` for TypeScript/PostgreSQL engineering standards
- `docs/decisions/` for architecture decision records

## Accepted Stack Direction

ADR 0002 records the current stack direction:

- TypeScript for frontend, backend/API, shared contracts, scripts, and tests
- PostgreSQL as the planned relational database
- SQL migrations as the durable schema source of truth
- Separate app boundaries for web and API code
- Markdown for project documentation and decision records

## Architecture Principles

- Build from user flows and query needs, not from speculative infrastructure.
- Keep modules small and separated by responsibility.
- Prefer explicit data contracts over hidden coupling.
- Choose boring, well-supported tools unless an ADR records a stronger reason.
- Design for a fresh clone to become runnable with a short documented setup.

## Planned Boundaries

These boundaries become active once implementation begins:

- UI owns user interaction, display state, form validation feedback, and navigation.
- API/backend owns authentication, authorization, business rules, persistence workflows, and stable contracts for the UI.
- Database owns durable data, relationships, constraints, indexes, and migrations.
- Analytics/query layer owns derived workout statistics such as exercise progress, weekly working sets, and estimated one-rep-max calculations.
- Documentation owns requirements, workflow rules, architecture decisions, and setup instructions.

## Future Repo Shape

Create application folders only when implementation begins and each folder has real files to own. Do not add empty scaffolding.

Expected future shape:

```text
apps/
  web/
  api/
packages/
  shared/
docs/
  decisions/
infra/
```

Within each app, organize by feature/domain first, then by technical role. Expected domains include `auth`, `workouts`, `exercises`, `analytics`, and `users`.

Avoid broad folders such as `misc`, oversized `utils`, unrelated `services`, or global feature-specific `components`. Shared code should move to `packages/shared` only after at least two real consumers exist.

## Dependency Rules

- UI may depend on documented API contracts, not direct database access.
- Backend may depend on database migrations and query definitions, not UI implementation details.
- Database migrations must be backward-readable from the docs and tied to query requirements.
- Analytics must define whether values are stored or computed.
- Shared types or contracts should be introduced only when they reduce real duplication.
- Cross-app types must live in `packages/shared` only when both apps actually need them.

## Decision Rules

Create an ADR in `docs/decisions/` before changing or introducing:

- Frontend framework or major UI library
- Backend framework or runtime
- Database engine or migration tool
- Authentication/session strategy
- API style and contract format
- Deployment or hosting architecture
- Major schema rules, such as soft delete policy, unit policy, or muscle attribution logic

Small implementation choices inside an already approved stack can be documented in code, tests, or the relevant feature docs instead of an ADR.

## Current Open Decisions

- Frontend framework
- Backend/API framework
- Migration tooling
- Authentication approach
- API contract format
- Deployment target
