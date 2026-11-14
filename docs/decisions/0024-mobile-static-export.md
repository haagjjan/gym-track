# ADR 0024 - Mobile Static-Export Build Target

## Status

Proposed, 2026-11-14. The owner reviews this before the mobile app ships. The spike on branch
`mobile/app` is built against it.

## Context

[ADR 0021](0021-mobile-app-stack.md) ships the web UI inside Capacitor as a bundled build. A
bundle has no Node server, so nothing that needs a request at render time survives. The
inventory in [mobile-route-inventory.md](../mobile-route-inventory.md) counts what `apps/web`
relies on today:

- 56 BFF route handler files (72 method handlers) under `src/app/api/**`. All but two files
  are plain proxies to the same path on `apps/api`. The exceptions read a server flag
  (`/api/auth/signup`, `/api/tracking/[...path]`), and `/api/public-status` maps to
  `/api/v1/status-metrics`.
- 24 pages and 2 layouts. The pages are thin: a server session check (`getCurrentUser`), a
  redirect, sometimes a flag from `process.env`, then one screen component from
  `src/features/**`. The screens themselves are client components.
- Two dynamic routes: `/workouts/[workoutId]` and `/help/demo/[[...screen]]`. A static export
  cannot pre-render routes whose parameters are user data.
- `src/middleware.ts`: host guard, security headers and CSP. Middleware does not run in a
  static export.

One source tree has to build both targets, and the production web build must not change.

## Options

| | A. Second config in `apps/web` (`output: "export"` by env) | B. Sibling static app that imports the web screens | C. Vite SPA entry |
|---|---|---|---|
| Web build untouched | No. `app/api/**`, middleware and server pages must be excluded from one of two builds of the same `app/` directory | Yes | Yes |
| Server pages | Every page needs a server and a client variant in the same file tree | Server pages stay in `apps/web`; client pages live in the new app | Same as B |
| `next/link`, `next/navigation`, `next/dynamic` in screens | Work | Work | Need shims or a rewrite of every import |
| Tooling | One Next version, two modes that can drift | One Next version, two small configs | Two bundlers |
| Risk | High: a build flag decides whether server code is bundled | Low | Medium to high |

## Decision

**Option B.** A new workspace package `apps/mobile` holds a second Next.js app with
`output: "export"`. Its `src/app/` contains only client pages. Each page imports its screen
from `apps/web/src/features/**` and wraps it in a client auth guard. `apps/web` keeps its
pages, BFF and middleware exactly as they are. `apps/mobile` also holds the Capacitor project
(`capacitor.config.ts`, `ios/`, `android/`).

A proof on 2026-11-14 exported Login and Home (with the shell and the 3D dashboard) this way
on the first build, in about 12 seconds, with `experimental.externalDir` and Tailwind's
`@source` pointing at `apps/web/src`.

Rules that follow:

1. **Screens stay in `apps/web/src/features` and `shared`.** `apps/mobile` contains pages,
   the guard, and native project files. It never forks a screen. The dependency direction is
   `apps/mobile` → `apps/web/src`; `apps/web` never imports from `apps/mobile`.
2. **Runtime switch.** `NEXT_PUBLIC_RUNTIME=app` is set by the mobile build only. Shared code
   reads it through one module, `apps/web/src/shared/platform/runtime.ts`. Feature code does
   not read the variable itself.
3. **API access.** Client code calls the API through `shared/api` only. On the web, a path
   like `/api/workouts` stays same-origin and hits the BFF. In the app, the same call is
   rewritten to `${NEXT_PUBLIC_API_ORIGIN}/api/v1/workouts` and carries the bearer token
   ([ADR 0023](0023-mobile-token-auth.md)). Raw `fetch("/api/...")` in feature code is moved
   onto that layer. The one path mismatch (`public-status`) is mapped there.
4. **Server flags.** Flags that pages read from `process.env` today become build-time
   `NEXT_PUBLIC_*` values in the mobile build (extended tracking, registration mode). The
   API still enforces them; the app value only decides what to show.
5. **Auth guard.** The mobile pages render through a client guard that loads the current
   user from `/auth/me`, shows the launch screen while loading, and sends signed-out users to
   Login. Authorization itself stays in the API. A `401` anywhere clears the token and shows
   Login.
6. **Dynamic routes.** The app uses query parameters: `/workouts/session/?id=<workoutId>` and
   `/help/demo/?screen=<name>`. Links to these routes are built by a helper in
   `shared/platform` so the web keeps its path form.
7. **Admin is not in the app.** The admin routes are not exported. Administrators use the
   web.
8. **Security headers.** The bundle is served from the app's own scheme, so the host guard
   does not apply. The exported HTML carries a `Content-Security-Policy` meta tag that allows
   scripts and styles from the bundle only and connections to the API origin only.
9. **Minimum client version.** The app sends `X-App-Version: <semver>` on every API request.
   When `MOBILE_MIN_APP_VERSION` is set and the header is lower, the API answers
   `426 Upgrade Required` with code `APP_UPDATE_REQUIRED`, and the app shows a blocking
   "Update GymTrack" screen. This protects the offline outbox (ADR 0025) from old bundles
   after a protocol change. Requests without the header (the web) are never affected.
10. **Assets.** `apps/web/public` is copied into the mobile build so the body model and
    images ship inside the app.

## Effort estimate

For the full split (all non-admin routes, API layer, guard, links, downloads), before
offline work: about 25 to 40 hours of focused work. The comparison in ADR 0021's fallback
rule is against several hundred hours for a native UI, so the split does not trigger the
Expo fallback.

## Consequences

- `apps/mobile` is a new workspace package and adds Capacitor dependencies. `pnpm check`
  now also type-checks and lints it.
- Two page trees exist. A new screen needs a page in both. The route inventory is the
  checklist, and a unit test compares the two route lists so a missing mobile page fails CI.
- Importing across app directories relies on `experimental.externalDir`. If Next removes it,
  the screens move to a shared package; the import paths change, the design does not.
- Feature code loses direct `fetch` and `process.env` access in client files. This is
  enforced by lint once the migration is complete.
- The web bundle gains a small amount of dead code (the app branch of the API layer).

## Verification gates

- `apps/mobile` builds with `output: "export"`; the web build output is unchanged.
- The exported bundle runs in a real Capacitor project on the iOS simulator and the Android
  emulator, logged in through the token endpoint (ADR 0021 criterion 1).
- `pnpm smoke:web` still passes against the web build.
