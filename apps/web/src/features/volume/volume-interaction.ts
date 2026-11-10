"use client";

import { useEffect, useState } from "react";

const COARSE_POINTER_QUERY = "(pointer: coarse)";

export interface VolumeOrbitPolicy {
  enableZoom: boolean;
  hint: string;
  /** Phones: TouchRotate splits each touch into rotate (sideways) or page scroll (vertical). */
  touchRotate: boolean;
  touchAction: "none";
}

const COARSE_POLICY: VolumeOrbitPolicy = {
  enableZoom: false,
  hint: "Swipe sideways to rotate the figure.",
  touchRotate: true,
  touchAction: "none"
};

const FINE_POLICY: VolumeOrbitPolicy = {
  enableZoom: true,
  hint: "Drag to rotate the figure. Scroll to zoom.",
  touchRotate: false,
  touchAction: "none"
};

export function volumeOrbitPolicy(coarsePointer: boolean): VolumeOrbitPolicy {
  return coarsePointer ? COARSE_POLICY : FINE_POLICY;
}

export function useCoarsePointer(): boolean {
  const [coarsePointer, setCoarsePointer] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(COARSE_POINTER_QUERY);
    const update = (): void => setCoarsePointer(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  return coarsePointer;
}
