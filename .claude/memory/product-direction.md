# Memory: Product Direction

Gym Progress Tracker is a web app for structured strength workout logging and
progress review.

## Stable Product Intent

- Primary user: hypertrophy-focused lifter.
- Secondary users: strength-focused lifter and casual gym-goer.
- Core job: log a gym workout quickly, then review past sessions, exercise progress,
  and weekly muscle-group volume.
- Success means a full workout can be logged in minutes and history/progress can be
  reached without digging.
- The app is web-first. Native mobile is out of MVP scope, but the web UI must work
  well on a phone in the gym.

## MVP Scope

In scope:

- Account creation and login.
- Workout sessions.
- Exercise selection and shared exercise creation.
- Set logging with warmup/working type, kg, reps, RIR, optional rest time, and notes.
- Workout history and detail views.
- Single-exercise progress analytics.
- Weekly working-set volume per primary muscle group.
- CSV import/export for workout history portability.

Out of scope for MVP:

- Nutrition.
- Coaching.
- Social sharing.
- Native mobile app.
- Cardio logging.
- Saved templates/protocols unless explicitly approved.

## Current Product Surface

- Backend/auth/database foundations are intentionally kept.
- The active product direction is the Body Cockpit / Aether UI redesign.
- The design should feel technical, precise, and immersive without slowing down
  functional workout logging.
- Persistent desktop sidebar stays; mobile is the primary practical usage mode.
- Active workout logging is the highest-friction flow and should be optimized for
  one-handed set entry.

## Recent Direction

- Email verification and password reset exist, with soft-gate verification.
- Product analytics are server-side first-party events in `app_events`.
- Operational visibility before tester launch is important.
- `docs/14-ui-polish-and-ops-round-2.md` is the current punch-list style guide for
  next polish and ops work.

## Language And Tone

- Product identity currently uses `BODY_COCKPIT`.
- User may be framed as `Operator`.
- Workouts may be framed as sessions/logs/protocols in UI labels.
- Keep real actions understandable. Avoid theme language that obscures what a button
  actually does.
