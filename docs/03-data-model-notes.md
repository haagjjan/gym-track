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
- The deterministic system catalog is the reviewed union of the legacy 152 names and logging-compatible records from Free Exercise DB revision `b0eed061e1c832b3ed815fbaa4b45b3cdc14df49`. Only names/classifications are seeded; cardio, stretching, duration/distance-only movements, instructions, and media are excluded.
- Catalog conflicts never rename, promote, or overwrite a user-owned exercise. The migration preserves the user row and reports the name for manual review.
- Equipment additionally supports `EZ bar`, `medicine ball`, and `stability ball`. Detailed source muscles map into the existing 12-group taxonomy.

### Ordering

- Session exercises use explicit integer positions within a session.
- Sets use explicit integer order within a session exercise.
- Position values should be compacted after reorder/delete so display order stays simple.
- Display set numbers should come from set order, not from a separate stored "set number" field.
- `session_exercises.client_mutation_id` and `sets.client_mutation_id` are nullable UUIDs so historical rows remain valid. Partial unique indexes scope a non-null ID to its workout or session-exercise parent, respectively.
- New exercise and set creates require a client mutation ID. An equivalent replay returns the existing resource; reuse for different content is a conflict.
- Add, reorder, delete, shift, and compaction operations lock the owned parent row and complete inside one transaction. Concurrent distinct adds both succeed with compact order; ownership loss and state races resolve to stable not-found or conflict outcomes.
- Set updates and exercise reorders are last-write-wins for the beta. The browser discards speculative ordering and refetches the authoritative workout after either success or failure.
- There is no generic idempotency table, entity revision field, or optimistic-concurrency protocol in this release.

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
- Unfinished new-set drafts use browser `localStorage` and are keyed by user, workout, and exercise. A versioned envelope holds `savedAt`, the logical action's `clientMutationId`, and the draft; each edit starts a new maximum 24-hour retention window.
- Malformed, expired, future-dated, and legacy unversioned envelopes are deleted. The mutation ID survives failed save attempts and is replaced only after success or explicit abandonment.
- Drafts are cleared after set save, explicit discard/cancellation, workout completion/deletion, account deletion, explicit device-data clearing, or expiry. They never enter analytics or account export.
- New-set defaults use the latest current-session set when present, otherwise the previous performance weight from the latest qualifying earlier workout, otherwise 20 kg.
- Previous performance is computed on read from owned, non-deleted, completed workouts strictly before the current workout. The latest workout containing an active working set qualifies; its best set is highest weight, then higher reps, then lower set order.
- Exercise progress selects one strongest working set per user-local calendar day across all sessions on that day. Load/Reps uses weight, reps, then lower RIR; EST 1RM uses Epley output with deterministic ties.

### Public-beta email and account lifecycle

- Public production requires a configured transactional-email provider, valid sender, and the published support address as reply-to. Log transport is limited to development, test, and explicit local/private-LAN deployments.
- Email delivery is synchronous and reports only a bounded mail kind, outcome, provider status, optional provider message ID, and duration. Recipients, message bodies, action links, and tokens are not log or metric fields.
- Raw verification, reset, invitation, and deletion-cancellation tokens are sent only in action links; PostgreSQL stores their hashes. Issuing a new verification, reset, or invitation link supersedes unused older tokens of the same purpose.
- No mail outbox or retry payload is stored. Invitation issuance remains durable if delivery fails and exposes an explicit resend state. Deletion scheduling instead depends on provider acceptance and compensates back to `ACTIVE` with the cancellation token invalidated when delivery fails.
- Deletion cancellation remains committed if its informational email fails. Completion email is best effort after erasure because the recipient address cannot be retained solely for retry.
- One API-process scheduler runs lifecycle cleanup during startup and hourly thereafter. Runs are single-flight; auth, invitation, deletion, retention, and notification failures are isolated so later phases and future runs continue.
- The scheduler is sufficient only for the accepted single-process, 50-account beta. Multi-process coordination or a durable work queue requires a later decision.

### Administrator containment

- Only explicit `ADMIN` accounts may list users, change ordinary-user status, revoke ordinary-user sessions, and read recent audit events.
- Suspension, session revocation, and their audit insert are transactional. Suspension revokes all live sessions; reactivation creates no session and leaves email-verification state unchanged.
- Administrator targets, self-suspension, role promotion, and status changes from `DELETION_PENDING` are unavailable through the web status interface. The deletion-cancellation workflow remains authoritative.
- Audit pagination uses descending `(created_at, id)` keyset order. API output allowlists bounded details rather than returning arbitrary stored audit JSON.

### Cardio

- Cardio is deferred from the MVP.
- Do not include cardio tables in the first schema pass.
- Future cardio modeling should support both session-linked and standalone entries.

## Follow-Up Notes For Schema Draft

- Define the exact muscle group seed list.
- Decide whether soft-deleted global exercises can be recreated or must be restored.
- Choose decimal precision for kg values.
- Decide the exact representation of open/closed sessions, such as `ended_at IS NULL` or an explicit status.
