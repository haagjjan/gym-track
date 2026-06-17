# Observability And Data Structures

This document records the current data structures used by the implemented app systems and the first logging/analytics plan for finding client and API failures. It is a planning document; it does not change API contracts, database schema, auth behavior, or workout behavior.

## Why The Current Client Error Appears

The `APPLICATION_FAULT` screen is the web app route error boundary. It appears when a client-side React render path throws an exception. The boundary proves that a browser-side module stopped rendering, but the exact root cause still requires the browser console stack trace.

For the recent Progress chart issue, the most likely fault area is the chart render lifecycle while these actions happen close together:

- switching selected exercises
- changing the visible chart span
- scrolling the internal chart viewport
- toggling chart modes or weight/reps series

The Progress chart currently transforms API set data through several derived structures:

1. `ExerciseProgressItem[]` from the analytics API.
2. `Map<string, ExerciseProgressItem>` keyed by day to keep only the best set of each day.
3. `ChartRow[]` with numeric timestamps for the Recharts time axis.
4. A derived chart timeline object with `startMs`, `endMs`, and `widthRatio`.
5. `Set<LoadMetric>` for visible `WEIGHT` and `REPS` lines.
6. A `ref` to the scroll viewport that mutates `scrollLeft` after render.

The risk is the interaction between Recharts layout measurement, a width-changing scroll container, and React state changes replacing chart data while the chart is being measured or remounted. This does not mean the data model is wrong; it means the current chart view needs better observability before we harden it further.

## Logging And Analytics Plan

### Goals

- Capture enough context to reproduce client crashes without exposing secrets or personal workout details.
- Correlate client-side route errors with API request logs.
- Keep logs operational, not behavioral surveillance.
- Add instrumentation in thin layers before changing chart logic again.

### Implemented Console-Only Policy

The first observability slice is browser console-only. It adds no API endpoint, no database table, no persistence, and no production reporting pipeline.

Client diagnostics are enabled when either condition is true:

- the web app runs with `process.env.NODE_ENV !== "production"`
- `NEXT_PUBLIC_CLIENT_DIAGNOSTICS=1` is set for a local or production-like reproduction build

`NEXT_PUBLIC_CLIENT_DIAGNOSTICS=1` is a debug switch only. It is not a central logging system and should not be treated as production monitoring.

### Event Levels

| Level | Use | Examples |
| --- | --- | --- |
| `debug` | Local-only state transitions and chart diagnostics. | Chart rows count, selected window, scroll width/client width. |
| `info` | Expected operational events. | API request completed, user started workout, CSV import completed. |
| `warn` | Recoverable abnormal states. | Partial previous-workout reuse, empty analytics payload for selected exercise. |
| `error` | Failed operation with user-visible impact. | Client route error, API 5xx, failed CSV import. |
| `fatal` | Process cannot safely continue. | API startup failure, database connection failure at boot. |

### Client Error Event Shape

Client logging emits a small structured event when the route error boundary catches an error:

```ts
interface ClientErrorEvent {
  event: "client_route_error";
  route: string;
  message: string;
  digest?: string;
  stack?: string;
  componentArea?: "dashboard" | "progress" | "weekly-volume" | "workout" | "history" | "auth";
  uiState?: Record<string, string | number | boolean | null>;
  occurredAt: string;
}
```

For the Progress chart, `uiState` should stay non-sensitive:

```ts
interface ProgressChartErrorState {
  chartMode: "loadReps" | "estimated";
  selectedWindowValue: "7" | "30" | "90" | "all";
  exerciseIdPresent: boolean;
  itemCount: number;
  chartRowCount: number;
  widthRatio: number;
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
}
```

### API Request Log Shape

The API already uses Fastify/Pino request logging. The logger redacts auth headers, cookies, session tokens, and session token hashes.

The next observability slice should standardize a request context:

```ts
interface ApiRequestLogContext {
  reqId: string;
  method: string;
  route: string;
  statusCode: number;
  responseTimeMs: number;
  userId?: string;
}
```

`userId` should only be logged after authentication succeeds and should never include email, username, cookies, or tokens.

### Correlation Plan

- Keep Fastify `reqId` as the API-side correlation id.
- Add a browser-generated `clientEventId` for client errors.
- Include `clientEventId` in any future client error report payload.
- If a client error happens after an API request, include the route and recent request status in client diagnostics without storing full response bodies.

### First Implementation Slices

