# Audit appendix: docs classification (Step 7)

Every tracked Markdown file was classified by four `gemini-3.8-flash-medium` workers, checked against the code and the tracked-file list. The main session confirmed 49 of 56 quoted evidence lines verbatim; the other 7 were paraphrased or shortened, and one of those was spot-checked against the code (`REGISTRATION_MODE`). ARCHIVE means `git mv` to `docs/archive/` in Step 12. Nothing gets deleted.

| File | Decision | Reason | Evidence |
|---|---|---|---|
| `ARCHITECTURE.md` | REWRITE | Core architecture doc omitting ADRs 0012-0022 and describing outdated fail-closed registration. | "fail-closed production registration" vs ADR 0022 open registration |
| `CODEBASE.md` | REWRITE | Factual repo map is outdated from 2026-07-04; misses admin features and ADRs 0006-0022. | "reflects the live tree inspected on 2026-07-04" vs current 2026-11-08 tree |
| `CONTRIBUTING.md` | KEEP | Accurate contributing workflow, change gates, ADR rules, and testing expectations. | - |
| `ENGINEERING.md` | KEEP | Authoritative TypeScript and PostgreSQL engineering standards, size limits, and code rules. | - |
| `README.md` | KEEP | Accurate high-level project overview reflecting current public v0 release and open registration. | - |
| `SECURITY.md` | REWRITE | Core security policy needed, but claims application is invitation-only beta with invitation flow. | "The application is in an invitation-only beta." vs ADR 0022 public v0 |
| `design-qa.md` | ARCHIVE | Finished one-off QA check for status compass referencing temporary /tmp artifacts. | "/private/tmp/gymtrack-status-compass-after.png" vs historical QA |
| `docs/00-workflow.md` | ARCHIVE | Historical phased roadmap tracking early project phases up through founding beta launch. | "Admit at most 50 Switzerland-resident ... founding members" vs ADR 0022 |
| `docs/01-requirements.md` | REWRITE | Core requirements doc, but marks mobile app out of scope and draft MVP status. | "- mobile application" under Out of scope vs ADR 0021 Capacitor |
| `docs/02-query-list.md` | REWRITE | Core database query spec, but retains superseded beta waitlist and invitation queries Q23-Q25. | "Q23 generically create/deduplicate a waitlist request" vs ADR 0022 |
| `docs/03-data-model-notes.md` | REWRITE | Core data rules, but contains stale invitation tokens and 50-account beta limits. | "sufficient only for the accepted single-process, 50-account beta" vs ADR 0022 |
| `docs/04-schema-draft.md` | REWRITE | Essential schema reference, but retains superseded beta waitlist and invitation controls. | "beta_settings is the locked singleton for immediate waitlist/invitation" vs ADR 0022 |
| `docs/05-api-contract.md` | REWRITE | Primary REST contract, but early auth/signup schemas contradict ADR 0022 open registration. | "REGISTRATION_MODE accepts only ENABLED, INVITE_ONLY, or DISABLED" vs ADR 0022 |
| `docs/06-implementation-start.md` | ARCHIVE | Finished historical implementation prompt and handoff for initial foundation batches. | "This is the historical implementation handoff for the foundation batches." vs - |
| `docs/07-implementation-pattern.md` | KEEP | Accurate architectural implementation patterns and vertical-slice boundary rules for API and web. | - |
| `docs/08-next-implementation-plan.md` | ARCHIVE | Finished implementation plan and handoff for Goal 1-4 pre-launch verification. | "Goal 4 pre-deployment verification is active" vs public v0 release |
| `docs/09-observability-and-data-structures.md` | KEEP | Comprehensive and accurate reference catalog of system data structures and client diagnostics. | - |
| `docs/10-frontend-rework-brief.md` | ARCHIVE | Finished task brief for earlier frontend rebuild on branch frontend-rework. | "For: Claude Fable 5, run via Claude Code" vs historical brief |
| `docs/11-phase0-frontend-inventory.md` | ARCHIVE | Finished phase deliverable from Phase 0 of earlier frontend rework. | "Status: Confirmed 2026-07-13." vs historical phase output |
| `docs/12-saas-hardening.md` | ARCHIVE | Finished milestone report from 2026-07-03 auth and security hardening pass. | "SaaS Hardening ... (2026-07-03)" vs historical report |
| `docs/13-operator-guide.md` | REWRITE | Daily operations guide, but contains stale Stage 1 single-owner disabled registration settings. | "Stage 1 production is single-owner ... REGISTRATION_MODE=DISABLED" vs ADR 0022 |
| `docs/14-ui-polish-and-ops-round-2.md` | ARCHIVE | Finished task punch list and batch execution brief for UI polish round 2. | "Owner review of the Phase 2 build complete." vs historical task list |
| `docs/15-production-operations-stage-1.md` | ARCHIVE | Finished implementation plan for Stage 1 personal remote testing operations. | "Stage: Personal remote testing" vs current public v0 |
| `docs/16-production-operations-stage-2.md` | ARCHIVE | Finished implementation plan for Stage 2 controlled private beta operations. | "Stage: Controlled private beta" vs current public v0 |
| `docs/17-production-operations-stage-3.md` | ARCHIVE | Superseded Stage 3 broad public release operations planning document. | "Status: Superseded for the first public beta by 18-public-beta-handoff.md" vs - |
| `docs/18-public-beta-handoff.md` | ARCHIVE | Finished handoff for Curated Founding Beta, superseded by public v0. | "invitation-only, and capped at 50 reserved/active seats" vs ADR 0022 |
| `docs/19-web-surface-audit.md` | ARCHIVE | Point-in-time web surface audit report from 2026-08-06. | "Audit date: 2026-08-06" vs historical report |
| `docs/99-current-project-state.md` | ARCHIVE | Historical project state handoff summary from an earlier pre-beta phase. | "Deployment target: Render Blueprint" vs current production host |
| `docs/DESIGN.md` | REWRITE | Outdated Aether design tokens; scheduled to be rewritten from scratch for UI/UX rework. | "docs/DESIGN.md will be rewritten from scratch" per ux-rework |
| `docs/current-system-analysis.md` | REWRITE | Core architecture doc, but describes production as invitation-only beta awaiting Goal 6. | "Production remains invitation-only" vs public v0 open registration |
| `docs/deployment-runbook.md` | REWRITE | Runbook for retained Render deployment, but contains stale disabled registration settings. | "REGISTRATION_MODE |
| `docs/mobile-app-effort-evaluation.md` | ARCHIVE | Superseded rough planning evaluation for native mobile apps, superseded by ADR 0021 Capacitor. | "Rough planning estimate" vs ADR 0021 accepted Capacitor app |
| `docs/repository-structure.md` | KEEP | Accurate and detailed repository directory and file ownership map. | - |
| `docs/server/GRAFANA-DASHBOARD-GUIDE.md` | KEEP | Active operational guide for Grafana dashboards and metric triage | - |
| `docs/server/SERVER-SETUP-INDEX.md` | ARCHIVE | Historical coordination index for completed Waves A, B, and C | L5: "Current phase: Wave C complete" |
| `docs/server/SERVER-TOOLS.md` | REWRITE | Operational tool reference containing stale pre-deployment status | L7: "no application repository has been deployed to the server yet" vs deployed production stack |
| `docs/server/disaster-recovery.md` | REWRITE | Active DR runbook containing stale private-only scope and superseded gating assumptions | L5: "recovery of the private gym-prod service" vs public v0 production |
| `docs/server/reports/01-host-baseline-audit-report.md` | ARCHIVE | Historical audit report for completed Stage 1 host baseline | L10: "The Stage 1 baseline audit completed successfully." |
| `docs/server/reports/02-os-admin-foundation-report.md` | ARCHIVE | Historical execution report for completed Stage 2 OS administration | L10: "Stage 2 completed successfully." |
| `docs/server/reports/03-access-network-hardening-report.md` | ARCHIVE | Historical execution report for completed Stage 3 network hardening | L11: "Stage 3 completed successfully" |
| `docs/server/reports/04-docker-platform-report.md` | ARCHIVE | Historical execution report for completed Stage 4 Docker engine verification | L11: "Stage 4 completed successfully." |
| `docs/server/reports/05-server-filesystem-and-repository-report.md` | ARCHIVE | Historical execution report for completed Stage 5 filesystem layout | L11: "Stage 5 completed successfully." |
| `docs/server/reports/06-postgresql-foundation-report.md` | ARCHIVE | Historical execution report for completed Stage 6 PostgreSQL container foundation | L11: "Stage 6 completed successfully." |
| `docs/server/reports/07-gym-tracker-deployment-report.md` | ARCHIVE | Historical execution report for completed Stage 7 application deployment | L12: "Stage 7 completed successfully." |
| `docs/server/reports/08-reverse-proxy-and-private-lan-access-report.md` | ARCHIVE | Historical execution report for completed Stage 8 Caddy reverse proxy deployment | L14: "Stage 8 completed successfully." |
| `docs/server/reports/09-monitoring-and-grafana-report.md` | ARCHIVE | Historical execution report for completed Stage 9 Prometheus and Grafana deployment | L11: "Stage 9 completed successfully." |
| `docs/server/reports/10-logging-and-alerting-report.md` | ARCHIVE | Historical execution report for completed Stage 10 logging and Alertmanager setup | L11: "Stage 10 completed successfully." |
| `docs/server/reports/11-backup-restore-and-disaster-recovery-report.md` | ARCHIVE | Historical execution report for completed Stage 11 Restic backup and restore verification | L11: "Stage 11 completed successfully." |
| `docs/server/reports/12-secure-remote-administration-report.md` | ARCHIVE | Historical execution report for completed Stage 12 Cloudflare Access SSH setup | L10: "Secure remote administration is operational." |
| `docs/server/reports/README.md` | ARCHIVE | Historical authoring template instructions for finished stage reports | L3: "ToDo: Write one report after each executed stage." |
| `docs/server/reports/jv-production-data-migration-report.md` | ARCHIVE | Historical execution report for one-time production database migration | L6: "Result: Completed and verified" |
| `docs/server/restore-full-service.md` | REWRITE | Active disaster recovery runbook containing stale private-LAN-only routing notes | L42: "external tunnel require a separate future decision" vs active Cloudflare tunnel |
| `docs/server/restore-postgresql.md` | KEEP | Active, accurate isolated PostgreSQL database restoration runbook and validation checklist | - |
| `docs/server/wave-a-host-fundation/01-host-baseline-audit.md` | ARCHIVE | Historical finished execution plan for Stage 1 baseline audit | Completed in Wave A |
| `docs/server/wave-a-host-fundation/02-os-admin-foundation.md` | ARCHIVE | Historical finished execution plan for Stage 2 OS admin foundation | Completed in Wave A |
| `docs/server/wave-a-host-fundation/03-access-network-hardening.md` | ARCHIVE | Historical finished execution plan for Stage 3 access and network hardening | Completed in Wave A |
| `docs/server/wave-a-host-fundation/04-docker-platform.md` | ARCHIVE | Historical finished execution plan for Stage 4 Docker platform installation | Completed in Wave A |
| `docs/server/wave-a-host-fundation/README.md` | ARCHIVE | Historical milestone roadmap for completed Wave A host foundation | L3: "Status: Complete — Stages 1 through 4 verified" |
| `docs/server/wave-b-application-platform/05-server-filesystem-and-repository.md` | ARCHIVE | Historical finished execution plan for Stage 5 server layout and repository setup | Completed in Wave B |
| `docs/server/wave-b-application-platform/06-postgresql-foundation.md` | ARCHIVE | Historical finished execution plan for Stage 6 PostgreSQL foundation | Completed in Wave B |
| `docs/server/wave-b-application-platform/07-gym-tracker-deployment.md` | ARCHIVE | Historical finished execution plan for Stage 7 application deployment | Completed in Wave B |
| `docs/server/wave-b-application-platform/08-reverse-proxy-and-private-lan-access.md` | ARCHIVE | Historical finished execution plan for Stage 8 reverse proxy and LAN access | Completed in Wave B |
| `docs/server/wave-b-application-platform/README.md` | ARCHIVE | Historical milestone roadmap for completed Wave B application platform | L3: "Status: Complete — Stages 5 through 8 verified" |
| `docs/server/wave-c-operations-dashboard/09-monitoring-and-grafana.md` | ARCHIVE | Historical finished execution plan for Stage 9 monitoring and Grafana deployment | Completed in Wave C |
| `docs/server/wave-c-operations-dashboard/10-logging-and-alerting.md` | ARCHIVE | Historical finished execution plan for Stage 10 logging and alerting configuration | Completed in Wave C |
| `docs/server/wave-c-operations-dashboard/11-backup-restore-and-disaster-recovery.md` | ARCHIVE | Historical finished execution plan for Stage 11 backup and restore pipeline | Completed in Wave C |
| `docs/server/wave-c-operations-dashboard/README.md` | ARCHIVE | Historical milestone roadmap for completed Wave C operations dashboard | L3: "Status: Complete — Stages 9, 10, and 11 verified" |
| `docs/beta-process/private-beta-1/private-beta-1-eval.md` | ARCHIVE | Empty evaluation file from historical private beta 1 | - |
| `docs/beta-process/private-beta-1/private-beta-1-remediation.md` | ARCHIVE | Completed remediation matrix for private beta 1 issues | - |
| `docs/beta-process/private-beta-1/private-beta-1-report.md` | ARCHIVE | Historical black-box device test report from August 2026 | - |
| `docs/beta-process/public-beta/goal-1/data-processing-inventory.md` | REWRITE | Active processing inventory; waitlist and invite processing rows are stale under ADR 0022 | line 29: "Waitlist |
| `docs/beta-process/public-beta/goal-1/dpia-screening.md` | ARCHIVE | Initial screening superseded by full DPIA in goal-2/dpia.md | - |
| `docs/beta-process/public-beta/goal-1/goal-1-remediation-report.md` | ARCHIVE | Finished repository remediation report for Goal 1 from August 2026 | - |
| `docs/beta-process/public-beta/goal-1/gym-tracker-operational-readiness-audit.md` | ARCHIVE | Historical operational readiness audit report from August 2026 | - |
| `docs/beta-process/public-beta/goal-1/launch-gates.md` | ARCHIVE | Completed Founding Beta launch checklist with all 29 gates closed | - |
| `docs/beta-process/public-beta/goal-1/operational-readiness-audit.md` | ARCHIVE | Historical pre-beta operational readiness audit report from August 2026 | - |
| `docs/beta-process/public-beta/goal-1/retention-and-erasure-runbook.md` | REWRITE | Operational erasure/restore runbook is active, but waitlist/invitation lifecycle is stale | line 5: "expires invitations... removes pending waitlist records after 180 days" vs ADR 0022 open registration |
| `docs/beta-process/public-beta/goal-1/security-review.md` | ARCHIVE | Historical security review closed on 2026-08-27 for gate SQC-1 | - |
| `docs/beta-process/public-beta/goal-2/availability-and-support-commitments.md` | ARCHIVE | Historical pre-launch drafting notes and commitments for Goal 2 | - |
| `docs/beta-process/public-beta/goal-2/dpia.md` | REWRITE | Formal DPIA needed, but 50-seat cap and invite-only approval are stale under ADR 0022 | line 26: "Scale |
| `docs/beta-process/public-beta/goal-2/goal-2-decision-record.md` | ARCHIVE | Historical decision record for Goal 2 that is not an ADR | - |
| `docs/beta-process/public-beta/goal-2/goal-2-external-actions.md` | ARCHIVE | Finished operator checklist for Goal 2 items from August 2026 | - |
| `docs/beta-process/public-beta/goal-2/jurisdiction-scope-changes.md` | ARCHIVE | Completed copy change specification for Switzerland-only waitlist copy | - |
| `docs/beta-process/public-beta/goal-2/legal-risk-acceptance.md` | ARCHIVE | Historical signed legal risk acceptance specific to 50-account Founding Beta | - |
| `docs/beta-process/public-beta/goal-2/processor-inventory-final.md` | REWRITE | Active processor inventory needed, but invitation email handling is stale under ADR 0022 | line 29: "invitations, verification, password reset" vs ADR 0022 open registration |
| `docs/beta-process/public-beta/goal-2/public-repository-plan.md` | ARCHIVE | Finished plan and risk assessment for making the repository public | - |
| `docs/beta-process/public-beta/goal-2/staging-environment-spec.md` | ARCHIVE | Finished environment specification for Goal 3 staging deployment on gym-prod | - |
| `docs/beta-process/public-beta/goal-2/tripo-fbx-license-evidence.md` | KEEP | Accurate and useful CC BY 4.0 license evidence cited by NOTICE for avatar models | - |
| `docs/beta-process/public-beta/goal-3/goal-3-staging-report.md` | ARCHIVE | Finished staging execution and verification report for Goal 3 | - |
| `docs/beta-process/public-beta/goal-4/goal-4-production-verification.md` | ARCHIVE | Finished verification report for Goal 4 from August 2026 | - |
| `docs/beta-process/public-beta/goal-5/goal-5-execution-pack.md` | ARCHIVE | Finished parallel launch gate closure procedures for Goal 5 | - |
| `docs/beta-process/public-beta/goal-5/goal-5-scope.md` | ARCHIVE | Finished production verification report and scope for Goal 5 | - |
| `docs/beta-process/public-beta/goal-5/manual-qa-script.md` | ARCHIVE | Completed manual QA script for closed gates SQC-7 and SQC-8 | - |
| `docs/beta-process/public-beta/goal-5/sqc-9-rehearsals.md` | ARCHIVE | Finished emergency control and outage rehearsal report for SQC-9 | - |
| `docs/beta-process/public-beta/goal-structure.md` | ARCHIVE | Historical goal declaration and roadmap for Founding Beta Goals 0–6 | - |
| `docs/status/2026-10-21-status-showcase.md` | ARCHIVE | Historical status showcase rollout handoff from October 2026 | - |
| `docs/status/SWE-Reports/Statusupdate-Whiteboxtesting.md` | ARCHIVE | Historical white-box testing status update from May 2026 | - |
| `docs/status/SWE-Reports/technical-review-2026-07.md` | ARCHIVE | Historical technical due-diligence review from July 2026 | - |
| `docs/status/production-readiness/privat-beta-readiness.md` | ARCHIVE | Historical MVP readiness review prior to private beta | - |
| `docs/status/production-readiness/server-status-gym-prod.md` | ARCHIVE | Historical server handoff document from July 2026 | - |
| `docs/status/production-readiness/stage-1-secure-external-access-plan.md` | ARCHIVE | Finished implementation plan for single-user Stage 1 external access | - |
| `docs/status/production-readiness/stage-1-step-by-step-plan.md` | ARCHIVE | Finished step-by-step execution plan for Stage 1 external access | - |
| `.github/pull_request_template.md` | KEEP | Standard PR checklist adhering to repository documentation, ADR, and quality guardrails | - |
| `_legacy-reference/README.md` | KEEP | Explains legacy frontend reference directory purpose, boundaries, and deletion milestone accurately | - |
| `apps/web/public/volume/README.md` | KEEP | Authoring guide and projection rules for active 3D volume muscle region SVGs | - |
| `docs/Usability_Audit/performance-audit-v1.md` | ARCHIVE | Historical performance audit report and baseline notes from early V1 cleanup | line 5: "Implemented pure-function algorithmic regression coverage for the current cleanup baseline." |
| `docs/Usability_Audit/usability-audit-v1.md` | ARCHIVE | Empty placeholder file from initial historical usability audit pass | File is empty |
| `docs/Usability_Audit/usability-audit-v2.md` | ARCHIVE | Historical usability audit superseded by audit v3 and v4 | line 3: "this audit is the V1 gym-use source of truth" vs superseded by v3/v4 |
| `docs/Usability_Audit/usability-audit-v3.md` | ARCHIVE | Historical usability audit superseded by audit v4 | line 3: "this audit supersedes audit v2" vs superseded by v4 |
| `docs/Usability_Audit/usability-audit-v4.md` | ARCHIVE | Historical beta usability audit superseded by the active UI/UX rework | line 3: "latest V1 beta UI source of truth" vs active ux-rework branch |
| `docs/decisions/0001-documentation-workflow.md` | KEEP | Architecture decision record with valid accepted status | - |
| `docs/decisions/0002-application-stack.md` | KEEP | Architecture decision record with valid accepted status | - |
| `docs/decisions/0003-framework-tooling.md` | KEEP | Architecture decision record with valid accepted status | - |
| `docs/decisions/0004-implementation-readiness.md` | KEEP | Architecture decision record with valid accepted status | - |
| `docs/decisions/0005-deployment-target.md` | KEEP | Architecture decision record with valid accepted status | - |
| `docs/decisions/0006-current-muscle-classification-and-template-copy-semantics.md` | KEEP | Architecture decision record with valid accepted status | - |
| `docs/decisions/0007-canonical-exercise-classifications-and-volume-preferences.md` | KEEP | Architecture decision record with valid accepted status | - |
| `docs/decisions/0008-stage-1-private-observability.md` | KEEP | Architecture decision record with valid accepted status | - |
| `docs/decisions/0009-private-home-server-deployment-target.md` | KEEP | Architecture decision record with valid accepted status | - |
| `docs/decisions/0010-encrypted-restic-backups.md` | KEEP | Architecture decision record with valid status noting partial supersession | - |
| `docs/decisions/0011-secure-single-owner-external-access.md` | KEEP | Architecture decision record with valid accepted status | - |
| `docs/decisions/0012-curated-public-beta-access.md` | KEEP | Superseded architecture decision record with accurate status line referencing ADR 0022 | - |
| `docs/decisions/0013-public-beta-privacy-and-erasure.md` | KEEP | Architecture decision record with valid accepted status | - |
| `docs/decisions/0014-idempotent-workout-mutations.md` | KEEP | Architecture decision record with valid accepted status | - |
| `docs/decisions/0015-staging-environment.md` | KEEP | Architecture decision record with valid accepted status | - |
| `docs/decisions/0016-founding-beta-jurisdiction-scope.md` | KEEP | Architecture decision record with valid status noting amendment by ADR 0022 | - |
| `docs/decisions/0017-secure-remote-administration.md` | KEEP | Architecture decision record with valid accepted status | - |
| `docs/decisions/0018-persistent-reverse-backup-tunnel.md` | KEEP | Architecture decision record with valid accepted status | - |
| `docs/decisions/0019-public-status-evidence.md` | KEEP | Architecture decision record with valid accepted status | - |
| `docs/decisions/0020-hands-on-onboarding-demo.md` | KEEP | Architecture decision record with valid accepted status | - |
| `docs/decisions/0021-mobile-app-stack.md` | KEEP | Architecture decision record with valid accepted status | - |
| `docs/decisions/0022-open-public-registration.md` | KEEP | Architecture decision record with valid accepted status superseding ADR 0012 | - |
| `docs/decisions/README.md` | KEEP | Comprehensive and current ADR index and format authoring guide | - |
| `docs/design-refs/volume-regions-pre-anatomy-rework/README.md` | ARCHIVE | Historical hash manifest and archive documentation for pre-rework 2026-07-13 SVGs | line 3: "archives the runtime muscle-region maps exactly as they existed before the Volume anatomy rework began on 2026-07-13" |
| `docs/design/stitch-redesign-v1/aether_fitness_system/DESIGN.md` | ARCHIVE | Superseded design token specification from early Stitch v1 redesign export | Superseded by current app and ux-rework branch |
| `docs/design/stitch-redesign-v2/design-notes.md` | ARCHIVE | Historical Stitch v2 redesign notes superseded by usability audits and active UI rework | Superseded by usability audits and ux-rework branch |
| `docs/design/stitch-redesign-v2/implementation-roadmap.md` | ARCHIVE | Historical implementation roadmap for finished Stitch v2 redesign phase | Replaced by public v0 release and ux-rework |
| `docs/design/stitch-redesign-v2/screen-index.md` | ARCHIVE | Historical screen index for superseded Stitch v2 mockup export | Replaced by live app routes and ux-rework |
| `ops/backup/README.md` | KEEP | Authoritative operational guide for production backups, restore testing, and reverse SSH tunnel | - |
| `ops/logging/README.md` | KEEP | Operational guide for production container log inspection, audit, rotation, and retention | - |
| `ops/monitoring/README.md` | KEEP | Operational guide for private Prometheus and Grafana monitoring, exporters, and PostgreSQL metrics role | - |
| `ops/production/README.md` | REWRITE | Production operations runbook contains stale framing around Public Beta Goal 4 cutover and founding cohort limitations | line 1: "# Public-Beta Production Operations" vs public v0 with open registration (ADR 0022) |
| `ops/staging/README.md` | REWRITE | Staging runbook contains stale framing around historical Goal 3 delivery gates and reporting | line 1: "# Goal 3 Staging Operations" vs ongoing staging environment (ADR 0015) |
| `ops/status/README.md` | KEEP | Comprehensive specification and runbook for external status and build-evidence GitHub Pages bundle | - |
| `ops/status/showcase-captures.md` | KEEP | Provenance and recapture instructions for committed status page showcase WebP images | - |
