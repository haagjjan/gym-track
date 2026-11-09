# Current project state

A short handoff for someone (or a model) who can't look around the repository. Last updated
2026-11-09. For the code map read [CODEBASE.md](../CODEBASE.md); for the rules read
[ARCHITECTURE.md](../ARCHITECTURE.md).

## Where things stand

- **Production** runs public v0 at `app.gymtrack.ch` from `main`. Signup is open to adults who
  live in Switzerland (ADR 0022). It is self-hosted on a home server behind Cloudflare Tunnel and
  Caddy, with monitoring, alerting, encrypted off-machine backups and a public status page.
- **Mobile apps** will be Capacitor shells around a bundled build of the web UI (ADR 0021,
  accepted with a spike gate). Nothing native ships yet.
- **UX rework** (branch `ux-rework`) gets the web UI ready to ship as that app. Done so far:
  - a new design system in [DESIGN.md](DESIGN.md): system font, one cyan accent, light and dark
    themes, sentence-case copy
  - the new shell: tab bar on phones (Home, History, Workout, Progress, Volume), in-app back,
    safe areas
  - every screen reworked, with new copy
  - code cleanup: spike route removed, 3D files split, shared `Sheet` and storage hooks
  - docs and repo cleanup: archive under [archive/](archive/README.md), the root docs rewritten

  The owner commits each step; check `git status` for what is still uncommitted.

## What the product does

Log strength workouts on a phone (sets with weight, reps, RIR, notes, a rest timer), reuse
templates, review history, import and export CSV, follow exercise progress, and see weekly
muscle volume on a 3D body. New accounts get a guided example that never touches their data.
Accounts support email verification, password reset, data export, deletion with a grace period,
and hard erasure. Admins get an overview, member tools, deletion support, campaigns and an audit
log.

## Next steps

1. **Mobile readiness gate (UX rework Step 13):** a full pass in the iOS and Android shells,
   independent review, and owner sign-off. Check that logging sets works with the keyboard open,
   that back behaves right on both platforms, and the frame rate on real phones.
2. **Mobile app plan:** written after Step 13, based on ADR 0021. The Capacitor spike decides
   whether token auth, offline sync or native plugins are needed (each needs its own ADR).
3. **Signup consent hotfix:** prepared in the `../gym-progress-tracker-hotfix` worktree, branch
   `hotfix/signup-consent`, not merged yet. Rebase `ux-rework` after it lands on `main`.
4. **Beta table cleanup:** drop `beta_access_requests` and `users.beta_cohort` and move
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
