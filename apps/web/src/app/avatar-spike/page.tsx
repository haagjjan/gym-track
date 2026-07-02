import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AvatarSpike } from "../../features/avatar/avatar-spike";

export const metadata: Metadata = {
  title: "Avatar Spike — Phase 1",
  robots: { index: false }
};

export default function AvatarSpikePage(): ReactNode {
  return <AvatarSpike />;
}
