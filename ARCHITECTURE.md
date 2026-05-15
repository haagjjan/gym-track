# Architecture

## Current State

The repository currently contains product and data-planning documentation for a gym progress tracker. Application code has not been introduced yet.

The source-of-truth documents are:

- `docs/00-workflow.md` for roadmap phases
- `docs/01-requirements.md` for MVP scope and user flows
- `docs/02-query-list.md` for query-driven database requirements
- `docs/03-data-model-notes.md` for data rules and modeling decisions
- `docs/decisions/` for architecture decision records

## Architecture Principles

- Build from user flows and query needs, not from speculative infrastructure.
- Keep modules small and separated by responsibility.
- Prefer explicit data contracts over hidden coupling.
- Choose boring, well-supported tools unless an ADR records a stronger reason.
- Design for a fresh clone to become runnable with a short documented setup.

## Planned Boundaries

These boundaries become active once the implementation stack is selected:

- UI owns user interaction, display state, form validation feedback, and navigation.
- API/backend owns authentication, authorization, business rules, persistence workflows, and stable contracts for the UI.
- Database owns durable data, relationships, constraints, indexes, and migrations.
- Analytics/query layer owns derived workout statistics such as exercise progress, weekly working sets, and estimated one-rep-max calculations.
- Documentation owns requirements, workflow rules, architecture decisions, and setup instructions.

## Dependency Rules

- UI may depend on documented API contracts, not direct database access.
- Backend may depend on database migrations and query definitions, not UI implementation details.
- Database migrations must be backward-readable from the docs and tied to query requirements.
- Analytics must define whether values are stored or computed.
- Shared types or contracts should be introduced only when they reduce real duplication.

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

- Frontend stack
- Backend stack
- Database engine
- Migration tooling
- Authentication approach
- API contract format
- Deployment target
