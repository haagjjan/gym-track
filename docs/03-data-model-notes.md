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

- Each exercise requires one primary muscle group.
- Secondary muscle groups may be captured for future use, but MVP volume counts use primary muscle only.
- Weekly muscle volume counts working sets only.
- Warmup sets do not count toward weekly muscle volume.

### Cardio

- Cardio is deferred from the MVP.
- Do not include cardio tables in the first schema pass.
- Future cardio modeling should support both session-linked and standalone entries.

## Follow-Up Notes For Schema Draft

- Define the exact muscle group seed list.
- Decide whether soft-deleted global exercises can be recreated or must be restored.
- Choose decimal precision for kg values.
- Decide the exact representation of open/closed sessions, such as `ended_at IS NULL` or an explicit status.
