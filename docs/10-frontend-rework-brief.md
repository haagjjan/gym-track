# Frontend Rework Brief — Gym Progress Tracker

**For:** Claude Fable 5, run via Claude Code
**Scope:** Complete frontend rework. This is a from-scratch redesign, not a refactor or incremental improvement.

## Mission

The backend (Fastify API, Kysely, Postgres) is stable and stays as-is. The current Next.js frontend is functionally complete but visually bad — it needs to be thrown out and rebuilt from zero with a new design direction. You have full creative freedom on layout, components, and styling. Nothing about the current UI's *look* is worth preserving. Its *functionality* is.

## Scope & Boundaries

- **In scope:** everything under the Next.js frontend app (pages, components, styling, client-side data fetching).
- **Out of scope:** the Fastify API, Kysely queries, DB schema, and any API contracts. Consume existing endpoints exactly as they are. If a page needs data the API doesn't currently provide, flag it — don't add backend endpoints without asking.
- Current styling is plain global CSS imported in Next.js. That's being replaced entirely — see Phase 1.

## Design Direction: Aether Fitness System

The full design system — colors, typography, spacing, elevation, shape, and component rules — is defined in `docs/DESIGN.md`. **Treat it as the source of truth, not this summary.** Read it in full before Phase 1.

Summary for orientation: "Futuristic Minimalism" with Glassmorphism/HUD influence — a dark "body cockpit" aesthetic. Deep obsidian surfaces (`#0A0A0A`/`#131313` range), electric cyan as the sparingly-used primary accent, soft lavender for secondary/recovery data, neon green for peak-performance/success states. Space Grotesk for headings and labels, JetBrains Mono for all numeric data so values don't cause layout shift. Depth comes from `backdrop-filter: blur()` and glass borders rather than shadows; interactive elements get a cyan/green outer glow. Base radius 4px on small components, 12px on cards — "soft-tech," not sharp, not rounded-friendly.

- **Explicit non-goals:** no playful/rounded consumer-app aesthetic, no flat/matte design without glow or blur, no bright multi-color "fun" palette outside the three defined accents.
- **The 3D avatar is the core of this design, not a widget.** `DESIGN.md` treats it as the layout's central pillar on desktop (upper third on mobile) — everything else docks around it. Because it's this central, it gets validated in isolation *before* any full page layout is built around it. See Phase 1.

## Reference Material

Three concept images live at `docs/design-refs/` — look at all three before Phase 1, but treat them differently:

- **`dashboard-fused-concept.png` — canonical target for Phase 2.** This is the closest thing to a finished spec: sidebar nav, the static avatar-on-pedestal centered with thin connector lines running from each data card to a point on the body, session list, biometric panel. Reproduce this as closely as possible, not just "in the spirit of" it. The connector-line treatment is its own component — leader lines anchored to card edges and body landmarks — call it out explicitly so it doesn't get simplified away into plain unconnected cards.
- **`home-screen-wireframe.png`**: superseded visually by the fused concept above, but keep it for its annotation structure (screen purpose, primary actions) — that's the origin of the Screen Spec Template below.
- **`dashboard-concept.png`**: earlier pass, superseded by the fused concept. Kept for reference only.
- **`whoop.com`**: reference for data density and legibility on a dark surface.
- **`vertex3d.asia`**: reference for interaction quality only (camera movement, sense of depth) — not an asset-fidelity target.

**Open decision — navigation paradigm:** the two screenshots use different nav patterns (persistent sidebar vs. hamburger menu). Pick one deliberately in Phase 2 rather than letting it get merged inconsistently across pages.

## Screen Spec Template

Use this template for every screen — both in the Phase 0 checklist and later when specifying new work. Keep entries short; this is a contract, not prose.

```
### [Screen Name]
Screen purpose:
Primary user actions:
Displayed data:
Interactions:
Empty state:
Loading state:
Mobile constraints:
Implementation notes:
```

## Process (four phases, to keep this controllable)

**Phase 0 — Inventory (do this first, always)**
Read the current frontend and produce a checklist of every existing page using the Screen Spec Template above — one filled-out block per page, based on what the current (ugly but functional) frontend actually does. This is the functionality contract for the rest of the project — nothing on this list should be lost in the rework. Alongside it, give me a short proposed tech stack (framework, styling approach — no default preference, pick what fits) with a one-paragraph justification. Show me both together before moving on to anything else.

