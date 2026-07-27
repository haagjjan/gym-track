import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../../../features/auth/server-auth";
import { ExercisesScreen } from "../../../features/exercises/exercises-screen";
import { AppShell } from "../../../features/shell/app-shell";

export const metadata = { title: "Exercises" };

export default async function ExercisesPage(): Promise<ReactNode> {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  return <AppShell user={user}><ExercisesScreen userId={user.id} /></AppShell>;
}
