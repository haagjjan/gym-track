# Apple App Store privacy labels

Draft answers for App Store Connect "App Privacy" (`GymTrack`, `ch.gymtrack.app`). Derived from `docs/beta-process/public-beta/goal-1/data-processing-inventory.md`, `docs/beta-process/public-beta/goal-2/processor-inventory-final.md`, `docs/beta-process/public-beta/goal-2/dpia.md`, `apps/web/src/app/privacy/page.tsx`, `docs/decisions/0023-mobile-token-auth.md`, and `docs/decisions/0025-offline-sync.md`.

## Data types collected

| Apple category / data type | Collected | Linked to identity | Used for tracking | Purposes | Source & notes |
|---|---|---|---|---|---|
| Contact Info — Email Address | Yes | Yes | No | App Functionality | Account signup, login, email verification, password reset, deletion notices (`data-processing-inventory.md`, `privacy/page.tsx`). Also used if the user contacts support (`processor-inventory-final.md`). |
| Identifiers — User ID | Yes | Yes | No | App Functionality | Internal user UUID and username (`data-processing-inventory.md`, `dpia.md`). |
| Health & Fitness — Fitness | Yes | Yes | No | App Functionality | Workout sessions, exercises, sets, weight, reps, RIR, rest intervals, templates (`data-processing-inventory.md`, `privacy/page.tsx`). Note: `dpia.md` section 5 treats longitudinal training data as potentially health-related. |
| User Content — Other User Content | Yes | Yes | No | App Functionality | Optional free-text set/workout notes, custom exercise definitions, optional in-app message responses, and support correspondence (`data-processing-inventory.md`, `privacy/page.tsx`). |
| Usage Data — Product Interaction | OWNER TO CONFIRM | Yes (when opted in) | No | Analytics | First-party `app_events` are opt-in and off by default (`data-processing-inventory.md`, `dpia.md`, `privacy/page.tsx`). **OWNER TO CONFIRM:** Whether Apple requires declaring opt-in-only first-party product events as "Collected" when disabled by default, and whether any anonymous aggregate events are sent when opted out. |
| Diagnostics — Other Diagnostic Data | OWNER TO CONFIRM | No | No | App Functionality | Server API logs record request ID, normalized route, method, status, duration, and bounded error type without user/email labels (`data-processing-inventory.md`). Cloudflare processes connection metadata and HTTP logs in transit (`processor-inventory-final.md`). **OWNER TO CONFIRM:** Whether transient server/CDN request metadata counts as "Diagnostics" under Apple's App Privacy definition. |

## On-device only data (not collected by the server)

- **Body profile** (optional age, height, weight, body-fat estimate): stored in local device storage only, never transmitted to the server, and excluded from exports (`data-processing-inventory.md`, `dpia.md`).
- **Session token**: stored in iOS Keychain (`docs/decisions/0023-mobile-token-auth.md`); not shared with third parties.
- **Offline set queue**: stored locally on-device until synced to the user's account (`docs/decisions/0025-offline-sync.md`).

## Data not collected

- Location (Precise or Coarse)
- Financial Info / Payment Info
- Contacts
- Browsing History / Search History
- Photos or Videos / Audio Data
- HealthKit / Health Connect data (no health-platform integration)
- Device ID / Advertising Data (no ads, no third-party analytics SDKs; `privacy/page.tsx`, `dpia.md`)
- Sensitive Info (beyond fitness/training data and optional free-text notes; no race, religion, biometrics, etc.)
