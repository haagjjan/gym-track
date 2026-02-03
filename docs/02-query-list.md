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
  - ordered exercises in that session
  - ordered sets per exercise including:
    - set_type (warmup/working)
    - weight, reps
    - RIR
    - rest_time_seconds

---

## 3) Logging / Editing a Workout

### Q6. Create a new session (start workout)
- Input: user_id, started_at (default now), notes(optional)
- Output: session_id

### Q7. Add exercise to session (ordered)
- Input: session_id, exercise_id, position/order
- Output: session_exercise_id

### Q8. Add set to a session exercise (ordered)
- Input: session_exercise_id, set_order, set_type, weight, reps, RIR, rest_time_seconds
- Output: set_id

### Q9. Edit or delete a set
- Input: set_id, changed fields OR delete flag
- Output: updated set

### Q10. Reorder exercises within a session
- Input: session_id, new ordering
- Output: updated ordering

---

## 4) Exercise Library (Defaults + Custom)

### Q11. List selectable exercises
- Filter: (defaults) + (user custom)
- Output: exercise_id, name, primary muscle group, equipment(optional)

### Q12. Create custom exercise
- Input: user_id, name, primary muscle group, optional secondary muscle groups
- Output: exercise_id

---

## 5) Progress & Analytics

### Q13. Exercise progress over time (sets)
- Filter: user_id, exercise_id, date range, optionally set_type=working
- Output (time series):
  - session_date
  - set_type
  - weight, reps, RIR
  - (optional) estimated_1RM

### Q14. Exercise summary stats for a time range
- Filter: user_id, exercise_id, date range
- Output:
  - total_sets, total_reps
  - total_volume (sum weight*reps)
  - best_top_set (by weight or by estimated 1RM)

### Q15. Weekly sets per muscle group
- Filter: user_id, week range
- Output:
  - week_start
  - muscle_group
  - number_of_working_sets

---

## 6) Cardio (optional MVP, but planned)

### Q16. Log cardio entry in a session OR standalone
- Input: distance, duration, optional notes
- Output: cardio_log_id

### Q17. Cardio history
- Filter: user_id, date range
- Output: distance, duration, pace
