# App review notes

Draft reviewer notes for Apple App Review and Google Play review (`GymTrack`, `ch.gymtrack.app`).

## Demo account

- **Email:** `OWNER TO CONFIRM: Provide a dedicated reviewer demo account email (with Swiss 18+ attestation already accepted).`
- **Password:** `OWNER TO CONFIRM: Provide the reviewer demo account password.`
- **Notes for reviewer:** Email verification does not block login (`docs/decisions/0022-open-public-registration.md`). New accounts also include a guided demo that keeps example data separate from real workouts (`docs/99-current-project-state.md`).

## Account deletion path

1. Sign in with the demo account (or create a test account).
2. Open **Settings** (profile button on the Home screen, per `docs/DESIGN.md`).
3. Go to **Privacy and data** > **Delete account** and confirm with the account password.
4. Deletion immediately revokes active sessions, locks access for a 7-day grace period, and permanently erases live user data afterward (`docs/decisions/0013-public-beta-privacy-and-erasure.md`, `apps/web/src/app/privacy/page.tsx`).

## Why GymTrack is more than a website wrapper

GymTrack ships a bundled static UI inside a native Capacitor shell (`docs/decisions/0021-mobile-app-stack.md`, `docs/decisions/0024-mobile-static-export.md`) rather than loading a remote website. Native capabilities in 1.0:

- **Secure credential storage (planned/in-progress for 1.0):** Stores opaque session tokens in iOS Keychain and Android Keystore via a native Capacitor secure-storage plugin (`docs/decisions/0023-mobile-token-auth.md`). **OWNER TO CONFIRM:** Verify enabled in the 1.0 build.
- **Offline workout logging queue (planned/in-progress for 1.0):** Queues newly logged sets and session-exercise creates on-device when offline and replays them on reconnect (`docs/decisions/0025-offline-sync.md`, Stage 1). **OWNER TO CONFIRM:** Verify enabled in the 1.0 build.
- **Native haptics (planned for 1.0):** Tactile feedback for the rest timer and workout interactions (`docs/decisions/0021-mobile-app-stack.md`, `docs/DESIGN.md`). **OWNER TO CONFIRM:** Verify which haptic triggers are present in the 1.0 build.
- **Native share sheet for exports (planned for 1.0):** Exports workout CSV and account JSON through the platform share sheet (`docs/DESIGN.md`, `docs/99-current-project-state.md`). **OWNER TO CONFIRM:** Verify native share plugin is wired in the 1.0 build.
- **Native system bars and safe areas:** Adapts status bar styling to light/dark themes and respects device safe areas (`docs/DESIGN.md`).
- **Interactive 3D body figure and muscle-volume map:** Local GLB 3D rendering for weekly muscle volume (`docs/99-current-project-state.md`, `docs/DESIGN.md`).

## Reviewer contact details

- **Name:** `OWNER TO CONFIRM: Controller/developer full name`
- **Email:** `OWNER TO CONFIRM: Support or review contact email`
- **Phone:** `OWNER TO CONFIRM: Phone number for App Review`
