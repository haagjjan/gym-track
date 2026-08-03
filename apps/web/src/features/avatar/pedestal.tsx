"use client";

import { useFBX } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { RIM_CYAN } from "./statue-core";

/**
 * The dashboard projector pedestal — a dedicated sculpted mesh (base-v-2.fbx),
 * NOT the avatar-base pedestal. The old fused pedestal was split off the figure
 * mesh at runtime, but that split kept sole slices of the feet that ghosted in
 * place while the figure spun. This standalone model has no feet at all, so the
 * ghost layers are gone by construction; the figure part simply stands on it.
 *
 * Shaded to match docs/design-refs/hologram-bay-mood*.png: dark reflective metal
 * (PMREM env map from the bay, no per-frame reflection pass) with recessed cyan
 * LED bands driven by WORLD-HEIGHT in the shader (the mesh has no UVs — audited —
 * so texture masking is impossible; height bands are the UV-free equivalent) and
 * a low base uplight so the pedestal glows onto the wet floor.
 */

export const PEDESTAL_MODEL_URL = "/models/avatar/base-v-2.fbx";

// Raw-model landmarks measured from base-v-2.fbx (scratchpad base-v2 audits):
// single non-indexed mesh, ~30.8k verts, no UVs, radially symmetric.
const MODEL_BOTTOM_Y = -24.63; // widest base rim (bbox min y)
const MODEL_STAND_Y = 21.4; // up-facing standing plane (max up-facing area, r<32)
const MODEL_MAX_RADIAL = 101.7; // widest ring, at the base
const MODEL_IMPORT_SCALE = 100; // FBXLoader root scale included in the audited landmarks

const PEDESTAL_STAND_WORLD = 0.505;
// Radius 0.9 approaches the mood reference's broad platform proportions while
// keeping the entire outer ellipse visible in the narrow desktop/phone stage.
const PEDESTAL_TARGET_RADIUS = 0.9;
const PEDESTAL_SCALE = PEDESTAL_TARGET_RADIUS / MODEL_MAX_RADIAL;
const PEDESTAL_OFFSET_Y = PEDESTAL_STAND_WORLD - MODEL_STAND_Y * PEDESTAL_SCALE;

/** World Y the figure's soles rest on / the projector glow pad sits at. */
export const PEDESTAL_TOP_Y = PEDESTAL_STAND_WORLD;
/** World Y where the FBX base and raised bay deck meet. */
export const PEDESTAL_BASE_Y =
  PEDESTAL_STAND_WORLD - (MODEL_STAND_Y - MODEL_BOTTOM_Y) * PEDESTAL_SCALE;
/** World outer radius after uniform scaling. */
export const PEDESTAL_RADIUS = MODEL_MAX_RADIAL * PEDESTAL_SCALE;

/**
 * Cyan LED seams, addressed by world RADIUS (distance from the axis) so they
 * render as clean concentric rings like the reference, independent of the tier
 * slope. Radii span the disc from the top plate edge out to the base; the
 * outermost is the bright base ring that reads as the "bottom light" in the ref.
 */
const LED_BAND_R = [0.38, 0.58, 0.78, 0.95].map((ratio) => PEDESTAL_RADIUS * ratio);
const LED_BAND_HALF_WIDTH = [0.012, 0.011, 0.012, 0.018];
const LED_BAND_INTENSITY = [0.7, 0.6, 0.65, 0.9];

interface PedestalUniforms {
  uTime: { value: number };
  uLedColor: { value: THREE.Color };
  uBandR: { value: number[] };
  uBandHalfWidth: { value: number[] };
  uBandIntensity: { value: number[] };
}

function createPedestalMaterial(environment: THREE.Texture): {
  material: THREE.MeshStandardMaterial;
  uniforms: PedestalUniforms;
} {
  const uniforms: PedestalUniforms = {
    uTime: { value: 0 },
    uLedColor: { value: new THREE.Color(RIM_CYAN) },
    uBandR: { value: LED_BAND_R },
    uBandHalfWidth: { value: LED_BAND_HALF_WIDTH },
    uBandIntensity: { value: LED_BAND_INTENSITY }
  };
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#3c4a5c"),
    envMap: environment,
    // Brushed metal, not chrome: metalness < 1 lets the overhead + fill lights
    // shade the tier tops bright and leave the risers dark, so the stepped form
    // reads from the near-top camera; the env map still adds a reflective sheen.
    envMapIntensity: 0.48,
    metalness: 0.3,
    roughness: 0.52
  });

  // HMR gotcha (see .claude/memory/avatar-3d-asset-facts): three caches the
  // compiled program, so onBeforeCompile is skipped after an edit recreates the
  // material and the custom uniforms freeze. Bump this key on any GLSL edit.
  material.customProgramCacheKey = () => "bay-pedestal-v8";
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        ["#include <common>", "varying vec3 vBayWorld;"].join("\n")
      )
      .replace(
        "#include <worldpos_vertex>",
        ["#include <worldpos_vertex>", "vBayWorld = worldPosition.xyz;"].join("\n")
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        [
          "#include <common>",
          "varying vec3 vBayWorld;",
          "uniform float uTime;",
          "uniform vec3 uLedColor;",
          "uniform float uBandR[4];",
          "uniform float uBandHalfWidth[4];",
          "uniform float uBandIntensity[4];"
        ].join("\n")
      )
      .replace(
        "#include <emissivemap_fragment>",
        [
          "#include <emissivemap_fragment>",
          "{",
          "  float bandRadius = length(vBayWorld.xz);",
          "  float ledSum = 0.0;",
          "  for (int i = 0; i < 4; i++) {",
          "    float d = abs(bandRadius - uBandR[i]);",
          "    ledSum += (1.0 - smoothstep(0.0, uBandHalfWidth[i], d)) * uBandIntensity[i];",
          "  }",
          "  float pulse = 0.85 + 0.15 * sin(uTime * 1.5);",
          "  vec3 rimViewDir = normalize(vViewPosition);",
          "  float edge = pow(1.0 - saturate(dot(rimViewDir, normal)), 3.0);",
          "  totalEmissiveRadiance += uLedColor * (ledSum * pulse + edge * 0.08);",
          "}"
        ].join("\n")
      );
  };

  return { material, uniforms };
}

