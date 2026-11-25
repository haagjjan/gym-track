"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { IconClock, IconDumbbell, IconFigure, IconTrend } from "../../shared/ui/icons";
import { normalizePathname } from "../../shared/platform/routes";
import { DemoProvider } from "./demo-provider";

const STATUS_PAGE_ORIGIN = "https://status.gymtrack.ch";

const PUBLIC_TABS = [
  { id: "workout", label: "Workout", href: "/demo", icon: IconDumbbell },
  { id: "history", label: "History", href: "/demo/history", icon: IconClock },
  { id: "progress", label: "Progress", href: "/demo/progress", icon: IconTrend },
  { id: "volume", label: "Volume", href: "/demo/volume", icon: IconFigure }
] as const;

type PublicTabId = (typeof PUBLIC_TABS)[number]["id"];

function activePublicTab(pathname: string): PublicTabId {
  if (pathname.startsWith("/demo/history")) return "history";
  if (pathname.startsWith("/demo/progress")) return "progress";
  if (pathname.startsWith("/demo/volume")) return "volume";
  return "workout";
}

export function PublicDemoShell({ children }: { children: ReactNode }): ReactNode {
  const pathname = normalizePathname(usePathname());
  const active = activePublicTab(pathname);

  useEffect(() => {
    if (window.parent === window) return;
    const targetOrigin = window.location.protocol === "https:" ? STATUS_PAGE_ORIGIN : "*";
    const announceReady = (): void => {
      window.parent.postMessage({ type: "gymtrack:demo-ready", path: pathname }, targetOrigin);
    };
    const onMessage = (event: MessageEvent): void => {
      if (event.source !== window.parent) return;
      if (window.location.protocol === "https:" && event.origin !== STATUS_PAGE_ORIGIN) return;
      const data = event.data as { type?: unknown } | null;
      if (data?.type === "gymtrack:demo-ping") announceReady();
    };
    window.addEventListener("message", onMessage);
    announceReady();
    return () => { window.removeEventListener("message", onMessage); };
  }, [pathname]);

  return (
    <DemoProvider startWithPractice>
      <div className="flex min-h-dvh flex-col bg-bg text-text">
        <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
          <div className="mx-auto flex h-11 max-w-5xl items-center justify-between px-4">
            <p className="text-subhead font-semibold text-text">
              GymTrack <span className="font-normal text-text-secondary">· Sample data</span>
            </p>
            <a
              className="min-h-11 inline-flex items-center px-1 text-subhead text-accent"
              href="/signup"
              rel="noopener noreferrer"
              target="_blank"
            >
              Try with your account
            </a>
          </div>
        </header>
        <main className="flex-1 pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom)+1.5rem)]">
          {children}
        </main>
        <nav
          aria-label="Preview navigation"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
        >
          <div className="mx-auto grid h-[var(--tabbar-height)] max-w-[45rem] grid-cols-4">
            {PUBLIC_TABS.map((item) => (
              <Link
                aria-current={active === item.id ? "page" : undefined}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-tab ${
                  active === item.id ? "text-accent" : "text-text-muted"
                }`}
                href={item.href}
                key={item.id}
              >
                <item.icon />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </DemoProvider>
  );
}
