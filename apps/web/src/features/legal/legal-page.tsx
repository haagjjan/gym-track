import Link from "next/link";
import type { ReactNode } from "react";
import { PUBLIC_PRIVACY_VERSION } from "../../shared/public-policy";
import { getCurrentUser } from "../auth/server-auth";
import { LegalBack } from "./legal-back";

export async function LegalPage({ children, title, version = PUBLIC_PRIVACY_VERSION }: { children: ReactNode; eyebrow?: string; title: string; version?: string }): Promise<ReactNode> {
  // Signed-out visitors (from signup) go back to signup, not to Settings.
  const signedIn = Boolean(await getCurrentUser());
  return <main className="min-h-dvh bg-bg pb-[calc(env(safe-area-inset-bottom)+1rem)] text-text">
    {/* Pushed-screen bar: stays visible while the text scrolls (no swipe-back in the app). */}
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex min-h-11 max-w-[65ch] items-center px-[max(1rem,env(safe-area-inset-left))]">
        <LegalBack signedIn={signedIn} />
      </div>
    </header>
    <div className="mx-auto max-w-[65ch] px-[max(1rem,env(safe-area-inset-left))]">
      <article className="pb-10 pt-4">
        <h1 className="text-title-1 text-text">{title}</h1>
        {!legalConfigComplete() ? <p className="mt-5 rounded-[var(--radius-card)] bg-surface p-3 text-subhead text-danger" role="alert">Contact details are incomplete, so this page can&apos;t be published yet. Set the controller and contact configuration first.</p> : null}
        <div className="legal-copy mt-6 space-y-6 text-body text-text-secondary">{children}</div>
        <footer className="mt-10 border-t border-line pt-4">
          <nav aria-label="Legal pages" className="flex flex-wrap gap-x-5">
            {[["/privacy", "Privacy"], ["/cookies", "Cookies and storage"], ["/terms", "Terms"], ["/support", "Support"]].map(([href, label]) => <Link className="inline-flex min-h-11 items-center text-callout text-accent" href={href!} key={href}>{label}</Link>)}
          </nav>
          <p className="mt-2 text-footnote text-text-muted">Version {version}. Switzerland only.</p>
        </footer>
      </article>
    </div>
  </main>;
}

/**
 * Read at request time from server environment, never through `NEXT_PUBLIC_*`.
 *
 * Next.js inlines `NEXT_PUBLIC_*` values into the bundle at build time and does
 * not re-read them at runtime, so the earlier prefixed variables were baked in
 * as `undefined` during `docker build` and no runtime configuration could
 * change them. Plain server variables are read from `process.env` per request.
 *
 * Every route rendering this component must also `export const dynamic =
 * "force-dynamic"`, or Next will statically prerender it at build time and
 * freeze whatever these resolve to then.
 */
export function legalContacts(): {
  controller: string;
  address: string;
  privacyEmail: string;
  supportEmail: string;
  securityEmail: string;
} {
  const supportEmail = process.env.SUPPORT_EMAIL;

  return {
    controller: process.env.CONTROLLER_NAME ?? "Controller name not configured",
    address: process.env.CONTROLLER_ADDRESS ?? "Controller address not configured",
    privacyEmail: process.env.PRIVACY_EMAIL ?? "Privacy contact not configured",
    supportEmail: supportEmail ?? "Support contact not configured",
    // Falls back to support rather than a placeholder: a reachable address is
    // better than none for a security report.
    securityEmail: process.env.SECURITY_EMAIL ?? supportEmail ?? "Security contact not configured"
  };
}

function legalConfigComplete(): boolean {
  return Boolean(
    process.env.CONTROLLER_NAME &&
    process.env.CONTROLLER_ADDRESS &&
    process.env.PRIVACY_EMAIL &&
    process.env.SUPPORT_EMAIL
  );
}

export function Section({ children, title }: { children: ReactNode; title: string }): ReactNode {
  return <section><h2 className="text-title-3 text-text">{title}</h2><div className="mt-2 space-y-3">{children}</div></section>;
}
