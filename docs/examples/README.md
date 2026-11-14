# Time and cardio sample workouts

`time-cardio-workouts.csv` contains synthetic data in the existing time/cardio import
format: 12 completed workouts from 5 October to 12 November 2026, with 114 entries.

- Dead hang and Wall Sit: three working sets per workout, plus a Dead hang warm-up.
  Holds lengthen over six weeks and later workouts add weight.
- Treadmill Run: a 5 km run each week, gradually faster.
- Rowing Machine: three 500 m intervals each week, with heart rate and notes.
- Stationary Bike: duration-only cooldowns to exercise the missing-distance state.

With extended tracking enabled, open History and use **Time and cardio CSV → Import
a time/cardio file**. Select this file, then **Import time and cardio**. These five
exercise names must exist with their matching time/cardio modes; they are included
in the current catalog migrations. No custom exercise creation is needed.

Import once: importing again creates another 12 workouts. The titles start with
“Sample” so they can be identified and deleted individually from workout detail.
Warm-ups appear in History but are excluded from Progress. Cardio does not count
as muscle volume. This file contains no strength sets and needs no strength CSV.
