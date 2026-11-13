"use client";

import { useLayoutEffect, type ReactNode } from "react";
import type * as THREE from "three";
import { useThree } from "@react-three/fiber";
import type { ResolvedTheme } from "../shell/theme";
import { useBodyModel } from "./body-model";

export function HomeBody({ material, theme }: { material: THREE.MeshStandardMaterial; theme: ResolvedTheme }): ReactNode {
  const body = useBodyModel();
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    material.color.set(theme === "dark" ? "#56616f" : "#e3e8ee");
    for (const part of body.parts) part.mesh.material = material;
    invalidate();
  }, [body, invalidate, material, theme]);
  return <primitive object={body.root} dispose={null} />;
}
