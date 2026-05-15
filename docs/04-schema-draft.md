# Schema Draft

## Status

ERD-level PostgreSQL schema for the MVP. The initial SQL migrations in `apps/api/db/migrations` implement this draft and must preserve the rules in `docs/03-data-model-notes.md`.

## Goals

- Support every MVP query in `docs/02-query-list.md`.
- Store raw workout data and compute analytics on read.
- Keep cardio out of the first schema pass.
- Use UUID primary keys for user, auth, workout, and exercise records.
- Use soft deletes for core workout data.

## Core Tables

### `users`

Stores application accounts for email/password login.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `email` | `text` | Required, globally unique case-insensitively |
| `username` | `text` | Required, globally unique case-insensitively |
| `password_hash` | `text` | Required |
| `created_at` | `timestamptz` | Required, default now |
| `updated_at` | `timestamptz` | Required, default now |

Constraints and indexes:

- Unique index on `lower(email)`.
- Unique index on `lower(username)`.

Deferred:

- Email verification fields.
- Password reset fields.

### `user_sessions`

Stores API-managed login sessions used by browser cookies.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Required FK to `users.id` |
| `session_token_hash` | `text` | Required, unique |
| `expires_at` | `timestamptz` | Required |
| `revoked_at` | `timestamptz` | Nullable |
| `created_at` | `timestamptz` | Required, default now |
| `last_used_at` | `timestamptz` | Nullable |

Constraints and indexes:

- Index on `(user_id, expires_at)`.
- Index on `session_token_hash`.
- Active sessions are rows where `revoked_at IS NULL` and `expires_at > now()`.

### `muscle_groups`

Seeded lookup table for stable muscle group references.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `slug` | `text` | Required, unique |
| `name` | `text` | Required |
| `sort_order` | `integer` | Required, unique |

MVP seed list:

- `chest`
- `back`
- `shoulders`
- `biceps`
- `triceps`
- `forearms`
- `quads`
- `hamstrings`
- `glutes`
- `calves`
- `abs`
- `traps`

### `exercises`

Shared global exercise library.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `name` | `text` | Required, globally unique case-insensitively |
| `equipment` | `text` | Nullable |
| `exercise_type` | `text` | Nullable; examples: `compound`, `isolation` |
| `primary_muscle_group_id` | `uuid` | Required FK to `muscle_groups.id` |
| `created_by_user_id` | `uuid` | Nullable FK to `users.id` |
| `created_at` | `timestamptz` | Required, default now |
| `updated_at` | `timestamptz` | Required, default now |
| `deleted_at` | `timestamptz` | Nullable soft delete |

Constraints and indexes:

- Unique index on `lower(name)`.
- Index on `primary_muscle_group_id`.
- Index on `lower(name)` for exercise search.
- Selectable exercises are rows where `deleted_at IS NULL`.

Rules:

- Soft-deleted exercise names should be restored/reused, not recreated as separate records.
- Historical workout data must remain readable even if an exercise is soft-deleted.

### `exercise_secondary_muscles`

Optional join table for secondary muscle assignments.

| Column | Type | Rules |
| --- | --- | --- |
| `exercise_id` | `uuid` | Required FK to `exercises.id` |
| `muscle_group_id` | `uuid` | Required FK to `muscle_groups.id` |

Constraints and indexes:

- Primary key on `(exercise_id, muscle_group_id)`.
- Index on `muscle_group_id`.

Rules:

- Secondary muscles are stored for future use.
- MVP volume counts use only `exercises.primary_muscle_group_id`.

### `workout_sessions`

User-owned workout sessions.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Required FK to `users.id` |
| `started_at` | `timestamptz` | Required |
| `ended_at` | `timestamptz` | Nullable; `NULL` means the session is open |
| `workout_type` | `text` | Nullable; examples: `upper`, `lower`, `push`, `pull`, `legs` |
| `title` | `text` | Nullable |
| `notes` | `text` | Nullable |
| `created_at` | `timestamptz` | Required, default now |
| `updated_at` | `timestamptz` | Required, default now |
| `deleted_at` | `timestamptz` | Nullable soft delete |

Constraints and indexes:

