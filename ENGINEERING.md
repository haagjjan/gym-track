# Engineering Standards

This document defines how production code should be shaped once implementation begins. It is calibrated for a TypeScript/PostgreSQL monorepo, not generic advice.

## Language Use

- Use TypeScript for UI, API/backend, shared contracts, scripts, and test code.
- Use SQL for PostgreSQL schema migrations, seeds, and database queries when the query shape matters.
- Use Markdown for requirements, workflow, architecture, decisions, setup, and review notes.
- Avoid adding another implementation language without an ADR.

## Size Limits

These limits are review gates. They are not a reason to split code mechanically, but they must trigger refactoring or a written explanation.

- Functions and methods should target 30 lines or less.
- Functions and methods over 50 lines require refactoring or written justification.
- React components, classes, and service modules should target 150 lines or less.
- React components, classes, and service modules over 250 lines require splitting or written justification.
- Source files should target 250 lines or less.
- Source files over 400 lines require splitting or written justification.
- Nesting should target 3 levels or less.
- Cyclomatic complexity should target 10 or less once tooling can measure it.

Generated files, lockfiles, migrations, documentation, and framework-required configuration may exceed these limits, but the reason should be obvious from the file type.

## TypeScript Rules

- Enable strict TypeScript settings once the toolchain exists.
- Prefer functions, plain objects, and small modules over class hierarchies.
- Use classes only when they clearly model stateful behavior or framework integration.
- Do not use `any` without a local comment explaining why a safer type is not practical.
- Prefer explicit domain types for workout, exercise, set, session, user, and analytics concepts.
- Keep validation close to input boundaries such as API handlers, forms, environment variables, and database rows.
- Keep business logic separate from framework glue so it can be tested without a browser or server.

## Interface Rules

Code against interfaces at boundaries, not everywhere.

Use interfaces or exported types for:

- API request and response contracts
- Database repositories and query ports
- Auth/session providers
- External services
- Clock, ID, and randomness providers
- Shared package boundaries
- Cross-app contracts between `apps/web`, `apps/api`, and `packages/shared`

Avoid fake abstractions:

- Do not create `IThingService` style interfaces for every small module.
- Do not add an interface when there is one implementation and no real boundary.
- Do not hide simple functions behind classes only to look "enterprise".

## Structure Rules

Organize code by feature/domain first, then by technical role inside that feature.

Expected future monorepo shape:

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

Expected feature domains include:

- `auth`
- `workouts`
- `exercises`
- `analytics`
- `users`

Avoid dumping-ground folders:

- No broad `misc`.
- No oversized `utils`.
- No giant `services` folder where unrelated business logic accumulates.
- No global `components` folder for feature-specific UI.
- Shared code must have at least two real consumers before it moves to a shared package.

Split modules before they become hard to scan. If a file needs a table of contents in your head, it is already too large.

## DRY Rule

- Duplication once is fine.
- Duplication twice is a signal to watch.
- Extract on the third repeated use, unless the duplicated code represents different business concepts.
- Prefer duplication over an abstraction that hides important workout, exercise, or analytics meaning.

## SQL Rules

- Schema changes must go through migrations.
- PostgreSQL is the planned database.
- SQL migrations are the durable schema source of truth.
- No ad hoc production schema edits.
- Prefer database constraints for durable invariants such as required fields, uniqueness, foreign keys, and valid ranges.
- Tie indexes to documented query needs from `docs/02-query-list.md`.
- Record major schema policy decisions in ADRs before implementing them.
- Keep derived values explicit: document whether each value is stored or computed.

## Testing Rules

Once application code exists:

- Unit-test pure business logic.
- Integration-test API/database flows.
- UI-test core logging, history, and analytics workflows.
- Add regression tests for bugs before or with the fix.
- Keep tests close to the behavior they verify unless shared fixtures reduce real duplication.
- Do not rely on manual testing alone for authentication, workout logging, database migrations, or analytics.
