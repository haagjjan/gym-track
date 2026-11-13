# ADR 0026: Time sets and workout cardio

## Status

Proposed, 2026-11-10, for the feature-flagged next-features batch. Independent of
the body-region work. The owner reviews this decision before merge.

## Context

Strength sets require positive load, repetitions and RIR. Duration exercises,
such as dead hangs, and cardio do not fit those invariants. Existing strength
logging, CSV and volume must retain their meaning when the new feature is off.

## Decision

Add an exercise tracking mode (`reps` by default, or `time`). Keep existing sets
and their constraints intact. Timed sets are separate rows keyed by a client UUID,
with workout and exercise references, set type, positive seconds, optional added
load in kg, note, revision and a deletion timestamp. Group them by exercise on
the workout screen. They do not require an empty repetition-set occurrence.
Primary-muscle working-set counts include timed working sets once the feature is
enabled; tonnage and estimated 1RM remain repetition-only metrics.

Cardio entries belong to a workout and store activity name, positive duration,
optional distance in metres, optional average heart rate, note, revision and a
soft-deletion timestamp. Pace is derived from distance and duration. Cardio never
participates in muscle volume, tonnage or strength-set counts.

New rows preserve a fingerprint of the original create request, so a replay of
the same client UUID can be distinguished from a different create even after an
edit. Ownership and parent state are checked transactionally under the existing
workout lock. Updates and deletes require the last revision and increment it.
This prepares the ID/revision rules of ADR 0025; it does not implement the native
outbox, operation receipts, collection synchronization or offline support.

The API keeps its authenticated REST and error-envelope conventions. All new
routes and UI are behind `ENABLE_EXTENDED_TRACKING`, off by default. Data
migrations are additive and local-only in this work. Existing exercise names,
strength rows and historical muscle assignments are not rewritten.

## Consequences

- Separate tables avoid sentinel repetitions or weakening existing constraints.
- Workout detail, history, progress, volume, account export and CSV need explicit
  handling of the extra rows. Export must not silently omit them.
- Time progress compares duration and optional added load; it never reports an
  estimated 1RM. Cardio progress compares logged duration/distance by activity.
- Disabling the flag prevents new extended writes and hides its controls; stored
  entries remain durable and can be exported after the feature is enabled again.
- Down migrations may only run against empty new tables. They refuse to discard
  logged data. Rollback in normal use means disabling the flag, not deleting rows.
