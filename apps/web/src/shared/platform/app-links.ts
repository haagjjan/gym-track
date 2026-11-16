const EMAIL_PATHS = new Set(["/verify-email", "/reset-password", "/cancel-deletion"]);

export function appLinkRoute(value: string): string | null {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.origin !== "https://app.gymtrack.ch" || url.username || url.password) {
    return null;
  }

  const path = url.pathname.replace(/\/$/, "");
  return EMAIL_PATHS.has(path) ? `${path}/${url.search}` : null;
}
