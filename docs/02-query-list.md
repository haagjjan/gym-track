# Query List (DB-Driven Spec)

In this document I list all the data questions the webapplication will have to anser.
The database schema, constraints, and indexes will be designed to support these queries.

---

## 1) Authentication & User

### Q1. Creation of an account
- Input: username, email, password - Complexity to be decided
- Output: user_id

### Q2. Login (verify credentials)
- Input: username, password
- Output: user_id, basic user profile

---

## 2) Workout Sessions (History & Detail)

### Q3. List recent sessions of (dashboard)
- Filter: user_id
- Output: last N sessions with:
  - session_id, date, time, (or duration), wourkout type (upper, lower ...), title/notes (optional)

### Q4. List workout contingency (history)
- Filter: user_id
- Output: ammount of workouts per week (for n weeks), set trend over n weaks, working sets per mouscle group per week

### Q5. List sessions by date range (history)
- Filter: user_id, start_date, end_date
- Output: session_id, started_at, ended_at/duration, total_exercises, total_sets

### Q6. Get session detail (open one workout)
- Filter: user_id, session_id
- Output:
  - session metadata (started_at, ended_at, notes)
  - ordered exercises in that session (1. ex, 2. ex, 3. ex, ...)
  - ordered sets per exercise including:
    - set_type (warmup/working)
    - weight, reps
    - RIR
    - rest_time_seconds
    - difference to last set
  - for each exercise, nullable previous performance from the latest earlier owned, non-deleted, completed workout containing a working set:
    - workout id/title/start time
    - highest-weight working set, then higher reps, then lower set order

---

## 3) Logging / Editing a Workout

### Q7. Create a new session (start workout)
- Input: Workout Type/Structure (upper, lower, push, pull, ...), user_id(automatically), started_at (default now), notes(optional)
- Output: session_id, exercise windows

### Q8. Add exercise to session (ordered)
- Input: session_id, exercise_id, and position/order for each staged selection.
- Output: session_exercise_id for each appended exercise; the web commits selections in click order.

### Q9. Add set to a session exercise (ordered)
- Input: session_exercise_id (auto), set_order (auto), set_type, weight, reps, RIR, rest_time_seconds (auto)
- Output: set_id, input set fields

### Q10. Edit or delete a set
- Input: set_id, changed fields OR delete flag
- Output: updated set

### Q11. Reorder exercises within a session
- Input: session_id, new ordering
- Output: updated ordering

---

## 4) Exercise Library (Shared Global)

### Q12. List selectable exercises
- Filter: shared global exercise library, excluding deleted exercises
- Output: exercise_id, name, primary muscle group, optional secondary muscle group, equipment(optional), exercise type (isolation/compound)

### Q13. Add exercise to shared library
- Input: user_id (for audit), name, one or more primary muscle groups, optional secondary muscle groups
- Output: exercise_id
- Rule: exercise names are globally unique, case-insensitively

### Q17. Search and filter selectable exercises
- Input: current user, optional search, multiple muscle IDs, equipment, type, ownership (`editable` or `readOnly`), entity-specific sort, limit, and offset.
- Output: unique selectable exercises with structured primary and secondary assignments and matching pagination totals.
- Search: exact exercise name, approved local aliases, prefix/substring, PostgreSQL trigram typo similarity, then primary/secondary muscle names and equipment. Short unrelated input must not create broad false positives.
- Filter: every selected muscle must match the same exercise in either role; equipment/type compose with those AND conditions.
- Ownership: `editable` requires `created_by_user_id = current user`; `readOnly` includes system exercises and exercises created by another user. Omitted ownership returns all selectable exercises.
- Pagination is required for the full system catalog; clients must not assume the first 100 rows are complete.

### Q18. Manage workout templates
- Input: current user, template name, ordered exercise IDs
- Output: user-owned templates with ordered exercise occurrences and current muscle classifications
- Actions: create, rename, staged multi-add, remove, reorder, duplicate, and delete. Template rows do not expose a per-exercise Replace action.

