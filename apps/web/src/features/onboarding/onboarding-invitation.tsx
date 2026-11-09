"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button, buttonClass } from "../../shared/ui/button";
import { useOnboarding } from "./use-onboarding";

export function OnboardingInvitation(): ReactNode {
  const { onboarding, mark } = useOnboarding();
  if (!onboarding || onboarding.steps.demoInvitationHandled) return null;
  return <section aria-label="Try the example" className="relative z-20 mx-4 mt-2 rounded-[var(--radius-card)] bg-surface p-4 lg:mx-6">
    <h2 className="text-title-3 text-text">Try a workout and see how tracking works.</h2>
    <p className="mt-1 text-subhead text-text-secondary">A short hands-on example. Your own workout history stays yours.</p>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Link className={buttonClass("primary", "compact")} href="/help/demo" onClick={() => void mark("demoInvitationHandled")}>Try the example</Link>
      <Button onClick={() => void mark("demoInvitationHandled")} size="compact" variant="plain">Skip</Button>
    </div>
  </section>;
}
