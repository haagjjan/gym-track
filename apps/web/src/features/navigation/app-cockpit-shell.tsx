"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { AuthUser } from "../auth/auth-types";
import { LogoutButton } from "../auth/logout-button";
import { StartSessionAction } from "../workouts/workout-entry-point";
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
  { href: "/", label: "DASHBOARD", match: (path: string) => path === "/" },
  { href: "/", label: "WORKOUT", match: (path: string) => /^\/workouts\/[^/]+/.test(path) },
  { href: "/workouts", label: "HISTORY", match: (path: string) => path === "/workouts" },
  { href: "/progress", label: "PROGRESS", match: (path: string) => path === "/progress" },
  { href: "/weekly-volume", label: "VOLUME", match: (path: string) => path === "/weekly-volume" }
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
              <div className="appShellTopActions">
                <button
                  className="appShellMenuButton"
                  type="button"
                  aria-expanded={isDrawerOpen}
                  onClick={() => setIsDrawerOpen((current) => !current)}
                >
                  MENU
                </button>
                <LogoutButton />
              </div>
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
          <div className="appShellDrawer">{sidebar}</div>
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
          <span>OPERATOR</span>
          <strong>{user.username}</strong>
          <small>{user.email}</small>
        </div>
      }
      footer={
        <div className="appShellNavFooter">
          <StartSessionAction label="START_SESSION" pendingLabel="OPENING" variant="cockpit" />
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
            {item.label}
          </Link>
        ))}
      </div>
    </CockpitSidebar>
  );
}
