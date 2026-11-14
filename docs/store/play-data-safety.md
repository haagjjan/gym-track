# Google Play Data safety

Draft answers for the Google Play Console Data safety form (`GymTrack`, `ch.gymtrack.app`). Derived from `docs/beta-process/public-beta/goal-1/data-processing-inventory.md`, `docs/beta-process/public-beta/goal-2/processor-inventory-final.md`, `docs/beta-process/public-beta/goal-2/dpia.md`, `apps/web/src/app/privacy/page.tsx`, `docs/decisions/0013-public-beta-privacy-and-erasure.md`, and `docs/decisions/0023-mobile-token-auth.md`.

## Note on "Shared" vs. service providers

Under Google Play's Data safety definition, transferring user data to service providers acting strictly on the developer's instructions is not classified as "sharing". GymTrack uses three external processors (`processor-inventory-final.md`, `privacy/page.tsx`):

- **Cloudflare** (US): routes and protects HTTPS traffic; decrypts TLS at its edge before re-encrypting toward the self-hosted Tunnel.
- **Resend** (US): delivers transactional emails (verification, password reset, deletion notices).
- **Infomaniak** (Switzerland): hosts support and privacy email correspondence.

**OWNER TO CONFIRM:** Confirm that Cloudflare (Free plan) and Resend qualify strictly as service-provider processing under Google Play's Data safety rules so "Shared" remains "No" for all rows below.

## Data collection and sharing table

| Data category / type | Collected | Shared | Processed ephemerally | Required or optional | Purposes | Source & notes |
|---|---|---|---|---|---|---|
| Personal info — Email address | Yes | No | No | Required | Account management, App functionality | Used for signup, login, verification, password reset, deletion notices, and support (`data-processing-inventory.md`, `privacy/page.tsx`). |
| Personal info — User IDs | Yes | No | No | Required | Account management, App functionality | Internal user UUID and username (`data-processing-inventory.md`, `dpia.md`). |
| Health and fitness — Fitness info | Yes | No | No | Optional (core logging) | App functionality | Workout sessions, exercises, sets, weight, reps, RIR, rest intervals, templates, and optional set notes (`data-processing-inventory.md`, `privacy/page.tsx`). Body profile (age, height, weight, body-fat %) is stored on-device only and never sent to the server (`dpia.md`). |
| Messages — Emails | Yes (if user contacts support) | No | No | Optional | App functionality | Support and privacy correspondence via Infomaniak; transactional email bodies via Resend (`processor-inventory-final.md`, `privacy/page.tsx`). |
| App activity — App interactions | OWNER TO CONFIRM | No | No | Optional | Analytics | First-party `app_events` are opt-in and off by default (`data-processing-inventory.md`, `dpia.md`, `privacy/page.tsx`). **OWNER TO CONFIRM:** Whether opt-in-only analytics must be declared as collected when off by default. |
| App info and performance — Diagnostics | OWNER TO CONFIRM | No | OWNER TO CONFIRM | Required (server logs) | App functionality, Fraud prevention & security | API logs record request ID, normalized route, method, status, duration, and bounded error type without user/email labels (`data-processing-inventory.md`); Cloudflare keeps short-lived HTTP/security logs (`processor-inventory-final.md`). **OWNER TO CONFIRM:** Whether transient server/CDN logs require declaring Diagnostics. |
| Device or other IDs | No | No | No | n/a | n/a | No advertising IDs or third-party tracking SDKs (`privacy/page.tsx`). Session tokens are stored in Android Keystore (`docs/decisions/0023-mobile-token-auth.md`). **OWNER TO CONFIRM:** Confirm client mutation UUIDs (`docs/decisions/0025-offline-sync.md`) do not need to be declared under Device or other IDs. |

## Security practices

- **Data encrypted in transit:** Yes. All app-to-server traffic uses HTTPS/TLS (`processor-inventory-final.md`, `privacy/page.tsx`).
- **Data deletion request mechanism:** Yes.
  - **In-app deletion path:** `Settings > Privacy and data > Delete account` (password-confirmed; revokes sessions immediately, locks the account for a 7-day grace period, then permanently erases live user data; `docs/decisions/0013-public-beta-privacy-and-erasure.md`, `privacy/page.tsx`).
  - **Web deletion URL:** `https://app.gymtrack.ch/settings` (authenticated) or `OWNER TO CONFIRM: Provide a public non-authenticated deletion-request URL or confirm https://app.gymtrack.ch/privacy (which lists the privacy contact email) satisfies Google Play's web deletion URL requirement.`
- **Independent security review:** No (not conducted).
