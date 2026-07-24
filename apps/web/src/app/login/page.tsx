import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AuthScreen } from "../../features/auth/auth-screen";
import { isRegistrationEnabled } from "../../features/auth/registration-mode";
import { getCurrentUser } from "../../features/auth/server-auth";

export const metadata = { title: "Login" };

export default async function LoginPage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return <AuthScreen mode="login" registrationEnabled={isRegistrationEnabled()} />;
}
