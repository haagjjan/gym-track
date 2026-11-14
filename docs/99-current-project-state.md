# Current project state

A short handoff for someone (or a model) who can't look around the repository. Last updated
2026-11-10. For the code map read [CODEBASE.md](../CODEBASE.md); for the rules read
[ARCHITECTURE.md](../ARCHITECTURE.md).

## Where things stand

- **Production** runs public v0 at `app.gymtrack.ch` from `main`. Signup is open to adults who
  live in Switzerland (ADR 0022). It is self-hosted on a home server behind Cloudflare Tunnel and
  Caddy, with monitoring, alerting, encrypted off-machine backups and a public status page.
- **Mobile apps** will be Capacitor shells around a bundled build of the web UI (ADR 0021,
  accepted with a spike gate). Nothing native ships yet.
- **UX rework** (branch `ux-rework`) got the web UI ready to ship as that app. Done and signed
  off on 2026-11-09:
  - a new design system in [DESIGN.md](DESIGN.md): system font, one cyan accent, light and dark
    themes, sentence-case copy
  - the new shell: tab bar on phones (Home, History, Workout, Progress, Volume), in-app back,
    safe areas
  - every screen reworked, with new copy
  - code cleanup: spike route removed, 3D files split, shared `Sheet` and storage hooks
  - docs and repo cleanup: archive under [archive/](archive/README.md), the root docs rewritten

  The owner commits each step; check `git status` for what is still uncommitted.

The execution record is `~/.agents/plans/gym-next-features.md`. Branch `next/b-body` now
holds all of backlog items 1–7, committed (2026-11-13):

- Home and Volume use the local GLB, shared lighting and a simple pedestal; the old room,
  FBX and SVG projection runtime are removed. Vertical Volume swipes use native scrolling.
  Settings → Credits names the anatomy source.
- `next/c-set-types` is merged in: time sets, cardio, CSV and progress, off by default
  behind `ENABLE_EXTENDED_TRACKING`. Setup and gates are in
  [next-tracking-verification.md](next-tracking-verification.md).
- Sets accept 0 kg for bodyweight work, and History links to Templates and Exercises.
- Time and cardio were reworked on 2026-11-13 (ADR 0026 revision): they are ordinary
  exercises in the same picker, workout list and templates, logged in minutes and
  seconds. The exercise picker and library filter by "logged by", and a live
  workout lists cardio in its own section below the exercises.
- Time/cardio Progress now shares the strength picker and time plot: one best
  working entry per local day, 1W/1M/3M/Max visible spans, pan/tap inspection,
  previous/next-day readout, window totals and an equivalent daily-winner table.
- Muscle Volume gives primary assignments full credit and secondary assignments half
  credit, including timed working sets, body regions, contributions and the guided
  example (ADR 0028). Counts are derived on read; historical workouts update too.
- A full audit of the 840 catalog exercises corrected the muscles of 125 of them
  (migration `20261113140000000_correct_exercise_muscles.sql`).

None of this has shipped. Offline sync is a proposed ADR (0025), not a built client; ADRs
0026 and 0027 are proposed too.

## What the product does

Log strength workouts on a phone (sets with weight, reps, RIR, notes, a rest timer), reuse
templates, review history, import and export CSV, follow exercise progress, and see weekly
muscle volume on a 3D body. New accounts get a guided example that never touches their data.
Accounts support email verification, password reset, data export, deletion with a grace period,
and hard erasure. Admins get an overview, member tools, deletion support, campaigns and an audit
log.

## Next steps

The UX rework is done (signed off 2026-11-09). The owner's list for what comes next, in order:

1. Light Home scene implemented with the shared figure; final look and device checks remain.
2. Native Volume scrolling and sideways rotation implemented; real-phone feel remains to check.
3. Progress chart: enlarge the plot inside the existing card (implemented on `next/a-ui`).
4. Shared rigged body model and simple pedestal: runtime implemented on `next/b-body`; final anatomy and device verification remain open.
5. Twenty muscle regions, catalog mapping and per-region volume are implemented; chest/lat picking has a mobile browser regression test.
6. Time sets, timer, progress and CSV implemented merged from `next/c-set-types`; flag defaults off.
7. Cardio duration, distance, pace and optional heart rate implemented, same flag; excluded from muscle volume.
8. Publishing the mobile app: Capacitor per ADR 0021, starting with the token-auth,
   static-export and offline-sync ADRs and a spike on real phones.
9. Testing: real-device checks plus wider automated coverage.
10. Distribution: TestFlight, the Play closed test (12 testers, 14 days), store listings.

Still open from earlier:

- **Signup consent hotfix:** prepared in the `../gym-progress-tracker-hotfix` worktree, branch
  `hotfix/signup-consent`, not merged yet. Rebase `ux-rework` after it lands on `main`.
- **Beta table cleanup:** drop `beta_access_requests` and `users.beta_cohort` and move
  `campaigns_open` out of `beta_settings` (planned in ADR 0022).

## Known gaps and risks

- File downloads (data export, CSV) and external links need native handling inside the phone
  shells. Not built yet.
- Device-local preferences (body profile, favourite lifts, display, rest timer) are not synced
  between devices.
- The new body model is 39,886 triangles (406,424 bytes); final anatomy
  and visual sign-off remain open. Build scripts and validator are in `tools/body-model/`.
- The independent runtime review did not produce a report because its CLI failed.
- The simulator can't show heat or frame rate on real phones; those need device checks.
- Production is a single home server: no high availability or automatic failover.

## Checks

`pnpm check` (type-check, lint, unit tests, build), `pnpm test:integration`,
`WEB_BASE_URL=http://localhost:3000 pnpm smoke:web`, and `git diff --check`. Run e2e specs one at
a time locally, because signup and auth share one rate-limit bucket per IP.
