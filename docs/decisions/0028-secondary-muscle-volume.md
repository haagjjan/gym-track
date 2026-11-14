# ADR 0028: Half credit for secondary muscle volume

## Status

Accepted — 2026-11-13

## Decision

Each non-deleted working set contributes 1 muscle set to each current primary
assignment and 0.5 to each current secondary assignment. The same rule applies to
repetition sets and, when enabled, timed sets. Warm-ups and cardio contribute zero.

Muscle groups and body regions use their respective assignment roles. A secondary
group cannot produce a full-credit region. When an exercise has no region mapping
for a group, use that group's default region with the group assignment's credit.
Several regions may belong to one group; region credits are never summed to
reconstruct group totals. This extends ADR 0027's region policy.

Volume remains derived on read using current exercise classifications (ADR 0006).
No database migration or workout rewrite is needed. The existing `workingSets`
response fields now contain weighted muscle-set counts and can have .5 fractions,
including exercise and recent-workout breakdowns. This replaces the primary-only
policy in the data notes and API contract.

## Consequences

Past workouts immediately gain secondary-muscle credit. Volume's body map, list,
breakdowns, weekly averages and total all use those credits, as does Home's figure.
The guided example follows the same rule. Volume explains the weighting and labels
its aggregate total as muscle sets. Summing across muscles can exceed the number
of sets actually performed, including for multi-primary exercises.

Workout/session set counts, Home's logged-set tile, Progress, tonnage, CSV exports,
and public activity counters continue to describe actual logged records. They do
not use weighted muscle credits. Imports and exercise classification edits affect
Volume through the same read-time calculation, without storing derived totals.
