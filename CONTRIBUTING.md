# Contributing

This repo should stay easy to reason about. Changes are expected to be small, reviewed, documented, and tied to the product roadmap.

Read `ENGINEERING.md` before implementing application code. It defines the TypeScript, SQL, size, structure, interface, DRY, and testing rules for this project.

## Standard Workflow

1. Read the relevant docs before changing files.
2. Confirm the scope of the change.
3. Create or update an ADR if the change affects architecture, stack, schema policy, auth, API style, or deployment.
4. Check `ENGINEERING.md` for size, structure, interface, SQL, and testing expectations.
5. Implement the smallest complete change.
6. Add or update tests when behavior changes.
7. Run relevant checks.
8. Commit with a focused message.
Tiny documentation fixes may still be committed directly to `main` while this is a solo project.

## Change Gates

A change is ready only when:

- The implementation matches the documented requirement or decision.
- The diff does not include unrelated cleanup.
- Generated or placeholder code is not left unused.
- New implementation files follow the size, folder, and interface rules in `ENGINEERING.md`, or the exception is explained.
- Documentation is updated when public behavior, setup, architecture, data shape, or workflow changes.
- Relevant tests/checks pass, or any skipped checks are clearly explained.
- `git diff --check` passes.

## ADR Requirements

Add a decision record in `docs/decisions/` for important tradeoffs. ADRs are required for:

- Selecting the frontend, backend, database, auth, or deployment stack
- Changing module boundaries or dependency direction
- Creating schema policies that will affect future migrations
- Introducing cross-cutting abstractions or shared infrastructure
- Reversing an earlier recorded decision

ADRs are not required for typo fixes, small documentation edits, or local implementation details that do not change project direction.

## Testing Expectations

The current repo has tooling, migrations, API health/auth/workout/exercise/analytics foundations, UI flows, CI, API database integration coverage, and a web smoke test. Validation should include install when dependencies change, type-check, lint, tests, build, Markdown review, and git checks where the local toolchain is available.

Once application code exists:

- Run the smallest relevant test set for the changed area.
- Add tests for new business rules, data transformations, API behavior, and regression fixes.
- Prefer integration tests for user flows that cross UI, API, and database boundaries.
- Do not rely on manual testing alone for core workout logging, authentication, or analytics behavior.
- Run `pnpm test:integration` when persistence behavior changes.
- Run `pnpm smoke:web` when auth, routing, or core workout logging UI changes.

## Commit Style

Use concise, imperative commit messages, for example:

- `Add project workflow guardrails`
- `Record database stack decision`
- `Draft schema for workout sessions`

Keep commits focused. A reader should understand why the change exists from the commit message and the surrounding docs.

## Review Checklist

Before merging or pushing important work, check:

- Does this match the MVP requirements?
- Does it follow the architecture boundaries?
- Does it follow the TypeScript/PostgreSQL rules in `ENGINEERING.md`?
- Are files, functions, components, and classes still small enough to scan?
- Is duplication being handled at the right time, without premature abstraction?
- Are interfaces used at real boundaries instead of everywhere?
- Does each folder have clear ownership, with no dumping-ground folder?
- Are SQL changes migration-driven and tied to documented queries?
- Is an ADR needed, and if so, is it included?
- Are names and concepts consistent with the glossary?
- Are tests or checks included for the risk level?
- Are API integration or web smoke tests updated when a core flow changes?
- Is setup or usage documentation still accurate?
- Is the repo structure still reflected in `docs/repository-structure.md`?

## Done Criteria

A task is done when the change is implemented, documented, validated, committed, and pushed, with any remaining risk clearly stated.