### Q19. Start or save a template workout
- Start: copy the template exercise occurrences into a new open session in one transaction
- Save: copy a completed session's current exercise IDs/order into a new or existing template
- Output: independent session/template records; no sets or performance values are copied

### Q20. Search, facet, sort, and summarize complete workout history

- Input: user, search text, time zone, optional multiple muscle IDs, equipment, exercise type, sort, limit, offset.
- Search title/type, displayed local dates, exercise names, muscles, and equipment before pagination.
- Facets require one contained exercise to satisfy every active exercise-level condition.
- Output rows include tonnage and an exercise preview. `allTimeSummary` is unfiltered and includes total/completed sessions, total tonnage, average completed duration, and completion rate.
- The History portability UI exposes the canonical row-per-set CSV headers, validation rules, accepted classifications, one complete row, and a downloadable sample without adding another database query.

### Q21. Search and rank workout templates

- Search template name or contained exercise data and apply the shared facets.
- Derive `lastUsedAt` from completed workouts with the exact same exercise multiset: order ignored, duplicate counts preserved, extra/missing occurrences rejected.
- Sort by last used, name, or last edited.

### Q22. Canonical exercise discovery and preferences

- List exercises by search, multiple muscle IDs, equipment, type, ownership/editability, and entity-specific sort.
- Return the canonical equipment/type options and up to five existing-name suggestions.
- Read and update the current user's 5–50 volume heat ceiling.
- Merge user-scoped workout and template references and report both affected record types.
- History, Template, and Exercise List filter/sort state is browser-tab-local and user-scoped; it does not add a database query. Search text is intentionally excluded from persistence.

---

## 5) Progress & Analytics

### Q14. Exercise progress over time (sets)
- Filter: user_id, exercise_id, time range, optionally set_type=working, set_id
- Progress navigation also accepts the user's IANA time zone and returns the number of unique local days with working-set data for each exercise. This is the number of points eligible for the plot.
- Output (time series), illustrated graphically:
  - session_date
  - weight, reps, RIR
- or 
  - session_date
  - weight, reps + RIR added
- or
  - (optional) estimated_1RM
- UI selection: choose one strongest working set per user-local calendar day. If more than one session exists on that day, all eligible sets compete for the single plotted point.

### Q15. Exercise summary stats for a time range
- Filter: user_id, exercise_id, date range
- Output:
  - total_sets, total_reps
  - total_volume (sum weight*reps)
  - average RIR
  - total time of doing this exercise
  - best_top_set (by weight or by estimated 1RM)
- Range-aware `total_sets` and `total_volume` include both working and warmup sets. Progress requests the active 1W/1M/3M range for these widgets and uses the unbounded summary for all-time best-set and estimated-1RM widgets; MAX reuses the unbounded summary.

### Q16. Weekly sets per muscle group
- Filter: user_id, time range
- Output:
  - average weekly woking sets for each muscle group
  - muscle_group
  - total number of sets per muscle group

---

## 6) Cardio (deferred / vNext)

Status: Deferred from the MVP and not part of the first schema/API pass.

## 7) Founding Beta and Account Lifecycle

- Q23 generically create/deduplicate a waitlist request without disclosing its prior state.
- Q24 lock settings/request rows, count consuming accounts and unexpired invites, enforce cap/rolling approval limit, and issue one hashed invitation atomically.
- Q25 consume one valid invitation with a matching email while creating the verified account and session transactionally.
- Q26 export every user-owned profile/workout/template/exercise/preference/onboarding/event/message record without secrets or other-user security data.
- Q27 lock an account for deletion, revoke all sessions, cancel by token/admin, select due accounts and hard-delete the complete ownership graph idempotently.
- Q28 get/update privacy and onboarding state; increment reliable login/workout counters independently of optional analytics.
- Q29 materialize campaign recipients and select the next eligible message from immutable trigger/audience state; save only a validated configured response.
- Q30 list applicant/user/campaign state for an explicit administrator and append every privileged mutation to the audit log.

### C1. Log cardio entry in a session OR standalone
- Input: distance, duration, optional notes
- Output: cardio_log_id

### C2. Cardio history
- Filter: user_id, date range
- Output: distance, duration, pace
