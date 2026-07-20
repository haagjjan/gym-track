# Data Model Notes

## Status

Draft rules for the first schema pass. These notes capture business rules and data-model decisions so `docs/04-schema-draft.md` can be written without guessing.

## Accepted Rules

### Session Lifecycle

- A user can have only one open workout session at a time.
- Starting a new session while one is open should prompt the user to resume or close the existing session.
- A session is open until it is explicitly ended.
- Past sessions can be edited so the user can correct workout logging mistakes.
- User workout data is private to the owning user.

### Exercise Library

- Exercises live in a shared global exercise library, not per-user libraries.
- Default exercises and user-added exercises are selected from the same shared library.
- Exercise names are globally unique, case-insensitively.
- User-added global exercises should keep audit metadata such as `created_by_user_id`.
- Deleted exercises should no longer be selectable for new sessions, but historical workout data must remain readable.
- Equipment and exercise type use the canonical nullable values accepted in ADR 0007; free-form classification values are not accepted.
- System exercises are read-only. A shared user-created exercise is editable only by its creator.

### Ordering

- Session exercises use explicit integer positions within a session.
- Sets use explicit integer order within a session exercise.
- Position values should be compacted after reorder/delete so display order stays simple.
- Display set numbers should come from set order, not from a separate stored "set number" field.

### Units

- Store weight in metric units internally, using kg.
- Store distance in metric units when distance fields are introduced.
- The UI may later convert values for display, but persisted workout data should use one internal unit system.

### Deletes

- Use soft delete for core workout data with `deleted_at`.
- Soft delete applies to sessions, session exercises, sets, exercises, and future cardio records.
- Default queries should exclude soft-deleted rows.
- Analytics should exclude soft-deleted sets and sessions.
- Historical workout details should still be recoverable for auditing or restore workflows.

### Set Values

- Set type is limited to `warmup` or `working`.
- Reps must be a positive integer.
- Weight must be a positive metric value stored internally as kg.
- RIR must be an integer from 0 to 10.
- Set notes are optional.
- Rest time is optional and should be stored as non-negative seconds if captured.

### Computed vs Stored Values

- Store raw workout data first.
- Compute difference to last set on read.
- Compute estimated one-rep max on read.
- Compute weekly volume and exercise summaries on read.
- Do not store aggregate analytics tables in the MVP unless later performance testing requires it.

### Muscle Attribution

- Each exercise requires one or more primary muscle groups and may have zero or more secondary muscle groups.
- The same muscle group may appear only once per exercise and cannot hold both roles.
- Exercise muscle assignments are authoritative current classification data; sessions and templates do not snapshot them.
- Historical workout displays and analytics use the exercise's current classification.
- Weekly muscle volume counts each current primary muscle assignment; no stabilizer role or weighting exists.
- Weekly muscle volume counts working sets only.
- Warmup sets do not count toward weekly muscle volume.

### Workout Templates

- A workout template is user-owned and stores a required name plus ordered exercise occurrences only.
- Duplicate exercise occurrences are preserved rather than deduplicated.
- Starting a template copies its ordered exercise structure into independent `session_exercises` rows and creates no set rows.
- Template edits never mutate active or historical sessions; session edits never mutate the template unless the user explicitly chooses the completion-time update action.
- Deleting a template must leave every workout session valid.
- Template last use is derived from completed workout exercise multisets. Order is ignored; duplicate counts and extra/missing exercises are significant.

### V1 filtering, merging, and client drafts

- Workout/template facet filters use one correlated exercise match: a single contained exercise must satisfy all selected muscles, equipment, and type.
- Workout all-time summaries are computed over all non-deleted workouts and are independent of result pagination and active filters.
- Exercise merges change only the requesting user's workout and template references. A personal source exercise is retired only when no active workout or template references remain for any user.
- Unfinished new-set drafts are device-local values keyed by user, workout, and exercise. They are cleared after save, completion, discard, or explicit cancellation and never enter analytics.
- Exercise progress selects one strongest working set per user-local calendar day across all sessions on that day. Load/Reps uses weight, reps, then lower RIR; EST 1RM uses Epley output with deterministic ties.

### Cardio

- Cardio is deferred from the MVP.
- Do not include cardio tables in the first schema pass.
- Future cardio modeling should support both session-linked and standalone entries.

## Follow-Up Notes For Schema Draft

- Define the exact muscle group seed list.
- Decide whether soft-deleted global exercises can be recreated or must be restored.
- Choose decimal precision for kg values.
- Decide the exact representation of open/closed sessions, such as `ended_at IS NULL` or an explicit status.