1. Implemented: client-side console grouping for `AppError` so local debugging shows route, digest, stack, and recent diagnostics.
2. Implemented: a narrow client diagnostics buffer for app-wide client errors, browser API requests, and Progress chart state.
3. Implemented: Playwright coverage should fail on unexpected `pageerror` while exercising Progress chart interactions.
4. Later only: add a same-origin diagnostics endpoint if needed, with rate limiting and redaction. This needs an ADR before production use because it introduces a new logging data path.
5. Later: review captured logs after reproduction and then harden the chart implementation based on the stack trace.

## System Data Structures

### Persistence Layer

| System | Data Structure / ADT | What It Does |
| --- | --- | --- |
| Database schema | PostgreSQL tables | Durable app state for users, sessions, exercises, workouts, session exercises, sets, and muscle groups. |
| Type-safe database access | `Kysely<AppDatabase>` | Gives TypeScript-aware SQL query construction over the PostgreSQL schema. |
| Column modeling | `ColumnType<Date, ...>` and `ColumnType<string, ...>` | Models generated timestamps and numeric database values that are returned as strings. |
| Soft deletion | nullable `deleted_at` columns | Hides removed workouts, session exercises, sets, and exercises without destroying rows. |
| Ordering | `position`, `set_order`, `sort_order` numbers | Preserves exercise order in a workout, set order in an exercise block, and muscle group display order. |

### Auth System

| System | Data Structure / ADT | What It Does |
| --- | --- | --- |
| Users | `users` table | Stores account identity and password hash. |
| Sessions | `user_sessions` table | Stores hashed opaque session token, expiration, revocation, and last-use state. |
| Auth cookie | opaque token string | Browser credential; only the hash is persisted in the database. |
| Auth service result types | discriminated result objects | Return success, invalid credentials, conflict, or unauthorized outcomes without throwing for expected auth states. |
| Logger redaction list | `sensitiveLogPaths: readonly string[]` | Prevents cookies, authorization headers, and session tokens from being logged. |

### Workout Logging System

| System | Data Structure / ADT | What It Does |
| --- | --- | --- |
| Workout session | `WorkoutDetail` / `workout_sessions` row | Represents one started or completed workout. |
| Workout list item | `WorkoutSummary` | Lightweight history/dashboard row with totals. |
| Exercise block | `SessionExercise` / `session_exercises` row | Ordered exercise entry inside one workout. |
| Set | `WorkoutSet` / `sets` row | One warmup or working set with kg, reps, RIR, rest, and note. |
| Set type | union `"warmup" | "working"` | Separates warmup sets from working-set analytics. |
| Reorder validation | `Set<string>` and `Set<number>` | Detects duplicate exercise ids and duplicate positions before persisting reorder operations. |
| Draft set values | `Record<string, SetDraft>` | Stores web form drafts keyed by session exercise id. |

### Exercise Library System

| System | Data Structure / ADT | What It Does |
| --- | --- | --- |
| Exercise | `Exercise` / `exercises` row | Represents a default or user-created movement. |
| Muscle group | `MuscleGroup` / `muscle_groups` row | Represents a primary or secondary muscle group. |
| Secondary muscles | `exercise_secondary_muscles` join table | Many-to-many relationship between exercises and secondary muscles. |
| Muscle grouping | `Map<string, MuscleGroupRecord[]>` | Groups secondary muscles by exercise id when building API responses. |
| Name review | `ExerciseNameReviewDetails` | Records normalized name, warning/block reasons, and suggestions for custom exercise creation. |

### Workout CSV System

| System | Data Structure / ADT | What It Does |
| --- | --- | --- |
| Parsed CSV row | `ParsedWorkoutCsvRow` | Normalized row from uploaded workout CSV. |
| CSV workout grouping | `Map<string, WorkoutCsvWorkout>` | Groups CSV rows into workout sessions before import. |
| CSV preview | `CsvImportPreview` | Reports importability, warning rows, and blocked rows before write. |
| CSV transaction | `Transaction<AppDatabase>` | Imports workouts, exercises, exercise blocks, and sets atomically where possible. |

### Analytics API System

| System | Data Structure / ADT | What It Does |
| --- | --- | --- |
| Completed exercise record | `CompletedExerciseRecord` | Exercise plus last logged date and total logged sets. |
| Exercise set record | `AnalyticsSetRecord` | Raw analytics set row for one exercise and user. |
| Exercise progress payload | `ExerciseProgressPayload` | API payload containing ordered set records with estimated 1RM values. |
| Exercise summary payload | `ExerciseSummaryPayload` | API payload containing totals, average RIR, and best top set. |
| Weekly volume set record | `WeeklyVolumeSetRecord` | Raw working-set row used to build weekly muscle volume. |
| Weekly volume accumulator | `Map<string, Map<string, WeeklyVolumeAccumulator>>` | Groups working sets by week, then muscle group. |
| Exercise/session sub-accumulators | `Map<string, WeeklyVolumeExercise>` and `Map<string, WeeklyVolumeSession>` | Deduplicates exercises and sessions while counting sets. |