const pedestalCache = new WeakMap<THREE.Group, THREE.BufferGeometry>();

/** Bake the FBX transform into one identity-space geometry (matches statue-core). */
function getPedestalGeometry(fbx: THREE.Group): THREE.BufferGeometry {
  const cached = pedestalCache.get(fbx);

  if (cached) {
    return cached;
  }

  // The audited MODEL_* landmarks include FBXLoader's 100x root scale and its
  // -90deg X axis correction. Restore that lay-flat orientation, then rotate
  // 180deg around the source model's Z-up axis so the projecting front section
  // faces the camera instead of sitting on the far side of the platform.
  fbx.scale.setScalar(MODEL_IMPORT_SCALE * PEDESTAL_SCALE);
  fbx.position.set(0, PEDESTAL_OFFSET_Y, 0);
  fbx.rotation.set(-Math.PI / 2, 0, Math.PI);
  fbx.updateMatrixWorld(true);

  // Re-center X/Z on the axis (bbox center is ~0 but not exactly).
  const box = new THREE.Box3().setFromObject(fbx);
  const center = box.getCenter(new THREE.Vector3());

  fbx.position.x = -center.x;
  fbx.position.z = -center.z;
  fbx.updateMatrixWorld(true);

  const position: number[] = [];
  const normal: number[] = [];
  const vertex = new THREE.Vector3();
  const vertexNormal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();

  fbx.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    const positionAttribute = child.geometry.getAttribute("position");
    const normalAttribute = child.geometry.getAttribute("normal");

    if (!positionAttribute) {
      return;
    }

    normalMatrix.getNormalMatrix(child.matrixWorld);

    for (let index = 0; index < positionAttribute.count; index += 1) {
      vertex.fromBufferAttribute(positionAttribute, index).applyMatrix4(child.matrixWorld);
      position.push(vertex.x, vertex.y, vertex.z);

      if (normalAttribute) {
        vertexNormal
          .fromBufferAttribute(normalAttribute, index)
          .applyMatrix3(normalMatrix)
          .normalize();
        normal.push(vertexNormal.x, vertexNormal.y, vertexNormal.z);
      }
    }
  });

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));

  if (normal.length === position.length) {
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
  } else {
    geometry.computeVertexNormals();
  }

  pedestalCache.set(fbx, geometry);

  return geometry;
}

export interface BayPedestalProps {
  /** Bay PMREM environment for metallic reflections (shared with the floor). */
  environment: THREE.Texture;
  /** Freeze the LED pulse for reduced-motion users. */
  reducedMotion?: boolean;
}

export function BayPedestal({ environment, reducedMotion = false }: BayPedestalProps): ReactNode {
  const fbx = useFBX(PEDESTAL_MODEL_URL);
  const geometry = useMemo(() => getPedestalGeometry(fbx), [fbx]);
  const { material, uniforms } = useMemo(
    () => createPedestalMaterial(environment),
    [environment]
  );
  const pedestalLightTarget = useMemo(() => {
    const target = new THREE.Object3D();

    target.position.set(0, (PEDESTAL_BASE_Y + PEDESTAL_TOP_Y) / 2, 0);

    return target;
  }, []);

  useFrame((state) => {
    uniforms.uTime.value = reducedMotion ? 0 : state.clock.elapsedTime;
  });

  return (
    <group>
      <mesh frustumCulled={false} geometry={geometry} material={material} />

      {/* Cool downlight dedicated to the pedestal: reveals the stepped tier
          form (bright tops, dark risers) that the overhead spot alone leaves
          in shadow this far below the figure. */}
      <spotLight
        angle={0.72}
        color="#cfeaf2"
        decay={0}
        intensity={2.35}
        penumbra={1}
        position={[0.6, 3.2, 1.4]}
        target={pedestalLightTarget}
      />
      <spotLight
        angle={0.85}
        color="#8fb9c8"
        decay={0}
        intensity={0.9}
        penumbra={1}
        position={[-1.4, 2.1, -0.9]}
        target={pedestalLightTarget}
      />
      <primitive object={pedestalLightTarget} />

      {/* Bottom light: a low cyan point light spilling off the base onto the
          wet floor, plus the base LED band above carrying the glow. */}
      <pointLight
        color={RIM_CYAN}
        distance={2.3}
        intensity={1.2}
        position={[0, PEDESTAL_BASE_Y + 0.14, 0]}
      />
    </group>
  );
}

useFBX.preload(PEDESTAL_MODEL_URL);
