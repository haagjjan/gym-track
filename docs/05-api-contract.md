# API Contract

## Status

Draft Markdown REST contract for the MVP. This is not an OpenAPI file and does not create implementation schemas. Zod/OpenAPI generation is deferred.

## Global Conventions

- Base path: `/api/v1`
- Transport: HTTPS JSON over HTTP.
- Auth: secure HttpOnly session cookie set by login/signup.
- Timestamp format: ISO 8601 UTC strings.
- IDs: UUID strings.
- Request bodies and response bodies use `camelCase`.
- Database column names remain `snake_case`.
- List endpoints use `limit` and `offset`.
- Deletes are soft deletes unless explicitly documented otherwise.
- Cardio endpoints are deferred from the MVP.

Successful JSON responses use:

```json
{
  "data": {}
}
```

Error responses use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "fields": {
      "email": ["Email is required."]
    }
  }
}
```

Common status codes:

- `200 OK` - successful read/update/action
- `201 Created` - successful create
- `204 No Content` - optional no-body success for future endpoints
- `400 Bad Request` - malformed request
- `401 Unauthorized` - missing or invalid auth session
- `403 Forbidden` - authenticated but not allowed
- `404 Not Found` - resource not found or not visible to user
- `409 Conflict` - uniqueness or state conflict
- `423 Locked` - temporary account lockout after repeated failed logins
- `422 Unprocessable Entity` - validation error
- `503 Service Unavailable` - a required external acceptance or service dependency failed
- `500 Internal Server Error` - unexpected server error

Goal 1 adds these stable error codes:

| Code | Status | Meaning |
| --- | --- | --- |
| `IDEMPOTENCY_CONFLICT` | `409` | A parent-scoped client mutation ID was reused with different content. |
| `EMAIL_DELIVERY_FAILED` | `503` | Required deletion-scheduling email acceptance failed and scheduling was compensated. |
| `INVALID_ACCOUNT_TRANSITION` | `409` | The requested ordinary-user status change is unavailable from its current state. |
| `ADMIN_TARGET_FORBIDDEN` | `403` | An administrator/self target cannot be changed through ordinary-user containment controls. |

## System Endpoints

### `GET /api/v1/health`

Returns API and database connectivity status.

Response `200`:

```json
{
  "data": {
    "status": "ok",
    "api": "ok",
    "database": "ok"
  }
}
```

Returns `503` when the API process is running but the database check fails:

```json
{
  "data": {
    "status": "degraded",
    "api": "ok",
    "database": "degraded"
  }
}
```

### `GET /api/v1/metrics` (internal only)

Returns Prometheus text exposition for the API process when `METRICS_ENABLED=true`.

This endpoint is an operations boundary, not a browser API:

- It is disabled by default and is not proxied through the Next.js BFF.
- The Stage 1 monitoring overlay enables it only on the private Docker network.
- It exposes default Node.js process metrics, normalized-route HTTP request/response/latency/in-flight metrics, bounded service/environment/release identity, transactional-email outcomes by bounded mail kind, and lifecycle cleanup state.
- Lifecycle series record last start, last fully successful run, last duration, bounded phase-failure counts, due-deletion backlog, and finalized-deletion count. Email series contain only bounded kind/outcome and duration.
- Route labels use Fastify route templates such as `/api/v1/workouts/:workoutId`, never raw request paths.
- User IDs, request IDs, emails, session/workout/exercise IDs, and credentials are never metric labels.
- Deployments that publish the API directly must leave it disabled unless an independently reviewed protection layer is present.

## Shared Shapes

### `User`

```json
{
  "id": "uuid",
  "email": "jan@example.com",
  "username": "jan",
  "emailVerified": false,
  "role": "USER",
  "accountStatus": "ACTIVE",
  "betaCohort": "FOUNDING_BETA_2026",
  "createdAt": "2026-05-15T10:00:00Z"
}
```

### `MuscleGroup`

```json
{
  "id": "uuid",
  "slug": "chest",
  "name": "Chest",
  "sortOrder": 1
}
```

### `Exercise`

```json
{
  "id": "uuid",
  "name": "Bench Press",
  "equipment": "barbell",
  "exerciseType": "compound",
  "primaryMuscleGroups": [
    { "id": "uuid", "slug": "chest", "name": "Chest" },
    { "id": "uuid", "slug": "triceps", "name": "Triceps" }
  ],
  "primaryMuscleGroup": {
    "id": "uuid",
    "slug": "chest",
    "name": "Chest"
  },
  "secondaryMuscleGroups": [
    {
      "id": "uuid",
      "slug": "triceps",
      "name": "Triceps"
    }
  ],
  "muscleGroups": [
    { "id": "uuid", "slug": "chest", "name": "Chest", "role": "PRIMARY" },
    { "id": "uuid", "slug": "triceps", "name": "Triceps", "role": "PRIMARY" }
  ],
  "createdByUserId": "uuid",
  "createdAt": "2026-05-15T10:00:00Z",
  "updatedAt": "2026-05-15T10:00:00Z"
}
```

### `Set`

```json
{
  "id": "uuid",
  "setOrder": 1,
  "setType": "working",
  "weightKg": "80.00",
  "reps": 8,
  "rir": 2,
  "restTimeSeconds": 120,
  "note": "Good speed",
  "createdAt": "2026-05-15T10:05:00Z",
  "updatedAt": "2026-05-15T10:05:00Z"
}
```

`weightKg` is serialized as a decimal string to preserve `numeric(6,2)` precision.

### `SessionExercise`

```json
{
  "id": "uuid",
  "position": 1,
  "exercise": {
    "id": "uuid",
    "name": "Bench Press",
    "primaryMuscleGroup": {
      "id": "uuid",
      "slug": "chest",
      "name": "Chest"
    }
  },
  "sets": [],
  "previousPerformance": {
    "workoutId": "uuid",
    "workoutTitle": "Upper A",
    "workoutStartedAt": "2026-05-08T10:00:00Z",
    "bestSet": {
      "setId": "uuid",
      "setOrder": 2,
      "weightKg": "82.50",
      "reps": 8,
      "rir": 1,
      "setType": "working"
    }
  }
}
```

`previousPerformance` is nullable. It selects only the authenticated user's non-deleted completed workouts strictly before the current workout. The latest workout containing an active working set for the exercise qualifies; its best set is highest weight, then higher reps, then lower set order.

### `WorkoutSummary`

```json
{
  "id": "uuid",
  "startedAt": "2026-05-15T10:00:00Z",
  "endedAt": "2026-05-15T11:10:00Z",
  "isOpen": false,
  "workoutType": "upper",
  "title": "Upper A",
  "notes": null,
  "totalExercises": 5,
  "totalSets": 15
}
```

### `WorkoutDetail`

```json
{
  "id": "uuid",
  "startedAt": "2026-05-15T10:00:00Z",
  "endedAt": null,
  "isOpen": true,
  "workoutType": "upper",
  "title": "Upper A",
  "notes": null,
  "exercises": []
}
```

## Auth Endpoints

### `POST /api/v1/auth/signup`

Creates an account and starts an auth session only when registration is enabled.

Request:

```json
{
  "email": "jan@example.com",
  "username": "jan",
  "password": "correct horse battery staple"
}
```

Response `201`:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "jan@example.com",
      "username": "jan",
      "emailVerified": false,
      "createdAt": "2026-05-15T10:00:00Z"
    }
  }
}
```

