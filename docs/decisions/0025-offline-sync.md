# ADR 0025: Local workout logging and deferred sync

## Status

Accepted by the owner on 2026-11-14, with the 30-day offline window, the 90-day retention and
the staged rollout, and with the rule that local data is never deleted because of its age
(see "Local data is kept"). Proposed 2026-11-10.

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

Proposed values (2026-11-14, for the owner's review): the supported offline window is
30 days. Tombstones and operation receipts are kept for 90 days. An outbox item older
than 30 days is not replayed silently: the app keeps the local data, marks the workout
"not synced", and offers to send it again as new entries or to export it. A device that
last synced more than 90 days ago discards its read cache and downloads a fresh snapshot
before replaying anything.

**Local data is kept (owner decision, 2026-11-14).** The 30 and 90 days limit only how long
an entry can still be merged automatically. They never delete anything on the phone:

- Everything logged on a device stays in its local store, synced or not, until the user
  deletes it or signs out after a successful sync.
- An entry that passed the window stays readable and exportable on the device and can be
  sent again as new entries.
- The 90-day refresh replaces only the copy of server data. Unsynced local entries are
  kept and shown as "not synced".
- The local store is therefore a durable record, not only a queue. It must live in app
  storage the system does not clear on its own (SQLite in the app container, not web
  storage). This is also what a later local-only mode, which never sends data to a server,
  would build on.

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

## Rollout stages

1. **Spike (branch `mobile/app`).** The app queues set creates and session-exercise
   creates only. They replay through the existing endpoints with the client mutation IDs
   of ADR 0014, so no server change is needed. Edits, deletes and reorders need a
   connection and say so. A read cache lets the active workout, the exercise catalog and
   templates open without a network.
2. **Whole workouts offline (built 2026-11-14).** The app queues every change the logger
   makes: starting a workout (empty or from a template), adding, removing and reordering
   exercises, adding, editing and deleting sets, renaming, finishing and discarding. The
   queue is sent in order through the existing endpoints. Things created on the phone
   carry a local ID until the server answers; creates use the mutation IDs of ADR 0014, so
   a lost answer cannot create a duplicate. The exercise list is copied to the phone, so
   exercises can be searched and added offline. The queue, that copy and the cached
   screens live in SQLite.

   Limits of this stage, accepted by the owner's goal of "train for a week without a
   connection, then sync":
   - An edit or delete made offline wins over a change made on another device in the
     meantime. This is what the online app does today (last write wins); it is only
     delayed. Revisions (stage 3) remove this.
   - A workout started from a template offline loses its link to the template.
   - If another workout is still open on the account, the offline one waits and the app
     says so. Finishing the open one sends it.
   - A change the server refuses is kept on the phone and shown with "Try again". It is
     never dropped silently.
   - Time sets and cardio entries, creating a new exercise, templates, CSV and settings
     still need a connection.
3. **Full protocol.** Revisions, receipts, tombstones and the sync cursor, in one
   coordinated release for every writer, as described above. Needed before two devices
   may edit the same workout offline, and before the stores are told "full offline
   support".

Stage 2 is the offline behaviour of the first store build.

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
