import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AuthScreen } from "../../features/auth/auth-screen";
import { RegistrationDisabledScreen } from "../../features/auth/registration-disabled-screen";
import { isRegistrationEnabled } from "../../features/auth/registration-mode";
import { getCurrentUser } from "../../features/auth/server-auth";

export const metadata = { title: "Signup" };

export default async function SignupPage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  if (!isRegistrationEnabled()) {
    return <RegistrationDisabledScreen />;
  }

  return <AuthScreen mode="signup" />;
}
