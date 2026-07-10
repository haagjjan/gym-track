# Skill: How To Make UI Polish Change

Use this for focused visual, layout, interaction, responsiveness, and polish work in
the Body Cockpit UI.

## Read First

- `CODEBASE.md`
- `docs/DESIGN.md`
- `docs/11-phase0-frontend-inventory.md`
- `docs/14-ui-polish-and-ops-round-2.md`
- `docs/design/stitch-redesign-v2/design-notes.md`
- The owning feature file under `apps/web/src/features/*`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/ui.tsx`

## Design Rules

- Stay inside the Aether / Body Cockpit direction: obsidian surfaces, cyan primary,
  lavender secondary, green success, red danger, glass borders, subtle glow.
- Keep typography functional: Space Grotesk for headings/labels, JetBrains Mono for
  numeric and data-heavy text.
- Mobile layouts must not horizontally scroll.
- Active workout logging must stay practical and fast, even if the surrounding UI is
  cinematic.
- Use existing Tailwind v4 tokens in `globals.css` before adding new styling.
- Reuse `Panel`, `HudButton`, `Metric`, `Skeleton`, `EmptyState`, and `ErrorState`
  when they fit.
- Do not paste Stitch `code.html` into production code.
- Do not introduce a new UI library for polish.
- Do not change API behavior for a visual polish task unless the requested polish
  clearly requires missing data.

## Workflow

1. Identify the owning screen/feature.
2. Confirm whether the change is an isolated polish item or a behavior change.
3. Check `docs/14-ui-polish-and-ops-round-2.md` for current priority and open decisions.
4. Make the smallest feature-owned change.
5. Check desktop and mobile layout assumptions in the code.
6. Run the focused checks in this file.
7. Summarize visible change, tested commands, and any residual mobile/visual risk.

## Visual QA Targets

- Text does not overflow buttons, panels, nav items, or metric cards.
- Touch targets are large enough on mobile.
- No incoherent overlap between fixed bars, shells, charts, panels, and modals.
- Charts remain readable on mobile and in dense data states.
- 3D/canvas scenes have a sized container and a fallback/loading state.
- No new colors outside the design system unless the docs are updated first.

## Checks

For most UI polish changes:

```sh
pnpm --filter @gym-progress-tracker/web type-check
pnpm lint
git diff --check
```

If auth, routing, active workout logging, history, or progress behavior could regress:

```sh
pnpm start
pnpm smoke:web
pnpm stop
```

For chart-specific work, also exercise the browser console path described in
`docs/09-observability-and-data-structures.md` and check for `pageerror` regressions.
