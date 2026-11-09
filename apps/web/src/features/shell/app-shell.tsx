"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode, type SVGProps } from "react";
import type { AuthUser } from "../auth/auth-types";
import { apiFetch } from "../../shared/api/client";
import { useWorkouts } from "../../shared/api/hooks";
import type { WorkoutSummary } from "../../shared/api/types";
import { useAppBack } from "./app-history";
import {
  IconAdmin,
  IconBack,
  IconClock,
  IconDumbbell,
  IconFigure,
  IconForward,
  IconHelp,
  IconHome,
  IconInbox,
  IconSettings,
  IconSignOut,
  IconTrend
} from "../../shared/ui/icons";
import { isTabRoot, tabFor, TABS, type TabId } from "./navigation";
import { DevicePrivacyProvider } from "../privacy/device-privacy";
import { OnboardingProvider } from "../onboarding/onboarding-provider";
import { OnboardingInvitation } from "../onboarding/onboarding-invitation";
import { MessageCenter } from "../messages/message-center";

type IconComponent = (props: SVGProps<SVGSVGElement>) => ReactNode;

interface NavItem {
  id: TabId;
  href: string;
  label: string;
  icon: IconComponent;
}

const TAB_ICONS: Record<TabId, IconComponent> = {
  home: IconHome,
  history: IconClock,
  workout: IconDumbbell,
  progress: IconTrend,
  volume: IconFigure
};

const DEMO_HREFS: Record<TabId, string> = {
  home: "/help/demo",
  history: "/help/demo/history",
  workout: "/help/demo/workout",
  progress: "/help/demo/progress",
  volume: "/help/demo/volume"
};

function navigationItems(demo: boolean): NavItem[] {
  return TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    href: demo ? DEMO_HREFS[tab.id] : tab.href,
    icon: TAB_ICONS[tab.id]
  }));
}

function activeTab(pathname: string, demo: boolean): TabId | null {
  if (!demo) return tabFor(pathname);
  const match = (Object.entries(DEMO_HREFS) as Array<[TabId, string]>).find(([, href]) => pathname === href || (href !== "/help/demo" && pathname.startsWith(`${href}/`)));
  if (match) return match[0];
  return pathname === "/help/demo/session" ? "workout" : null;
}

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
  const tab = activeTab(pathname, demo);
  const pushed = !demo && !isTabRoot(pathname);
  const openWorkout = useOpenWorkout(!demo);
  // Home and the Workout launcher show their own resume card instead.
  const showMiniBar = Boolean(openWorkout) && pathname !== "/" && pathname !== "/workout";

  const content = (
    <div className="flex min-h-dvh bg-bg text-text">
      <DesktopSidebar active={tab} demo={demo} openWorkout={openWorkout} pathname={pathname} user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        {demo ? <DemoTopBar /> : pushed ? <PushedTopBar /> : pathname === "/" ? <HomeTopBar user={user} /> : <SafeAreaTop />}
        <main
          className={`flex-1 lg:pb-0 ${
            showMiniBar
              ? "pb-[calc(var(--tabbar-height)+var(--minibar-height)+env(safe-area-inset-bottom)+1.5rem)]"
              : "pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom)+1.5rem)]"
          }`}
        >
          {!demo && pathname === "/" ? <OnboardingInvitation /> : null}
          {children}
        </main>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
        {showMiniBar && openWorkout ? <WorkoutMiniBar workout={openWorkout} /> : null}
        <TabBar active={tab} demo={demo} pathname={pathname} />
      </div>
      {!demo && canPrompt(pathname) ? <MessageCenter /> : null}
    </div>
  );

  return (
    <OnboardingProvider userId={user.id}>
      {demo ? content : <DevicePrivacyProvider userId={user.id}>{content}</DevicePrivacyProvider>}
    </OnboardingProvider>
  );
}

function canPrompt(pathname: string): boolean {
  return pathname !== "/workout"
    && pathname !== "/messages"
    && pathname !== "/admin"
    && !/^\/workouts\/[^/]+$/.test(pathname);
}

function useOpenWorkout(enabled: boolean): WorkoutSummary | null {
  // Same query key as the launcher, so both read one cached request.
  const workouts = useWorkouts(20);
  if (!enabled) return null;
  return workouts.data?.items.find((workout) => workout.isOpen) ?? null;
}

