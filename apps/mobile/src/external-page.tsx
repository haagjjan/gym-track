"use client";

import "./bootstrap";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, type ReactNode } from "react";
import { getNativeBridge } from "../../web/src/shared/platform/native";
import { Button } from "../../web/src/shared/ui/button";
import { appConfig } from "./config";

/**
 * A page that lives on the website (legal texts, support). The app opens it in the
 * system browser sheet, so the text is always the current published version.
 */
export function ExternalPage({ path, title }: { path: string; title: string }): ReactNode {
  const router = useRouter();
  const open = useCallback(() => {
    const url = `${appConfig.webOrigin}${path}`;
    const bridge = getNativeBridge();

    if (bridge) {
      void bridge.openExternal(url);
    } else {
      window.open(url, "_blank", "noreferrer");
    }
  }, [path]);

  useEffect(() => {
    open();
  }, [open]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <h1 className="text-title-2 text-text">{title}</h1>
      <p className="text-body text-text-secondary">This page opens in your browser.</p>
      <Button onClick={open}>Open again</Button>
      <Button onClick={() => router.back()} variant="secondary">Back</Button>
    </main>
  );
}
