# Muscle region maps — anatomy authoring guide

These SVGs are the source of truth for Volume muscle-region ownership. The 3D shader and
click-picking rasterize the same pixels, so a visible region and a selected region use the
same projection decision. The optional 2D view intentionally continues to use only the front
and back maps. The interactive 3D map is the default Volume experience; users can choose the
lighter 2D front/back map for the current device under **Settings → Cockpit display**.

- `muscle-regions-front.svg` — viewed from the front; image left is anatomical right
  (`world +z`).
- `muscle-regions-back.svg` — viewed from behind; image left is anatomical left
  (`world -z`).
- `muscle-regions-side.svg` — sparse override authored from the anatomical-right side
  (`world +z`); image left is the back (`world -x`) and image right is the front
  (`world +x`). Runtime projection mirrors it for the anatomical-left side.

All three files use `viewBox="0 0 660 1024"`. `y=0` is the head top, `y=1024` is the
feet line, and `x=330` is the center of the active projection.

## Runtime interaction and performance

- Clicking an already-selected region deselects it in both 3D and 2D.
- The 3D `FRONT` and `BACK` controls use the same damped camera path as muscle focus;
  reduced-motion preferences still apply the goal immediately.
- The 3D canvas renders on demand instead of running continuously at the display refresh
  rate. Static views therefore use no ongoing render loop, and device pixel ratio is capped
  at `1.35` to bound fragment-shader cost on high-density phones.

## Live authoring loop

1. Start the web dev server and open `/muscle-spike`; the route is development-only and
   needs no login.
2. Use the `FRONT`, `BACK`, or `SIDE` authoring-template control for an exact orthographic
   model view. The equivalent console hook is `__muscleSpikeTemplate('front')` (also
   accepts `'back'`, `'side'`, or `null`).
3. Switch to `DEBUG_REGIONS` to inspect ownership, or use `CLAY` with one selected region
   to judge its boundary against the model's muscle relief.
4. Edit the SVG and run `await __muscleSpikeReloadMaps()` to re-fetch and rasterize all
   three files without rebuilding.
5. Check front, back, both sides, and front/rear three-quarter views. Confirm bilateral
   symmetry, continuous seams, neighboring-region ownership, and neutral joints/fists/feet.
   The `REVIEW_ORBIT` controls snap to those repeatable comparison angles without changing
   the product camera behavior.
6. Before handoff, compare the debug view and an isolated clay/highlight view, then verify
   that clicking selects the same region that the shader displays.

Review tooling can query a projected pixel directly:

```js
__muscleSpikeRegionAt({ xn: 0.1, zn: 0.9, yn: 0.88, nx: 0, nz: 1 });
```

`xn` and `zn` are world position divided by the measured figure half-width; `yn` is the
normalized height from feet (`0`) to head (`1`); `nx` and `nz` are the smooth world-normal
components used by the shader.

## Projection and side-override rules

- Front/back are complete projections. Their black background means `none`.
- The side map is sparse and must not have a background rectangle:
  - transparent pixels retain the front/back result;
  - exact palette colors assign a region;
  - opaque black explicitly clears spill to `none`.
- The dominant horizontal smooth-normal component selects the projection. Front/back wins
  when `|nx| >= |nz|`; a covered side pixel wins when `|nz| > |nx|`.
- Only heat and selection appearance blend across the narrow `0.4–0.6` side-dominance
  band. Region ownership and click-picking use the hard dominant-axis decision.
- Above normalized height `0.75`, side overrides also require `|zn| >= 0.52`. The flexed
  forearm overlaps the head in side-map x/y space; this lateral gate prevents a valid arm
  pixel or black fist eraser from affecting the head.
- The raised forearm and deltoid also overlap each other in exact side-map x/y space. Their
  world-lateral positions separate them: side-authored shoulders are limited to
  `|zn| <= 0.70`, while forearms require `|zn| >= 0.90`. GPU rendering and CPU picking use
  the same region-specific gates.

## Drawing rules

- Fills are IDs, not decoration. Use the exact `REGION_PALETTE` colors from
  `apps/web/src/features/volume/region-map.ts`; blended or unknown colors fail closed to
  `none`.
- Keep `stroke="rgb(0,0,0)" stroke-width="5"` on region groups so adjacent shapes retain
  a neutral separation seam. A colored side override that continues the same front/back
  region may override that stroke with its matching fill color; this avoids splitting one
  logical muscle at the projection seam. Side-map erasers remain opaque black.
- Front/back author one half and mirror it with `<use>`. Symmetric center shapes should be
  one full-width path to avoid a center-line stroke. The side map is authored once from
  `+z`; mirroring happens in projection code, so it needs no `<use>` copy.
- Later paths paint over earlier ones. Keep painter order intentional, especially around
  crossing arms and explicit side erasers.
- Shape overhang outside the body silhouette is harmless, but do not use overhang to solve
  side accuracy. Add a sparse side override instead.
- Keep fists, elbows, knees, shins, ankles, and feet neutral unless the product definition
  explicitly changes.

The archived pre-rework front/back sources and their hashes live in
`docs/design-refs/volume-regions-pre-anatomy-rework/`.
