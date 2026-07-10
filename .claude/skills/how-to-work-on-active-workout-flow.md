# Skill: How To Work On Active Workout Flow

Use this for `/workout`, `/workouts/[workoutId]`, workout logging, set entry,
exercise insertion, rest timers, and workout completion.

## Read First

- `CODEBASE.md`
- `docs/11-phase0-frontend-inventory.md`
- `docs/14-ui-polish-and-ops-round-2.md`
- `docs/05-api-contract.md`
- `docs/07-implementation-pattern.md`
- `apps/web/src/features/session/session-screen.tsx`
- `apps/web/src/features/session/exercise-sheet.tsx`
- `apps/web/src/features/session/use-start-session.ts`
- `apps/web/src/features/launch/launch-screen.tsx`
- `apps/web/src/shared/api/hooks.ts`
- `apps/api/src/features/workouts/workout-logging.routes.ts`
- `apps/api/src/features/workouts/workout-logging.service.ts`

## Current Flow

- `/workout` is the launch screen: resume active session, start empty, or clone a
  previous workout structure.
- `/workouts/[workoutId]` is the active/completed session screen.
- The active session screen deliberately does not use `AppShell`; it is a focused,
  fullscreen set-logging flow.
- `useStartSession` creates a workout and handles `OPEN_WORKOUT_EXISTS` by routing to
  the existing open workout.
- `SessionScreen` owns active exercise selection, per-exercise set drafts, save flash,
  rest timer state, set editing, exercise reorder/remove, and completion.
- `ExerciseSheet` owns exercise search, inline creation, muscle group selection, and
  exercise-name review/blocked behavior.
- Browser code calls Next `/api/*` routes; those forward cookies to the Fastify API.

## Product Rules

- Mobile gym use is the priority. Controls must be large, readable, and one-handed.
- The fastest path is: open session, add/select exercise, enter kg/reps/RIR, save set.
- Keep completed sessions readable and avoid enabling accidental destructive edits.
- Do not add 3D to active workout logging.
- Preserve one-open-workout behavior.
- Preserve kg storage and working/warmup set semantics.
- Reordering is for exercise blocks, not individual sets, unless the product docs are
  explicitly changed.
- Destructive actions need confirmation or a deliberate two-step gesture.

## Implementation Pattern

- UI-only changes stay in `apps/web/src/features/session` or `features/launch`.
- API shape changes require updating `docs/05-api-contract.md`, backend routes,
  schemas/services/repositories, and tests.
- Database changes require a new SQL migration and usually an ADR or docs update.
- Use `shared/api/hooks.ts` for TanStack Query mutation/query behavior and cache invalidation.
- Keep route handlers thin; do not put business rules into Next proxy routes.

## Checks

For UI-only active-flow changes, usually run:

```sh
pnpm --filter @gym-progress-tracker/web type-check
pnpm lint
git diff --check
```

If the core smoke flow could be affected, also run:

```sh
pnpm start
pnpm smoke:web
pnpm stop
```

For backend/persistence changes, add:

```sh
pnpm --filter @gym-progress-tracker/api test
pnpm test:integration
```
