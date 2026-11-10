"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

/**
 * The shared body figure: one mesh per muscle region and side
 * (`muscle_<slug>_<L|R>`), plus neutral meshes for untracked muscle, bone and
 * skin, all bound to one 19-bone skeleton so the figure can be posed. Built
 * from BodyParts3D by tools/body-model (see its README for the licence and
 * credit). Meshopt-compressed; the decoder ships with three.
 */
export const BODY_MODEL_URL = "/models/body/body.glb";

/** World height of the figure, feet to crown, and where the feet stand. */
export const BODY_HEIGHT = 1.66;
export const BODY_FEET_Y = 0.44;

export type BodyPartKind = "muscle" | "other" | "bone" | "skin";

export interface BodyPart {
  kind: BodyPartKind;
  mesh: THREE.Mesh;
  /** Region slug for muscles, null for the neutral parts. */
  slug: string | null;
}

export interface BodyModel {
  /** Feet line, crown, and the widest half extent, in world units. */
  frame: { feetY: number; headY: number; halfWidth: number };
  parts: BodyPart[];
  root: THREE.Group;
}

function partOf(mesh: THREE.Mesh): BodyPart {
  const match = /^muscle_(.+)_[LRC]$/.exec(mesh.name);
  if (match) return { kind: "muscle", mesh, slug: match[1]! };
  const kind: BodyPartKind = mesh.name === "body_skin" ? "skin" : mesh.name === "body_bone" ? "bone" : "other";
  return { kind, mesh, slug: null };
}

/**
 * A private copy of the figure for one scene. Geometry is shared with every
 * other copy; materials are the caller's. The figure faces +x and stands on
 * BODY_FEET_Y, the frame the cameras of both scenes are tuned for.
 */
export function useBodyModel(): BodyModel {
  const gltf = useGLTF(BODY_MODEL_URL, false, true);

  return useMemo(() => {
    // Skinned meshes need their own skeleton per copy; a plain clone would share bones.
    const figure = cloneSkinned(gltf.scene);
    const size = new THREE.Box3().setFromObject(figure).getSize(new THREE.Vector3());
    const scale = BODY_HEIGHT / Math.max(size.y, 1e-6);

    figure.scale.setScalar(scale);
    figure.rotation.y = Math.PI / 2; // glTF front is +z; the scenes look down -x.
    figure.position.y = BODY_FEET_Y;

    const root = new THREE.Group();
    root.add(figure);
    root.updateMatrixWorld(true);

    const parts: BodyPart[] = [];
    figure.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      // A posed limb leaves its bind-pose bounds, so never cull by them.
      child.frustumCulled = false;
      parts.push(partOf(child));
    });

    return {
      frame: { feetY: BODY_FEET_Y, headY: BODY_FEET_Y + BODY_HEIGHT, halfWidth: (size.x * scale) / 2 },
      parts,
      root
    };
  }, [gltf]);
}

useGLTF.preload(BODY_MODEL_URL, false, true);
