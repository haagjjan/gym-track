"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { AuthUser } from "../auth/auth-types";
import { apiFetch } from "../../shared/api/client";
import { useStartSession } from "../session/use-start-session";
import {
  IconBarbell,
  IconChart,
  IconGear,
  IconGrid,
  IconHistory,
  IconLogout,
  IconMail,
  IconShield,
  IconVolume
} from "./icons";
import { DevicePrivacyProvider } from "../privacy/device-privacy";
import { OnboardingProvider } from "../onboarding/onboarding-provider";
import { OnboardingInvitation } from "../onboarding/onboarding-invitation";
import { MessageCenter } from "../messages/message-center";

interface NavItem {
  href: string;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
  isActive: (path: string) => boolean;
}

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: IconGrid,
    isActive: (path) => path === "/"
  },
  {
    href: "/workouts",
    label: "History",
    icon: IconHistory,
    isActive: (path) => path === "/workouts" || /^\/workouts\/[^/]+/.test(path)
  },
  {
    href: "/progress",
    label: "Progress",
    icon: IconChart,
    isActive: (path) => path === "/progress"
  },
  {
    href: "/weekly-volume",
    label: "Volume",
    icon: IconVolume,
    isActive: (path) => path === "/weekly-volume"
  },
  {
    href: "/settings",
    label: "Settings",
    icon: IconGear,
    isActive: (path) => path === "/settings"
  }
];

export function AppShell({
  children,
  user,
  demo = false
}: {
  children: ReactNode;
  user: AuthUser;
  demo?: boolean;
}): ReactNode {
  const pathname = usePathname();

  const content = <div className="flex min-h-dvh bg-void">
    <DesktopSidebar demo={demo} pathname={pathname} user={user} />
    <div className="flex min-w-0 flex-1 flex-col">
      {demo ? <header className="border-b border-outline-dim/40 px-4 py-3 text-sm text-fg lg:hidden">Gym Progress Tracker · Example</header> : <MobileTopBar user={user} />}
      <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {!demo && pathname === "/" ? <OnboardingInvitation /> : null}
        {children}
      </main>
    </div>
    <MobileTabBar demo={demo} pathname={pathname} />
    {!demo && canPrompt(pathname) ? <MessageCenter /> : null}
  </div>;
  return <OnboardingProvider userId={user.id}>{demo ? content : <DevicePrivacyProvider userId={user.id}>{content}</DevicePrivacyProvider>}</OnboardingProvider>;
}

function navigationItems(demo: boolean): NavItem[] {
  if (!demo) return navItems;
  return navItems.filter((item) => item.href !== "/settings").map((item) => {
    const href = item.href === "/" ? "/help/demo" : item.href === "/workouts" ? "/help/demo/history" : item.href === "/weekly-volume" ? "/help/demo/volume" : `/help/demo${item.href}`;
    return { ...item, href, isActive: (path: string) => path === href };
  });
}

function canPrompt(pathname: string): boolean {
  return pathname !== "/workout"
    && pathname !== "/messages"
    && pathname !== "/admin"
    && !/^\/workouts\/[^/]+$/.test(pathname);
}

