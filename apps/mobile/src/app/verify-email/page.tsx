"use client";

import { Suspense, type ReactNode } from "react";
import { VerifyEmailScreen } from "../../../../web/src/features/auth/account-flow-screens";

export default function VerifyEmailPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <VerifyEmailScreen />
    </Suspense>
  );
}
