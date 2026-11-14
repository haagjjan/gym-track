"use client";

import { Suspense, type ReactNode } from "react";
import { ResetPasswordScreen } from "../../../../web/src/features/auth/account-flow-screens";

export default function ResetPasswordPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <ResetPasswordScreen />
    </Suspense>
  );
}
