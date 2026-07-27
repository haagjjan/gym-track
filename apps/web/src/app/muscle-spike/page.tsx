import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { MuscleSpike } from "../../features/volume/muscle-spike";

export const metadata: Metadata = {
  title: "Muscle Mask Spike — Batch C Part 2",
  robots: { index: false }
};

export default function MuscleSpikePage(): ReactNode {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <MuscleSpike />;
}
