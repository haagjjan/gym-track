import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../features/auth/server-auth";
import type { AuthUser } from "../features/auth/auth-types";
import { AppCockpitShell } from "../features/navigation/app-cockpit-shell";
import { DashboardHome } from "../features/dashboard";

export default async function HomePage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <SignedInHome user={user} />;
}

function SignedInHome({ user }: { user: AuthUser }): ReactNode {
  return (
    <AppCockpitShell user={user}>
      <DashboardHome user={user} />
    </AppCockpitShell>
  );
}
