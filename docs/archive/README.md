# Archive

Finished plans, reports, briefs and handoffs. They record how the project got here and are
not maintained. Where one of them disagrees with the current docs or the code, the current
docs and the code win.

Everything here was moved with `git mv` in November 2026 (UX rework, Step 12), so `git log
--follow <file>` still shows each file's full history. Paths inside the archive mirror their
old place under `docs/`. Links between archived files still work. A few links that were
already broken before the move are left as they were.

The classification behind the move is in
[`../audit-2026-11/docs-classification.md`](../audit-2026-11/docs-classification.md).

## Roadmaps, briefs and phase notes

| File | What it was |
|---|---|
| [`00-workflow.md`](00-workflow.md) | Original phased roadmap up to the founding beta |
| [`06-implementation-start.md`](06-implementation-start.md) | Handoff for the foundation implementation batches |
| [`08-next-implementation-plan.md`](08-next-implementation-plan.md) | Goals 1–4 pre-launch plan |
| [`10-frontend-rework-brief.md`](10-frontend-rework-brief.md) | Brief for the first frontend rebuild (cockpit UI, 3D avatar) |
| [`11-phase0-frontend-inventory.md`](11-phase0-frontend-inventory.md) | Functionality contract from that rebuild's Phase 0 |
| [`12-saas-hardening.md`](12-saas-hardening.md) | Auth, security and analytics hardening report, July 2026 |
| [`14-ui-polish-and-ops-round-2.md`](14-ui-polish-and-ops-round-2.md) | UI polish round 2 task list (hologram bay, volume map, retroactive edits) |
| [`15-production-operations-stage-1.md`](15-production-operations-stage-1.md) | Stage 1 operations plan (personal remote testing) |
| [`16-production-operations-stage-2.md`](16-production-operations-stage-2.md) | Stage 2 operations plan (private beta) |
| [`17-production-operations-stage-3.md`](17-production-operations-stage-3.md) | Stage 3 operations plan, superseded by the founding beta handoff |
| [`18-public-beta-handoff.md`](18-public-beta-handoff.md) | Curated founding beta handoff, superseded by public v0 (ADR 0022) |
| [`19-web-surface-audit.md`](19-web-surface-audit.md) | Web surface audit, August 2026 |
| [`mobile-app-effort-evaluation.md`](mobile-app-effort-evaluation.md) | Early mobile estimate, superseded by ADR 0021 |
| [`design-qa.md`](design-qa.md) | One-off design QA of the status compass |

## Folders

| Folder | What it holds |
|---|---|
| [`beta-process/`](beta-process/) | Private beta 1 feedback, public beta goal reports (goals 1–5), the August peer review. The live GDPR documents (data inventory, retention runbook, DPIA, processor inventory, model licence evidence) stay in `docs/beta-process/public-beta/`. |
| [`server/`](server/) | Home-server build-out: setup index, waves A–C and their reports. The live runbooks stay in `docs/server/`. |
| [`status/`](status/) | Older status, readiness and technical review reports |
| [`Usability_Audit/`](Usability_Audit/) | First usability audit with screenshots |
| [`design/`](design/) | Stitch redesign concepts v1 and v2 (the "Aether" look), replaced by `docs/DESIGN.md` |
| [`design-refs/`](design-refs/) | The first rebuild's fused dashboard concept (`design-ref.png`) and the muscle-region SVGs from before the anatomy rework. The live hologram-bay mood images and muscle anatomy references stay in `docs/design-refs/`. |
| [`Source_Pictures/`](Source_Pictures/), [`UI_Redesign/`](UI_Redesign/) | Early home-screen pictures and Excalidraw sketches |
| [`legacy-reference/`](legacy-reference/) | The old web UI kept as a reference during the first rebuild. Excluded from lint. |
