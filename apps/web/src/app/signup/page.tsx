import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AuthScreen } from "../../features/auth/auth-screen";
import { RegistrationDisabledScreen } from "../../features/auth/registration-disabled-screen";
import { readRegistrationMode } from "../../features/auth/registration-mode";
import { getCurrentUser } from "../../features/auth/server-auth";

export const metadata = { title: "Create account" };

export default async function SignupPage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const mode = readRegistrationMode();

  if (mode === "DISABLED") {
    return <RegistrationDisabledScreen />;
  }

  return <AuthScreen mode="signup" />;
}
