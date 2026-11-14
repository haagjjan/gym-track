# ADR 0027: Muscle regions within existing reporting groups

## Status

Proposed for the pending body branch, 2026-11-10. Records the settled next-feature
scope; owner review and merge remain outstanding.

Muscle attribution is extended by [ADR 0028](0028-secondary-muscle-volume.md):
secondary assignments now receive half credit for groups and regions.

## Context

The original twelve muscle groups are useful reporting categories but too broad
for precise body picking and heat. Existing filters, CSV and historical totals
must remain compatible. The body model now exposes twenty named region pairs.

## Decision

Keep the twelve groups and add twenty muscle regions. Each region belongs to one
group, with one default region per group. Catalog exercises have current primary
and secondary region assignments, alongside their existing group assignments.
A custom exercise without region assignments falls back to its primary groups'
defaults. Assignments are current classification, not snapshots on workout rows.

Working sets contribute once per current primary group and once per assigned
primary region. A set working two regions of one group is still one group set;
region totals must not be summed to reconstruct group totals. Secondary muscles
are contextual and do not add working-set volume. Warmups are excluded.

The body uses named left/right skinned meshes, one material per region, and
raycast picking against those same surfaces. Runtime projection from hand-drawn
SVG maps is retired. The source and adaptations are credited in Settings and
`tools/body-model/README.md`.

Adductors rolling up to quads, and neck rolling up to traps, are reporting
conventions rather than anatomical membership. Abs, lats and anterior-deltoid
envelopes are disclosed display approximations; final visual acceptance is
separate from structural and picking verification.

## Consequences

- The schema change is additive. Group filters, CSV and existing strength sets
  retain their original meaning.
- The API supplies group items and region items separately. Example data and
  older payloads can continue to use groups.
- Future tracking types must supply both reporting views consistently. Batch C
  includes a compatibility adapter for timed working sets using default regions.
- Body regeneration must preserve region names, bilateral visibility, local
  asset loading and the geometry/size budgets checked by the validator.
