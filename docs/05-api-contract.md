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
- `422 Unprocessable Entity` - validation error
- `500 Internal Server Error` - unexpected server error

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

## Shared Shapes

### `User`

```json
{
  "id": "uuid",
  "email": "jan@example.com",
  "username": "jan",
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
  "sets": []
}
```

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

Creates an account and starts an auth session.

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
      "createdAt": "2026-05-15T10:00:00Z"
    }
  }
}
```

Behavior:

- Sets the auth session cookie.
- Returns `409` if email or username already exists.
- Passwords are hashed with Argon2.

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
      "createdAt": "2026-05-15T10:00:00Z"
    }
  }
}
```

Behavior:

- Sets the auth session cookie.
- Returns `401` for invalid credentials.

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
      "createdAt": "2026-05-15T10:00:00Z"
    }
  }
}
```

Returns `401` when no valid auth session exists.

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
            }
          },
          "sets": []
        }
      ]
    }
  }
}
```

Returns `404` if the workout does not exist or belongs to another user.

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
    }
  }
}
```

Behavior:

- Appends to the end if `position` is omitted.
- Provided `position` must be in the active compact range `1..activeCount+1`.
- Existing active exercise positions are shifted to keep positions compact.
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
- Invalid ordering returns `409`.
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
- Remaining exercise positions should be compacted.

## Set Endpoints

### `POST /api/v1/workouts/:workoutId/exercises/:sessionExerciseId/sets`

Adds a set to a workout exercise.

Request:

```json
{
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
    }
  }
}
```

Behavior:

- Appends to the end of the set list.
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

- Remaining set order should be compacted.

## Exercise Library Endpoints

### `GET /api/v1/exercises`

Lists selectable exercises from the shared global exercise library.

Query parameters:

- `search` string, optional
- `primaryMuscleGroupId` UUID, optional
- `limit` integer, default `50`, max `100`
- `offset` integer, default `0`

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
  "primaryMuscleGroupId": "uuid",
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

## Analytics Endpoints

### `GET /api/v1/analytics/exercises`

Returns exercises the current user has logged, sorted by most recently trained first. This supports the Progress exercise list and excludes exercises that have never appeared in the user's workout history.

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
- Uses the exercise primary muscle group only.
- Includes per-muscle exercise totals and recent contributing sessions for the Weekly Volume detail panel.
- Excludes soft-deleted workouts, session exercises, and sets.

## Deferred Endpoints

Cardio is deferred from the MVP. Do not implement these endpoints in the first API pass:

- `POST /api/v1/cardio`
- `GET /api/v1/cardio`

## Validation Rules

- Required fields must be present and non-empty unless nullable.
- `email` must be a valid email string.
- `username` must be globally unique case-insensitively.
- `password` must be 4-200 characters.
- `setType` must be `warmup` or `working`.
- `weightKg` must be positive and fit `numeric(6,2)`.
- `reps` must be a positive integer.
- `rir` must be an integer from 0 to 10.
- `restTimeSeconds` must be omitted, null, or a non-negative integer.
- `limit` must be positive and capped by the endpoint max.
- `offset` must be a non-negative integer.

## Follow-Up Decisions

- Decide exact password length/hash requirements.
- Decide whether API docs should later be generated from Zod or OpenAPI.
- Decide final cookie name and environment-specific cookie flags during implementation.
- Decide whether email verification and password reset are MVP or vNext.