Behavior:

- When `REGISTRATION_MODE=DISABLED`, returns `403` with
  `REGISTRATION_DISABLED` before request validation or any account/session side effect.
- Sets the auth session cookie.
- Issues a 24-hour single-use verification token and awaits one provider-acceptance attempt. Signup still succeeds if that verification delivery fails; the bounded internal outcome is recorded and an explicit resend remains available.
- Returns `409` if email or username already exists.
- Passwords are hashed with Argon2.

Disabled response `403`:

```json
{
  "error": {
    "code": "REGISTRATION_DISABLED",
    "message": "Registration is currently disabled."
  }
}
```

### `POST /api/v1/auth/login`

Logs in with username and password.

Request:

```json
{
  "username": "jan",
  "password": "correct horse battery staple"
}
```

Response `200`:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "jan@example.com",
      "username": "jan",
      "emailVerified": false,
      "createdAt": "2026-05-15T10:00:00Z"
    }
  }
}
```

Behavior:

- Sets the auth session cookie.
- Returns `401` for invalid credentials.
- After 10 failed attempts, temporarily locks the account for 15 minutes and returns `423` while the lock is active.
- A successful login clears prior failure and lockout state.

### `POST /api/v1/auth/logout`

Revokes the current auth session.

Response `200`:

```json
{
  "data": {
    "loggedOut": true
  }
}
```

### `GET /api/v1/auth/me`

Returns the current authenticated user.

Response `200`:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "jan@example.com",
      "username": "jan",
      "emailVerified": false,
      "createdAt": "2026-05-15T10:00:00Z"
    }
  }
}
```

Returns `401` when no valid auth session exists.

### `POST /api/v1/auth/verify-email`

Consumes a single-use email-verification token.

Request:

```json
{
  "token": "raw-action-token"
}
```

Response `200`:

```json
{
  "data": {
    "verified": true
  }
}
```

Returns `400` with `INVALID_TOKEN` when the token is invalid, expired, already used, or has the wrong purpose.

### `POST /api/v1/auth/resend-verification`

Attempts to send a new verification email for the authenticated user.

Response `200`:

```json
{
  "data": {
    "status": "SENT"
  }
}
```

`status` is `SENT`, `NOT_REQUIRED`, or `FAILED`. A new request supersedes every unused verification token for that account. Returns `401` without a valid auth session.

### `POST /api/v1/auth/forgot-password`

Requests a single-use password-reset link.

Request:

```json
{
  "email": "jan@example.com"
}
```

Response `200`:

```json
{
  "data": {
    "requested": true
  }
}
```

The response is identical whether the email exists or email delivery succeeds, preventing account enumeration. For an existing account, a new request supersedes every unused reset token and attempts delivery of a replacement token that expires after 60 minutes. The delivery outcome is internal only.

### `POST /api/v1/auth/reset-password`

Consumes a password-reset token and replaces the account password.

Request:

```json
{
  "token": "raw-action-token",
  "password": "new correct horse battery staple"
}
```

Response `200`:

```json
{
  "data": {
    "reset": true
  }
}
```

Successful reset marks the email verified, revokes all existing sessions, and clears login failure state. Returns `400` with `INVALID_TOKEN` when the token is invalid, expired, already used, or has the wrong purpose.

### Transactional-email behavior

- Public production startup requires `RESEND_API_KEY`, a valid `EMAIL_FROM`, and the published `SUPPORT_EMAIL` used as reply-to. Log delivery is allowed only in development, test, and explicit local/private-LAN deployments.
- Supported mail kinds are invitation, verification, password reset, deletion scheduled, deletion cancelled, deletion cancelled by support, and deletion completed.
- Delivery is synchronous and either returns provider acceptance (with an optional provider message ID) or raises a typed delivery error. There is no mail outbox.
- Logs and metrics may include only mail kind, outcome, provider status, provider message ID, and duration. They never include recipient, body, action link, or raw token.
- Raw action tokens are never persisted outside their existing hashed domain-token records. A later explicit resend supersedes a failed or ambiguous attempt.

## Workout Endpoints

### `POST /api/v1/workouts`

Creates a new open workout.

Request:

```json
{
  "startedAt": "2026-05-15T10:00:00Z",
  "workoutType": "upper",
  "title": "Upper A",
  "notes": null
}
```

Response `201`:

```json
{
  "data": {
    "workout": {
      "id": "uuid",
      "startedAt": "2026-05-15T10:00:00Z",
      "endedAt": null,
      "isOpen": true,
      "workoutType": "upper",
      "title": "Upper A",
      "notes": null,
      "exercises": []
    }
  }
}
```

Behavior:

- Uses current time if `startedAt` is omitted.
- Returns `409` if the user already has an open workout.

