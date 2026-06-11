"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { AuthUser } from "../auth/auth-types";
import { LogoutButton } from "../auth/logout-button";
import {
  CockpitAppShell,
  CockpitSidebar,
  CockpitTopBar
} from "../../shared/ui/cockpit";

interface AppCockpitShellProps {
  children: ReactNode;
  user: AuthUser;
}

const navItems = [
  { href: "/", icon: "D", label: "Dashboard", match: (path: string) => path === "/" },
  { href: "/", icon: "W", label: "Workout", match: (path: string) => /^\/workouts\/[^/]+/.test(path) },
  { href: "/workouts", icon: "H", label: "History", match: (path: string) => path === "/workouts" },
  { href: "/progress", icon: "P", label: "Progress", match: (path: string) => path === "/progress" },
  { href: "/weekly-volume", icon: "V", label: "Volume", match: (path: string) => path === "/weekly-volume" }
];

export function AppCockpitShell({ children, user }: AppCockpitShellProps): ReactNode {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const sidebar = <AppSidebar pathname={pathname} user={user} />;

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="appCockpitShell">
      <CockpitAppShell
        sidebar={sidebar}
        topBar={
          <CockpitTopBar
            title="BODY_COCKPIT_V1.0"
            status="SYSTEM_READY"
            actions={
              <button
                aria-controls="app-navigation-drawer"
                aria-expanded={isDrawerOpen}
                aria-label="Open navigation"
                className="appShellMenuButton"
                type="button"
                onClick={() => setIsDrawerOpen(true)}
              >
                <MenuGlyph />
              </button>
            }
          />
        }
      >
        {children}
      </CockpitAppShell>
      {isDrawerOpen ? (
        <div className="appShellDrawerLayer">
          <button
            className="appShellDrawerBackdrop"
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div
            aria-label="Navigation menu"
            className="appShellDrawer"
            id="app-navigation-drawer"
            role="dialog"
          >
            <div className="appShellDrawerHeader">
              <span>BODY_COCKPIT_V1.0</span>
              <button
                aria-label="Close navigation"
                className="appShellMenuButton appShellMenuButton--drawer"
                type="button"
                onClick={() => setIsDrawerOpen(false)}
              >
                <MenuGlyph />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AppSidebar({ pathname, user }: { pathname: string; user: AuthUser }): ReactNode {
  return (
    <CockpitSidebar
      operator={
        <div className="appShellOperator">
          <div className="appShellOperator__avatar" aria-hidden="true">
            {operatorInitial(user.username)}
          </div>
          <div className="appShellOperator__meta">
            <span>OPERATOR</span>
            <strong>{user.username}</strong>
            <small>{user.email}</small>
          </div>
          <p className="appShellOperator__status">
            <span aria-hidden="true" />
            AUTH_ACTIVE
          </p>
        </div>
      }
      footer={
        <div className="appShellNavFooter">
          <LogoutButton />
        </div>
      }
    >
      <div className="appShellNavList">
        {navItems.map((item) => (
          <Link
            aria-current={item.match(pathname) ? "page" : undefined}
            className="appShellNavLink"
            href={item.href}
            key={item.label}
          >
            <span className="appShellNavIcon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </CockpitSidebar>
  );
}

function MenuGlyph(): ReactNode {
  return (
    <span className="appShellMenuGlyph" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function operatorInitial(username: string): string {
  return username.trim().charAt(0).toUpperCase() || "O";
}
