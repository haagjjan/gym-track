import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ children, eyebrow, title }: { children: ReactNode; eyebrow: string; title: string }): ReactNode {
  return <main className="min-h-dvh bg-void px-5 py-10 text-fg"><article className="mx-auto max-w-3xl rounded-xl border border-outline-dim/60 bg-surface/70 p-6 sm:p-9"><p className="label-caps text-cyan">{eyebrow}</p><h1 className="mt-2 font-display text-3xl font-bold">{title}</h1><p className="mt-2 text-xs text-outline">Version 2026-08-05-beta-1 · Draft publication requires qualified legal review</p>{!legalConfigComplete() ? <p className="mt-5 rounded border border-red/50 bg-red/5 p-3 text-xs text-red" role="alert">PUBLICATION_BLOCKED: controller and contact configuration is incomplete. This draft must not be treated as final legal wording.</p> : null}<div className="legal-copy mt-7 space-y-6 text-sm leading-relaxed text-fg-muted">{children}</div><nav className="mt-9 flex flex-wrap gap-4 border-t border-outline-dim/50 pt-5 text-xs"><Link className="text-cyan" href="/beta">Founding Beta</Link><Link className="text-cyan" href="/privacy">Privacy</Link><Link className="text-cyan" href="/cookies">Cookies & storage</Link><Link className="text-cyan" href="/terms">Terms</Link><Link className="text-cyan" href="/support">Support</Link></nav></article></main>;
}

export function legalContacts(): { controller: string; address: string; privacyEmail: string; supportEmail: string } {
  return {
    controller: process.env.NEXT_PUBLIC_CONTROLLER_NAME ?? "[controller configuration required]",
    address: process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS ?? "[controller address required]",
    privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? "[privacy contact required]",
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "[support contact required]"
  };
}

function legalConfigComplete(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONTROLLER_NAME && process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS && process.env.NEXT_PUBLIC_PRIVACY_EMAIL && process.env.NEXT_PUBLIC_SUPPORT_EMAIL);
}

export function Section({ children, title }: { children: ReactNode; title: string }): ReactNode {
  return <section><h2 className="font-display text-lg font-bold text-fg">{title}</h2><div className="mt-2 space-y-2">{children}</div></section>;
}
