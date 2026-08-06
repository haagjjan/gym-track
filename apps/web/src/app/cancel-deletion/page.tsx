import type { ReactNode } from "react";
import { CancelDeletionScreen } from "../../features/auth/cancel-deletion-screen";

export const metadata = { title: "Cancel deletion" };

export default async function CancelDeletionPage({ searchParams }: { searchParams: Promise<{ token?: string }> }): Promise<ReactNode> {
  const query = await searchParams;
  return <CancelDeletionScreen token={query.token ?? ""} />;
}
