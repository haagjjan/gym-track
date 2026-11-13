import type { ReactNode } from "react";
import type { ResolvedTheme } from "../shell/theme";
import { BODY_FEET_Y } from "./body-model";

/** No environment maps, textures or shadow passes: one rig for both figures. */
export function BodyLighting({ theme }: { theme: ResolvedTheme }): ReactNode {
  return (
    <>
      <hemisphereLight args={["#ffffff", "#5b6470", theme === "dark" ? 0.9 : 1.5]} />
      <directionalLight color="#ffffff" intensity={theme === "dark" ? 2.2 : 1.6} position={[3, 4.5, 3.5]} />
      <directionalLight color="#cfe0f2" intensity={0.5} position={[3, 1.5, -4]} />
      <directionalLight color="#ffffff" intensity={theme === "dark" ? 1.6 : 1.1} position={[-3.5, 4, -2.5]} />
    </>
  );
}

export const PEDESTAL_RADIUS = 0.55;
export const PEDESTAL_TOP_Y = BODY_FEET_Y;

/** A single low disc grounds the body without a room or animated decoration. */
export function BodyPedestal({ theme }: { theme: ResolvedTheme }): ReactNode {
  return (
    <mesh position={[0, BODY_FEET_Y - 0.045, 0]}>
      <cylinderGeometry args={[PEDESTAL_RADIUS, PEDESTAL_RADIUS + 0.02, 0.09, 64]} />
      <meshStandardMaterial color={theme === "dark" ? "#303943" : "#ced5dd"} metalness={0} roughness={0.85} />
    </mesh>
  );
}