**Phase 1 — 3D avatar spike (isolated, before any page layout)**
This is the highest-risk, most central piece of the design — validate it in isolation before it gets baked into real pages. Build a minimal standalone scene using the idiomatic real-time-3D approach for whatever framework you chose in Phase 0 (react-three-fiber if you stayed in React/Next.js; the equivalent for anything else — e.g. Threlte for Svelte, TresJS for Vue, or plain three.js if you're not in a component framework at all). If your framework needs SSR-safety handling for a WebGL canvas (Next.js does — client component, dynamic import with `ssr: false`), account for it.

Concrete plan: the asset already exists — `futuristic+humanoid+3d+model.fbx`, generated in Tripo AI (~50K faces, HD Model). **Don't rig it.** It's in a double-bicep flex pose, not a T/A-pose, which makes skeletal rigging risky (bind pose gets baked into the flex, distorts under other animations). It's also untextured, which is fine — we're not using its surface detail.

Instead, treat it as a **static trophy statue on a pedestal**, matching the framing in `docs/design-refs/home-screen-wireframe.png` directly: no skeleton, no walk/idle animation loop. Reactivity comes from two things instead: a slow camera orbit/turntable around the static mesh, and a stylized shader — matte dark base material, cyan fresnel/rim-light glow along the silhouette — whose intensity, color, or particle effects respond to real data (e.g. glow intensity tied to a readiness score, a particle burst or color shift on a mock "PR hit" event). This proves the data-reactive concept without needing rigging to succeed. Skeletal rig + a literal flex-on-PR animation is a fine v2 idea later, not a Phase 1 requirement.

File handling: the asset is currently at the repo root as `futuristic+humanoid+3d+model.fbx`. First step of Phase 1 — relocate it into the frontend app's public directory (find the correct path in the monorepo, likely something like `apps/frontend/public/models/avatar/`) and rename it to something simpler, e.g. `avatar-base.fbx` — no `+` characters. Load it with `@react-three/drei`'s `useGLTF`/FBX loader. Screenshot it, self-check against `DESIGN.md` and `docs/design-refs/home-screen-wireframe.png`, and stop. Also flag bundle size and mobile performance — this needs to lazy-load and stay usable on a phone at the gym, not just look good on your dev machine.

I will review this before anything else proceeds. If it doesn't land, we adjust the concept here — cheaply — rather than after Phase 2.

**Phase 2 — Concept screens (stop here for review)**
Before writing any new component: archive the existing frontend UI code. Move current components/pages/styles into a clearly separate `_legacy-reference/` folder outside the active app (not deleted — the Phase 0 checklist still needs a source of truth for edge cases), so there is nothing left in the live app to adapt or incrementally edit. This is a rebuild, not a refactor — the old files should only ever be consulted for "what does this actually compute," never copied from for structure or styling.

`DESIGN.md` already defines a full token system (colors, type scale, radius, spacing) — implement it using the styling approach you proposed in Phase 0.

`docs/design-refs/dashboard-fused-concept.png` is the target for the main screen — reproduce it as closely as possible, not just "in the spirit of" it: sidebar nav, the static avatar centered on its pedestal, connector lines running from each data card to a point on the body (build this as its own component — leader lines anchored to card edges and body landmarks, not plain unconnected cards), session list, biometric panel. Build this screen plus one detail/logging view. Render and screenshot them, self-check against both `DESIGN.md` and the reference image, and stop. I'll review before you touch anything else.

**Phase 3 — Full implementation**
Once I approve the direction, rebuild every page/component from the Phase 0 checklist in the new system. No functional regressions versus that checklist.

## Working Conventions

- Branch: `frontend-rework-fable5`
- Frontend framework and libraries are your call — Next.js isn't a hard requirement, pick whatever fits this job best (data-dense dashboard, one real-time 3D scene, gym-adjacent mobile use). If you propose switching away from it, state the choice and a brief justification as part of Phase 0, and account for how it affects the pnpm workspace and the Docker build. Whatever you pick still consumes the existing Fastify API as-is and lives inside the pnpm monorepo.
- Commit logically (per page or component group), not as one giant diff.

## Definition of Done

- Every page/flow from the Phase 0 checklist exists in the new design.
- No data or functionality regressions.
- Visually and structurally matches `docs/DESIGN.md`, including a working 3D avatar element — verified by your own screenshot self-review, not just described.

---

## Kickoff prompt (paste this into Claude Code, in the repo root, on the `frontend-rework-fable5` branch — also drag `dashboard-fused-concept.png` directly into the chat, don't rely on the file path alone)

> Read `docs/10-frontend-rework-brief.md`, `docs/DESIGN.md`, and everything in `docs/design-refs/` before doing anything else. This is a from-scratch rebuild, not a refactor — once Phase 0 is confirmed, the existing frontend code gets archived out of the active app, not adapted. Start with Phase 0 only: inventory the current frontend using the Screen Spec Template, and propose a tech stack with a brief justification. Don't touch any code yet. Stop after both so I can confirm before you move on.
