# Mobile app

How the iOS and Android apps are built and run. Decisions are in
[ADR 0021](decisions/0021-mobile-app-stack.md) (Capacitor),
[ADR 0023](decisions/0023-mobile-token-auth.md) (token auth),
[ADR 0024](decisions/0024-mobile-static-export.md) (build target) and
[ADR 0025](decisions/0025-offline-sync.md) (offline). ADRs 0023 to 0025 are still proposed.

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

4. iOS (simulator, no signing needed):

   ```sh
   cd apps/mobile/ios/App
   xcodebuild -project App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator \
     -destination 'id=<simulator id>' -derivedDataPath /tmp/gymtrack-ios CODE_SIGNING_ALLOWED=NO build
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

Stage 1 of ADR 0025:

- The app opens without a network when a session is stored, using the last confirmed user.
- Screens show the last answers the API gave (kept on the device for up to 30 days).
- While the API does not answer, the app counts as offline: refreshes pause instead of
  failing, and resume when a request gets through again. The WebView's own online flag is
  not trusted; it can stay on in airplane mode.
- A set logged without a connection is kept in an outbox and sent when the phone is back
  online, with the same mutation ID, so it cannot be stored twice.
- Editing or deleting a set, reordering, adding an exercise, and starting or finishing a
  workout need a connection.

The outbox and the read cache use web storage in this stage. ADR 0025 names SQLite as the
target store.

## Checks

- `pnpm --filter @gym-progress-tracker/mobile type-check`, `lint`, `build`
- `pnpm --filter @gym-progress-tracker/mobile test`: every web route has an app page
  (`scripts/check-routes.mjs`). A new screen needs a page in both trees.
- The build writes a Content-Security-Policy meta tag into every exported page
  (`scripts/write-csp.mjs`).

## Not built yet

- Production route to the API for phones (see ADR 0023, Consequences). Until then the app
  cannot reach production.
- Signing, TestFlight and Play tracks; app icons and splash screens (the projects still
  carry the Capacitor defaults).
- Push notifications and the rest-timer notification.
- Universal Links and App Links for emailed links. They open the website.
- The full sync protocol of ADR 0025.
- Checks on physical phones (3D frame rate and heat, keyboard, gestures).
- In the app, legal and support pages open the website in the browser sheet.