### `GET /api/v1/workouts`

Lists workout summaries for the current user.

Query parameters:

- `startDate` ISO timestamp/date, optional
- `endDate` ISO timestamp/date, optional
- `limit` integer, default `20`, max `100`
- `offset` integer, default `0`

Date-only values use UTC day bounds: `startDate=2026-05-15` starts at `2026-05-15T00:00:00.000Z`, and `endDate=2026-05-15` ends at `2026-05-15T23:59:59.999Z`. Timestamp values are treated as exact instants.

Response `200`:

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "startedAt": "2026-05-15T10:00:00Z",
        "endedAt": "2026-05-15T11:10:00Z",
        "isOpen": false,
        "workoutType": "upper",
        "title": "Upper A",
        "notes": null,
        "totalExercises": 5,
        "totalSets": 15
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 1
    }
  }
}
```

### `GET /api/v1/workouts/:workoutId`

Returns full workout detail.

Response `200`:

```json
{
  "data": {
    "workout": {
      "id": "uuid",
      "startedAt": "2026-05-15T10:00:00Z",
      "endedAt": null,
      "isOpen": true,
      "workoutType": "upper",
      "title": "Upper A",
      "notes": null,
      "exercises": [
        {
          "id": "uuid",
          "position": 1,
          "exercise": {
            "id": "uuid",
            "name": "Bench Press",
            "primaryMuscleGroup": {
              "id": "uuid",
              "slug": "chest",
              "name": "Chest"
            },
            "primaryMuscleGroups": [
              { "id": "uuid", "slug": "chest", "name": "Chest" },
              { "id": "uuid", "slug": "triceps", "name": "Triceps" }
            ],
            "secondaryMuscleGroups": [
              { "id": "uuid", "slug": "shoulders", "name": "Shoulders" }
            ],
            "muscleGroups": [
              { "id": "uuid", "slug": "chest", "name": "Chest", "role": "PRIMARY" },
              { "id": "uuid", "slug": "triceps", "name": "Triceps", "role": "PRIMARY" },
              { "id": "uuid", "slug": "shoulders", "name": "Shoulders", "role": "SECONDARY" }
            ]
          },
          "sets": []
        }
      ]
    }
  }
}
```

Returns `404` if the workout does not exist or belongs to another user.

Workout details resolve these muscle fields from the exercise's current normalized classification; the session does not contain a classification snapshot.

### `PATCH /api/v1/workouts/:workoutId`

Updates workout metadata.

Request:

```json
{
  "startedAt": "2026-05-15T10:00:00Z",
  "workoutType": "upper",
  "title": "Upper A",
  "notes": "Felt strong"
}
```

Response `200`:

```json
{
  "data": {
    "workout": {
      "id": "uuid",
      "startedAt": "2026-05-15T10:00:00Z",
      "endedAt": null,
      "isOpen": true,
      "workoutType": "upper",
      "title": "Upper A",
      "notes": "Felt strong",
      "exercises": []
    }
  }
}
```

### `POST /api/v1/workouts/:workoutId/end`

Closes an open workout.

Request:

```json
{
  "endedAt": "2026-05-15T11:10:00Z"
}
```

Response `200`:

```json
{
  "data": {
    "workout": {
      "id": "uuid",
      "startedAt": "2026-05-15T10:00:00Z",
      "endedAt": "2026-05-15T11:10:00Z",
      "isOpen": false,
      "workoutType": "upper",
      "title": "Upper A",
      "notes": null,
      "exercises": []
    }
  }
}
```

Behavior:

- Uses current time if `endedAt` is omitted.
- Returns `409` if the workout is already closed.

### `DELETE /api/v1/workouts/:workoutId`

Soft-deletes a workout.

Response `200`:

```json
{
  "data": {
    "deleted": true
  }
}
```

## Workout CSV Endpoints

CSV import/export uses one canonical row-per-set workout-history format. The columns are:

```text
workout_started_at,workout_ended_at,workout_type,workout_title,workout_notes,exercise_name,primary_muscle_group_slug,equipment,exercise_type,exercise_position,set_order,set_type,weight_kg,reps,rir,rest_time_seconds,set_note
```

The Workout History `View CSV format` dialog/sheet presents this exact contract and a downloadable sample:

- All 17 canonical header columns are required and extra columns are rejected, even when a column's row value is optional.
- Required values: `workout_started_at`, `workout_ended_at`, `exercise_name`, `primary_muscle_group_slug`, `exercise_position`, `set_order`, `set_type`, `weight_kg`, `reps`, and `rir`.
- Optional values may be blank: `workout_type`, `workout_title`, `workout_notes`, `equipment`, `exercise_type`, `rest_time_seconds`, and `set_note`.
- Timestamps are ISO 8601 instants with offsets; the end must be after the start. Use one row per set and repeat workout/exercise fields on every row.
- `exercise_position` values are compact positive integers starting at `1` within each workout. `set_order` values are compact positive integers starting at `1` within each exercise occurrence.
- `set_type` is `working` or `warmup`. Equipment is blank or one of `barbell`, `dumbbell`, `kettlebell`, `cable`, `machine`, `plate-loaded machine`, `Smith machine`, `resistance band`, `bodyweight`, or `other`. Exercise type is blank or one of `compound`, `isolation`, `isometric`, or `other`.
- Seeded primary muscle slugs are `chest`, `back`, `shoulders`, `biceps`, `triceps`, `forearms`, `quads`, `hamstrings`, `glutes`, `calves`, `abs`, and `traps`.
- Exports enable Papa Parse formula escaping. Any exported cell beginning with a spreadsheet formula prefix is emitted as literal text rather than an executable formula when opened in common spreadsheet software; the downloadable sample contains only fixed canonical content.

Complete example row:

```csv
2026-07-10T17:00:00.000Z,2026-07-10T18:00:00.000Z,upper,Push Day,,Bench Press,chest,barbell,compound,1,1,working,80,8,2,120,Controlled reps
```

### `GET /api/v1/workouts/export.csv`

Exports the current user's closed, non-deleted workout sets as `text/csv`.

Behavior:

- Requires authentication.
- Uses the canonical header above.
- Excludes open workouts, soft-deleted workouts, soft-deleted exercise blocks, and soft-deleted sets.
- Returns the header row when there are no closed workout sets to export.

### `POST /api/v1/workouts/import.csv`

Imports closed workout sessions from the canonical CSV format.

Request:

- Content type: `text/csv`
- Optional query param: `confirmNameWarnings=true`
- Body: CSV text using the canonical columns above.

Response `201`:

```json
{
  "data": {
    "importedRows": 1,
    "importedWorkouts": 1
  }
}
```

Behavior:

- Requires authentication.
- Validates the entire CSV before writing.
- Uses the shared exercise-name quality gate for every `exercise_name`.
- Creates closed workout sessions from CSV rows.
- Creates or reuses global exercises by case-insensitive `exercise_name`.
- Requires `primary_muscle_group_slug` to match a seeded muscle group.
- Requires compact `exercise_position` and `set_order` values starting at `1`.
- Rejects blocked exercise names.
- Rejects warned exercise names unless `confirmNameWarnings=true`.
- Does not partially import when validation fails.

Validation response `422`:

```json
{
  "error": {
    "code": "CSV_VALIDATION_ERROR",
    "message": "CSV could not be imported.",
    "fields": {
      "row 2": ["weight_kg: Expected a positive kg value with up to 2 decimals."]
    }
  }
}
```

When the failure is caused by warned or blocked exercise names, `error.details.preview` includes:

- `importedRows`
- `importedWorkouts`
- `importability`
- `warnings`
- `blocked`

### `POST /api/v1/workouts/import.csv/preview`

Previews a CSV import without writing any workout data.

Request:

- Content type: `text/csv`
- Body: CSV text using the canonical columns above.

Response `200`:

```json
{
  "data": {
    "preview": {
      "importedRows": 1,
      "importedWorkouts": 1,
      "importability": "ready_with_warnings",
      "warnings": [
        {
          "row": 2,
          "originalName": "Incline Dumbell Press",
          "normalizedName": "Incline Dumbell Press",
          "reasons": [{ "code": "not_in_catalog", "message": "This name is not in the approved exercise catalog yet." }],
          "suggestions": ["Incline Dumbbell Press"]
        }
      ],
      "blocked": []
    }
  }
}
```

Behavior:

- Requires authentication.
- Validates the entire CSV before previewing.
- Reports row-level validation errors without writing any data.
- Returns `importability` as `ready`, `ready_with_warnings`, or `blocked`.

## Workout Exercise Endpoints

### `POST /api/v1/workouts/:workoutId/exercises`

Adds an exercise block to a workout.

Request:

```json
{
  "clientMutationId": "b1633708-8425-4b61-9413-642edf9c0722",
  "exerciseId": "uuid",
  "position": 1
}
```

Response `201`:

```json
{
  "data": {
    "sessionExercise": {
      "id": "uuid",
      "position": 1,
      "exercise": {
        "id": "uuid",
        "name": "Bench Press",
        "primaryMuscleGroup": {
          "id": "uuid",
          "slug": "chest",
          "name": "Chest"
        }
      },
      "sets": []
    },
    "replayed": false
  }
}
```

Behavior:

- `clientMutationId` is required and generated once per logical add action. It is reused until success or explicit abandonment.
- Appends to the end if `position` is omitted.
- Provided `position` must be in the active compact range `1..activeCount+1`.
- Ownership validation, the workout-row lock, active count, shifts/compaction, and insertion complete inside one transaction.
- Existing active exercise positions are shifted to keep positions compact. Distinct concurrent adds serialize and both succeed.
- Initial creation returns `201` with `replayed: false`. A replay under the same workout and same `exerciseId` returns the existing resource at its authoritative current position with `200` and `replayed: true`, without another write or reapplying the originally requested position.
- Reusing the ID under the same workout for a different `exerciseId` returns `409 IDEMPOTENCY_CONFLICT`. Position is mutable ordering metadata. IDs are scoped to the parent workout and therefore do not conflict across users' workouts.
- Returns `404` if the workout or exercise is not available.

### `PATCH /api/v1/workouts/:workoutId/exercises/reorder`

Reorders exercise blocks in a workout.

Request:

```json
{
  "items": [
    {
      "sessionExerciseId": "uuid",
      "position": 1
    }
  ]
}
```

Response `200`:

```json
{
  "data": {
    "items": [
      {
        "sessionExerciseId": "uuid",
        "position": 1
      }
    ]
  }
}
```

Behavior:

- Request items must include every active session exercise for the workout exactly once.
- Positions must be unique and compact in the range `1..N`.
- The operation locks the owned workout row and is last-write-wins for this beta. The web invalidates and refetches the authoritative workout after success or failure.
- Invalid ordering or a resolved structural race returns a stable `409`, never a raw database error.
- Unknown or foreign session exercise IDs return `404`.

### `DELETE /api/v1/workouts/:workoutId/exercises/:sessionExerciseId`

Soft-deletes an exercise block from a workout.

Response `200`:

```json
{
  "data": {
    "deleted": true
  }
}
```

Behavior:

- Related sets are hidden from active views and analytics.
- Deletion and position compaction run in one transaction under the owned workout-row lock.
- Remaining exercise positions are compacted. Races resolve to `404` or `409`, not an unhandled database error.

## Set Endpoints

### `POST /api/v1/workouts/:workoutId/exercises/:sessionExerciseId/sets`

Adds a set to a workout exercise.

Request:

```json
{
  "clientMutationId": "71d688ee-21aa-4686-ab34-c2271e80e4f9",
  "setType": "working",
  "weightKg": "80.00",
  "reps": 8,
  "rir": 2,
  "restTimeSeconds": 120,
  "note": "Good speed"
}
```

Response `201`:

```json
{
  "data": {
    "set": {
      "id": "uuid",
      "setOrder": 1,
      "setType": "working",
      "weightKg": "80.00",
      "reps": 8,
      "rir": 2,
      "restTimeSeconds": 120,
      "note": "Good speed",
      "createdAt": "2026-05-15T10:05:00Z",
      "updatedAt": "2026-05-15T10:05:00Z"
    },
    "replayed": false
  }
}
```

Behavior:

- `clientMutationId` is required and generated once per logical set-save action. The active draft retains it across failed attempts until success or explicit abandonment.
- Ownership validation, the session-exercise row lock, active count/order calculation, compaction, and insertion complete inside one transaction.
- Appends to the end of the set list. Distinct concurrent adds serialize and both succeed with compact deterministic order.
- Initial creation returns `201` with `replayed: false`. A replay matching the set's current normalized values under the same session exercise returns the existing resource with `200` and `replayed: true`, without another write.
- Reusing the ID under the same session exercise for different current set content, or replaying after that set was deleted, returns `409 IDEMPOTENCY_CONFLICT`; a later set edit may therefore make an old create payload conflict. IDs are scoped to the parent and do not conflict across users' session exercises.
- `weightKg` accepts a decimal string or JSON number, but responses use a decimal string.
- `restTimeSeconds` may be omitted or null.

### `PATCH /api/v1/sets/:setId`

Updates a set.

Request:

```json
{
  "setType": "working",
  "weightKg": "82.50",
  "reps": 8,
  "rir": 1,
  "restTimeSeconds": 150,
  "note": "Hard top set"
}
```

Response `200`:

```json
{
  "data": {
    "set": {
      "id": "uuid",
      "setOrder": 1,
      "setType": "working",
      "weightKg": "82.50",
      "reps": 8,
      "rir": 1,
      "restTimeSeconds": 150,
      "note": "Hard top set",
      "createdAt": "2026-05-15T10:05:00Z",
      "updatedAt": "2026-05-15T10:07:00Z"
    }
  }
}
```

Behavior:

- Accepts one or more editable set fields.
- Preserves `setOrder`.
- Updates are last-write-wins for this beta. The web invalidates and refetches the authoritative workout after success or failure.

### `DELETE /api/v1/sets/:setId`

Soft-deletes a set.

Response `200`:

```json
{
  "data": {
    "deleted": true
  }
}
```

Behavior:

- Deletion and order compaction run in one transaction under the owned parent session-exercise lock.
- Remaining set order is compacted. Races resolve to `404` or `409`, not an unhandled database error.

## Exercise Library Endpoints

### `GET /api/v1/exercises`

Lists selectable exercises from the shared global exercise library.

Query parameters:

- `search` string, optional
- `primaryMuscleGroupId` UUID, optional legacy primary-role filter
- `muscleGroupId` UUID, optional legacy either-role filter
- `muscleGroupIds` repeated or comma-separated UUIDs, optional; every selected muscle must match the exercise in either role
- `equipment` canonical value or `unspecified`, optional
- `exerciseType` canonical value or `unspecified`, optional
- `ownership=editable|readOnly`, optional; omitted means all selectable exercises
- `sort=name|muscle|equipment|type`, optional
- `limit` integer, default `50`, max `100`
- `offset` integer, default `0`

Behavior:

- Requires authentication and applies the authenticated user ID to ownership filtering.
- Search relevance is exact name, approved repo-owned alias, name prefix/substring, `pg_trgm` typo similarity, then primary/secondary muscle or equipment. Results remain deterministic by similarity/name within a relevance tier, and unrelated short/noise searches are bounded to avoid broad false positives.
- Muscle, equipment, type, and ownership filters compose before pagination; response items remain unique and pagination `total` reflects the filtered result.
- `ownership=editable` matches `created_by_user_id = authenticated user`. `ownership=readOnly` matches system exercises (`created_by_user_id IS NULL`) and exercises created by another user.
- The response shape is unchanged; `createdByUserId` continues to let the web explain why an exercise is read-only.

Response `200`:

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Bench Press",
        "equipment": "barbell",
        "exerciseType": "compound",
        "primaryMuscleGroup": {
          "id": "uuid",
          "slug": "chest",
          "name": "Chest"
        },
        "secondaryMuscleGroups": [],
        "createdByUserId": null,
        "createdAt": "2026-05-15T10:00:00Z",
        "updatedAt": "2026-05-15T10:00:00Z"
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 1
    }
  }
}
```

