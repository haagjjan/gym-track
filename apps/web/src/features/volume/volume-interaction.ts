"use client";

import { useEffect, useState } from "react";

const COARSE_POINTER_QUERY = "(pointer: coarse)";

export interface VolumeOrbitPolicy {
  enableZoom: boolean;
  hint: string;
  touchAction: "none" | "pan-y";
}

const COARSE_POLICY: VolumeOrbitPolicy = {
  enableZoom: false,
  hint: "SWIPE SIDEWAYS TO ROTATE · SWIPE UP/DOWN TO SCROLL",
  touchAction: "pan-y"
};

const FINE_POLICY: VolumeOrbitPolicy = {
  enableZoom: true,
  hint: "DRAG TO ORBIT · SCROLL TO ZOOM",
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