function useHasPendingMessages(): boolean {
  const query = useQuery({
    queryKey: ["messages", "pending"],
    queryFn: ({ signal }) => apiFetch<{ items: unknown[] }>("/api/messages", { signal }),
    staleTime: 60_000
  });
  return (query.data?.items.length ?? 0) > 0;
}

/* ---------- Top of screen ---------- */

function SafeAreaTop(): ReactNode {
  return <div aria-hidden className="h-[env(safe-area-inset-top)] lg:hidden" />;
}

function HomeTopBar({ user }: { user: AuthUser }): ReactNode {
  const hasMessages = useHasPendingMessages();

  return (
    <div className="flex justify-end gap-1 px-[max(1rem,env(safe-area-inset-right))] pt-[calc(env(safe-area-inset-top)+0.25rem)] lg:hidden">
      {user.role === "ADMIN" ? (
        <Link aria-label="Admin" className="inline-flex size-11 items-center justify-center rounded-full text-text" href="/admin">
          <IconAdmin />
        </Link>
      ) : null}
      <Link
        aria-label={hasMessages ? "Messages, new message" : "Messages"}
        className="relative inline-flex size-11 items-center justify-center rounded-full text-text"
        href="/messages"
      >
        <IconInbox />
        {hasMessages ? <span aria-hidden className="absolute right-2 top-2 size-2.5 rounded-full border-2 border-bg bg-accent" /> : null}
      </Link>
      <Link
        aria-label={user.emailVerified ? "Profile and settings" : "Profile and settings, email not confirmed"}
        className="relative inline-flex size-11 items-center justify-center rounded-full"
        href="/settings"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-surface-raised text-subhead font-semibold text-text">
          {user.username.charAt(0).toUpperCase()}
        </span>
        {!user.emailVerified ? <span aria-hidden className="absolute right-1 top-1 size-2.5 rounded-full border-2 border-bg bg-warning" /> : null}
      </Link>
    </div>
  );
}

function PushedTopBar(): ReactNode {
  const back = useAppBack();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex h-11 items-center px-[max(0.25rem,env(safe-area-inset-left))] lg:px-4">
        {back.target.kind === "none" ? null : (
          <button
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center gap-0.5 pr-3 text-body text-accent"
            onClick={back.goBack}
            type="button"
          >
            <IconBack />
            <span>{back.label}</span>
          </button>
        )}
      </div>
    </header>
  );
}

function DemoTopBar(): ReactNode {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
      <div className="flex h-11 items-center justify-between px-4">
        <p className="text-headline text-text">Example</p>
        <button className="min-h-11 cursor-pointer px-1 text-body text-accent" onClick={() => router.push("/")} type="button">
          Exit example
        </button>
      </div>
    </header>
  );
}

/* ---------- Bottom of screen (phones) ---------- */

