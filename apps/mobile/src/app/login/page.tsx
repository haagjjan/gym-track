"use client";

import type { ReactNode } from "react";
import { AuthScreen } from "../../../../web/src/features/auth/auth-screen";
import { appConfig } from "../../config";
import { GuestOnly } from "../../session/session";

export default function LoginPage(): ReactNode {
  return (
    <GuestOnly>
      <AuthScreen mode="login" registrationEnabled={appConfig.registrationEnabled} />
    </GuestOnly>
  );
}
