"use client";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { appLinkRoute } from "../../../web/src/shared/platform/app-links";

export function AppLinks(): ReactNode {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    let receivedEvent = false;
    const navigate = (url: string): void => {
      const route = appLinkRoute(url);
      if (active && route) router.replace(route);
    };
    const listener = App.addListener("appUrlOpen", ({ url }) => {
      receivedEvent = true;
      navigate(url);
    });

    void App.getLaunchUrl().then((launch) => {
      if (launch && !receivedEvent) navigate(launch.url);
    }).catch(() => undefined);

    return () => {
      active = false;
      void listener.then((handle) => handle.remove());
    };
  }, [router]);

  return null;
}