function DesktopSidebar({ pathname, user, demo }: { pathname: string; user: AuthUser; demo: boolean }): ReactNode {
  const router = useRouter();
  const { start, isPending } = useStartSession();

  async function handleLogout(): Promise<void> {
    await apiFetch("/api/auth/logout", { method: "POST", body: {} }).catch(() => null);
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 flex-col border-r border-outline-dim/40 bg-surface/60 backdrop-blur-md lg:flex">
      <div className="border-b border-outline-dim/40 px-5 py-5">
        <p className="rounded border border-outline-dim/60 px-2 py-1 text-center font-display text-xs font-bold uppercase tracking-[0.1em] text-fg">
          Gym Progress Tracker
        </p>
      </div>

      <div className="border-b border-outline-dim/40 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded border border-outline-dim bg-surface-low font-display text-lg font-bold text-fg">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-fg">
              {user.username}
            </p>
            {user.betaCohort ? <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-lavender">Founding Beta</p> : null}
          </div>
        </div>
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-1 px-3 py-4">
        {navigationItems(demo).map((item) => {
          const active = item.isActive(pathname);
          const showPendingBadge = item.href === "/settings" && !user.emailVerified;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded px-3 py-2.5 font-display text-xs font-bold uppercase tracking-[0.12em] transition-colors ${
                active
                  ? "border-l-2 border-cyan bg-cyan/10 text-cyan"
                  : "border-l-2 border-transparent text-fg-muted hover:bg-surface-low hover:text-fg"
              }`}
              href={item.href}
              key={item.href}
            >
              <span className="relative inline-flex">
                <item.icon className={active ? "text-cyan" : "text-outline"} />
                {showPendingBadge ? (
                  <span
                    aria-hidden
                    className="status-dot absolute -right-0.5 -top-0.5 bg-lavender shadow-glow-lavender"
                  />
                ) : null}
              </span>
              {item.label}
              {showPendingBadge ? <span className="sr-only">(email verification pending)</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-outline-dim/40 p-4">
        <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-outline">
          {!demo ? <Link className="min-h-11 px-2 py-3 hover:text-cyan" href="/messages">Messages</Link> : null}
          <Link className="min-h-11 px-2 py-3 hover:text-cyan" href="/help">Help</Link>
          {!demo && user.role === "ADMIN" ? <Link className="min-h-11 px-2 py-3 hover:text-lavender" href="/admin">Admin</Link> : null}
        </div>
        <button
          className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded border border-cyan/50 font-display text-xs font-bold uppercase tracking-[0.12em] text-cyan transition-all hover:bg-cyan/10 hover:shadow-glow-cyan disabled:cursor-wait disabled:opacity-60"
          disabled={isPending}
          onClick={() => demo ? router.push("/help/demo/workout") : void start()}
          type="button"
        >
          <IconBarbell />
          {isPending ? "OPENING…" : "WORKOUT"}
        </button>
        <button
          className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded font-display text-[11px] font-bold uppercase tracking-[0.12em] text-outline transition-colors hover:text-red"
          onClick={() => demo ? router.push("/") : void handleLogout()}
          type="button"
        >
          <IconLogout />
          {demo ? "Exit example" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}

function MobileTopBar({ user }: { user: AuthUser }): ReactNode {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-outline-dim/40 bg-void/80 px-4 py-3 backdrop-blur-md lg:hidden">
      <p className="min-w-0 truncate font-display text-xs font-bold uppercase tracking-[0.08em] text-fg">
        Gym Progress Tracker {user.betaCohort ? <span className="text-[9px] text-lavender">· Founding</span> : null}
      </p>
      <div className="flex shrink-0 items-center">
        {user.role === "ADMIN" ? (
          <Link
            aria-label="Administration"
            className="inline-flex size-11 items-center justify-center rounded text-fg-muted transition-colors hover:bg-surface-low hover:text-lavender"
            href="/admin"
          >
            <IconShield />
          </Link>
        ) : null}
        <Link
          aria-label="Messages"
          className="inline-flex size-11 items-center justify-center rounded text-fg-muted transition-colors hover:bg-surface-low hover:text-cyan"
          href="/messages"
        >
          <IconMail />
        </Link>
        <Link
          aria-label="Settings"
          className="relative inline-flex size-11 items-center justify-center rounded text-fg-muted transition-colors hover:bg-surface-low hover:text-cyan"
          href="/settings"
        >
          <IconGear />
          {!user.emailVerified ? (
            <>
              <span aria-hidden className="status-dot absolute right-2 top-2 bg-lavender shadow-glow-lavender" />
              <span className="sr-only">(email verification pending)</span>
            </>
          ) : null}
        </Link>
      </div>
    </header>
  );
}

function MobileTabBar({ pathname, demo }: { pathname: string; demo: boolean }): ReactNode {
  const { start, isPending } = useStartSession();
  const router = useRouter();
  const items = navigationItems(demo);
  const left = items.slice(0, 2);
  const right = items.slice(2, 4);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 h-[calc(4rem+env(safe-area-inset-bottom))] border-t border-outline-dim/40 bg-void lg:hidden"
    >
      <div className="grid h-16 grid-cols-5 items-end bg-void pb-1">
        {left.map((item) => (
          <MobileTab item={item} key={item.href} pathname={pathname} />
        ))}

        <div className="flex justify-center">
          <button
            aria-label="Start workout session"
            className={`relative -top-4 flex size-14 cursor-pointer items-center justify-center rounded-full border border-cyan bg-surface text-cyan shadow-glow-cyan transition-transform active:scale-95 disabled:opacity-60 ${demo && pathname === "/help/demo" ? "ring-4 ring-cyan/40 ring-offset-2 ring-offset-void" : ""}`}
            disabled={isPending}
            onClick={() => demo ? router.push("/help/demo/workout") : void start()}
            type="button"
          >
            <IconBarbell height="24" width="24" />
          </button>
        </div>

        {right.map((item) => (
          <MobileTab item={item} key={item.href} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}

function MobileTab({ item, pathname }: { item: NavItem; pathname: string }): ReactNode {
  const active = item.isActive(pathname);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex min-h-14 flex-col items-center justify-center gap-1 pb-1 pt-2 text-[9px] font-bold uppercase tracking-[0.1em] ${
        active ? "text-cyan" : "text-outline"
      }`}
      href={item.href}
    >
      <item.icon />
      {item.label}
    </Link>
  );
}
