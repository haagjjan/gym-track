# ADR 0014: Idempotent and Serialized Workout Mutations

## Status

Accepted for implementation on 2026-08-06.

## Context

Adding an exercise or set used a read-count-write sequence without a shared database lock. Concurrent tabs or an ambiguous network failure could therefore cause an ordering constraint failure, duplicate a logical write, or leave the client uncertain whether a write succeeded.

## Decision

- Exercise and set create requests carry a client-generated UUID that remains stable for one logical action.
- The UUID is stored on the created row and is unique within its workout or session-exercise parent, including after soft deletion.
- Replaying an equivalent active create returns the original row without writing again. Reusing the UUID for different content, or for a deleted row, returns `IDEMPOTENCY_CONFLICT`.
- Exercise add, reorder, and delete transactions lock the owned workout row before reading or changing active positions.
- Set add and delete transactions lock the owned workout row and then the session-exercise row before reading or changing active set order.
- Create operations calculate order and make any position shifts inside the same transaction as their insert. Delete and reorder operations compact or replace positions inside their locked transaction.
- Set value updates and exercise reorders remain last-write-wins for the Founding Beta. Clients refetch authoritative workout state after every mutation settles.
- Exercise replay equivalence compares the selected exercise only. Position is mutable ordering metadata: replay returns the existing row at its authoritative current position and never reapplies or compares the original placement request. Set replay equivalence compares the current normalized set values. A set changed after creation may therefore reject an old replay rather than overwrite current data.

## Consequences

The web and API must deploy together because create mutation IDs are required immediately. No generic idempotency table, durable request body, or resource revision column is introduced. Parent locking deliberately serializes the small amount of ordered workout write traffic expected under the 50-account beta cap. Database integration tests must cover replay, conflicting reuse, concurrent distinct creates, user isolation, and mixed order mutations.