### `POST /api/v1/exercises`

Adds a globally unique exercise to the shared library.

Request:

```json
{
  "name": "Incline Dumbbell Press",
  "equipment": "dumbbell",
  "exerciseType": "compound",
  "primaryMuscleGroupIds": ["uuid", "uuid"],
  "secondaryMuscleGroupIds": ["uuid"],
  "confirmNameWarning": false
}
```

Response `201`:

```json
{
  "data": {
    "exercise": {
      "id": "uuid",
      "name": "Incline Dumbbell Press",
      "equipment": "dumbbell",
      "exerciseType": "compound",
      "primaryMuscleGroup": {
        "id": "uuid",
        "slug": "chest",
        "name": "Chest"
      },
      "secondaryMuscleGroups": [],
      "createdByUserId": "uuid",
      "createdAt": "2026-05-15T10:00:00Z",
      "updatedAt": "2026-05-15T10:00:00Z"
    }
  }
}
```

Behavior:

- Returns `409` if an active exercise with the same case-insensitive name exists.
- Returns `404` if any referenced muscle group does not exist.
- Uses a shared exercise-name quality gate before create/restore:
  - exact case-insensitive allowlist match: accept automatically
  - hard-block rule or blacklist match: reject
  - plausible but unapproved name: require explicit confirmation
