# Founding Beta Launch Gates

The beta may be promoted only after every blocker is checked with linked evidence. “Implemented” is not evidence that an external system or policy is operational.

## External/legal blockers

- [ ] Real controller legal name and postal address configured.
- [ ] Dedicated support, privacy and security email addresses configured and tested; API `SUPPORT_EMAIL` matches the published web support contact and Resend reply-to.
- [ ] Final support provider and every processor/region/transfer/retention recorded.
- [x] Swiss FADP applicability, justification per processing category, sensitive-data analysis, Terms/liability/no-medical-advice, shared contributions and voluntary support are assessed and accepted by the controller. Scope is Switzerland-only per ADR 0016. Evidence: [signed legal-risk acceptance](../goal-2/legal-risk-acceptance.md). This is self-assessment rather than counsel review and becomes void on any recorded trigger. Provider transfer documents remain under the processor gate above.
- [x] Full DPIA completed, approved by the controller on 2026-08-10 and assigned a review date. Evidence: [DPIA](../goal-2/dpia.md).
- [ ] Final rendered Privacy, Terms, Cookie/Storage, Support and beta-limitations pages match production behavior and are version archived.
- [ ] Bundled FBX models have documented redistribution terms and required attribution, or are removed/replaced before public delivery; [NOTICE](../../../../NOTICE) matches the delivered asset set.

## Production systems

- [ ] `REGISTRATION_MODE=INVITE_ONLY`; `DISABLED` emergency change rehearsed.
- [ ] First real user has `role=ADMIN` through a controlled migration/operator procedure; no email inference.
- [ ] Admission settings read cap 50, approvals/day 10, and all three runtime controls work.
- [ ] Cloudflare private gate remains until unauthenticated direct API signup cannot bypass invite admission.
- [ ] BFF/API share a 32+ character `BFF_CLIENT_IP_SECRET`; forged browser headers fail attribution tests and direct non-health requests to the API hostname return `BFF_REQUIRED`.
- [ ] Resend domain verified; SPF, DKIM and DMARC pass; bounce/complaint monitoring and suppression owner assigned.
- [ ] Invite, verification, reset, deletion and cancellation black-box emails pass HTML/plain/link/expiry tests.
- [ ] Telegram alert contains only reference and timestamp; approval works only in authenticated admin.
- [ ] `status.gymtrack.ch` is deployed independently with TLS and an incident publication rehearsal.
- [ ] Optional support URL, if configured, has approved provider terms and voluntary/no-benefit wording.

## Data lifecycle and recovery

- [ ] Production/browser inspection matches the processing inventory exactly.
- [ ] Export completeness and cross-user isolation pass.
- [ ] Grace-period lock, link cancellation, admin support cancellation and idempotent final erasure pass.
- [ ] Shared exercise deletion/anonymization passes with both referenced and unreferenced fixtures.
- [ ] Strict wall-clock 30-day Restic expiry/prune run is recorded; local dump expiry is seven days.
- [ ] Restore an older snapshot in isolation, obtain the newest valid erasure ledger separately, replay it, and prove erased IDs are absent before opening network access.
- [ ] Recovery runbook explicitly forbids reopening before erasure replay.

## Security, quality and capacity

- [ ] Security review covers authorization/IDOR, admin, cap races, invite reuse/expiry, CSRF, brute force, enumeration, feedback XSS, deletion, headers and log/metric leakage.
- [ ] At least 20 concurrent active loggers and 2× measured peak pass with recorded write latency, connections, disk growth, failure and overload behavior.
- [x] Full `pnpm check`, API DB integration, migration up/down, build, performance and Chromium/Firefox Playwright pass for the exact staging release. Evidence: [Goal 3 staging report](../goal-3/goal-3-staging-report.md). Production-specific black-box, capacity and device gates remain separate below and above.
- [ ] 390 px, 430 px, 1440 px and Samsung S22 Plus Firefox/mobile-data workflow pass.
- [ ] Keyboard, screen-reader, focus, touch, reduced-motion, mobile keyboard and popover checks pass.
- [ ] Rollback, database restore/ledger replay, signup pause, campaign pause, incident notice and email outage rehearsals pass.

## Rollout stop rules

Start with 10 invitations and observe 72 hours. Never approve more than 10 in a rolling 24-hour window. Stop immediately for P0/P1, isolation/deletion failure, unavailable recovery email, failed backups, unexplained workout writes, or measured capacity breach. Resume only with documented cause, remediation, verification and owner approval.
