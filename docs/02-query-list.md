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

---

## 3) Logging / Editing a Workout

### Q7. Create a new session (start workout)
- Input: Workout Type/Structure (upper, lower, push, pull, ...), user_id(automatically), started_at (default now), notes(optional)
- Output: session_id, exercise windows

### Q8. Add exercise to session (ordered)
- Input: session_id, exercise_id, position/order, workig mouscle groups
- Output: session_exercise_id

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

## 4) Exercise Library (Defaults + Custom)

### Q12. List selectable exercises
- Filter: (defaults) + (user custom)
- Output: exercise_id, name, primary muscle group, optional secondary muscle group, equipment(optional), exercise type (isolation/compound)

### Q13. Add custom exercise to list
- Input: user_id, name, primary muscle group, optional secondary muscle groups
- Output: exercise_id

---

## 5) Progress & Analytics

### Q14. Exercise progress over time (sets)
- Filter: user_id, exercise_id, time range, optionally set_type=working, set_id
- Output (time series), illustrated graphically:
  - session_date
  - weight, reps, RIR
- or 
  - session_date
  - weight, reps + RIR added
- or
  - (optional) estimated_1RM

### Q15. Exercise summary stats for a time range
- Filter: user_id, exercise_id, date range
- Output:
  - total_sets, total_reps
  - total_volume (sum weight*reps)
  - average RIR
  - total time of doing this exercise
  - best_top_set (by weight or by estimated 1RM)

### Q16. Weekly sets per muscle group
- Filter: user_id, time range
- Output:
  - average weekly woking sets for each muscle group
  - muscle_group
  - total number of sets per muscle group

---

## 6) Cardio (optional MVP, but planned)

### Q16. Log cardio entry in a session OR standalone
- Input: distance, duration, optional notes
- Output: cardio_log_id

### Q17. Cardio history
- Filter: user_id, date range
- Output: distance, duration, pace