- If the existing record is soft-deleted, implementation should restore/reuse it instead of creating a duplicate.
- At least one primary ID is required; IDs must be unique with no overlap between roles.
- `PATCH /api/v1/exercises/:exerciseId` accepts the same classification shape and is restricted to the user who created the exercise.
- Exercise search matches exercise names and current primary or secondary muscle names. Results expose structured role data.

Review-required response `422`:

```json
{
  "error": {
    "code": "EXERCISE_NAME_REVIEW_REQUIRED",
    "message": "This exercise name needs review before it can be added.",
    "details": {
      "normalizedName": "Incline Dumbell Press",
      "reasons": [{ "code": "not_in_catalog", "message": "This name is not in the approved exercise catalog yet." }],
      "suggestions": ["Incline Dumbbell Press"]
    }
  }
}
```

Blocked-name response `422`:

```json
{
  "error": {
    "code": "EXERCISE_NAME_BLOCKED",
    "message": "This exercise name is blocked.",
    "details": {
      "normalizedName": "Bench Press 2026-05-20",
      "reasons": [{ "code": "contains_date", "message": "Exercise names must not include dates or timestamps." }],
      "suggestions": ["Bench Press"]
    }
  }
}
```

### `GET /api/v1/muscle-groups`

Lists seeded muscle groups.

