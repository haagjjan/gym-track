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
| `email_verified_at` | `timestamptz` | Nullable; set after successful verification or password reset |
| `failed_login_attempts` | `integer` | Required, default 0 |
| `locked_until` | `timestamptz` | Nullable; temporary login lockout deadline |
| `volume_heat_ceiling` | `integer` | Required, default 20; check 5 through 50 |
| `created_at` | `timestamptz` | Required, default now |
| `updated_at` | `timestamptz` | Required, default now |

Constraints and indexes:

- Unique index on `lower(email)`.
- Unique index on `lower(username)`.

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

### `auth_action_tokens`

Stores hashed, single-use email-verification and password-reset tokens.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Required FK to `users.id` |
| `purpose` | `text` | Required: `email_verification` or `password_reset` |
| `token_hash` | `text` | Required, unique; raw tokens are never persisted |
| `expires_at` | `timestamptz` | Required |
| `used_at` | `timestamptz` | Nullable; set when the token is consumed |
| `created_at` | `timestamptz` | Required, default now |

Constraints and indexes:

- Check constraint limits `purpose` to the two supported auth actions.
- Unique index on `token_hash`.
- Index on `(user_id, purpose, created_at DESC)` supports current-token lookup and cleanup.

### `app_events`

Stores bounded first-party product events emitted by the API. There is no client-ingest endpoint.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `bigint` | Generated identity primary key |
| `user_id` | `uuid` | Nullable FK to `users.id` |
| `event_name` | `text` | Required |
| `properties` | `jsonb` | Required, default empty object |
| `created_at` | `timestamptz` | Required, default now |

Constraints and indexes:

- Index on `(event_name, created_at)` supports event-rate review.
- Index on `(user_id, created_at)` supports user-scoped operational investigation.

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
| `equipment` | `text` | Nullable; canonical equipment check from ADR 0007 |
| `exercise_type` | `text` | Nullable; `compound`, `isolation`, `isometric`, or `other` |
| `primary_muscle_group_id` | `uuid` | Temporary legacy compatibility field; normalized assignments are authoritative |
| `created_by_user_id` | `uuid` | Nullable FK to `users.id` |
| `created_at` | `timestamptz` | Required, default now |
| `updated_at` | `timestamptz` | Required, default now |
| `deleted_at` | `timestamptz` | Nullable soft delete |

Constraints and indexes:

- Unique index on `lower(name)`.
- Index on `primary_muscle_group_id`.
- B-tree pattern index and partial `pg_trgm` GIN index on `lower(name)` for prefix and typo-tolerant exercise search.
- Selectable exercises are rows where `deleted_at IS NULL`.
- `equipment` is null or one of the thirteen canonical values, including `EZ bar`, `medicine ball`, and `stability ball`.
- `exercise_type` is null or one of the four canonical type values.

Rules:

- The system seed includes 820 deterministic read-only exercise rows from the reviewed catalog manifest. The earlier `Bench Press` seed remains independently valid.
- System catalog IDs use the reserved `10000000-...` namespace. Case-insensitive user-owned conflicts are preserved and reported for manual review.
- Soft-deleted exercise names should be restored/reused, not recreated as separate records.
- Historical workout data must remain readable even if an exercise is soft-deleted.

### `exercise_muscle_groups`

Authoritative normalized primary and secondary muscle assignments.

| Column | Type | Rules |
| --- | --- | --- |
| `exercise_id` | `uuid` | Required FK to `exercises.id` |
| `muscle_group_id` | `uuid` | Required FK to `muscle_groups.id` |
| `role` | `text` | Required: `PRIMARY` or `SECONDARY` |

Constraints and indexes:

- Primary key on `(exercise_id, muscle_group_id)` prevents overlap and duplicate roles.
- Check constraint limits roles to `PRIMARY` and `SECONDARY`.
- Deferred constraint triggers require at least one primary assignment at transaction commit.
- Index on `(muscle_group_id, role, exercise_id)` supports picker filtering and analytics.

Rules:

- Multiple primary and secondary muscles are supported.
- Current assignments are resolved for historical workout data; they are not snapshotted.
- The legacy primary column and `exercise_secondary_muscles` table remain temporarily dual-written for rolling deployment compatibility.

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
| `source_template_id` | `uuid` | Nullable FK to `workout_templates.id`, `ON DELETE SET NULL` |
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

### `workout_templates`

User-owned reusable workout structures.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Required FK to `users.id` |
| `name` | `text` | Required, trimmed length 1-120 |
| `created_at` | `timestamptz` | Required |
| `updated_at` | `timestamptz` | Required |

### `workout_template_exercises`

Ordered exercise occurrences. Duplicate `exercise_id` values are intentionally allowed.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `workout_template_id` | `uuid` | Required FK, cascades only to template child rows |
| `exercise_id` | `uuid` | Required FK to `exercises.id` |
| `position` | `integer` | Required, positive and unique within template |
| `created_at` | `timestamptz` | Required |

Templates never contain sets, weights, reps, RIR, timers, or completion state. Starting a template copies these ordered rows into independent `session_exercises` rows.

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
| Q1 Create account | `users`, `user_sessions`, `auth_action_tokens`, unique lower email/username indexes |
| Q2 Login | `users`, `user_sessions`, failed-attempt/lockout fields, username lookup, active session indexes |
| Q3 Recent sessions | `workout_sessions` index on `(user_id, started_at DESC)` |
| Q4 Workout/history contingency | `workout_sessions`, `session_exercises`, `sets`, date-range and working-set filters |
| Q5 Sessions by date range | `workout_sessions` index on `(user_id, started_at, ended_at)` |
| Q6 Session detail | `workout_sessions`, `session_exercises`, `sets`, ordered position/set indexes, previous owned completed-workout lookup |
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
| Q17 Exercise muscle search/filter | `exercise_muscle_groups`, `muscle_groups`, lower-name B-tree and `pg_trgm` search indexes |
| Q18 Template management | `workout_templates`, `workout_template_exercises` |
| Q19 Template/session copying | template rows copied to `workout_sessions`, `session_exercises` transactionally |

Cardio C1-C2 are deferred and intentionally unsupported by the first schema pass.

## Follow-Up Decisions

- Decide whether `workout_type` should become a constrained lookup once workout splits are implemented.

## Founding Beta Schema Extension

Migration `20260805120000000_add_public_beta_foundation.sql` extends `users` with explicit role/account state/cohort, reliable activity counters, privacy choices, policy evidence, deletion deadline and versioned onboarding. `exercises.created_by_user_id` becomes `ON DELETE SET NULL` so a shared referenced definition can outlive its creator without retaining identity.

`beta_settings` is the locked singleton for immediate waitlist/invitation/campaign controls, account cap and rolling approval limit. `beta_access_requests` stores policy/age evidence, state, hashed invitation and joined account. `admin_audit_events` records privileged actions. `account_deletion_tokens` and `erasure_tombstones` support reversible grace and restore-safe hard erasure.

`campaigns`, `campaign_targets` and `message_deliveries` store immutable published content/audience, bounded trigger/response design and exactly-once per-user state. All ownership FKs cascade on user erasure unless a retained shared definition explicitly nulls creator identity. The processing and retention rules are in `docs/public-beta/data-processing-inventory.md`.
