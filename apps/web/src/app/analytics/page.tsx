import { redirect } from "next/navigation";

// Legacy URL kept alive: /analytics has redirected to /progress since the
// original app (Phase 0 contract).
export default function AnalyticsPage(): never {
  redirect("/progress");
}
