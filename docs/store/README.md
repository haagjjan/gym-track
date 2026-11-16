# Store readiness drafts

> **Draft notice:** Every file in `docs/store/` is a draft prepared from repository documentation. The owner must review all copy, legal/privacy disclosures, `OWNER TO CONFIRM` items, and build capabilities against the final 1.0 binary before submitting to Apple App Store Connect or Google Play Console.

## Files in this folder

- `listing-copy.md`: App Store and Google Play store listing text with character counts.
- `apple-privacy-labels.md`: Draft answers for App Store "App Privacy" declarations.
- `play-data-safety.md`: Draft answers for the Google Play Data safety form.
- `age-rating-and-availability.md`: Proposed Apple age-rating and Play IARC answers, target audience, and Switzerland-only store availability.
- `review-notes.md`: Reviewer instructions, demo account placeholder, deletion path, native functionality summary, and contact placeholder.

## Owner-only checklist before submission

- [ ] **Apple Developer Program:** Enroll and pay the annual fee (US$99/year, per `docs/decisions/0021-mobile-app-stack.md`), and register bundle ID `ch.gymtrack.app`.
- [ ] **Google Play Console:** Create the developer account (US$25 one-time, per `docs/decisions/0021-mobile-app-stack.md`) and register package `ch.gymtrack.app`.
- [ ] **Google Play closed test:** Complete the mandatory 12-tester, 14-day closed test required for new personal Play developer accounts (`docs/decisions/0021-mobile-app-stack.md`, `docs/99-current-project-state.md`).
- [ ] **App signing and credentials:** Configure iOS distribution certificates/provisioning profiles and Android upload key / Play App Signing.
- [ ] **Production mobile API readiness:** Confirm `apps/api` is routed for mobile clients (`app.gymtrack.ch/api/v1/*`), `ENABLE_MOBILE_TOKEN_AUTH` is enabled, and IDOR/security checks pass on the bearer-token path (`docs/decisions/0023-mobile-token-auth.md`).
- [ ] **Real-device verification and screenshots:** Run the 1.0 build on physical iOS and Android devices (3D body figure frame rate, thermal behavior, offline set queue, Keychain/Keystore token storage, native share sheet for exports) and capture store screenshots from real builds (`docs/99-current-project-state.md`, `docs/decisions/0021-mobile-app-stack.md`).
- [ ] **DPIA re-assessment for open signup:** Review and update `docs/beta-process/public-beta/goal-2/dpia.md` and `docs/beta-process/public-beta/goal-1/data-processing-inventory.md` for open public registration (ADR 0022) and mobile app processing.
- [ ] **Public URLs:** Verify that `https://app.gymtrack.ch/privacy`, `https://app.gymtrack.ch/terms`, and `https://app.gymtrack.ch/support` render live with configured controller and contact details, without any `PUBLICATION_BLOCKED` banner (`docs/beta-process/public-beta/goal-2/dpia.md`).
- [ ] **Resolve all `OWNER TO CONFIRM` items:** Replace every placeholder and confirm every ambiguous privacy/rating item across the files in this folder.
