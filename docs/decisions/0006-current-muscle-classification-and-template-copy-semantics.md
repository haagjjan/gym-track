# ADR 0006: Current Muscle Classification and Template Copy Semantics

## Status

Accepted — 2026-07-14

## Context

Exercises need multiple primary and secondary muscle assignments, and users need reusable workout templates without coupling plans to performed workout data.

## Decision

- `exercise_muscle_groups` is the authoritative normalized exercise-to-muscle relation. A row has role `PRIMARY` or `SECONDARY`; an exercise must always have at least one primary assignment.
- Workout history and analytics resolve an exercise's current muscle assignments. Muscle classifications are not copied into sessions, sets, or templates.
- A workout template owns a name and an ordered list of exercise references only. It never owns planned or completed set data.
- Starting from a template transactionally creates a normal workout session and copies the ordered exercise occurrences into independent session exercise rows.
- A session may reference its source through nullable `workout_sessions.source_template_id`. Template deletion sets that reference to `NULL`; it never cascades into sessions.
- Template and session edits never dynamically update one another. Updating a source template from a completed workout is an explicit user action based only on exercise IDs, ordering, and duplicate occurrences.

## Consequences

- Historical muscle reports can change when an exercise classification is corrected.
- Duplicate exercise occurrences remain distinguishable through separate ordered child rows.
- Templates can be deleted without losing workout history.
- The legacy single-primary column and secondary table remain temporarily dual-written for rolling-deploy compatibility; new reads use the normalized relation and a later migration may remove the legacy fields.
