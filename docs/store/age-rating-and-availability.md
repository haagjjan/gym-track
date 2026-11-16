# Age rating and availability

Proposed questionnaire answers, target audience, and store availability for `GymTrack` (`ch.gymtrack.app`). Derived from `docs/decisions/0016-founding-beta-jurisdiction-scope.md`, `docs/decisions/0022-open-public-registration.md`, `apps/web/src/app/privacy/page.tsx`, `apps/web/src/app/terms/page.tsx`, and `docs/beta-process/public-beta/goal-1/data-processing-inventory.md`.

## Store availability

- **Apple App Store:** Switzerland only.
- **Google Play Store:** Switzerland only.
- **Reason (ADR 0016 & ADR 0022):** The service is offered exclusively to adults (18+) who live in Switzerland (`apps/web/src/app/privacy/page.tsx`, `apps/web/src/app/terms/page.tsx`). Swiss FADP is the governing law, avoiding GDPR applicability and multi-jurisdiction legal obligations (`docs/decisions/0016-founding-beta-jurisdiction-scope.md`). Eligibility is self-attested at signup and recorded in `users.adult_attested_at` (`docs/decisions/0022-open-public-registration.md`).

## Target audience

- **Minimum age:** 18+ (adults only, per ADR 0016 and ADR 0022).
- **Google Play Target Audience & Content:** Select **18 and over** only. Do not mark the app as appealing to children.

## Apple App Store age-rating questionnaire

| Topic | Proposed answer | Notes |
|---|---|---|
| Cartoon or fantasy violence | None | — |
| Realistic violence | None | — |
| Sexual content or nudity | None | — |
| Profanity or crude humor | None | — |
| Alcohol, tobacco, or drug use or references | None | — |
| Mature/suggestive themes | None | — |
| Simulated gambling | None | — |
| Horror/fear themes | None | — |
| Medical/treatment information | None | Terms explicitly state the app is not medical advice and does not diagnose, treat, or prevent injury or disease (`apps/web/src/app/terms/page.tsx`). |
| Unrestricted web access | No | Bundled UI only; no embedded general web browser (`docs/decisions/0024-mobile-static-export.md`). |
| User-generated content / social features | OWNER TO CONFIRM | Authenticated users can create custom exercises visible to other authenticated users (`data-processing-inventory.md`, `terms/page.tsx`), with no chat, feed, or public profiles. **OWNER TO CONFIRM:** Whether shared custom exercise definitions require declaring User-Generated Content in App Store Connect. |

- **Expected Apple content rating:** 4+ (or 12+ if shared custom exercises trigger UGC). Note that Apple's content rating reflects in-app content, while the legal eligibility requirement (18+) is enforced by the signup attestation and Switzerland-only store availability.

## Google Play content rating (IARC) questionnaire

| Topic | Proposed answer | Notes |
|---|---|---|
| Category | Health & Fitness / Utility | Strength-training log. |
| Violence, sexuality, language, controlled substances, gambling, fear | No | None present. |
| Users interact or exchange content | OWNER TO CONFIRM | Custom exercises are shared in the authenticated catalog (`data-processing-inventory.md`), but there is no messaging, comments, or user-to-user chat. **OWNER TO CONFIRM:** Confirm whether IARC's user-interaction question applies to shared custom exercise names. |
| Shares user's physical location | No | No location collection. |
| Allows purchasing digital goods | No | Free app, no payments or in-app purchases (`docs/beta-process/public-beta/goal-2/dpia.md`). |
