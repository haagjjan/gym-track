export type VolumeMuscleRole = "PRIMARY" | "SECONDARY";

/** Set-equivalent credit for each current muscle assignment. */
export function volumeContribution(role: VolumeMuscleRole): number {
  return role === "SECONDARY" ? 0.5 : 1;
}