Requires authentication.

Response `200`:

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "slug": "chest",
        "name": "Chest",
        "sortOrder": 1
      }
    ]
  }
}
```

## Workout Template Endpoints

Template responses contain `id`, `name`, `createdAt`, `updatedAt`, and ordered `exercises`. Each entry has its own ID/position plus the referenced exercise's current structured `muscleGroups`. Templates never contain sets or performance fields.

### `GET /api/v1/workout-templates`

Lists only the current user's templates, newest updated first.

### `GET /api/v1/workout-templates/:templateId`

Reads one owned template. Missing and foreign IDs both return `404`.

### `POST /api/v1/workout-templates`

```json
{ "name": "Push A", "exerciseIds": ["uuid", "uuid", "uuid"] }
```

Creates the template transactionally. Order and duplicate IDs are preserved. Every exercise must currently be selectable.

### `PATCH /api/v1/workout-templates/:templateId`

Accepts `name`, `exerciseIds`, or both. Replacing the ordered IDs implements add, remove, replace, and reorder operations in one transaction.

### `POST /api/v1/workout-templates/:templateId/duplicate`

Creates an independent owned copy. An optional `name` overrides the default `"<name> Copy"`.

### `DELETE /api/v1/workout-templates/:templateId`

Deletes the template and its child rows. Session source references become `NULL`; workout sessions and history are never deleted.

### `POST /api/v1/workout-templates/:templateId/start`

Creates a normal open workout and copies ordered exercise occurrences into session exercise rows in one transaction. No set rows are created. Returns `409 OPEN_WORKOUT_EXISTS` when the user already has an active workout.

### `POST /api/v1/workouts/:workoutId/templates`

```json
{ "name": "Push A Result" }
```

Creates a new template from an owned completed workout's current ordered exercise IDs, excluding all set/performance data.

### `POST /api/v1/workout-templates/:templateId/from-workout`

```json
{ "workoutId": "uuid" }
```

Explicitly replaces an owned source template's exercise structure with an owned completed workout's structure, preserving the template name.

## Analytics Endpoints

### `GET /api/v1/analytics/exercises`

Returns exercises the current user has logged, sorted by most recently trained first. This supports the Progress exercise list and excludes exercises that have never appeared in the user's workout history.

Query parameters:

- `timeZone` IANA time zone, optional, defaults to `UTC`; used to count unique local plotted days

Response `200`:

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Bench Press",
        "primaryMuscleGroup": {
          "id": "uuid",
          "slug": "chest",
          "name": "Chest"
        },
        "secondaryMuscleGroups": [
          {
            "id": "uuid",
            "slug": "triceps",
            "name": "Triceps"
          }
        ],
        "lastDoneAt": "2026-05-15T10:00:00Z",
        "plottedSetCount": 12,
        "totalSets": 24
      }
    ]
  }
}
```

Behavior:

- User-scoped; another user's workout history is not visible.
- Sorts by `lastDoneAt` descending.
- Counts non-deleted sets from non-deleted workout data.
- `plottedSetCount` counts unique local calendar days containing at least one working set. It matches the maximum number of daily points shown by the Progress plot over full history.

### `GET /api/v1/analytics/exercises/:exerciseId/progress`

Returns raw set history for an exercise over a time range.

Query parameters:

- `startDate` ISO timestamp/date, optional
- `endDate` ISO timestamp/date, optional
- `includeWarmups` boolean, default `false`

Response `200`:

```json
{
  "data": {
    "exerciseId": "uuid",
    "items": [
      {
        "workoutId": "uuid",
        "sessionExerciseId": "uuid",
        "setId": "uuid",
        "sessionDate": "2026-05-15T10:00:00Z",
        "setOrder": 1,
        "setType": "working",
        "weightKg": "80.00",
        "reps": 8,
        "rir": 2,
        "estimatedOneRepMaxKg": "99.20"
      }
    ]
  }
}
```

Behavior:

- Defaults to working sets only.
- `includeWarmups=true` includes warmup sets.
- Estimated one-rep max is computed on read.

### `GET /api/v1/analytics/exercises/:exerciseId/summary`

Returns computed summary stats for an exercise over a time range.

Query parameters:

- `startDate` ISO timestamp/date, optional
- `endDate` ISO timestamp/date, optional

Response `200`:

```json
{
  "data": {
    "exerciseId": "uuid",
    "totalSets": 12,
    "totalReps": 96,
    "totalVolumeKg": "7680.00",
    "averageRir": 2.1,
    "bestTopSet": {
      "workoutId": "uuid",
      "setId": "uuid",
      "sessionDate": "2026-05-15T10:00:00Z",
      "weightKg": "82.50",
      "reps": 8,
      "rir": 1,
      "estimatedOneRepMaxKg": "103.40"
    }
  }
}
```

When no matching sets exist, numeric totals return zero, `averageRir` returns `null`, and `bestTopSet` returns `null`.

`totalSets`, `totalReps`, and `totalVolumeKg` include both working and warmup sets in the requested range. The Progress UI requests the active 1W/1M/3M range for `TOTAL_SETS` and `TOTAL_TONNAGE`; MAX and the all-time `BEST_SET`/`EST_1RM` widgets use an unbounded request. `totalVolumeKg` is the sum of `weight × reps`.

### `GET /api/v1/analytics/weekly-volume`

