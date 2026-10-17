"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { HudButton } from "../../shared/ui/ui";
import { useOnboarding } from "./use-onboarding";

export function OnboardingInvitation(): ReactNode {
  const { onboarding, mark } = useOnboarding();
  if (!onboarding || onboarding.steps.demoInvitationHandled) return null;
  return <section aria-label="Try the example" className="m-4 rounded-xl border border-cyan/40 bg-surface p-4 lg:m-6">
    <h2 className="font-display text-lg font-bold text-fg">Try a workout and see how tracking works.</h2>
    <p className="mt-1 text-sm text-fg-muted">A short hands-on example. Your own workout history stays yours.</p>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Link className="inline-flex min-h-11 items-center rounded bg-cyan px-4 text-sm font-bold text-on-cyan" href="/help/demo" onClick={() => void mark("demoInvitationHandled")}>Try the example</Link>
      <HudButton onClick={() => void mark("demoInvitationHandled")} variant="ghost">Skip</HudButton>
    </div>
  </section>;
}