function TabBar({ active, pathname, demo }: { active: TabId | null; pathname: string; demo: boolean }): ReactNode {
  const items = navigationItems(demo);
  const highlightWorkout = demo && pathname === "/help/demo";

  return (
    <nav
      aria-label="Primary"
      className="border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] backdrop-blur-md"
    >
      <div className="mx-auto grid h-[var(--tabbar-height)] max-w-[45rem] grid-cols-5">
        {items.map((item) => item.id === "workout" ? (
          <Link
            aria-current={active === "workout" ? "page" : undefined}
            aria-label={item.label}
            className="flex items-center justify-center"
            href={item.href}
            key={item.id}
          >
            <span
              className={`-mt-3.5 flex size-13 items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_2px_8px_rgb(0_0_0/0.25)] transition-transform duration-[120ms] active:scale-95 ${
                highlightWorkout ? "ring-4 ring-accent/40 ring-offset-2 ring-offset-bg" : ""
              }`}
            >
              <item.icon height="26" width="26" />
            </span>
          </Link>
        ) : (
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
  );
}

function useElapsed(startedAt: string): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = globalThis.setInterval(() => setNow(Date.now()), 1000);
    return () => globalThis.clearInterval(timer);
  }, []);

  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function workoutTitle(workout: WorkoutSummary): string {
  return workout.title?.trim() || workout.workoutType?.trim() || "Workout";
}

function WorkoutMiniBar({ workout }: { workout: WorkoutSummary }): ReactNode {
  const elapsed = useElapsed(workout.startedAt);

  return (
    <Link
      aria-label={`Resume ${workoutTitle(workout)}, ${elapsed} elapsed`}
      className="mx-auto flex h-[var(--minibar-height)] max-w-[45rem] items-center gap-3 border-t border-line bg-surface px-[max(1rem,env(safe-area-inset-left))]"
      href={`/workouts/${workout.id}`}
    >
      <span aria-hidden className="size-2.5 flex-none rounded-full bg-success" />
      <span className="min-w-0 flex-1 truncate text-headline text-text">{workoutTitle(workout)}</span>
      <span className="num text-callout text-text-secondary">{elapsed}</span>
      <IconForward className="flex-none text-text-muted" />
    </Link>
  );
}

/* ---------- Wide screens ---------- */

function DesktopSidebar({
  active,
  pathname,
  user,
  demo,
  openWorkout
}: {
  active: TabId | null;
  pathname: string;
  user: AuthUser;
  demo: boolean;
  openWorkout: WorkoutSummary | null;
}): ReactNode {
  const router = useRouter();

  async function handleLogout(): Promise<void> {
    await apiFetch("/api/auth/logout", { method: "POST", body: {} }).catch(() => null);
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 flex-none flex-col border-r border-line bg-surface lg:flex">
      <p className="px-5 pb-4 pt-6 text-title-3 text-text">GymTrack</p>

      <nav aria-label="Primary" className="flex-1 space-y-0.5 px-3">
        {navigationItems(demo).map((item) => (
          <SidebarLink active={active === item.id && !SIDEBAR_SECONDARY.has(pathname)} href={item.href} icon={item.icon} key={item.id} label={item.label} />
        ))}
        {openWorkout && pathname !== "/workout" ? (
          <Link
            className="mt-4 flex min-h-11 items-center gap-3 rounded-lg bg-surface-raised px-3 py-2"
            href={`/workouts/${openWorkout.id}`}
          >
            <span aria-hidden className="size-2.5 flex-none rounded-full bg-success" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-subhead font-semibold text-text">{workoutTitle(openWorkout)}</span>
              <span className="block text-footnote text-text-secondary">Workout in progress</span>
            </span>
          </Link>
        ) : null}
      </nav>

      <div className="space-y-0.5 border-t border-line px-3 py-3">
        {demo ? null : (
          <>
            <SidebarLink
              active={pathname === "/settings"}
              badge={!user.emailVerified ? "Email not confirmed" : undefined}
              href="/settings"
              icon={IconSettings}
              label="Settings"
            />
            <SidebarLink active={pathname === "/messages"} href="/messages" icon={IconInbox} label="Messages" />
          </>
        )}
        <SidebarLink active={pathname === "/help"} href="/help" icon={IconHelp} label="Help" />
        {!demo && user.role === "ADMIN" ? <SidebarLink active={pathname === "/admin"} href="/admin" icon={IconAdmin} label="Admin" /> : null}
        <button
          className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-callout text-text-secondary hover:bg-surface-raised hover:text-text"
          onClick={() => demo ? router.push("/") : void handleLogout()}
          type="button"
        >
          <IconSignOut />
          {demo ? "Exit example" : "Sign out"}
        </button>
        {demo ? null : <p className="truncate px-3 pt-2 text-footnote text-text-muted">Signed in as {user.username}</p>}
      </div>
    </aside>
  );
}

// Routes with their own sidebar entry; on wide screens they don't light up Home.
const SIDEBAR_SECONDARY = new Set(["/settings", "/messages", "/help", "/admin"]);

function SidebarLink({
  active,
  href,
  icon: Icon,
  label,
  badge
}: {
  active: boolean;
  href: string;
  icon: IconComponent;
  label: string;
  badge?: string | undefined;
}): ReactNode {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-callout ${
        active ? "bg-surface-raised font-semibold text-accent" : "text-text-secondary hover:bg-surface-raised hover:text-text"
      }`}
      href={href}
    >
      <Icon />
      <span className="flex-1">{label}</span>
      {badge ? (
        <>
          <span aria-hidden className="size-2 rounded-full bg-warning" />
          <span className="sr-only">({badge})</span>
        </>
      ) : null}
    </Link>
  );
}
