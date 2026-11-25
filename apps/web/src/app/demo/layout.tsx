import type { ReactNode } from "react";
import { PublicDemoShell } from "../../features/onboarding/public-demo-shell";

export const metadata = {
  title: "Interactive preview — GymTrack",
  description: "Try GymTrack with sample workout, progress, and muscle-volume data."
};

export default function PublicDemoLayout({ children }: { children: ReactNode }): ReactNode {
  return <PublicDemoShell>{children}</PublicDemoShell>;
}