Returns weekly working-set counts by primary muscle group.

Query parameters:

- `startDate` ISO timestamp/date, optional
- `endDate` ISO timestamp/date, optional
- `muscleGroupIds` comma-separated UUID list, optional

Response `200`:

```json
{
  "data": {
    "weeks": [
      {
        "weekStart": "2026-05-11",
        "weekEnd": "2026-05-17",
        "items": [
          {
            "muscleGroup": {
              "id": "uuid",
              "slug": "chest",
              "name": "Chest"
            },
            "workingSets": 12,
            "exercises": [
              {
                "id": "uuid",
                "name": "Bench Press",
                "workingSets": 8
              }
            ],
            "recentSessions": [
              {
                "workoutId": "uuid",
                "sessionDate": "2026-05-15T10:00:00Z",
                "workingSets": 4
              }
            ]
          }
        ]
      }
    ]
  }
}
```

Behavior:

- Counts working sets only.
- Counts each current primary muscle assignment for the exercise; secondary assignments do not receive volume.
- Includes per-muscle exercise totals and recent contributing sessions for the Weekly Volume detail panel.
- Excludes soft-deleted workouts, session exercises, and sets.

## Deferred Endpoints

Cardio is deferred from the MVP. Do not implement these endpoints in the first API pass:

- `POST /api/v1/cardio`
- `GET /api/v1/cardio`

## Validation Rules

- `REGISTRATION_MODE` accepts only `ENABLED`, `INVITE_ONLY`, or `DISABLED`; production defaults to
  `DISABLED` when the variable is absent.
- Required fields must be present and non-empty unless nullable.
- `email` must be a valid email string.
- `username` must be globally unique case-insensitively.
- Signup and reset `password` values must be 10-200 characters.
- Login accepts 1-200 password characters so accounts created under the earlier minimum can still authenticate.
- `clientMutationId` must be a UUID and is required for new session-exercise and set creates.
- `setType` must be `warmup` or `working`.
- `weightKg` must be positive and fit `numeric(6,2)`.
- `reps` must be a positive integer.
- `rir` must be an integer from 0 to 10.
- `restTimeSeconds` must be omitted, null, or a non-negative integer.
- `limit` must be positive and capped by the endpoint max.
- `offset` must be a non-negative integer.

## V1 usability contract additions

These additions supersede older list behavior where it conflicts.

### `GET /api/v1/workouts`

Optional query values: `search`, repeated or comma-separated `muscleGroupIds`, `equipment`, `exerciseType`, `sort=newest|oldest|name`, `timeZone`, `limit`, and `offset`. `equipment` and `exerciseType` accept `unspecified` for `NULL`.

Search and facets execute before pagination. Search covers title, workout type, locally displayed date formats, exercise name, muscle name, and equipment. All active exercise facets must match one contained exercise. Each summary also returns:

```json
{
  "tonnageKg": "12500.00",
  "exercisePreview": [
    { "id": "uuid", "name": "Bench Press", "equipment": "barbell", "exerciseType": "compound" }
  ]
}
```

The list payload includes an unfiltered `allTimeSummary`:

```json
{
  "totalSessions": 120,
  "completedSessions": 115,
  "cumulativeTonnageKg": "900000.00",
  "averageCompletedDurationSeconds": 4200,
  "completionRate": 0.9583
}
```

### `GET /api/v1/workout-templates`

Accepts `search`, `muscleGroupIds`, `equipment`, `exerciseType`, and `sort=lastUsed|name|lastEdited`. Facet semantics match workouts. Template exercises include `equipment` and `exerciseType`; templates include nullable `lastUsedAt`. Last use comes from the latest completed workout with the exact exercise multiset.

### `GET /api/v1/exercises`

Accepts `search`, repeated or comma-separated `muscleGroupIds`, `equipment`, `exerciseType`, `ownership=editable|readOnly`, `sort=name|muscle|equipment|type`, `limit`, and `offset`. Multiple muscles are AND conditions on the exercise. Search covers name, muscle, and equipment. Ownership uses the authenticated user: `editable` is user-created-by-me; `readOnly` is system-created or created by another user. Omitted ownership returns all selectable exercises. Every filter executes before pagination and response shapes remain unchanged.

### `GET /api/v1/exercises/options`

Returns authoritative `equipment` and `exerciseTypes` arrays. Equipment includes `barbell`, `dumbbell`, `kettlebell`, `cable`, `machine`, `plate-loaded machine`, `Smith machine`, `resistance band`, `bodyweight`, `EZ bar`, `medicine ball`, `stability ball`, and `other`.

### `GET /api/v1/exercises/name-suggestions?name=...`

Returns at most five selectable existing exercises for creation-time reuse using the same fuzzy/alias relevance ordering as the exercise list. The client labels these as “Did you mean?” choices; the response never merges, renames, or overwrites a custom exercise.

### `GET|PATCH /api/v1/users/me/preferences`

Returns or updates `{ "volumeHeatCeiling": 20 }`. PATCH requires a whole number from 5 through 50.

### Exercise merge result

Merge responses additionally include `reassignedTemplateExercises` and `affectedTemplates`. The operation reassigns only the requesting user's workout/template references. Source retirement follows the global active-reference rule in `docs/03-data-model-notes.md`.

## Follow-Up Decisions

- Decide whether API docs should later be generated from Zod or OpenAPI.
- The cookie name and secure flag remain environment-configured; document deployment values in the operations runbook rather than hard-coding them here.

## Founding Beta Interfaces

