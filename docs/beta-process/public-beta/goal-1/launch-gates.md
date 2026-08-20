# Founding Beta Launch Gates

The beta may be promoted only after every blocker is checked with linked evidence. “Implemented” is not evidence that an external system or policy is operational.

## External/legal blockers

- [ ] Real controller legal name and postal address configured. The controller approved `Jan Haag, Lerchenstrasse 74, 4059 Basel, Switzerland` and both values are recorded in the version-controlled production environment template. A read-only production check on 2026-08-20 found the deployed Compose sets neither variable, so the live pages would still render the `PUBLICATION_BLOCKED` banner. This is a deployment and rendering verification, not an open decision.
- [ ] Dedicated support, privacy and security email addresses configured and tested; API `SUPPORT_EMAIL` matches the published web support contact and Resend reply-to. The three addresses were configured and tested under Goal 2 item A5 and all reach the controller's inbox. The three-way match is structural rather than a matter of discipline: both services read the same `SUPPORT_EMAIL` name and the API derives `EMAIL_REPLY_TO` from it. The read-only production check on 2026-08-20 found the deployed Compose sets none of these variables, so only the deployed confirmation remains.
- [x] Final support provider and every processor/region/transfer/retention recorded. Evidence: the [processor inventory](../goal-2/processor-inventory-final.md) names Infomaniak Network SA (Geneva) as the support, privacy and security correspondence processor, and records entity/region, personal data touched, transfer basis and retention for Infomaniak, Cloudflare and Resend. Telegram is recorded as carrying no personal data, and controller-operated infrastructure is listed separately as a non-processor relationship.
- [x] Swiss FADP applicability, justification per processing category, sensitive-data analysis, Terms/liability/no-medical-advice, shared contributions and voluntary support are assessed and accepted by the controller. The original acceptance was signed 2026-08-10; the controller reaffirmed it on 2026-08-19 after correcting Cloudflare's scope from metadata-only to application content in transit. Evidence: [legal-risk acceptance](../goal-2/legal-risk-acceptance.md).
- [x] Full DPIA completed and originally approved by the controller on 2026-08-10 with a review date. Version 1.2 corrects Cloudflare's payload-processing scope and was reaffirmed by the controller on 2026-08-19. Evidence: [DPIA](../goal-2/dpia.md).
- [ ] Final rendered Privacy, Terms, Cookie/Storage, Support and beta-limitations pages match production behavior and are version archived.
- [x] Bundled Tripo 3D Free-tier FBX models have documented redistribution terms and attribution. Evidence: archived official pricing around both July 2026 repository-introduction dates applies `CC BY 4.0`; [licence evidence](../goal-2/tripo-fbx-license-evidence.md), [NOTICE](../../../../NOTICE), and the public Support-page attribution record the licence and modifications.

## Production systems

- [ ] `REGISTRATION_MODE=INVITE_ONLY`; `DISABLED` emergency change rehearsed.
- [ ] First real user has `role=ADMIN` through a controlled migration/operator procedure; no email inference.
- [ ] Admission settings read cap 50, approvals/day 10, and all three runtime controls work.
- [ ] Cloudflare private gate remains until unauthenticated direct API signup cannot bypass invite admission.
- [ ] BFF/API share a 32+ character `BFF_CLIENT_IP_SECRET`; forged browser headers fail attribution tests and direct non-health requests to the API hostname return `BFF_REQUIRED`.
- [ ] Resend domain verified; SPF, DKIM and DMARC pass; bounce/complaint monitoring and suppression owner assigned. The sending domain is verified and its DNS records are published through Cloudflare, and the controller is named as the delivery owner in the [production runbook](../../../../ops/production/README.md) with a per-batch and daily Resend dashboard review. Outstanding: received-header evidence that SPF, DKIM and DMARC **align** on a real delivered message from `noreply@send.gymtrack.ch`, which needs a production send. Verified records do not by themselves prove alignment when the From domain and the DKIM `d=` domain differ.
- [ ] Invite, verification, reset, deletion and cancellation black-box emails pass HTML/plain/link/expiry tests.
- [ ] Telegram infrastructure alerts contain no applicant/account data; beta-request Telegram notification variables remain unset, and approval works only in authenticated admin.
- [ ] `status.gymtrack.ch` is deployed independently with TLS and an incident publication rehearsal.
- [x] Optional support URL, if configured, has approved provider terms and voluntary/no-benefit wording. The controller decided on 2026-08-20 not to offer a voluntary-support link for the Founding Beta, so `SUPPORT_URL` stays empty in the production environment template and no provider terms are required. Any later link must carry approved terms and no-benefit wording before it is configured.