### Web API Client System

| System | Data Structure / ADT | What It Does |
| --- | --- | --- |
| API result | `ApiResult<T>` discriminated union | Represents successful data or normalized API error without throwing for expected HTTP failures. |
| API error payload | `ApiErrorPayload` | Shared shape for API error code, message, fields, and optional details. |
| Range options | `{ startDate?: string; endDate?: string; signal?: AbortSignal }` | Optional query window and cancellation signal for browser requests. |
| Abort control | `AbortController` and `AbortSignal` | Cancels in-flight requests when route state changes or components unmount. |

### Progress UI System

| System | Data Structure / ADT | What It Does |
| --- | --- | --- |
| Exercise selector state | `CompletedExercise[]`, selected exercise id, search string, selected muscle slug | Owns which exercise the user is inspecting. |
| Visible chart span | union `"7" | "30" | "90" | "all"` | Controls the x-axis viewport size, not the fetched history. |
| Chart mode | union `"loadReps" | "estimated"` | Chooses between weight/reps lines and estimated 1RM line. |
| Visible load metrics | `Set<"weight" | "reps">` | Tracks which load/reps series are shown. |
| Daily best set map | `Map<string, ExerciseProgressItem>` | Collapses multiple sets per day to the best set for chart clarity. |
| Chart row | `ChartRow` | Derived chart point with timestamp, kg, reps, estimated 1RM, set order, and set type. |
| Chart timeline | `{ startMs; endMs; widthRatio }` | Determines x-axis domain and scrollable chart width. |
| Scroll viewport ref | `RefObject<HTMLDivElement>` | Lets the chart default to the newest slice by setting `scrollLeft`. |

### Weekly Volume UI System

| System | Data Structure / ADT | What It Does |
| --- | --- | --- |
| Volume payload | `WeeklyVolumePayload` | API payload of weeks, muscle groups, exercises, and recent sessions. |
| Volume totals | `Map<string, VolumeMuscleTotal>` | Groups weekly volume by muscle slug for body map and panels. |
| Volume accumulator | `VolumeAccumulator` | Mutable internal shape used to merge exercise and session counts. |
| Volume band | union `"none" | "maintenance" | "active" | "high"` | Converts weekly average sets into a readable training signal. |
| Body map region | region list and slug lookup | Maps muscles to visual body regions in the weekly volume screen. |

### Dashboard System

| System | Data Structure / ADT | What It Does |
| --- | --- | --- |
| Dashboard data | `DashboardData` | Combines current user, recent workouts, weekly volume, and completed exercises. |
| Active workout | first open `WorkoutSummary` | Drives resume/start session CTA behavior. |
| Recent completed sessions | `WorkoutSummary[]` | Feeds previous session strips and dashboard history signals. |
| Home avatar state | booleans and refs inside avatar visual | Controls static fallback, 3D scene readiness, and reduced-motion handling. |

### Navigation And Shell System

| System | Data Structure / ADT | What It Does |
| --- | --- | --- |
| Route config | list of sidebar nav items | Defines cockpit navigation rows and active matching. |
| Drawer state | boolean `isDrawerOpen` | Controls mobile shell open/close behavior. |
| Shell composition | React component tree | Wraps authenticated routes without changing backend state. |

### Error Handling System

| System | Data Structure / ADT | What It Does |
| --- | --- | --- |
| Route error boundary | `AppErrorProps` with `Error & { digest?: string }` | Catches client route render failures and offers retry/home actions. |
| Form field errors | `Record<string, string[]>` or feature-specific partial records | Maps validation errors to input fields. |
| User-facing error state | `string | null` | Stores recoverable UI errors from API calls or form actions. |
| Future client diagnostics | `ClientErrorEvent` | Proposed structured event for capturing route, message, stack, and non-sensitive UI state. |

## Immediate Debugging Checklist For Progress Faults

When the `APPLICATION_FAULT` screen appears during Progress chart use:

1. Open the browser console and copy the first error stack.
2. Record the exact action sequence: selected exercise change, chart scroll, window change, chart mode toggle.
3. Note the selected chart span and whether `WEIGHT`, `REPS`, or both were visible.
4. Record whether the page was at mobile or desktop width.
5. Check whether the API logs show successful `GET /analytics/exercises/:id/progress` and `GET /analytics/exercises/:id/summary` responses immediately before the crash.

The next code slice should add temporary, non-sensitive Progress chart diagnostics around these same points.
