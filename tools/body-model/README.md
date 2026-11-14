# Body model pipeline

The app ships `apps/web/public/models/body/body.glb`: the v13 rigged figure,
20 muscle regions (left and right), three neutral meshes, a 19-bone skeleton,
and `Relaxed` / `ArmsRaised` clips. Home and Volume clone the skeleton while
sharing the loaded geometry. Picking intersects the actual skinned muscle mesh.

## Source and licence

BodyParts3D 4.0, © The Database Center for Life Science, under
[Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
The [publisher's licence page](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html)
was checked on 2026-11-10; it permits derivative redistribution with attribution.
The in-app credit is in Settings → Credits.

Changes: anatomical elements grouped into regions, adjusted proportions, generated
abs, lat and anterior-deltoid surfaces, a closed inner body, tapered extremities, added facial
surfaces, reduced geometry and a skeleton with two pose clips. The source does
not provide latissimus dorsi or rectus abdominis surfaces. Those regions and the
visible anterior-deltoid envelopes are approximations. `shoulders.py` replaces
internal clavicular strips that were almost entirely occluded, and reduces only
neutral geometry to meet the triangle budget. This is a training-volume view, not a medical reference.

## Rebuild

Blender's Python API is used only for asset tooling; runtime code stays TypeScript.
The scripts preserve the original build steps, including geometry routines above
the usual source-size limits, so the existing figure remains reproducible.
Downloaded sources and `.blend` intermediates stay outside the repository.

Set `BODY_MODEL_WORKDIR` to an external directory (default:
`~/Projects/gym-assets/body-model`). Its `source/bodyparts3d/` must contain
`isa_parts_list_e.txt`, `isa_element_parts.txt`, and
`isa_obj/isa_BP3D_4.0_obj_99/`. The two checked-in filename manifests select the
imported muscles, skin and bones. The output directory is created by the import.
The export and rig commands expect the intermediate `composed.blend` beside them.

```bash
cd /Users/janva/Projects/gym-progress-tracker
export BODY_MODEL_WORKDIR="$HOME/Projects/gym-assets/body-model"
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python tools/body-model/01_import.py
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python tools/body-model/03_compose.py
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python tools/body-model/04_export.py -- 30000 3000 3000 4000 "$BODY_MODEL_WORKDIR/out/figure.glb"
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python tools/body-model/06_rig.py -- "$BODY_MODEL_WORKDIR/out/figure.blend" "$BODY_MODEL_WORKDIR/out/figure-rigged.glb"
```

Budgets passed to `04_export.py` are allocation targets, not final triangle counts:
minimum per-element counts and the rig's new surfaces add geometry. Never replace
the shipped asset without checking its final geometry and views.

Compress into a **new candidate file** before installation. Keep muscle names,
individual meshes and skinning:

```bash
pnpm dlx @gltf-transform/cli@4 optimize "$BODY_MODEL_WORKDIR/out/figure-rigged.glb" "$BODY_MODEL_WORKDIR/out/candidate.glb" --compress meshopt --simplify false --join false --flatten false --instance false --palette false --prune false --texture-compress false
node --experimental-strip-types tools/body-model/validate.ts "$BODY_MODEL_WORKDIR/out/candidate.glb"
```

`02_render.py` renders a composed `.blend`; `05_render_glb.py` renders an exported
rigged `.blend`, optionally `only=<region>`; `07_closeup.py` captures a chosen
centre and scale. Each takes arguments after Blender's `--`. Keep front, back,
side and both three-quarter sheets in the external work directory for comparison.
`params.json`, `regions.py`, and `surface.py` control the outlines and proportions.

## Validation and measured baseline

```bash
node --experimental-strip-types tools/body-model/validate.ts
```

The URL in `features/avatar/body-model.ts` includes the first 12 SHA-256 hex digits
of the shipped file. Update it when installing a new asset; the default validator
checks it. Only fingerprinted requests receive immutable web caching. Native
bundled builds serve the same local file.

The validator checks bundled buffers, no textures, meshopt, both sides of every
region, approximate bilateral bounds (4 cm tolerance for source asymmetry),
shared joint indices, pose names, metre scale, bytes, triangles, and actual loader
parse time. It also confirms an exposed nearest raycast hit for every left/right
muscle from eight directions, including neutral meshes as occluders. It is a structural check, not anatomical or visual approval.

Measured 2026-11-10: **39,886 triangles, 406,424 bytes, 12 ms loader parse** locally.
The validation ceiling is 40k triangles / 600 KB. Neutral surfaces are simplified
to fit that budget; other tracked muscles retain their geometry. CPU loader timing is not a mobile
frame-rate measurement. Device heat, frame rate, and full anatomical sign-off
remain open.

The retired FBX and SVG projection files are available in git history; a local
copy is also retained in the external work directory's `retired-assets/`.
