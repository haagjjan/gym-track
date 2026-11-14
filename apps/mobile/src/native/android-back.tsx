"use client";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { hasAppSession } from "../../../web/src/shared/api/transport";
import { androidBackAction } from "../../../web/src/shared/platform/android-back";
import { closeTopModal, hasOpenModal } from "../../../web/src/shared/ui/use-modal-behavior";

const HISTORY_KEY = "gymtrack.nav-history";

function readHistory(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

/** Wires the Android hardware back button to the back contract in docs/DESIGN.md. */
export function AndroidBack(): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const keyboardOpen = useRef(false);
  pathRef.current = pathname;

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") {
      return;
    }

    const handles = [
      Keyboard.addListener("keyboardDidShow", () => { keyboardOpen.current = true; }),
      Keyboard.addListener("keyboardDidHide", () => { keyboardOpen.current = false; }),
      App.addListener("backButton", () => {
        void hasAppSession().then((signedIn) => {
          const action = androidBackAction({
            keyboardOpen: keyboardOpen.current,
            modalOpen: hasOpenModal(),
            history: readHistory(),
            path: pathRef.current,
            signedIn
          });

          if (action.kind === "close-keyboard") void Keyboard.hide();
          else if (action.kind === "close-modal") closeTopModal();
          else if (action.kind === "history-back") router.back();
          else if (action.kind === "go") router.replace(action.path);
          else void App.exitApp();
        });
      })
    ];

    return () => {
      for (const handle of handles) {
        void handle.then((listener) => listener.remove());
      }
    };
  }, [router]);

  return null;
}
