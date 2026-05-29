# Next Implementation Plan

## Purpose

Use this file to start the next fresh implementation session without replanning the project. This is a handoff plan only; do not implement these blocks unless the user explicitly asks for the next slice.

## Current Status

Not implemented:

- Hosted production credentials, custom domains, first tester launch execution, email verification, and password reset.

## Recommended Next Slice

Start with **Small-Batch Launch Execution**.

Reason: the repo now has core MVP flows, quality gates, Render configuration, safer API logs, clearer Progress/Weekly Volume screens, and a canonical CSV data portability path.

After small-batch launch execution, resume iteration from tester feedback.

## Implementation Blocks

### 1. Hosted production credentials and launch setup

Goal: finish the last operational pieces needed for a small tester batch.

Implement:

- Hosted production credentials and environment values.
- Custom domain decisions, if required before inviting testers.
- First tester launch execution.

Rules:

- Do not commit hosted credentials or production database URLs.
- Keep launch setup aligned with ADR 0005 and the runbook.

Tests/checks:

- Validate deployment and environment values against the runbook.
- Re-run browser smoke checks against the deployed stack before inviting testers.

### 2. Auth hardening follow-up

Goal: close the last product gaps around account access.

Implement:

- Email verification.
- Password reset.

Rules:

- Keep the current owned email/password auth and opaque-session approach unless a new ADR changes it.
- Add any required API/UI contract updates in the same change.

Tests/checks:

- Add focused auth tests for the new flows.
- Run `pnpm check` and the relevant browser smoke coverage.


## Fresh Session Prompt

Use this prompt when starting the next implementation session:

```md
We are continuing the Gym Progress Tracker from the current MVP foundation.

First read:
- AGENTS.md
- README.md
- ARCHITECTURE.md
- ENGINEERING.md
- CONTRIBUTING.md
- docs/git-pipeline.md
- docs/deployment-runbook.md
- docs/repository-structure.md
- docs/00-workflow.md
- docs/02-query-list.md
- docs/03-data-model-notes.md
- docs/04-schema-draft.md
- docs/05-api-contract.md
- docs/07-implementation-pattern.md
- docs/08-next-implementation-plan.md

Implement the next recommended slice only: Small-Batch Launch Execution.

Do not commit hosted credentials, production database URLs, tester personal data, backup artifacts, custom domain changes, or application stack changes.

Before handoff, run relevant checks, confirm `git diff --check`, keep the diff focused, commit, and push.
```