- `POST /api/v1/beta/waitlist` is public, accepts `{ email, adultAttested: true, privacyVersion }`, and always returns the same accepted envelope for new, duplicate, account-linked, blocked, or paused intake.
- `POST /api/v1/auth/signup` requires `inviteToken`, the published Terms/Privacy versions and `adultAttested: true` when registration is `INVITE_ONLY`. A valid invitation is single use, expires after seven days, reserves a seat, fixes the invited email, and creates an already email-verified account.
- `POST /api/v1/users/me/export` requires `{ password }` and downloads machine-readable JSON. It excludes credential/token hashes and unrelated security/audit records.
- `POST /api/v1/users/me/deletion` requires `{ password }`, revokes sessions and returns `deletionDueAt` only after the cancellation email is accepted. `POST /api/v1/users/me/deletion/cancel` accepts the single-use raw token. Account erasure is the documented hard-delete exception to soft-delete defaults.
- `GET|PATCH /api/v1/users/me/privacy-preferences` manages functional storage, account-linked analytics and feedback prompts. `GET|PATCH /api/v1/users/me/onboarding` manages versioned boolean steps.
- `GET /api/v1/messages` returns eligible undismissed messages; only the first is marked shown. `POST /messages/:campaignId/dismiss` is final; `POST /respond` accepts the exact configured acknowledgement/rating/choice/free-text shape.
- Owner-only beta routes list requests/settings and execute audited request/settings actions. Owner-only campaign routes create drafts, list campaigns and publish/pause/resume/end. `POST /admin/users/:userId/deletion/cancel` is the audited urgent-support cancellation path.

### Invitation approval and reissue

`POST /api/v1/admin/beta/requests/:requestId` accepts an administrator action. `APPROVE` and `RESEND` synchronously attempt provider acceptance after the invitation transaction.

Request:

```json
{
  "action": "APPROVE"
}
```

Successful response `200`:

```json
{
  "data": {
    "updated": true,
    "status": "approved",
    "expiresAt": "2026-08-13T10:00:00.000Z",
    "deliveryStatus": "SENT"
  }
}
```

`deliveryStatus` is `SENT` or `FAILED`. A delivery failure does not roll back the invitation: the request remains `INVITED`, an audit event is recorded, and the administrator UI presents the explicit `RESEND` action. Reissue rotates the unused invitation token; callers must not encourage a generic retry of the earlier action.

### Account deletion delivery results

Deletion scheduling response `200`:

```json
{
  "data": {
    "deletionDueAt": "2026-08-13T10:00:00.000Z"
  }
}
```

If required email acceptance fails, the service compensates the account back to `ACTIVE`, invalidates the pending cancellation token, and returns:

```json
{
  "error": {
    "code": "EMAIL_DELIVERY_FAILED",
    "message": "Deletion was not scheduled because the required email could not be delivered. Sign in again before retrying or contact support."
  }
}
```

The status is `503`. The already-revoked sessions are not recreated, so the user may need to sign in again.

Both token and administrator cancellation return `200` after the account transition even when the informational email fails:

```json
{
  "data": {
    "cancelled": true,
    "notificationStatus": "SENT"
  }
}
```

`notificationStatus` is `SENT` or `FAILED`. A final-deletion notification is best effort; the erased email address is not retained for retry.

### `GET /api/v1/admin/users`

Lists up to the bounded beta population for an authenticated administrator.

Response `200`:

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "email": "member@example.com",
        "username": "member",
        "role": "USER",
        "status": "ACTIVE",
        "cohort": "FOUNDING_BETA_2026",
        "createdAt": "2026-08-01T10:00:00.000Z",
        "activeSessionCount": 2
      }
    ]
  }
}
```

`GET /api/v1/admin/beta/users` remains temporarily as a deprecated read-only alias. It sends `Deprecation: true` and `Link: </api/v1/admin/users>; rel="successor-version"`. New clients use the canonical endpoint; the alias gains no containment mutations.

### `PATCH /api/v1/admin/users/:userId/status`

Accepts only:

```json
{
  "status": "SUSPENDED"
}
```

`status` is `ACTIVE` or `SUSPENDED`. Success returns the final account status and the number of sessions revoked:

```json
{
  "data": {
    "status": "updated",
    "accountStatus": "SUSPENDED",
    "revokedSessions": 2
  }
}
```

The account-row lock, status change, session revocation, and audit insert are one transaction. Suspension revokes every live session. Reactivation creates no session and does not alter email verification. Administrator targets, self-targets, role changes, and `DELETION_PENDING` transitions are unavailable; use the existing deletion-cancellation endpoint for the latter. Returns `403 ADMIN_TARGET_FORBIDDEN`, `409 INVALID_ACCOUNT_TRANSITION`, or `404 USER_NOT_FOUND` as applicable.

### `POST /api/v1/admin/users/:userId/sessions/revoke`

Revokes all current sessions for an ordinary user and writes the audit record in the same transaction.

Response `200`:

```json
{
  "data": {
    "status": "updated",
    "revokedSessions": 3
  }
}
```

Replaying the action is safe and returns `revokedSessions: 0`. Administrator/self targets return `403 ADMIN_TARGET_FORBIDDEN`; an unknown target returns `404 USER_NOT_FOUND`.

### `GET /api/v1/admin/audit-events`

Returns recent administrator audit events in descending creation order. `limit` defaults to 50 and is capped at 100; `cursor` is the opaque `nextCursor` from the previous page.

```json
{
  "data": {
    "items": [
      {
        "id": "123",
        "adminUserId": "uuid",
        "adminUsername": "owner",
        "action": "USER_SUSPENDED",
        "targetType": "USER",
        "targetId": "uuid",
        "details": {
          "previousStatus": "ACTIVE",
          "newStatus": "SUSPENDED",
          "revokedSessions": 2
        },
        "createdAt": "2026-08-06T12:00:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
```

Only the allowlisted bounded detail fields `previousStatus`, `newStatus`, and `revokedSessions` are exposed. A malformed cursor or limit above 100 returns `422 VALIDATION_ERROR`.

### API-process lifecycle behavior

The single API process owns a single-flight lifecycle runner. It runs once during startup and hourly thereafter. Auth-token cleanup, invitation expiry, due deletions, retention cleanup, and completion notifications are isolated phases: one failure does not stop later phases, later due accounts, or the next scheduled run. The runner processes the entire due-deletion list under the 50-account beta cap and reports bounded metrics described under `GET /api/v1/metrics`.

All public/auth/export/deletion/feedback/admin mutation groups have endpoint-specific limits. Production client attribution accepts only a valid BFF HMAC; browser-supplied forwarding headers are not trusted by the API.
