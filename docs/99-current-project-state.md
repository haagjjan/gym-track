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

The next-feature work is split: body/runtime changes are in the original worktree
on `next/b-body`; optional time/cardio changes are in the independent
`../gym-progress-tracker-set-types` worktree on `next/c-set-types`. The canonical
execution record is `~/.agents/plans/gym-next-features.md`. Changes in this
worktree are uncommitted, behind `ENABLE_EXTENDED_TRACKING=false` by default, and
have only been tested against isolated local databases. No offline client is
built; ADRs 0025 and 0026 are proposed for owner review. See
[next-tracking-verification.md](next-tracking-verification.md) for setup and gates.

## What the product does

Log strength workouts on a phone (sets with weight, reps, RIR, notes, a rest timer), reuse
templates, review history, import and export CSV, follow exercise progress, and see weekly
muscle volume on a 3D body. New accounts get a guided example that never touches their data.
Accounts support email verification, password reset, data export, deletion with a grace period,
and hard erasure. Admins get an overview, member tools, deletion support, campaigns and an audit
log.

## Next steps

The UX rework is done (signed off 2026-11-09). The owner's list for what comes next, in order:

1. Light Home scene implemented in the body worktree; final look and device checks remain.
2. Native Volume scrolling and sideways rotation implemented in the body worktree; real-phone checks remain.
3. Progress chart: enlarge the existing card plot (implemented on `next/a-ui`).
4. Shared rigged figure and pedestal implemented on `next/b-body`; final anatomy sign-off remains.
5. Twenty muscle regions and per-region volume implemented on `next/b-body`.
6. Time sets, timer, progress and CSV implemented here; flag defaults off.
7. Cardio logging, progress and CSV implemented here; excluded from muscle volume.
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
- Muscle-region art in `apps/web/public/volume/` is hand-drawn and still being refined by the
  owner.
- The simulator can't show heat or frame rate on real phones; those need device checks.
- Production is a single home server: no high availability or automatic failover.

## Checks

`pnpm check` (type-check, lint, unit tests, build), `pnpm test:integration`,
`WEB_BASE_URL=http://localhost:3000 pnpm smoke:web`, and `git diff --check`. Run e2e specs one at
a time locally, because signup and auth share one rate-limit bucket per IP.
