# Anatomy check — v13

Checked 2026-11-10 using front, back, side and both quarter views, with the
[OpenStax shoulder/back figures](https://openstax.org/books/anatomy-and-physiology/pages/11-5-muscles-of-the-pectoral-girdle-and-upper-limbs),
[abdominal wall figures](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-4-axial-muscles-of-the-abdominal-wall-and-thorax), and
[hip/thigh figures](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs).

## Findings and fixes

The v12 front-deltoid regions were nearly internal, leaving thin strips and a
projecting tip. The v13 tapered anterior envelopes expose coherent bilateral
shoulder-to-upper-arm regions without those spikes. A second visual check found
the visibility issue resolved in front, side and quarter-front views. Exact
attachment and contour remain simplified. `shoulders.py` records the adaptation.

Chest, side/rear delts, upper back, traps, neck, biceps, triceps, forearms,
obliques, glutes, abductors, quads, adductors, hamstrings and calves have
recognizable placement and visible neighboring regions. Lower back deliberately
shows the lumbar erectors rather than covering them with fascia. Neck uses
sternocleidomastoid surfaces. These are training-map conventions.

Abs have the correct paired medial location but simplified continuous strips and
serrated borders. Generated lats have recognizable posterior flank placement;
the lower outline is abrupt and their upper-arm connection cannot be certified
from the current views. Both remain explicit approximation/sign-off items.
Adductors rolling up to quads is an application reporting convention, not an
anatomical claim that adductors belong to the quadriceps.

Neutral geometry was reduced to meet the triangle budget. Other tracked muscle
meshes retain their v12 geometry. Full-resolution review still notes surface
artifacts around the knee and abs; these need visual judgment before sign-off.

## Evidence and limits

External source scenes and five-view sheets are retained at
`~/Projects/gym-assets/body-model/out/` and `out/sheets/v13-*.png`. They are not
bundled with the app. The validator tests that all 40 muscle meshes have an
exposed nearest raycast hit across eight directions. Browser regression coverage
checks actual chest and lat selection on the skinned model.

This is region-level visual and selection review, not medical validation of
every origin, insertion or constituent muscle. Owner visual sign-off, final
lat/abs acceptance and real-device performance/gesture feel remain open.
