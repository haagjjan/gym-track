"use client";

import { useFBX } from "@react-three/drei";
import { useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { measureFigureFrame } from "../volume/heatmap";

export const AVATAR_MODEL_URL = "/models/avatar/avatar-base.fbx";
export const STATUE_HEIGHT = 2.1;
export const RIM_CYAN = "#00dbe7";
export const PULSE_GREEN = "#51fb37";

export interface RimUniforms {
  uRimColor: { value: THREE.Color };
  uPulseColor: { value: THREE.Color };
  uRimIntensity: { value: number };
  uRimPower: { value: number };
  uPulse: { value: number };
}

export function createStatueMaterial(): {
  material: THREE.MeshStandardMaterial;
  uniforms: RimUniforms;
} {
  const uniforms: RimUniforms = {
    uRimColor: { value: new THREE.Color(RIM_CYAN) },
    uPulseColor: { value: new THREE.Color(PULSE_GREEN) },
    uRimIntensity: { value: 0.9 },
    uRimPower: { value: 3.4 },
    uPulse: { value: 0 }
  };
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#171a20"),
    metalness: 0.35,
    roughness: 0.5
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        [
          "#include <common>",
          "uniform vec3 uRimColor;",
          "uniform vec3 uPulseColor;",
          "uniform float uRimIntensity;",
          "uniform float uRimPower;",
          "uniform float uPulse;"
        ].join("\n")
      )
      .replace(
        "#include <emissivemap_fragment>",
        [
          "#include <emissivemap_fragment>",
          "{",
          "  vec3 rimViewDir = normalize(vViewPosition);",
          "  float rimFresnel = pow(1.0 - saturate(dot(rimViewDir, normal)), uRimPower);",
          "  vec3 rimTint = mix(uRimColor, uPulseColor, uPulse);",
          "  totalEmissiveRadiance += rimTint * rimFresnel * (uRimIntensity + uPulse * 2.2);",
          "}"
        ].join("\n")
      );
  };

  return { material, uniforms };
}

/**
 * The built-in pedestal has an asymmetric slab, so the full bounding box is skewed.
 * Center the turntable axis on the figure instead: bounds of vertices above a height cut.
 */
export function boundsAboveHeight(root: THREE.Object3D, minWorldY: number): THREE.Box3 {
  const bounds = new THREE.Box3();
  const vertex = new THREE.Vector3();

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    const positionAttribute = child.geometry.getAttribute("position");

    if (!positionAttribute) {
      return;
    }

    for (let index = 0; index < positionAttribute.count; index += 1) {
      vertex.fromBufferAttribute(positionAttribute, index).applyMatrix4(child.matrixWorld);

      if (vertex.y >= minWorldY) {
        bounds.expandByPoint(vertex);
      }
    }
  });

  return bounds;
}

/** Scale to STATUE_HEIGHT, ground at y=0, center x/z on the figure axis. */
function normalizeStatue(fbx: THREE.Group): void {
  // Reset first so normalization is idempotent under StrictMode/HMR re-runs.
  fbx.scale.setScalar(1);
  fbx.position.set(0, 0, 0);
  fbx.updateMatrixWorld(true);

  const rawSize = new THREE.Box3().setFromObject(fbx).getSize(new THREE.Vector3());

  fbx.scale.setScalar(STATUE_HEIGHT / rawSize.y);
  fbx.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(fbx);
  const figureBounds = boundsAboveHeight(
    fbx,
    scaledBox.min.y + (scaledBox.max.y - scaledBox.min.y) * 0.4
  );
  const figureCenter = figureBounds.getCenter(new THREE.Vector3());

  fbx.position.set(-figureCenter.x, -scaledBox.min.y, -figureCenter.z);
  fbx.updateMatrixWorld(true);
}

export type StatuePart = "figure" | "pedestal";

interface StatuePartGeometries {
  figure: THREE.BufferGeometry;
  pedestal: THREE.BufferGeometry;
}

const partsCache = new WeakMap<THREE.Group, StatuePartGeometries>();

/**
 * The FBX fuses figure and pedestal into one merged mesh, but the two are
 * cleanly separable per TRIANGLE with the same audited predicate the volume
 * shader discards by: every pedestal part beyond radial 0.6 tops out at
 * yn 0.044, the plate the feet stand on is up-facing at yn 0.032–0.044, and
 * above yn 0.046 only feet/ankles remain. Splitting lets the dashboard spin
 * the figure alone (hologram turns, platform stays) and leaves the pedestal a
 * swappable mesh for a future re-skin. World transforms are baked into the
 * output geometries, so both parts render at identity.
 */
