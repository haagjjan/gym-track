"use client";

import "./bootstrap";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, type ReactNode } from "react";
import { useAppBack } from "../../web/src/features/shell/app-history";
import { getNativeBridge } from "../../web/src/shared/platform/native";
import { Button } from "../../web/src/shared/ui/button";
import { IconBack } from "../../web/src/shared/ui/icons";
import { appConfig } from "./config";

/**
 * A page that lives on the website (legal texts, support). The app opens it in the
 * system browser sheet, so the text is always the current published version.
 */
export function ExternalPage({ path, title }: { path: string; title: string }): ReactNode {
  const router = useRouter();
  const back = useAppBack();
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

  function handleBack(): void {
    if (back.target.kind === "none") router.back();
    else back.goBack();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex h-11 items-center px-[max(0.25rem,env(safe-area-inset-left))] lg:px-4">
          <button
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center gap-0.5 pr-3 text-body text-accent"
            onClick={handleBack}
            type="button"
          >
            <IconBack />
            <span>{back.label}</span>
          </button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-center">
        <h1 className="text-title-2 text-text">{title}</h1>
        <p className="text-body text-text-secondary">This page opens in a browser sheet.</p>
        <Button className="w-full" onClick={open}>Open again</Button>
        <Button className="w-full" onClick={handleBack} variant="secondary">Back</Button>
      </main>
    </div>
  );
}
