# ADR 0001 - Documentation Workflow Guardrails

## Status

Accepted

## Context

The project is still early and mostly documentation-driven. Before application code is added, the repo needs clear rules for how Codex and humans should make changes. Without these guardrails, generated implementation work can drift away from the MVP requirements, create unused abstractions, or make architecture decisions without recording why they were chosen.

## Decision

Use root-level workflow documents plus ADRs:

- `AGENTS.md` defines Codex-specific working rules.
- `ARCHITECTURE.md` defines boundaries, dependency direction, and open architecture decisions.
- `CONTRIBUTING.md` defines the implementation, validation, review, commit, and push workflow.
- `docs/decisions/` stores ADRs for important technical and product tradeoffs.

Major decisions about stack, database, auth, API style, deployment, schema policy, or module boundaries must be recorded as ADRs before implementation.

## Consequences

The repo has stricter gates before feature work begins. This slows down major decisions slightly, but it should reduce spaghetti code, duplicate systems, and undocumented tradeoffs.

Small edits remain lightweight: typo fixes, small documentation updates, and local implementation details do not need ADRs.