## Data lifecycle and recovery

- [ ] Production/browser inspection matches the processing inventory exactly.
- [ ] Export completeness and cross-user isolation pass.
- [ ] Grace-period lock, link cancellation, admin support cancellation and idempotent final erasure pass.
- [ ] Shared exercise deletion/anonymization passes with both referenced and unreferenced fixtures.
- [x] Strict wall-clock 30-day Restic expiry/prune run is recorded; local dump expiry is seven days. Evidence: [Goal 4 production verification](../goal-4/goal-4-production-verification.md), 2026-08-19 maintenance success with no expired snapshots, 13 packs safely repacked, zero unused bytes and a clean 10% repository data read.
- [x] Restore an older snapshot in isolation, obtain the newest valid erasure ledger separately, replay it, and prove erased IDs are absent before opening network access. Evidence: [Goal 4 production verification](../goal-4/goal-4-production-verification.md), older snapshot `a3bc255c` plus separately restored newest-ledger snapshot `8eb83d86`; the installed candidate drill passed on 2026-08-19 and the earlier sanitized host report is `erasure-replay-restore-20260818T162455Z.env`.
- [x] Recovery runbook explicitly forbids reopening before erasure replay. Evidence: candidate runbook SHA-256 `a1226de0...` was installed root-owned, captured by snapshot `8eb83d86`, restored in the 2026-08-19 configuration drill, and states that the newest protected erasure ledger must be replayed before a restored database is reopened.

## Security, quality and capacity

- [ ] Security review covers authorization/IDOR, admin, cap races, invite reuse/expiry, CSRF, brute force, enumeration, feedback XSS, deletion, headers and log/metric leakage.
- [x] At least 20 concurrent active loggers and 2x measured peak pass with recorded write latency, connections, disk growth, failure and overload behavior. Evidence: exact candidate `6b31f98981da266304484fb14c3a18904e279e4c` in production-shaped staging; [Goal 4 production verification](../goal-4/goal-4-production-verification.md) records zero failures at 20 and 40 loggers, workload p95 of 131.87 ms and 263.14 ms across six writes plus one verification read per logger, peak 17 database connections, 532,480 bytes of database growth, bounded CPU/memory, no observed 2x overload and immediate recovery.
- [x] Full `pnpm check`, API DB integration, migration up/down, build, performance and Chromium/Firefox Playwright pass for staged application baseline `6b31f98981da266304484fb14c3a18904e279e4c`. Evidence: the controller reported its exact CI pipeline fully green; its nine-migration ledger is unchanged from the fresh up/down and 16-test integration proof, exact staging migration reported no pending work, both hardened browser projects passed, and focused staging revalidation is recorded in the [Goal 4 production verification](../goal-4/goal-4-production-verification.md).
- [ ] The final policy/configuration commit has a green exact-SHA CI run, its version-controlled production Compose/Caddy invariants pass, and its Privacy, Terms, Cookie/Storage, Support and beta-limitations pages pass focused staging rendering with the approved production values. Unchanged capacity, restore and functional security evidence remains attributable to `6b31f98...` and need not be repeated without an application/database/deployed-topology delta.
- [x] Automated 320 px, 390 px, 430 px and 1440 px responsive checks pass without horizontal overflow on the staged application baseline. Evidence: the controller-reported green exact-SHA CI and hardened Chromium/Firefox run execute `auth-workout-smoke.spec.ts`; the 390 px core workout flow plus eight authenticated routes at 430/1440 px passed without page errors.
- [x] Automated accessibility interaction checks pass on the staged application baseline: WCAG 2 A/AA and 2.1 A/AA axe scans have no serious/critical findings on representative public/authenticated screens; zoom remains enabled; modal initial focus, trap, inert background, Escape and restoration pass; informational popovers remain non-modal and restore focus; reduced motion disables the live status animation; and the 390 px 3D figure accepts vertical scroll plus horizontal orbit gestures.
- [ ] Physical Samsung S22 Plus Firefox/mobile-data full workflow, Android keyboard and touch pass.
- [ ] Manual screen-reader, contrast, reduced-motion and final keyboard/focus review pass on production-shaped rendering.
- [ ] Rollback, database restore/ledger replay, signup pause, campaign pause, incident notice and email outage rehearsals pass.

## Rollout stop rules

Start with 10 invitations and observe 72 hours. Never approve more than 10 in a rolling 24-hour window. Stop immediately for P0/P1, isolation/deletion failure, unavailable recovery email, failed backups, unexplained workout writes, or measured capacity breach. Resume only with documented cause, remediation, verification and owner approval.
