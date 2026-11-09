# MVP Status Review

## Overall Status

The project now has a real MVP foundation, not just a scaffold.

The backend, database, authentication, workout logging, analytics, CSV import/export, CI, deployment configuration, and redesigned UI surfaces are all present.

Current classification:

**Private beta candidate, not SaaS-ready yet.**

The app is good enough to keep building on. It is probably not ready yet for normal users without close supervision, mainly because product polish, mobile gym usability, account lifecycle, and production operations are still incomplete.

---

## What Is Strong

The technical foundation is solid.

The repo includes:

* Clear documentation
* ADRs
* Feature-slice architecture
* SQL migrations
* Fastify API
* Next.js app
* PostgreSQL schema
* Auth sessions
* Tests
* CI scripts
* Render deployment config
* Operations runbook

The core user product exists:

* Signup, login, logout, current user
* Start or resume workout
* Add/create exercises
* Add, edit, and delete sets
* Reorder exercise blocks
* End workout
* View workout history and workout detail
* Import/export canonical workout CSV
* View progress charts
* View weekly volume body map

The current redesign has also moved well past generic CRUD.

Existing redesigned surfaces include:

* Cockpit UI primitives
* Auth screens
* App shell and navigation
* Dashboard
* Workout start
* Active workout logging
* History
* Progress
* Weekly volume

---

## Checks Run

The following checks passed:

```bash
pnpm type-check
pnpm lint
pnpm test
pnpm build
git diff --check
```

Additional result:

* `pnpm test` passed with **107 API tests**
* `git status --short` was clean

---

## Main Product Gap

The main blocker is no longer:

> Can the app technically work?

The main blocker is now:

> Can a tired user in the gym log a real workout quickly on a phone without friction or confusion?

The app is close, but the active workout flow still needs real mobile QA, manual end-to-end testing, and likely UI refinement.

The code already has the right product concepts:

* One active exercise
* Insert exercise dialog
* Draft sets
* Edit state
* Archive/read-only behavior
* Completion confirmation

However, this is the most important product surface. It needs to be tested under realistic gym conditions.

---

## SaaS Evaluation

### Product Readiness

**Status: Medium**

The app has a clear target user and a useful core loop.

Still missing:

* Onboarding
* First-run guidance
* User settings
* Account management
* Polished empty-account experience

---

### UX/UI Readiness

**Status: Medium**

The cockpit redesign is distinctive and much stronger than a generic dashboard.

Main risks:

* Some labels are very stylized
* Some icons are currently letter glyphs
* Mobile tap targets need review
* Overflow behavior needs review
* The theme needs to be checked in the actual workout logging context

Important question:

> Does the UI help during workout logging, or does it distract?

---

### Backend/API Readiness

**Status: Strong MVP**

The API is well-structured and tested.

One notable contract drift:

`docs/05-api-contract.md` documents these routes:

```text
PATCH /api/v1/workouts/:workoutId
DELETE /api/v1/workouts/:workoutId
```

But implementations for these base workout update/delete routes were not found.

This should either be fixed in the docs or implemented in the API.

---

### Data Model Readiness

**Status: Strong MVP**

The schema supports the intended workout/session/exercise/set/analytics flows.

The following design choices are sensible:

* Soft delete
* Ordering
* User scoping
* Primary-muscle volume rules

---

### Auth/Security Readiness

**Status: Early SaaS**

Good foundation:

* Argon2 password hashing
* HttpOnly opaque session cookies
* Database-backed sessions
* Secure cookie defaults in production

Still missing for SaaS readiness:

* Email verification
* Password reset
* Rate limiting / brute-force protection
* Account deletion
* Account data export policy
* CSRF review
* Security headers review
* Production secret rotation procedures

---

### Analytics Readiness

**Status: Good MVP**

Existing analytics are useful:

* Progress charts
* Summaries
* Estimated 1RM
* Completed-exercise navigation
* Weekly muscle volume

However, analytics are not yet insight-rich SaaS analytics.

Future value multipliers:

* PR detection
* Workout templates
* Volume targets
* Better exercise attribution
* More actionable progress insights

---

### Deployment/Ops Readiness

**Status: Partial**

Existing foundation:

* Render deployment config
* Operations runbook

Still future work:

* Hosted credentials
* Custom domain
* First production deploy
* Backup verification
* Monitoring alerts

---

### Observability Readiness

**Status: Partial**

Existing foundation:

* API structured logging

Still missing:

* Central error tracking
* Uptime monitoring
* Alerting
* Production incident loop

Client diagnostics are currently console-only.

---

### Testing/QA Readiness

**Status: Good foundation, incomplete product QA**

The automated foundation is healthy:

* Type-check passes
* Lint passes
* Tests pass
* Build passes
* Integration and web smoke tests exist

However, Docker/database-backed checks were not run in this pass.

Before beta, run:

```bash
pnpm test:integration
pnpm smoke:web
```

Also perform manual mobile QA at:

* 390px width
* 430px width

Critical flows to test manually:

* Signup
* Login
* Start workout
* Log set
* Edit set
* Delete set
* Complete session
* View history
* View progress
* View weekly volume

---

### Documentation Readiness

**Status: Good, with some drift**

The docs are unusually strong.

Known issue:

`README.md` still references an older UX slice plan, while:

```text
docs/08-next-implementation-plan.md
```

says the Stitch v2 redesign docs are now the source of truth.

The README should be updated to match the current implementation direction.

---

## Biggest Risks

1. **Active workout mobile usability**

   This is the make-or-break product risk.

2. **Incomplete account lifecycle**

   The app is not SaaS-complete without password reset, email verification decision, account settings, and account deletion/export handling.

3. **Unproven production setup**

   Production readiness exists on paper/config, but it has not yet been proven with a deployed tester environment.

4. **API contract drift**

   Docs and implementation should be aligned before serious QA or external consumers.

5. **Large UI files**

   Some large UI files exceed the repo’s engineering size rules, especially workout/history/chart files. Future changes may become harder to review if these are not split carefully.

---

## Recommended Next Moves

### 1. Run a real mobile QA pass

Test the full core loop on mobile:

* Signup
* Login
* Start workout
* Add exercise
* Log sets
* Edit sets
* Delete sets
* Complete session
* Open history
* Open progress
* Check weekly volume

Focus especially on whether logging feels fast while tired in the gym.

---

### 2. Fix API contract drift

Either implement the missing routes:

```text
PATCH /api/v1/workouts/:workoutId
DELETE /api/v1/workouts/:workoutId
```

or remove/update them in:

```text
docs/05-api-contract.md
```

---

### 3. Update the README

Bring `README.md` in line with the current Stitch v2 redesign direction.

The README should clearly state which planning document is currently authoritative.

---

### 4. Add SaaS account basics

Prioritize:

* Password reset
* Email verification decision
* Account settings
* Delete account
* Export account data

---

### 5. Run stronger QA checks

Run:

```bash
pnpm test:integration
pnpm smoke:web
```

Also run the product manually in realistic mobile sizes.

---

### 6. Deploy a private Render environment

Create one private tester environment and run the operations runbook with one test account.

Validate:

* Deployment
* Environment variables
* Database connection
* Auth flow
* Workout flow
* Logs
* Backup expectations
* Recovery assumptions

---

## Bottom Line

The repo is in a healthy **serious MVP / private beta** state.

It has a real spine.

The next work should be less about adding more features and more about making the current product reliable, understandable, and comfortable enough for actual repeated use.
