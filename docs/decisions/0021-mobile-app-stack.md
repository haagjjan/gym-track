# ADR 0021 - Mobile App Stack

## Status

Accepted (2026-11-08): Capacitor with a bundled build, subject to the spike gate below.

## Context

The iOS and Android apps are the main future target. Before reworking the web UI, we need to know whether that UI will ship inside the apps or only serve as a spec for a separate native UI. Otherwise the same screens get polished twice.

What constrains the choice:

- **Auth.** The web app authenticates through a Next.js BFF: same-origin route handlers plus session cookies ([ADR 0011](0011-secure-single-owner-external-access.md)). A static export can't run request-dependent route handlers, Server Actions or cookie writes ([Next.js static exports](https://nextjs.org/docs/app/guides/static-exports)). So any app that bundles its UI needs a token-based login path on `apps/api`, whichever framework we pick. Pointing Capacitor at the hosted site (`server.url`) avoids that, but Capacitor's own docs say not to do that in production ([Capacitor config](https://capacitorjs.com/docs/config)).
- **Offline logging.** Logging sets in a gym with bad reception has to work. Today only set creates are idempotent; set updates and reorders are last-write-wins ([ADR 0014](0014-idempotent-workout-mutations.md)). Every option needs a durable local store, an outbox and conflict rules. Native SQLite is available in Expo (`expo-sqlite`) and Capacitor (`@capacitor-community/sqlite`). An installed iOS PWA gets persistent storage (`navigator.storage.persist()`) but no Background Sync, so it can only sync while the app is open.
- **Store review.** Apple guideline 4.2 and Google Play's WebView policy reject apps that are mostly a repackaged website. Neither bans WebView apps. A Capacitor app with offline SQLite, haptics, push and HealthKit/Health Connect is a real app; a thin shell around the website is not.
- **3D.** The avatar and volume map use React Three Fiber with custom GLSL shaders and FBX assets. In Capacitor, and in Expo DOM components, they run unchanged in the system WebView (WKWebView or Android WebView). A port to native `expo-gl` is not a drop-in WebGL2 runtime. None of these paths has been tested on a physical phone yet.
- **Effort and cost.** For one developer, the earlier estimate ([mobile-app-effort-evaluation.md](../archive/mobile-app-effort-evaluation.md)) is 1,500–2,500 h for iPhone plus 250–450 h for Android, assuming one shared codebase. On top of that come:
  - Apple Developer Program, US$99 per year
  - Google Play, US$25 one-time, and a closed test with 12 testers for 14 days for new personal accounts
  - in-app account deletion (Apple 5.1.1(v))
  - a review of the beta admission rules ([ADR 0012](0012-curated-public-beta-access.md), [ADR 0016](0016-founding-beta-jurisdiction-scope.md))

Options (research notes and reviews from 2026-11-08 are kept outside the repo; sources are linked inline):

| | Capacitor (bundled web UI) | Expo / React Native | Installed PWA |
|---|---|---|---|
| UI | Reworked web UI ships as the app | Native screens, built a second time | Reworked web UI |
| UI codebases to maintain | 1 | 2 | 1 |
| Native feel | Good if the web UI follows mobile conventions; native haptics and status bar via plugins | Best (native tabs, gestures, transitions) | Weakest; no store presence |
| 3D scenes | Unchanged in WKWebView | Unchanged in a DOM component, or ported to `expo-gl` | Unchanged |
| Offline logging | SQLite plugin + outbox | `expo-sqlite` + outbox | IndexedDB + outbox, syncs only while the app is open |
| Auth work | Token login for the app; the web keeps cookies | Same | None |
| Build work | A static-export build target that calls the API directly | New app | Manifest + service worker |
| Store risk | Low to medium, if the native features are real | Low | n/a |
| Push, HealthKit, Health Connect | Plugins | Libraries | Push only after Home Screen install; no health data |
| OTA updates | Web bundle (Capgo or Appflow, or own hosting) | EAS Update | Always live |

## Decision

Recommended: **Capacitor with a bundled build of the reworked web UI**, gated by a short spike. This is the owner's stated leaning and also what the evidence supports for a single developer:

- One UI codebase. The UI rework now under way ships directly to iOS and Android, so it gets done once.
- The 3D views run unchanged.
- The work that would be needed anyway (token auth, offline outbox, store compliance) doesn't depend on the framework, so Expo's extra cost would buy native feel and nothing else.

Spike exit criteria, to be met before the mobile plan starts:

1. A static-export build of the main routes runs in the iOS Simulator and the Android emulator, logged in through a token endpoint on `apps/api`.
2. The avatar and volume scenes hold a usable frame rate, without thermal problems over 10 minutes, on one physical mid-range iPhone and one physical mid-range Android phone.
3. Logging a set while offline, then reconnecting, syncs without duplicates. Sets reuse the client mutation IDs from ADR 0014.

Switch to Expo / React Native if the spike shows the WebView UI can't reach acceptable native feel (scroll, keyboard, gestures), or the static-export split costs about as much as a native UI.

## Consequences

- The web UI rework must follow mobile platform conventions closely: safe areas, tab bar, back behavior, 44 pt touch targets, keyboard handling. That UI becomes the app.
- New ADRs needed before the mobile work: mobile token auth, the offline sync protocol (revisions for set edits and reorders), and the static-export build target.
- Native value has to be real to pass review: offline logging, haptics, push, and later HealthKit/Health Connect.
- Store costs, the account-deletion requirement and beta admission scope must be settled before the first submission.
