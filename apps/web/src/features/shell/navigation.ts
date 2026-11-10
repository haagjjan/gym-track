/**
 * Navigation contract from docs/DESIGN.md (Navigation): which tab owns a
 * route, which routes are tab roots, and where Back goes. URLs never change;
 * ownership comes from this table, not from the URL prefix.
 */
export type TabId = "home" | "history" | "workout" | "progress" | "volume";

export interface TabDefinition {
  id: TabId;
  label: string;
  href: string;
}

export const TABS: readonly TabDefinition[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "history", label: "History", href: "/workouts" },
  { id: "workout", label: "Workout", href: "/workout" },
  { id: "progress", label: "Progress", href: "/progress" },
  { id: "volume", label: "Volume", href: "/weekly-volume" }
];

const TAB_ROOTS: Record<string, TabId> = {
  "/": "home",
  "/workouts": "history",
  "/workout": "workout",
  "/progress": "progress",
  "/analytics": "progress",
  "/weekly-volume": "volume"
};

const TITLES: Record<string, string> = {
  "/": "Home",
  "/workouts": "History",
  "/workout": "Workout",
  "/workouts/templates": "Templates",
  "/workouts/exercises": "Exercises",
  "/progress": "Progress",
  "/analytics": "Progress",
  "/weekly-volume": "Volume",
  "/settings": "Settings",
  "/messages": "Messages",
  "/help": "Help",
  "/support": "Support",
  "/privacy": "Privacy",
  "/terms": "Terms",
  "/cookies": "Cookies",
  "/admin": "Admin",
  "/signup": "Sign up",
  "/login": "Sign in"
};

const LEGAL = new Set(["/privacy", "/terms", "/cookies"]);

export function normalizePath(path: string): string {
  const bare = path.split(/[?#]/)[0] ?? "/";
  return bare.length > 1 ? bare.replace(/\/+$/, "") : "/";
}

export function isTabRoot(path: string): boolean {
  return normalizePath(path) in TAB_ROOTS;
}

/** The tab a route belongs to, or null for routes outside the tabbed app. */
export function tabFor(path: string): TabId | null {
  const p = normalizePath(path);
  const root = TAB_ROOTS[p];
  if (root) return root;
  if (p === "/workouts/templates" || p.startsWith("/workouts/templates/") || p === "/workouts/exercises") return "workout";
  // A finished workout's detail; the open, live workout runs full screen outside the shell.
  if (/^\/workouts\/[^/]+$/.test(p)) return "history";
  if (["/settings", "/messages", "/help", "/support", "/admin"].includes(p) || LEGAL.has(p)) return "home";
  return null;
}

/** Where Back goes when the in-app history has nothing to return to. */
export function parentOf(path: string, signedIn = true): string | null {
  const p = normalizePath(path);
  if (isTabRoot(p)) return null;
  if (p === "/workouts/templates" || p.startsWith("/workouts/templates/") || p === "/workouts/exercises") return "/workout";
  if (/^\/workouts\/[^/]+$/.test(p)) return "/workouts";
  if (p === "/settings" || p === "/messages" || p === "/admin") return "/";
  if (p === "/help" || p === "/support") return "/settings";
  if (LEGAL.has(p)) return signedIn ? "/settings" : "/signup";
  return "/";
}

export function titleFor(path: string): string {
  const p = normalizePath(path);
  if (TITLES[p]) return TITLES[p];
  if (/^\/workouts\/[^/]+$/.test(p)) return "Workout";
  return "Back";
}

const HISTORY_LIMIT = 50;

/**
 * The shell's own history list. A route change appends; returning to the
 * entry before the current one (a Back, by any means) pops instead, so the
 * list mirrors what Back would show.
 */
export function recordVisit(history: readonly string[], path: string): string[] {
  const p = normalizePath(path);
  const last = history.at(-1);
  if (last === p) return [...history];
  if (history.at(-2) === p) return history.slice(0, -1);
  const next = [...history, p];
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
}

export type BackTarget =
  | { kind: "history"; path: string }
  | { kind: "parent"; path: string }
  | { kind: "none" };

/** Back contract: previous in-app entry first, then the route-table parent. */
export function backTarget(history: readonly string[], path: string, signedIn = true): BackTarget {
  const p = normalizePath(path);
  const previous = history.at(-1) === p ? history.at(-2) : history.at(-1);
  if (previous && previous !== p) return { kind: "history", path: previous };
  const parent = parentOf(p, signedIn);
  return parent ? { kind: "parent", path: parent } : { kind: "none" };
}
