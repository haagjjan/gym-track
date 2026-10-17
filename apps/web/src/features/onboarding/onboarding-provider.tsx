"use client";

import type { ReactNode } from "react";
import { OnboardingAccountContext } from "./use-onboarding";

export function OnboardingProvider({ userId, children }: { userId: string; children: ReactNode }): ReactNode {
  return <OnboardingAccountContext.Provider key={userId} value={userId}>{children}</OnboardingAccountContext.Provider>;
}
