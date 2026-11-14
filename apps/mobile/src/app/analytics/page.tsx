"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export default function AnalyticsPage(): ReactNode {
  const router = useRouter();

  useEffect(() => {
    router.replace("/progress/");
  }, [router]);

  return null;
}
