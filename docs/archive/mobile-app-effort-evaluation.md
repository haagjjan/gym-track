# Mobile App Effort Evaluation

**Assessed:** 2026-10-13
**Status:** Rough planning estimate, not an approved implementation decision or delivery commitment.

## Scenario assessed

The proposed first release is a public iPhone app for Swiss residents, with open account registration. An Android app, including Samsung phones, would follow. The mobile app would offer all user-facing web features and match the dashboard and muscle-view 3D interactions. Workout logging would work offline: a signed-in user could use a cached exercise catalog, start a workout, log and edit sets, and finish it; the workout would sync when connectivity returns. Other features may require a connection. Owner/admin tools and CSV import/export would remain on the web. The estimate excludes payments, wearables, and other new device features.

This is a substantial expansion of the current [MVP requirements](../01-requirements.md), which specify responsive mobile web and place a native mobile app outside MVP scope.

## Complexity assessment

The existing Fastify API, PostgreSQL model, workout rules, and some TypeScript business logic are reusable. The interface itself would require significant mobile work. The Next.js app uses server-side authentication and same-origin API routes ([implementation pattern](../07-implementation-pattern.md), [access architecture](../decisions/0011-secure-single-owner-external-access.md)); these cannot simply be bundled as static phone assets. [Next.js documents](https://nextjs.org/docs/app/guides/static-exports) that static exports do not support request-dependent route handlers or cookies.

Offline workout logging is the largest data risk. It needs durable local storage, a cached catalog, retry-safe synchronization, and a visible resolution when the same workout changes on another device. Existing exercise and set creates already carry client mutation IDs, but set updates and exercise reorders are last-write-wins, with no workout revision protocol ([ADR 0014](../decisions/0014-idempotent-workout-mutations.md)). An unfinished set draft in browser storage is not a complete offline workout store.

Matching the 3D views adds device-specific rendering, asset, gesture, accessibility, and performance work. React Three Fiber [supports React Native](https://r3f.docs.pmnd.rs/getting-started/installation), but its documentation calls for testing on a physical iPhone; the effort to reproduce this project's scenes and shaders remains uncertain.

Public open registration also changes the current invitation-only, 50-account admission model ([ADR 0012](../decisions/0012-curated-public-beta-access.md)). Keeping the intended Swiss-resident audience requires review of eligibility, published policy wording, support capacity, and the existing [jurisdiction decision](../decisions/0016-founding-beta-jurisdiction-scope.md). Store distribution adds device QA, signing, review materials, privacy disclosures, and account-deletion access. Apple expects a functional review account for apps with login and an in-app path to initiate account deletion ([App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [account deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/)).

## Effort estimate

| Release | Rough engineering effort | Calendar time for one builder at 15–20 focused hours/week |
| --- | ---: | ---: |
| Public iPhone app | 1,500–2,500 hours | Approximately 18–36 months |
| Android app after iPhone | Additional 250–450 hours | Approximately 3–7 additional months |

These ranges include investigation, application and API work, offline synchronization, 3D adaptation, testing, and initial store release work. They assume a shared cross-platform mobile codebase and sustained part-time availability. Calendar figures are rounded planning ranges, not a guaranteed conversion from hours; interruptions and store review can extend them. The estimates exclude ongoing maintenance, hosting, store memberships, and external legal or design costs. Confidence is limited until offline sync and physical-device 3D performance are proven.

As of this assessment, the [Apple Developer Program](https://developer.apple.com/help/account/membership/program-enrollment/) lists US$99 per membership year, and [Google Play Console](https://support.google.com/googleplay/android-developer/answer/6112435) lists a US$25 one-time registration fee. New Google Play personal developer accounts may also need a closed test with 12 opted-in testers for 14 continuous days before production access ([Play Console requirements](https://support.google.com/googleplay/android-developer/answer/14151465)). Platform sources were checked on 2026-10-13.