function getStatueParts(fbx: THREE.Group): StatuePartGeometries {
  const cached = partsCache.get(fbx);

  if (cached) {
    return cached;
  }

  normalizeStatue(fbx);

  const frame = measureFigureFrame(fbx);
  const invHeight = 1 / Math.max(frame.headY - frame.feetY, 1e-6);
  const invHalf = 1 / Math.max(frame.halfWidth, 1e-6);
  const figureArrays: { position: number[]; normal: number[] } = { position: [], normal: [] };
  const pedestalArrays: { position: number[]; normal: number[] } = { position: [], normal: [] };
  const vertexA = new THREE.Vector3();
  const vertexB = new THREE.Vector3();
  const vertexC = new THREE.Vector3();
  const edgeAb = new THREE.Vector3();
  const edgeAc = new THREE.Vector3();
  const faceNormal = new THREE.Vector3();
  const vertexNormal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();

  fbx.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    const position = child.geometry.getAttribute("position");
    const normal = child.geometry.getAttribute("normal");

    if (!position || !normal) {
      return;
    }

    normalMatrix.getNormalMatrix(child.matrixWorld);

    // Non-indexed geometry: every 3 vertices form one triangle.
    for (let index = 0; index + 2 < position.count; index += 3) {
      vertexA.fromBufferAttribute(position, index).applyMatrix4(child.matrixWorld);
      vertexB.fromBufferAttribute(position, index + 1).applyMatrix4(child.matrixWorld);
      vertexC.fromBufferAttribute(position, index + 2).applyMatrix4(child.matrixWorld);

      const centroidY = (vertexA.y + vertexB.y + vertexC.y) / 3;
      const centroidX = (vertexA.x + vertexB.x + vertexC.x) / 3;
      const centroidZ = (vertexA.z + vertexB.z + vertexC.z) / 3;
      const yn = (centroidY - frame.feetY) * invHeight;
      const radial = Math.hypot(centroidX, centroidZ) * invHalf;

      faceNormal.crossVectors(edgeAb.subVectors(vertexB, vertexA), edgeAc.subVectors(vertexC, vertexA)).normalize();

      const isPedestal =
        yn < 0.033 ||
        (yn < 0.047 && (radial > 0.6 || faceNormal.y > 0.55)) ||
        (yn < 0.32 && radial > 1.05);
      const target = isPedestal ? pedestalArrays : figureArrays;

      target.position.push(
        vertexA.x, vertexA.y, vertexA.z,
        vertexB.x, vertexB.y, vertexB.z,
        vertexC.x, vertexC.y, vertexC.z
      );

      for (let corner = 0; corner < 3; corner += 1) {
        vertexNormal.fromBufferAttribute(normal, index + corner).applyMatrix3(normalMatrix).normalize();
        target.normal.push(vertexNormal.x, vertexNormal.y, vertexNormal.z);
      }
    }
  });

  const build = (arrays: { position: number[]; normal: number[] }): THREE.BufferGeometry => {
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(arrays.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(arrays.normal, 3));

    return geometry;
  };

  const parts: StatuePartGeometries = {
    figure: build(figureArrays),
    pedestal: build(pedestalArrays)
  };

  partsCache.set(fbx, parts);

  return parts;
}

export function Statue({
  material,
  part
}: {
  material: THREE.MeshStandardMaterial;
  /** Omit to render the whole fused statue (legacy consumers). */
  part?: StatuePart;
}): ReactNode {
  const fbx = useFBX(AVATAR_MODEL_URL);

  const statue = useMemo(() => {
    if (part) {
      return null;
    }

    normalizeStatue(fbx);
    fbx.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material;
        child.frustumCulled = false;
      }
    });

    return fbx;
  }, [fbx, material, part]);

  const parts = useMemo(() => (part ? getStatueParts(fbx) : null), [fbx, part]);

  if (part && parts) {
    return (
      <mesh
        frustumCulled={false}
        geometry={part === "figure" ? parts.figure : parts.pedestal}
        material={material}
      />
    );
  }

  return statue ? <primitive object={statue} /> : null;
}
