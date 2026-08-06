import * as THREE from "three";
import { heatT, REGION_SLUGS, TARGET_WEEKLY_SETS } from "./heatmap";
import {
  MUSCLE_COLOR_FRAGMENT,
  MUSCLE_EMISSIVE_FRAGMENT,
  MUSCLE_FRAGMENT_COMMON,
  MUSCLE_VERTEX_COMMON,
  MUSCLE_VERTEX_WORLD_POSITION
} from "./muscle-mask-shader";

export { TARGET_WEEKLY_SETS };

/**
 * Per-fragment muscle-region masking via projected ID maps (docs/14 Part 2).
 *
 * The mesh has no per-muscle submeshes and no UVs, so regions come from
 * hand-authored front/back muscle-suit maps plus a sparse side override (see
 * region-map.ts). The dominant horizontal world-normal component picks the
 * projection, while heat/selection blend narrowly across that seam. Edge
 * precision equals the authored art; boundaries are texel-crisp (nearest
 * sampling, 2048px).
 *
 * Region ids follow REGION_SLUGS order. Encoding/decoding (nearest entry of
 * the non-collinear REGION_PALETTE) must stay in lockstep with region-map.ts,
 * which also serves click-picking from the same pixels.
 */

export type MaskMode = "holo" | "clay" | "debug";

const MODE_VALUE: Record<MaskMode, number> = { holo: 0, clay: 1, debug: 2 };

export interface MuscleMaskUniforms {
  uFeetY: { value: number };
  uInvHeight: { value: number };
  uInvHalf: { value: number };
  uMapFront: { value: THREE.Texture };
  uMapBack: { value: THREE.Texture };
  uMapSide: { value: THREE.Texture };
  uHidePedestal: { value: number };
  uHeat: { value: Float32Array };
  uSelected: { value: number };
  uMode: { value: number };
  uTargetT: { value: number };
  uCyanDeep: { value: THREE.Color };
  uCyan: { value: THREE.Color };
  uViolet: { value: THREE.Color };
  uLavender: { value: THREE.Color };
  uStage1: { value: THREE.Color };
  uStage2: { value: THREE.Color };
  uStage3: { value: THREE.Color };
  uStage4: { value: THREE.Color };
  uStage5: { value: THREE.Color };
}

function linear(hex: string): THREE.Color {
  return new THREE.Color(hex).convertSRGBToLinear();
}

export function createMuscleMaskMaterial(
  frontMap: THREE.Texture,
  backMap: THREE.Texture,
  sideMap: THREE.Texture
): {
  material: THREE.MeshStandardMaterial;
  uniforms: MuscleMaskUniforms;
  setMode: (mode: MaskMode) => void;
} {
  const uniforms: MuscleMaskUniforms = {
    uFeetY: { value: 0 },
    uInvHeight: { value: 1 },
    uInvHalf: { value: 1 },
    uMapFront: { value: frontMap },
    uMapBack: { value: backMap },
    uMapSide: { value: sideMap },
    uHidePedestal: { value: 1 },
    uHeat: { value: new Float32Array(REGION_SLUGS.length) },
    uSelected: { value: 0 },
    uMode: { value: MODE_VALUE.holo },
    uTargetT: { value: heatT(TARGET_WEEKLY_SETS) },
    uCyanDeep: { value: linear("#006a71") },
    uCyan: { value: linear("#00f2ff") },
    uViolet: { value: linear("#a852ff") },
    uLavender: { value: linear("#d9b9ff") },
    uStage1: { value: linear("#E9D5FF") },
    uStage2: { value: linear("#D8B4FE") },
    uStage3: { value: linear("#C084FC") },
    uStage4: { value: linear("#9333EA") },
    uStage5: { value: linear("#581C87") }
  };

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#171a20"),
    metalness: 0.35,
    roughness: 0.5,
    // DoubleSide so the ankle-line discard shows solid dark interiors instead
    // of see-through hollow shins when the camera looks down the cut tubes.
    side: THREE.DoubleSide
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", MUSCLE_VERTEX_COMMON)
      .replace("#include <worldpos_vertex>", MUSCLE_VERTEX_WORLD_POSITION);

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", MUSCLE_FRAGMENT_COMMON)
      .replace("#include <color_fragment>", MUSCLE_COLOR_FRAGMENT)
      .replace("#include <emissivemap_fragment>", MUSCLE_EMISSIVE_FRAGMENT);
  };

  // Force a fresh program per shader revision — dodges the dev-HMR gotcha where
  // a cached compiled program skips onBeforeCompile and freezes the uniforms.
  material.customProgramCacheKey = () => "muscle-mask-v14-side-projection";

  const setMode = (mode: MaskMode): void => {
    uniforms.uMode.value = MODE_VALUE[mode];

    if (mode === "clay") {
      material.color.set("#ffffff");
      material.metalness = 0.04;
      material.roughness = 0.62;
    } else if (mode === "debug") {
      material.color.set("#ffffff");
      material.metalness = 0.0;
      material.roughness = 0.85;
    } else {
      material.color.set("#171a20");
      material.metalness = 0.35;
      material.roughness = 0.5;
    }
  };

  return { material, uniforms, setMode };
}
