import Link from "next/link";
import type { ReactNode } from "react";
import { PUBLIC_PRIVACY_VERSION } from "../../shared/public-policy";

export function LegalPage({ children, eyebrow, title, version = PUBLIC_PRIVACY_VERSION }: { children: ReactNode; eyebrow: string; title: string; version?: string }): ReactNode {
  return <main className="min-h-dvh bg-void px-5 py-10 text-fg"><article className="mx-auto max-w-3xl rounded-xl border border-outline-dim/60 bg-surface/70 p-6 sm:p-9"><Link className="label-caps mb-6 inline-flex min-h-11 items-center rounded border border-outline-dim/60 px-3 text-cyan transition-colors hover:border-cyan/50 hover:bg-cyan/5" href="/settings">← Back to Settings</Link><p className="label-caps text-cyan">{eyebrow}</p><h1 className="mt-2 font-display text-3xl font-bold">{title}</h1><p className="mt-2 text-xs text-outline">Version {version} · Controller-approved self-assessment · Switzerland-only Founding Beta</p>{!legalConfigComplete() ? <p className="mt-5 rounded border border-red/50 bg-red/5 p-3 text-xs text-red" role="alert">PUBLICATION_BLOCKED: controller and contact configuration is incomplete. Approved wording must not be published with placeholder contact details.</p> : null}<div className="legal-copy mt-7 space-y-6 text-sm leading-relaxed text-fg-muted">{children}</div><nav className="mt-9 flex flex-wrap gap-4 border-t border-outline-dim/50 pt-5 text-xs"><Link className="text-cyan" href="/beta">Founding Beta</Link><Link className="text-cyan" href="/privacy">Privacy</Link><Link className="text-cyan" href="/cookies">Cookies & storage</Link><Link className="text-cyan" href="/terms">Terms</Link><Link className="text-cyan" href="/support">Support</Link></nav></article></main>;
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
    controller: process.env.CONTROLLER_NAME ?? "[controller configuration required]",
    address: process.env.CONTROLLER_ADDRESS ?? "[controller address required]",
    privacyEmail: process.env.PRIVACY_EMAIL ?? "[privacy contact required]",
    supportEmail: supportEmail ?? "[support contact required]",
    // Falls back to support rather than a placeholder: a reachable address is
    // better than none for a security report.
    securityEmail: process.env.SECURITY_EMAIL ?? supportEmail ?? "[security contact required]"
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
  return <section><h2 className="font-display text-lg font-bold text-fg">{title}</h2><div className="mt-2 space-y-2">{children}</div></section>;
}
