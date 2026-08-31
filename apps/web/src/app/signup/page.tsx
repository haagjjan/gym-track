import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AuthScreen } from "../../features/auth/auth-screen";
import { RegistrationDisabledScreen } from "../../features/auth/registration-disabled-screen";
import { readRegistrationMode } from "../../features/auth/registration-mode";
import { getCurrentUser } from "../../features/auth/server-auth";

export const metadata = { title: "Create account" };

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{ invite?: string; email?: string }>;
}): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const mode = readRegistrationMode();
  const query = await searchParams;

  if (mode === "DISABLED") {
    return <RegistrationDisabledScreen />;
  }

  if (mode === "INVITE_ONLY" && (!query.invite || !query.email)) {
    redirect("/beta");
  }

  return <AuthScreen email={query.email} inviteToken={query.invite} mode="signup" />;
}