- Check `ended_at IS NULL OR ended_at >= started_at`.
- Partial unique index on `user_id` where `ended_at IS NULL AND deleted_at IS NULL` to allow only one open session per user.
- Index on `(user_id, started_at DESC)` for recent sessions and history.
- Index on `(user_id, started_at, ended_at)` for date-range history and analytics.

### `session_exercises`

Ordered exercise blocks inside a workout session.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `workout_session_id` | `uuid` | Required FK to `workout_sessions.id` |
| `exercise_id` | `uuid` | Required FK to `exercises.id` |
| `position` | `integer` | Required, positive |
| `created_at` | `timestamptz` | Required, default now |
| `updated_at` | `timestamptz` | Required, default now |
| `deleted_at` | `timestamptz` | Nullable soft delete |

Constraints and indexes:

- Check `position > 0`.
- Partial unique index on `(workout_session_id, position)` where `deleted_at IS NULL`.
- Index on `(workout_session_id, position)` for ordered session detail.
- Index on `exercise_id` for exercise history joins.

Rules:

- Position values should be compacted after reorder/delete.

### `sets`

Ordered sets inside a session exercise.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `session_exercise_id` | `uuid` | Required FK to `session_exercises.id` |
| `set_order` | `integer` | Required, positive |
| `set_type` | `text` | Required: `warmup` or `working` |
| `weight_kg` | `numeric(6,2)` | Required, positive |
| `reps` | `integer` | Required, positive |
| `rir` | `integer` | Required, 0-10 |
| `rest_time_seconds` | `integer` | Nullable, non-negative |
| `note` | `text` | Nullable |
| `created_at` | `timestamptz` | Required, default now |
| `updated_at` | `timestamptz` | Required, default now |
| `deleted_at` | `timestamptz` | Nullable soft delete |

Constraints and indexes:

- Check `set_order > 0`.
- Check `set_type IN ('warmup', 'working')`.
- Check `weight_kg > 0`.
- Check `reps > 0`.
- Check `rir >= 0 AND rir <= 10`.
- Check `rest_time_seconds IS NULL OR rest_time_seconds >= 0`.
- Partial unique index on `(session_exercise_id, set_order)` where `deleted_at IS NULL`.
- Index on `(session_exercise_id, set_order)` for ordered session detail.
- Index on `(set_type, deleted_at)` as a helper for working-set analytics.

Rules:

- Set order drives display numbering.
- Difference to last set, estimated one-rep max, weekly volume, and summaries are computed on read.

## Query Mapping

| Query | Supported by |
| --- | --- |
| Q1 Create account | `users`, unique lower email/username indexes |
| Q2 Login | `users`, `user_sessions`, username lookup, active session indexes |
| Q3 Recent sessions | `workout_sessions` index on `(user_id, started_at DESC)` |
| Q4 Workout/history contingency | `workout_sessions`, `session_exercises`, `sets`, date-range and working-set filters |
| Q5 Sessions by date range | `workout_sessions` index on `(user_id, started_at, ended_at)` |
| Q6 Session detail | `workout_sessions`, `session_exercises`, `sets`, ordered position/set indexes |
| Q7 Create session | `workout_sessions`, one-open-session partial unique index |
| Q8 Add exercise to session | `session_exercises`, active position uniqueness |
| Q9 Add set | `sets`, active set-order uniqueness and value checks |
| Q10 Edit/delete set | `sets`, soft delete via `deleted_at` |
| Q11 Reorder exercises | `session_exercises.position`, compacted positions |
| Q12 List exercises | `exercises`, `muscle_groups`, `exercise_secondary_muscles`, lower-name search |
| Q13 Add exercise | `exercises`, lower-name uniqueness, optional `created_by_user_id` audit |
| Q14 Exercise progress | Join `workout_sessions` -> `session_exercises` -> `sets` by user, exercise, date range |
| Q15 Exercise summary | Same raw tables as Q14, computed aggregates on read |
| Q16 Weekly sets per muscle | `sets` where `set_type = 'working'`, joined to exercise primary muscle |

Cardio C1-C2 are deferred and intentionally unsupported by the first schema pass.

## Follow-Up Decisions

- Decide whether email verification and password reset belong in MVP auth.
- Decide whether `workout_type` should become a constrained lookup once workout splits are implemented.
