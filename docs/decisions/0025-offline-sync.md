# ADR 0025: Local workout logging and deferred sync

## Status

Proposed, 2026-11-10. The owner reviews this decision before the native offline
implementation. Time and cardio storage may adopt the ID and revision rules now.

## Context

The web app is server-rendered and online-only. ADR 0021 selects a bundled
Capacitor build for phones. Gym logging should work immediately, including when
reception is poor, without sending each edit through a network round trip.
ADR 0014 currently makes set and session-exercise creates replayable; it does
not define conflict handling for offline edits or deletes.

## Proposed decision

The native app reads and writes its own local database for the active workout,
recent history, exercise catalog and templates. The logger never waits on the
server to save locally. A durable outbox records each local mutation atomically
with its data. A background sync worker replays the outbox when connectivity and
a valid session are available. PostgreSQL remains the cross-device source of truth.

A workout, session exercise, strength set, timed set or cardio entry gets a client-generated
UUID before its first save. The server preserves it. Create replay returns the
same entity when the ID, owner, parent and original content agree, including
after a later edit or deletion. Reusing it for a different create is a conflict.
Creates therefore retain their original request fingerprint independently of the
mutable current values. Deleted IDs cannot be resurrected by a delayed create.

Every mutable entity starts at revision 1. An edit or delete carries its last
seen revision and an operation UUID. The server checks ownership, parent state
and revision in one transaction, increments the revision on success, and stores
the operation result for equivalent replay. A stale operation returns a conflict
with the current revision; it never silently overwrites another device. A delete
is a tombstone, with a revision and deletion timestamp, included in sync results.
Receipt lookup is scoped to the authenticated owner and immutable operation
fingerprint (entity, parent, operation kind and original payload), before
rejecting a changed revision or deleted parent. Equivalent acknowledged writes
therefore remain replayable after subsequent changes. UUID reuse with a different
owner, entity or payload is rejected without exposing another owner's receipt.

Retention of tombstones and operation receipts must exceed the supported offline
window; that window and expiry recovery are a prerequisite of the native build.

Outbox items are ordered by parent dependencies: workout, exercise occurrence,
then sets or cardio. Operations on one entity form a durable chain (create →
edit → edit → delete). Each pending operation depends on the preceding operation's
acknowledged revision, rather than copying a single old server revision. A
conflict stops that chain; advancing an acknowledged local predecessor never
rebases over another device's edit. Restarts and lost acknowledgements retain
the chain and its operation UUIDs.

The workout carries a collection revision for exercise order; each session
exercise carries a collection revision for set order. Adding, deleting,
compacting or reordering children increments its parent collection revision
under ADR 0014's parent lock. A full-list reorder requires the expected collection
revision; concurrent insertion or deletion makes it stale. Updated child rows
also advance their entity revisions. Cardio entries are chronologically displayed
and have no editable position collection. A failed item blocks dependent operations, not unrelated
workouts. Retry transient failures with bounded backoff; pause on authentication
loss; show explicit action for conflicts or permanent validation errors. Do not
claim an operation is synced until the server acknowledges it. An expired
session never discards local workout data. Signing out or switching accounts
must explicitly handle pending writes and keep stores isolated by user. Every
in-flight response is bound to the initiating account and store generation;
it cannot update a newly selected account or a replacement local store.

The active workout opens from local storage. Recent History, Progress and Volume
open from locally cached source data and refresh in the background. Catalog and
templates work from the most recent complete local snapshot. Display the last
successful sync and pending state in plain words; do not make stale analytics
look current. First-use data, account recovery, verification, account deletion,
admin functions, messages, and authoritative cross-device reconciliation need
the server. Body assets ship with the app and require no sync request.

The native rollout supersedes ADR 0014's comparison against mutable current
create content, rejection of replay after deletion, and last-write-wins edits
for synchronized entities. Existing strength data must be migrated too. Every
writer, including the online web app, imports and operator-supported mutations,
must participate in the same revision and receipt protocol before offline sync
is enabled. The current online contract stays unchanged until that coordinated
rollout; fields in new tables are preparation, not this protocol's implementation.

Two devices can each start an open workout offline. The server preserves its
one-open-workout invariant; the rejected local workout and its children remain
intact. The app offers an explicit choice to finish the existing server workout
and retry, or save the local one as a completed workout with a chosen end time.
Neither resolution discards logged sets or silently merges workouts.

The web remains online-only until a separate decision changes its rendering
model. This ADR adds no service worker, local database dependency, token scheme,
native plugin, deployment change or background-execution guarantee. Those stay
behind the mobile spike and their own gates.

## Consequences and verification gates

- New time/cardio tables can use client UUIDs, revisions and tombstones now;
  adopting fields alone does not make the existing app offline-capable.
- The native implementation must prove interrupted replay, duplicate creates,
  edit/delete replay after lost acknowledgements, parent deletion races,
  concurrent stale edits, account isolation and expiry recovery.
- Verify a same-entity create/edit/edit/delete chain across restart and lost
  acknowledgements, stale reorder versus sibling insert/delete, and late
  responses after account switching. Test two offline open-workout creates.
- Download pagination needs a stable server cursor, bounded snapshots and
  tombstone delivery before claiming full synchronization.
- Accepted conflicts require an explicit user choice or a documented merge rule.
  The server's revision never changes just because a local cache refreshed.
- Storage encryption, credential storage, backup exclusions and mobile lifecycle
  behavior require separate spike evidence before release.

## Alternatives

Per-edit network logging is simpler but cannot meet the offline requirement.
A cache without an atomic outbox can lose writes. Last-write-wins hides stale
edits. Replacing the database or API style is unnecessary for this design.
