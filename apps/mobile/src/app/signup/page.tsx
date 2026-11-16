"use client";

import type { ReactNode } from "react";
import { AuthScreen } from "../../../../web/src/features/auth/auth-screen";
import { RegistrationDisabledScreen } from "../../../../web/src/features/auth/registration-disabled-screen";
import { appConfig } from "../../config";
import { GuestOnly } from "../../session/session";

export default function SignupPage(): ReactNode {
  return (
    <GuestOnly>
      {appConfig.registrationEnabled ? <AuthScreen mode="signup" /> : <RegistrationDisabledScreen />}
    </GuestOnly>
  );
}
