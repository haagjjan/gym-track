# Mobile app

How the iOS and Android apps are built and run. Decisions are in
[ADR 0021](decisions/0021-mobile-app-stack.md) (Capacitor),
[ADR 0023](decisions/0023-mobile-token-auth.md) (token auth),
[ADR 0024](decisions/0024-mobile-static-export.md) (build target) and
[ADR 0025](decisions/0025-offline-sync.md) (offline). ADRs 0023 to 0025 are accepted.

## What it is

`apps/mobile` is a second Next.js app built as a static export. Its pages are thin client
wrappers around the screens in `apps/web/src/features`. Capacitor packs the exported bundle
into the native projects in `apps/mobile/ios` and `apps/mobile/android`. The app has no
server of its own: it calls `apps/api` directly with a session token kept in the Keychain
or Keystore.

| Part | Where |
| --- | --- |
| Pages and auth guard | `apps/mobile/src/app`, `apps/mobile/src/session` |
| Startup wiring (API origin, plugins) | `apps/mobile/src/bootstrap.ts`, `src/config.ts` |
| Native plugins behind the UI's interface | `apps/mobile/src/native` |
| Offline read cache and outbox sync | `apps/mobile/src/offline` |
| Runtime switch, links, native interface, Android back order | `apps/web/src/shared/platform` |
| API transport (BFF on the web, API plus token in the app) | `apps/web/src/shared/api/transport.ts` |
| Outbox for sets logged offline | `apps/web/src/shared/offline/set-outbox.ts` |
| API side | `apps/api/src/features/auth/mobile-client.ts` |

Rules: screens are never forked into `apps/mobile`; feature code asks
`shared/platform/runtime.ts` instead of reading env variables; every browser API call goes
through `shared/api` (`apiFetch` or `apiRequest`).

## Run it on the emulators

1. Start the API with the app transport on. The app flag is off by default.

   ```sh
   set -a && . ./.env && set +a
   ENABLE_MOBILE_TOKEN_AUTH=true pnpm --filter @gym-progress-tracker/api dev
   ```

   Leave `BFF_CLIENT_IP_SECRET` unset locally. Use another `API_PORT` if 4000 is taken, and
   the same port in the next step.

2. Build the bundle and copy it into the native projects.

   ```sh
   cd apps/mobile
   NEXT_PUBLIC_API_ORIGIN=http://localhost:4000 pnpm build
   CAP_DEV=1 npx cap sync
   ```

3. Android (`gymtrack_pixel_play`, WebView 140 or newer):

   ```sh
   cd apps/mobile/android
   JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew assembleDebug
   adb reverse tcp:4000 tcp:4000
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   adb shell am start -n ch.gymtrack.app/.MainActivity
   ```

4. iOS (simulator). Sign locally (`CODE_SIGN_IDENTITY=-`): an unsigned build cannot write to
   the Keychain, so the session is lost at every restart.

   ```sh
   cd apps/mobile/ios/App
   xcodebuild -project App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator \
     -destination 'id=<simulator id>' -derivedDataPath /tmp/gymtrack-ios CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=YES build
   xcrun simctl install <simulator id> /tmp/gymtrack-ios/Build/Products/Debug-iphonesimulator/App.app
   xcrun simctl launch <simulator id> ch.gymtrack.app
   ```

`pnpm --filter @gym-progress-tracker/mobile dev` serves the same pages in a desktop browser
on port 3100 for quick checks. Add `http://localhost:3100` to `MOBILE_APP_ORIGINS` on the
API for that.

## Build settings

Set at build time, read in `apps/mobile/next.config.ts`:

| Variable | Default | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_API_ORIGIN` | `http://localhost:4000` | Origin of `apps/api` as the phone reaches it |
| `NEXT_PUBLIC_WEB_ORIGIN` | `https://app.gymtrack.ch` | Website, for legal and support pages opened in the browser |
| `NEXT_PUBLIC_ENABLE_EXTENDED_TRACKING` | `false` | Shows time and cardio controls; the API still decides |
| `NEXT_PUBLIC_REGISTRATION_MODE` | `ENABLED` | `DISABLED` shows the registration-closed screen |
| `NEXT_PUBLIC_SUPPORT_URL` | empty | Support link in Settings |

`CAP_DEV=1` on `cap sync` allows plain HTTP to a local API in the Android shell. Never set
it for a release build. The app version sent to the API comes from
`apps/mobile/package.json`.

API settings: `ENABLE_MOBILE_TOKEN_AUTH`, `MOBILE_APP_ORIGINS`, `MOBILE_MIN_APP_VERSION`
(see `.env.example`).

## What works offline

Stage 2 of ADR 0025:

- The app opens without a network when a session is stored, using the last confirmed user.
- Screens show the last answers the API gave (kept on the device for up to 30 days).
- While the API does not answer, the app counts as offline: refreshes pause instead of
  failing, and resume when a request gets through again. The WebView's own online flag is
  not trusted; it can stay on in airplane mode.
- A whole workout can be logged without a connection: start it (empty or from a template),
  add, remove and reorder exercises, add, edit and delete sets, rename, finish or discard.
  Each change goes into a queue on the phone (`shared/offline/outbox-*.ts`) and is sent in
  order when the API answers again (`apps/mobile/src/offline/outbox-sync.tsx`). Creates
  carry a mutation ID, so nothing is stored twice.
- Online, with an empty queue, changes go straight to the API as before. A change is queued
  only when the API is unreachable, when earlier changes are still waiting, or when it is
  about something that exists only on the phone so far.
- Screens show the server copy with the queued changes on top
  (`shared/offline/outbox-overlay.ts`). Sets that have not reached the server are labelled
  "Waiting to sync". A change the server refuses stays on the phone and shows a notice with
  "Try again".
- The exercise list is copied to the phone once a day (`shared/offline/exercise-catalog.ts`),
  so the picker searches it offline.
- The queue, the exercise copy, the cached screens and the cached user are stored in a
  SQLite file in the app's data folder (`apps/mobile/src/offline/device-store.ts`), which
  the system does not clear. A desktop browser uses web storage instead.
- Still needing a connection: time sets and cardio, creating a new exercise, templates,
  CSV, messages, settings and account actions.

Evidence (browser build, API requests blocked): `offline-workout-check.mjs` and
`offline-edit-check.mjs` in `~/.agents/plans/artifacts/gym-mobile-app/`.

## Checks

- `pnpm --filter @gym-progress-tracker/mobile type-check`, `lint`, `build`
- `pnpm --filter @gym-progress-tracker/mobile test`: every web route has an app page
  (`scripts/check-routes.mjs`). A new screen needs a page in both trees.
- The build writes a Content-Security-Policy meta tag into every exported page
  (`scripts/write-csp.mjs`).

## Not built yet

- The production route to the API exists in `ops/production` but is not deployed, and the
  flag is off (ADR 0023).
- Signing, TestFlight and Play tracks; app icons and splash screens (the projects still
  carry the Capacitor defaults).
- Push notifications and the rest-timer notification.
- Universal Links and App Links for emailed links. They open the website.
- Revisions and conflict handling between two devices (ADR 0025, stage 3).
- Remote push notifications.
- Checks on physical phones (3D frame rate and heat, keyboard, gestures).
- In the app, legal and support pages open the website in the browser sheet.
