# Product screenshot provenance

These committed WebP files are real browser captures of GymTrack's existing hands-on example,
not generated mockups and not live usage evidence. All shown workout data is sample data. The
local username `status_showcase` belongs only to a disposable local account.

- Captured: 2026-10-21, Codex in-app browser, 430 × 932 CSS pixels (portrait mobile), device scale 1.
- App source: `967bf8d61d7c928a000b7682781657cec47a2f1e`. The status showcase working-tree
  changes were present, but the app's demo UI source was unchanged from this revision.
- Runtime: local Next.js production build; isolated PostgreSQL 17 database, local API, no
  production cookies, credentials, personal training history, or data imported from production.
- Files: `public/images/workout.webp`, `progress.webp`, `volume.webp`.
- Encoding: WebP quality 88, method 6, original captured dimensions (workout 430 × 932; progress and volume 419 × 908); no retouching or compositing.

## Recapture

1. Start the documented local app stack with an isolated database. Use a production web build so
   development tools do not appear in the captures. Create a disposable account and enter Help's
   hands-on example; never use a real member account or populate personal workouts for this task.
2. Set a 430 × 932 mobile viewport. Open `/help/demo/progress`, choose **Explore freely**, and leave
   Barbell Bench Press with the one-month Load & Reps view selected. Collapse the lift selector,
   then scroll past the example guide so the Analytics label, full chart and bottom navigation
   are visible. Wait for the chart animation to finish and inspect the capture before accepting it.
3. Use the Volume navigation link without reloading the demo. Wait for the body map to finish
   loading, then scroll past the example guide so the Muscle Volume heading, body map, heat
   scale, summary cards and bottom navigation are visible. Capture the viewport without changing
   the model, hiding controls or compositing another screen.
4. Use Workout → the example full-body template. Select Barbell Bench Press. Add two working
   sets: 27.5 kg × 9 and 27.5 kg × 8, both RIR 2. Close the set editor and capture the viewport.
5. Save original PNGs only under ignored `.cache/status-review/`. Encode the three accepted
   captures using `cwebp -q 88 -m 6 INPUT.png -o ops/status/public/images/NAME.webp`.
6. Keep the original portrait aspect ratios; do not crop desktop screenshots into phone shapes.
   The gallery bounds previews to 320px wide while full-size links retain the complete captures.
   Inspect every encoded file for legibility, missing assets and unintended personal data. Keep
   the page's dimensions, alt text and captions in sync; update this provenance record with the
   actual source revision. Run the independent status browser checks before publishing.

The mobile captures replace the earlier desktop captures. Viewport captures retain their actual
encoded pixel dimensions, which can differ slightly from the configured CSS viewport.

The example computes relative sample dates when entered; dates will change on recapture. Raw
captures, local database files, test accounts, logs and browser traces must remain outside commits.
